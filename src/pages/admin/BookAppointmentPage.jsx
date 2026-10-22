import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import PatientSearch from "../../components/PatientSearch";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Select from "../../components/Select";
import ErrorMessage from "../../components/ErrorMessage";
import AvailableSlotPicker from "../../components/admin/AvailableSlotPicker";
import {
  WorkflowPage,
  WorkflowCard,
  WorkflowStatus,
} from "../../components/admin/WorkflowUI";
import useWorkflowResource from "../../hooks/useWorkflowResource";
import {
  bookAppointment,
  listDoctors,
} from "../../services/adminWorkflowService";
import { bookingError, workflowError } from "../../utils/adminWorkflows";
import { toLocalDateString } from "../../utils/dateUtils";

export default function BookAppointmentPage() {
  const [doctorRevision, setDoctorRevision] = useState(0);
  const doctors = useWorkflowResource(listDoctors, {}, doctorRevision);
  const [patientId, setPatientId] = useState(null),
    [doctor, setDoctor] = useState("");
  const [patientName, setPatientName] = useState("");
  const [date, setDate] = useState(""),
    [slot, setSlot] = useState(""),
    [reason, setReason] = useState("");
  const [error, setError] = useState(""),
    [saving, setSaving] = useState(false),
    [result, setResult] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0),
    [rejectedSlot, setRejectedSlot] = useState("");
  const inFlight = useRef(false);
  const doctorId =
    doctor || (doctors.data?.length === 1 ? doctors.data[0].userId : "");
  const submit = async (event) => {
    event.preventDefault();
    if (inFlight.current || result) return;
    const values = { patientId, doctorId, date, slot, reason };
    const validation = bookingError(values);
    if (validation) {
      setError(validation);
      return;
    }
    inFlight.current = true;
    setSaving(true);
    setError("");
    try {
      setResult(await bookAppointment(values));
    } catch (failure) {
      setError(workflowError(failure, "book the appointment"));
      if ([409, 422].includes(failure.status)) {
        setRejectedSlot(slot);
        setSlot("");
        setRefreshKey((key) => key + 1);
      }
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };
  return (
    <WorkflowPage
      title="Book Appointment"
      subtitle="Schedule a new appointment"
    >
      {result ? (
        <WorkflowCard title="Appointment confirmed">
          <div role="status">
            Appointment {result.appointmentId} booked for{" "}
            {result.patientFullName}.
          </div>
          <p>
            Doctor {result.doctorId} · {result.appointmentDate} ·{" "}
            {result.timeSlot}
          </p>
          <WorkflowStatus status={result.status} />
          <div className="flex gap-3">
            <Button
              onClick={() => {
                setResult(null);
                setSlot("");
                setRefreshKey((key) => key + 1);
              }}
            >
              Book another appointment
            </Button>
            <Link
              className="text-primary-800 underline"
              to="/admin/appointments"
            >
              Appointment Hub
            </Link>
          </div>
        </WorkflowCard>
      ) : (
        <>
          {patientId ? (
            <WorkflowCard title="Selected patient">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p>
                  {patientName} · Patient ID: {patientId}
                </p>
                <Button
                  variant="outline"
                  disabled={saving}
                  onClick={() => setPatientId(null)}
                >
                  Change patient
                </Button>
              </div>
            </WorkflowCard>
          ) : (
            <fieldset
              disabled={saving}
              className="min-w-0"
              aria-label="Patient selection"
            >
              <PatientSearch
                actionLabel="Select"
                onSelect={setPatientId}
                onSelectPatient={(row) => setPatientName(row.fullName)}
                selectedId={patientId}
                onSearchChange={() => setPatientId(null)}
                registerAction={
                  <Link
                    to="/admin/register-patient"
                    className="text-primary-800 underline"
                  >
                    Register Patient
                  </Link>
                }
              />
            </fieldset>
          )}
          <form
            onSubmit={submit}
            noValidate
            className="space-y-4"
            aria-busy={saving}
          >
            <ErrorMessage message={error} />
            <fieldset
              disabled={saving}
              className="grid min-w-0 items-start gap-4 lg:grid-cols-2"
            >
              <legend className="sr-only">Appointment booking</legend>
              <WorkflowCard title="Appointment details">
                <p aria-live="polite">
                  {patientId
                    ? `Selected patient ID: ${patientId}`
                    : "Select a patient from the search results above."}
                </p>
                {doctors.error && (
                  <>
                    <ErrorMessage
                      message={workflowError(doctors.error, "load doctors")}
                    />
                    <Button
                      variant="outline"
                      onClick={() => setDoctorRevision((key) => key + 1)}
                    >
                      Retry doctors
                    </Button>
                  </>
                )}
                {doctors.loading && <p role="status">Loading doctors…</p>}
                {!doctors.loading &&
                  !doctors.error &&
                  doctors.data?.length === 0 && (
                    <p role="status">No active doctors are available.</p>
                  )}
                <Select
                  name="booking-doctor"
                  label="Doctor"
                  required
                  value={doctorId}
                  onChange={(event) => {
                    setDoctor(event.target.value);
                    setSlot("");
                    setRejectedSlot("");
                  }}
                  options={(doctors.data ?? []).map((d) => ({
                    value: d.userId,
                    label: d.username,
                  }))}
                />
                <Input
                  name="booking-date"
                  label="Appointment Date"
                  type="date"
                  required
                  min={toLocalDateString()}
                  value={date}
                  onChange={(event) => {
                    setDate(event.target.value);
                    setSlot("");
                    setRejectedSlot("");
                  }}
                />
                <Input
                  name="booking-reason"
                  label="Reason for visit (optional)"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
                <p className="text-xs text-neutral-600">
                  Use the clinic workstation’s local date and time.
                </p>
              </WorkflowCard>
              <WorkflowCard title="Available Time Slots">
                <AvailableSlotPicker
                  doctorId={doctorId}
                  date={date}
                  value={slot}
                  onChange={setSlot}
                  refreshKey={refreshKey}
                  disabled={saving}
                />
                {rejectedSlot && (
                  <p>
                    Previously selected: {rejectedSlot}. Please choose another
                    available time.
                  </p>
                )}
              </WorkflowCard>
            </fieldset>
            <div className="flex justify-between gap-3">
              <Link
                to="/admin/appointments"
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm text-primary-900"
              >
                Cancel
              </Link>
              <Button
                type="submit"
                loading={saving}
                disabled={doctors.loading || Boolean(doctors.error)}
                className="bg-primary-800"
              >
                Book Appointment
              </Button>
            </div>
          </form>
        </>
      )}
    </WorkflowPage>
  );
}
