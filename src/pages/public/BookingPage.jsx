import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Icon from "../../components/Icon";
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

const initial = {
  firstName: "",
  lastName: "",
  phone: "",
  dateOfBirth: "",
  gender: "",
  doctorId: "",
  appointmentDate: "",
  slot: "",
};

const validName = (value) => /^[\p{L}\p{M} .'-]+$/u.test(value.trim());

/* Only validate the appointment part (step 1). */
function validateAppointment(form) {
  const errors = {};
  if (!form.doctorId) errors.doctorId = "booking.required";
  if (
    !isValidDate(form.appointmentDate) ||
    form.appointmentDate < clinicToday()
  )
    errors.appointmentDate = "booking.invalidDate";
  if (!form.slot) errors.slot = "booking.required";
  return errors;
}

/* Only validate patient details (step 2). */
function validatePatient(form) {
  const errors = {};
  for (const key of ["firstName", "lastName"]) {
    if (!form[key].trim()) errors[key] = "booking.required";
    else if (!validName(form[key]) || form[key].trim().length > 100)
      errors[key] = "booking.invalidName";
  }
  if (`${form.firstName.trim()} ${form.lastName.trim()}`.trim().length > 100) {
    errors.lastName = "booking.invalidName";
  }
  if (!isSriLankanPhone(form.phone)) errors.phone = "booking.invalidPhone";
  if (!isValidDate(form.dateOfBirth) || form.dateOfBirth > clinicToday())
    errors.dateOfBirth = "booking.invalidDob";
  if (!["MALE", "FEMALE", "OTHER"].includes(form.gender))
    errors.gender = "booking.required";
  return errors;
}

/* Full validation – used on final submit. */
function validateBooking(form) {
  return { ...validateAppointment(form), ...validatePatient(form) };
}

const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";
const inputClass =
  "w-full rounded-lg border bg-white/90 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";
const inputOk = "border-slate-300 focus:border-blue-500 focus:ring-blue-500/30";
const inputBad = "border-red-400 focus:border-red-500 focus:ring-red-500/30";
const isBeforeOrAtClosing = (slot) => {
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(slot);
  return Boolean(match) && Number(match[1]) * 60 + Number(match[2]) <= 20 * 60;
};

export default function BookingPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const preselectedDoctor = useRef(searchParams.get("doctor"));

  const [form, setForm] = useState(initial);
  const [doctors, setDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
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

  const [step, setStep] = useState("appointment");
  const detailsHeadingRef = useRef(null);
  const visibleSlots = slots.filter(isBeforeOrAtClosing);

  useEffect(() => {
    const controller = new AbortController();
    getPublicDoctors(controller.signal)
      .then((ds) => {
        if (controller.signal.aborted) return;
        setDoctors(ds);
        setDoctorsLoading(false);
        setForm((f) => {
          if (f.doctorId) return f;
          if (ds.length === 1) return { ...f, doctorId: ds[0].id };
          const wanted = preselectedDoctor.current;
          return wanted && ds.some((d) => d.id === wanted)
            ? { ...f, doctorId: wanted }
            : f;
        });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setDoctorsLoading(false);
        setMessage("booking.doctorError");
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

  useEffect(() => {
    if (step === "details") detailsHeadingRef.current?.focus();
  }, [step]);

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
    if (name === "phone" && !/^\+?[0-9\s()-]*$/.test(value)) {
      setErrors((previous) => ({ ...previous, phone: "booking.invalidPhone" }));
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

  const pickSlot = (slot) => {
    setForm((f) => ({ ...f, slot }));
    setErrors((x) => ({ ...x, slot: undefined }));
    setMessage("");
  };

  const reloadSlots = () => {
    setSlots([]);
    setSlotState("loading");
    setRetrySlots((x) => x + 1);
  };

  const continueToDetails = () => {
    const found = validateAppointment(form);
    setErrors(found);
    if (Object.keys(found).length) {
      const firstKey = Object.keys(found)[0];
      document.getElementById(firstKey)?.focus();
      return;
    }
    setStep("details");
  };

  const backToAppointment = () => {
    setStep("appointment");
  };

  const submit = async (event) => {
    event.preventDefault();
    if (submitting.current) return;

    if (step !== "details") {
      continueToDetails();
      return;
    }

    const found = validateBooking(form);
    if (form.slot && !visibleSlots.includes(form.slot))
      found.slot = "booking.required";
    setErrors(found);
    if (Object.keys(found).length) {
      const appointmentKeys = ["doctorId", "appointmentDate", "slot"];
      if (Object.keys(found).some((k) => appointmentKeys.includes(k))) {
        setStep("appointment");
        setTimeout(() => {
          const firstKey = Object.keys(found)[0];
          document.getElementById(firstKey)?.focus();
        }, 0);
        return;
      }
      const firstKey = Object.keys(found)[0];
      document.getElementById(firstKey)?.focus();
      return;
    }

    submitting.current = true;
    setPending(true);
    setMessage("");
    try {
      const appointmentDateTime = `${form.appointmentDate}T${form.slot.length === 5 ? `${form.slot}:00` : form.slot
        }`;
      const result = await submitPublicBooking({
        fullName: `${form.firstName.trim()} ${form.lastName.trim()}`,
        contactNo: normalizeSriLankanPhone(form.phone),
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        doctorId: Number(form.doctorId),
        appointmentDateTime,
      });
      const bookedAt = result.appointmentDateTime ?? result.dateTime;
      const bookedAtMatch =
        typeof bookedAt === "string"
          ? bookedAt.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}(?::\d{2})?)/)
          : null;
      navigate("/appointments/confirmed", {
        state: {
          documentId: bookingDocumentId,
          booking: {
            doctor: doctors.find((d) => d.id === form.doctorId)?.name || "",
            date: result.date ?? bookedAtMatch?.[1] ?? form.appointmentDate,
            time: result.time ?? bookedAtMatch?.[2] ?? form.slot,
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
        setStep("appointment");
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
      <small
        id={`${key}-error`}
        role="alert"
        className="mt-1 block text-xs font-medium text-red-600"
      >
        {t(errors[key])}
      </small>
    );

  const accessibility = (key) => ({
    "aria-invalid": Boolean(errors[key]),
    "aria-describedby": errors[key] ? `${key}-error` : undefined,
  });

  const field = (key, type = "text", extra = {}) => (
    <div key={key}>
      <label htmlFor={key} className={labelClass}>
        {t(`booking.${key}`)}
      </label>
      <input
        id={key}
        name={key}
        type={type}
        value={form[key]}
        onChange={change}
        required
        className={`${inputClass} ${errors[key] ? inputBad : inputOk}`}
        {...accessibility(key)}
        maxLength={type === "text" ? 100 : undefined}
        max={key === "dateOfBirth" ? clinicToday() : undefined}
        min={key === "appointmentDate" ? clinicToday() : undefined}
        {...extra}
      />
      {errorFor(key)}
    </div>
  );

  const chosenDoctor = doctors.find((d) => d.id === form.doctorId);
  const summaryReady = chosenDoctor && form.appointmentDate && form.slot;

  return (
    <div className="relative min-h-screen font-sans text-slate-800 selection:bg-blue-600 selection:text-white bg-slate-900">

      {/* Ambient Gradient Overlay */}
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-teal-950/90 backdrop-blur-[2px]" />

      <div className="relative z-10 flex min-h-screen flex-col">

        {/* Main Content Card */}
        <main className="mx-auto my-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="rounded-3xl border border-white/20 bg-white/95 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
            <div className="mb-5 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => navigate("/home")}
                disabled={pending}
                className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Icon name="arrow-left" className="h-4 w-4" />
                {t("booking.returnHome", "Return home")}
              </button>
              <button
                type="button"
                onClick={() => navigate("/home")}
                disabled={pending}
                className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t("common.cancel", "Cancel")}
              </button>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              {t("booking.title")}
            </h1>
            <p className="mt-1.5 text-sm text-slate-600">
              {t(
                "booking.subtitle",
                "Pick a doctor and a time, then tell us who the visit is for.",
              )}
            </p>

            {/* Progress indicator */}
            <ol
              className="mt-6 flex items-center gap-3 text-xs font-semibold"
              aria-label={t("booking.progress", "Booking progress")}
            >
              <li className="flex items-center gap-2" aria-current={step === "appointment" ? "step" : undefined}>
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full ${step === "appointment"
                      ? "bg-blue-700 text-white"
                      : "bg-emerald-600 text-white"
                    }`}
                >
                  {step === "appointment" ? "1" : "✓"}
                </span>
                <span className={step === "appointment" ? "text-slate-900" : "text-slate-500"}>
                  {t("booking.stepAppointment", "Appointment")}
                </span>
              </li>
              <li aria-hidden="true" className="h-px w-6 bg-slate-300" />
              <li className="flex items-center gap-2" aria-current={step === "details" ? "step" : undefined}>
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full ${step === "details"
                      ? "bg-blue-700 text-white"
                      : "bg-slate-200 text-slate-500"
                    }`}
                >
                  2
                </span>
                <span className={step === "details" ? "text-slate-900" : "text-slate-500"}>
                  {t("booking.stepDetails", "Patient details")}
                </span>
              </li>
            </ol>

            {message && (
              <div
                role="alert"
                className="mt-6 flex flex-col items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center"
              >
                <p className="font-medium">{t(message)}</p>
                {message === "booking.doctorError" && (
                  <button
                    type="button"
                    onClick={() => {
                      setMessage("");
                      setDoctorsLoading(true);
                      setRetryDoctors((x) => x + 1);
                    }}
                    className="shrink-0 rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-700"
                  >
                    {t("booking.retry")}
                  </button>
                )}
              </div>
            )}

            <form onSubmit={submit} noValidate aria-busy={pending} className="mt-6 space-y-6">
              <fieldset disabled={pending} className="space-y-6">
                {/* Step 1: appointment */}
                {step === "appointment" && (
                  <section
                    aria-labelledby="appt-heading"
                    className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-5 sm:p-6"
                  >
                    <h2 id="appt-heading" className="text-base font-bold text-slate-900">
                      {t("booking.appointmentTitle", "Appointment")}
                    </h2>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="doctorId" className={labelClass}>
                          {t("booking.doctorId")}
                        </label>
                        <select
                          id="doctorId"
                          name="doctorId"
                          value={form.doctorId}
                          onChange={change}
                          required
                          disabled={doctorsLoading}
                          className={`${inputClass} ${errors.doctorId ? inputBad : inputOk}`}
                          {...accessibility("doctorId")}
                        >
                          <option value="">
                            {doctorsLoading ? t("common.loading") : t("booking.chooseDoctor")}
                          </option>
                          {doctors.map((d) => (
                            <option value={d.id} key={d.id}>
                              {d.specialty ? `${d.name} · ${d.specialty}` : d.name}
                            </option>
                          ))}
                        </select>
                        {errorFor("doctorId")}
                      </div>

                      {field("appointmentDate", "date")}
                    </div>

                    {/* Slots */}
                    <div>
                      <span id="slot-label" className={labelClass}>
                        {t("booking.slot")}
                      </span>

                      {slotState === "idle" && (
                        <p className="rounded-lg bg-white border border-slate-200 px-3 py-3 text-sm text-slate-500">
                          {t("booking.slotHint", "Choose a doctor and a date to see free times.")}
                        </p>
                      )}

                      {slotState === "loading" && (
                        <div
                          role="status"
                          aria-label={t("common.loading")}
                          className="flex flex-wrap gap-2 motion-safe:animate-pulse"
                        >
                          {[1, 2, 3, 4, 5, 6].map((n) => (
                            <div key={n} className="h-9 w-20 rounded-lg bg-slate-200" />
                          ))}
                        </div>
                      )}

                      {slotState === "ready" && !visibleSlots.length && (
                        <p role="status" className="rounded-lg bg-amber-50 px-3 py-3 text-sm text-amber-800">
                          {t("booking.noSlots")}
                        </p>
                      )}

                      {slotState === "ready" && visibleSlots.length > 0 && (
                        <div
                          id="slot"
                          role="radiogroup"
                          aria-labelledby="slot-label"
                          tabIndex={-1}
                          {...accessibility("slot")}
                          className="flex flex-wrap gap-2 focus:outline-none"
                        >
                          {visibleSlots.map((s) => {
                            const selected = form.slot === s;
                            return (
                              <button
                                key={s}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                onClick={() => pickSlot(s)}
                                className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${selected
                                    ? "border-blue-700 bg-blue-700 text-white shadow-sm"
                                    : "border-slate-300 bg-white text-slate-700 hover:border-blue-400"
                                  }`}
                              >
                                {formatPatientTime(s, i18n.language)}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {slotState === "error" && (
                        <div
                          role="alert"
                          className="flex flex-col items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 sm:flex-row sm:items-center"
                        >
                          <p className="text-sm font-medium text-red-800">
                            {t("booking.slotError")}
                          </p>
                          <button
                            type="button"
                            onClick={reloadSlots}
                            className="shrink-0 rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-700"
                          >
                            {t("booking.retry")}
                          </button>
                        </div>
                      )}

                      {errorFor("slot")}
                    </div>

                    {/* Continue action */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={continueToDetails}
                        className="w-full rounded-xl bg-blue-700 px-6 py-3 text-base font-bold text-white shadow-sm transition hover:bg-blue-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-blue-400"
                      >
                        {t("booking.continueToDetails", "Continue to patient details")}
                      </button>
                      {summaryReady && (
                        <p className="mt-2 flex items-start gap-2 text-xs text-emerald-700">
                          <span aria-hidden="true" className="mt-0.5">✓</span>
                          <span>
                            {chosenDoctor.name} · {form.appointmentDate} ·{" "}
                            {formatPatientTime(form.slot, i18n.language)}
                          </span>
                        </p>
                      )}
                    </div>
                  </section>
                )}

                {/* Appointment summary (step 2) */}
                {step === "details" && summaryReady && (
                  <section
                    aria-label={t("booking.appointmentSummary", "Your appointment")}
                    className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 sm:p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                          {t("booking.yourAppointment", "Your appointment")}
                        </p>
                        <p className="mt-1.5 text-base font-bold text-emerald-950">
                          {chosenDoctor.name}
                          {chosenDoctor.specialty ? (
                            <span className="ml-1 text-sm font-normal text-emerald-800">
                              · {chosenDoctor.specialty}
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-1 text-sm text-emerald-900">
                          {form.appointmentDate} · {formatPatientTime(form.slot, i18n.language)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={backToAppointment}
                        className="shrink-0 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                      >
                        {t("booking.change", "Change")}
                      </button>
                    </div>
                  </section>
                )}

                {/* Step 2: patient details */}
                {step === "details" && (
                  <section
                    aria-labelledby="details-heading"
                    className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-5 sm:p-6"
                  >
                    <h2
                      id="details-heading"
                      ref={detailsHeadingRef}
                      tabIndex={-1}
                      className="text-base font-bold text-slate-900 focus:outline-none"
                    >
                      {t("booking.detailsTitle", "Patient details")}
                    </h2>
                    <p className="text-sm text-slate-500">
                      {t(
                        "booking.detailsHint",
                        "Tell us who this appointment is for. We'll use this to register the visit.",
                      )}
                    </p>

                    <div className="grid gap-4 sm:grid-cols-2">
                      {field("firstName", "text", { autoComplete: "given-name" })}
                      {field("lastName", "text", { autoComplete: "family-name" })}
                      {field("phone", "tel", {
                        autoComplete: "tel",
                        inputMode: "tel",
                        placeholder: "07X XXX XXXX",
                      })}
                      {field("dateOfBirth", "date", { autoComplete: "bday" })}
                      <div className="sm:col-span-2">
                        <label htmlFor="gender" className={labelClass}>
                          {t("booking.gender", "Gender")}
                        </label>
                        <select
                          id="gender"
                          name="gender"
                          value={form.gender}
                          onChange={change}
                          required
                          className={`${inputClass} ${errors.gender ? inputBad : inputOk}`}
                          {...accessibility("gender")}
                        >
                          <option value="">{t("booking.chooseGender", "Choose gender")}</option>
                          <option value="MALE">{t("booking.genderMale", "Male")}</option>
                          <option value="FEMALE">{t("booking.genderFemale", "Female")}</option>
                          <option value="OTHER">{t("booking.genderOther", "Other")}</option>
                        </select>
                        {errorFor("gender")}
                      </div>
                    </div>
                  </section>
                )}
              </fieldset>

              {/* Submit / back actions */}
              {step === "details" && (
                <div className="space-y-3">
                  <button
                    type="submit"
                    disabled={pending}
                    className="w-full rounded-xl bg-blue-700 px-6 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-blue-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-blue-400"
                  >
                    {pending ? t("booking.submitting") : t("booking.submit")}
                  </button>
                  <button
                    type="button"
                    onClick={backToAppointment}
                    disabled={pending}
                    className="w-full rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {t("booking.backToAppointment", "Back to appointment")}
                  </button>
                </div>
              )}
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
