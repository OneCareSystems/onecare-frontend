import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  getPublicDoctors,
  getAvailableSlots,
  submitPublicBooking,
  statusOf,
} from "../../services/publicBookingService";
import {
  isSriLankanPhone,
  normalizeSriLankanPhone,
} from "../../utils/sriLankanPhone";
import { clinicToday } from "../../utils/clinicTime";
import { formatPatientTime, isValidDate } from "../../utils/publicDateTime";
import { bookingDocumentId } from "../../utils/bookingNavigation";
import "../../styles/patient-public.css";

const initial = {
  firstName: "",
  lastName: "",
  phone: "",
  dateOfBirth: "",
  doctorId: "",
  appointmentDate: "",
  slot: "",
  reason: "",
};
const validName = (value) => /^[\p{L}\p{M} .'-]+$/u.test(value.trim());
function validateBooking(form) {
  const errors = {};
  for (const key of ["firstName", "lastName"]) {
    if (!form[key].trim()) errors[key] = "booking.required";
    else if (!validName(form[key]) || form[key].trim().length > 100)
      errors[key] = "booking.invalidName";
  }
  if (!isSriLankanPhone(form.phone)) errors.phone = "booking.invalidPhone";
  if (!isValidDate(form.dateOfBirth) || form.dateOfBirth > clinicToday())
    errors.dateOfBirth = "booking.invalidDob";
  if (!form.doctorId) errors.doctorId = "booking.required";
  if (
    !isValidDate(form.appointmentDate) ||
    form.appointmentDate < clinicToday()
  )
    errors.appointmentDate = "booking.invalidDate";
  if (!form.slot) errors.slot = "booking.required";
    return errors;
}

export default function BookingPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState(initial);
  const [doctors, setDoctors] = useState([]);
  const [slots, setSlots] = useState([]);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(
    location.state?.missingConfirmation ? "booking.checkMessage" : "",
  );
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const [slotState, setSlotState] = useState("idle");
  const [retrySlots, setRetrySlots] = useState(0);
  const [retryDoctors, setRetryDoctors] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    getPublicDoctors(controller.signal)
      .then((ds) => {
        if (controller.signal.aborted) return;
        setDoctors(ds);
        if (ds.length === 1) setForm((f) => ({ ...f, doctorId: ds[0].id }));
      })
      .catch(() => {
        if (!controller.signal.aborted) setMessage("booking.doctorError");
      });
    return () => controller.abort();
  }, [retryDoctors]);
  useEffect(() => {
    if (
      !form.doctorId ||
      !isValidDate(form.appointmentDate) ||
      form.appointmentDate < clinicToday()
    )
      return;
    const controller = new AbortController();
    getAvailableSlots(form.doctorId, form.appointmentDate, controller.signal)
      .then((available) => {
        if (!controller.signal.aborted) {
          setSlots(available);
          setSlotState("ready");
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setSlotState("error");
      });
    return () => controller.abort();
  }, [form.doctorId, form.appointmentDate, retrySlots]);
  const change = (event) => {
    const { name, value } = event.target;
    if (["doctorId", "appointmentDate"].includes(name)) {
      setSlots([]);
      const doctor = name === "doctorId" ? value : form.doctorId;
      const date = name === "appointmentDate" ? value : form.appointmentDate;
      setSlotState(
        doctor && isValidDate(date) && date >= clinicToday()
          ? "loading"
          : "idle",
      );
    }
    if (name=="phone"&& !/^\+?[0-9\s()-]*$/.test(value)){
      setErrors((previous)=>({...previous, phone: "booking.invalidPhone"}));
      return;
    }

    setForm((f) => ({
      ...f,
      [name]: value,
      ...(["doctorId", "appointmentDate"].includes(name) ? { slot: "" } : {}),
    }));
    setErrors((x) => ({ ...x, [name]: undefined }));
    setMessage("");
  };
  const reloadSlots = () => {
    setSlots([]);
    setSlotState("loading");
    setRetrySlots((x) => x + 1);
  };
  const submit = async (event) => {
    event.preventDefault();
    if (submitting.current) return;
    const found = validateBooking(form);
    if (form.slot && !slots.includes(form.slot))
      found.slot = "booking.required";
    setErrors(found);
    if (Object.keys(found).length) return;
    submitting.current = true;
    setPending(true);
    setMessage("");
    try {
      const result = await submitPublicBooking({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: normalizeSriLankanPhone(form.phone),
        dateOfBirth: form.dateOfBirth,
        doctorId: form.doctorId,
        date: form.appointmentDate,
        time: form.slot,
        reason: form.reason.trim(),
      });
      navigate("/appointments/confirmed", {
        state: {
          documentId: bookingDocumentId,
          booking: {
            doctor: doctors.find((d) => d.id === form.doctorId)?.name || "",
            date: result.date ?? form.appointmentDate,
            time: result.time ?? form.slot,
            status: "Scheduled",
            reference: result.appointmentId ?? result.id ?? null,
          },
        },
      });
    } catch (error) {
      const status = statusOf(error);
      if (status === 409) {
        setMessage("booking.conflict");
        setForm((f) => ({ ...f, slot: "" }));
        reloadSlots();
      } else if (status === 429) setMessage("booking.rateLimit");
      else setMessage("booking.submitError");
    } finally {
      submitting.current = false;
      setPending(false);
    }
  };
  const errorFor = (key) =>
    errors[key] && (
      <small id={`${key}-error`} role="alert">
        {t(errors[key])}
      </small>
    );
  const accessibility = (key) => ({
    "aria-invalid": Boolean(errors[key]),
    "aria-describedby": errors[key] ? `${key}-error` : undefined,
  });
  const field = (key, type = "text") => (
    <div className="patient-field" key={key}>
      <label htmlFor={key}>{t(`booking.${key}`)}</label>
      <input
        id={key}
        name={key}
        type={type}
        value={form[key]}
        onChange={change}
        required
        {...accessibility(key)}
        maxLength={type === "text" ? 100 : undefined}
        max={key === "dateOfBirth" ? clinicToday() : undefined}
        min={key === "appointmentDate" ? clinicToday() : undefined}
      />
      {errorFor(key)}
    </div>
  );
  return (
    <div className="patient-shell">
      <h1>{t("booking.title")}</h1>
      {message && (
        <div role="alert" className="patient-alert">
          <p>{t(message)}</p>
          {message === "booking.doctorError" && (
            <button
              type="button"
              onClick={() => {
                setMessage("");
                setRetryDoctors((x) => x + 1);
              }}
            >
              {t("booking.retry")}
            </button>
          )}
        </div>
      )}
      <form
        className="patient-form"
        onSubmit={submit}
        noValidate
        aria-busy={pending}
      >
        <fieldset className="patient-form-fields" disabled={pending}>
          {field("firstName")}
          {field("lastName")}
          {field("phone", "tel")}
          {field("dateOfBirth", "date")}
          <div className="patient-field">
            <label htmlFor="doctorId">{t("booking.doctorId")}</label>
            <select
              id="doctorId"
              name="doctorId"
              value={form.doctorId}
              onChange={change}
              required
              {...accessibility("doctorId")}
            >
              <option value="">{t("booking.chooseDoctor")}</option>
              {doctors.map((d) => (
                <option value={d.id} key={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            {errorFor("doctorId")}
          </div>
          {field("appointmentDate", "date")}
          <div className="patient-field">
            <label htmlFor="slot">{t("booking.slot")}</label>
            <select
              id="slot"
              name="slot"
              value={form.slot}
              onChange={change}
              disabled={slotState !== "ready" || !slots.length}
              required
              {...accessibility("slot")}
            >
              <option value="">{t("booking.chooseSlot")}</option>
              {slots.map((s) => (
                <option key={s} value={s}>
                  {formatPatientTime(s, i18n.language)}
                </option>
              ))}
            </select>
            {errorFor("slot")}
            {slotState === "loading" && (
              <p role="status">{t("common.loading")}</p>
            )}
            {slotState === "ready" && !slots.length && (
              <p role="status">{t("booking.noSlots")}</p>
            )}
            {slotState === "error" && (
              <div role="alert">
                <p>{t("booking.slotError")}</p>
                <button type="button" onClick={reloadSlots}>
                  {t("booking.retry")}
                </button>
              </div>
            )}
          </div>
          <div className="patient-field patient-full">
            <label htmlFor="reason">{t("booking.reason")}</label>
            <textarea
              id="reason"
              name="reason"
              maxLength={500}
              value={form.reason}
              onChange={change}
            />
          </div>
        </fieldset>
        <button
          className="patient-button patient-full"
          disabled={pending}
          type="submit"
        >
          {pending ? t("booking.submitting") : t("booking.submit")}
        </button>
      </form>
    </div>
  );
}
