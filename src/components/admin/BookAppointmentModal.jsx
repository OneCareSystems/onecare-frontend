import { useRef, useState } from "react";
import Modal from "../Modal";
import AutocompleteCombobox from "../AutocompleteCombobox";
import Button from "../Button";
import Input from "../Input";
import ErrorMessage from "../ErrorMessage";
import AvailableSlotPicker from "./AvailableSlotPicker";
import { WorkflowStatus } from "./WorkflowUI";
import useWorkflowResource from "../../hooks/useWorkflowResource";
import usePatientOptions from "../../hooks/usePatientOptions";
import {
  bookAppointment,
  listDoctors,
} from "../../services/adminWorkflowService";
import { bookingError, workflowError } from "../../utils/adminWorkflows";
import { clinicToday } from "../../utils/clinicTime";

export default function BookAppointmentModal({
  onClose,
  onBooked,
  returnFocusRef,
}) {
  const [doctorRevision, setDoctorRevision] = useState(0);
  const doctors = useWorkflowResource(listDoctors, {}, doctorRevision);
  const [patient, setPatient] = useState(null),
    [doctor, setDoctor] = useState("");
  const [patientOpen, setPatientOpen] = useState(false);
  const [patientQuery, setPatientQuery] = useState(""),
    [page, setPage] = useState(0);
  const patients = usePatientOptions({
    open: patientOpen,
    query: patientQuery,
    page,
  });
  const [doctorQuery, setDoctorQuery] = useState("");
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
  const doctorOptions = (doctors.data ?? []).map((row) => ({
    value: row.userId,
    label: row.username,
  }));
  const submit = async (event) => {
    event.preventDefault();
    if (inFlight.current || result) return;
    const values = { patientId: patient?.value, doctorId, date, slot, reason };
    const validation = bookingError(values);
    if (validation) {
      setError(validation);
      return;
    }
    inFlight.current = true;
    setSaving(true);
    setError("");
    try {
      const booked = await bookAppointment(values);
      setResult(booked);
      onBooked(booked);
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
    <Modal
      isOpen
      title="Book Appointment"
      onClose={onClose}
      closeDisabled={saving}
      closeLabel="Close booking"
      trapFocus
      returnFocusRef={returnFocusRef}
      className="flex max-h-[calc(100dvh-2rem)] flex-col !rounded-xl !p-4 sm:!p-6"
      bodyClassName="flex min-h-0 flex-1 flex-col"
    >
      <p className="mb-4 text-sm text-primary-800">
        Schedule a new appointment
      </p>
      {result ? (
        <div className="min-h-0 space-y-4 overflow-y-auto">
          <h3 className="font-semibold text-primary-950">
            Appointment confirmed
          </h3>
          <p role="status">
            Appointment {result.appointmentId} booked for{" "}
            {result.patientFullName}.
          </p>
          <p className="text-sm">
            Doctor {result.doctorId} · {result.appointmentDate} ·{" "}
            {result.timeSlot}
          </p>
          <WorkflowStatus status={result.status} />
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setResult(null);
                setSlot("");
                setRefreshKey((key) => key + 1);
              }}
            >
              Book another appointment
            </Button>
            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={submit}
          noValidate
          aria-busy={saving}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-1 pb-4">
            <ErrorMessage message={error} />
            <AutocompleteCombobox
              label="Patient"
              required
              value={patient}
              disabled={saving}
              query={patientQuery}
              onOpenChange={setPatientOpen}
              onQueryChange={(query) => {
                setPatientQuery(query);
                setPage(0);
              }}
              options={patients.rows.map((row) => ({
                value: row.patientId,
                label: `${row.fullName} · Clinic ID: ${row.patientId}`,
                detail: row.contactNo ? `Phone: ${row.contactNo}` : "",
              }))}
              onSelect={setPatient}
              onClear={() => setPatient(null)}
              loading={patients.loading}
              error={patients.error}
              onRetry={patients.retry}
              emptyMessage="No patients found. Try another search."
              pagination={
                <div className="flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={patients.loading || page === 0}
                    onClick={() => setPage((value) => value - 1)}
                  >
                    Previous patients
                  </Button>
                  <span className="text-xs text-neutral-600">
                    Page {page + 1}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={
                      patients.loading ||
                      Boolean(patients.error) ||
                      patients.rows.length < 10
                    }
                    onClick={() => setPage((value) => value + 1)}
                  >
                    Next patients
                  </Button>
                </div>
              }
            />
            <div className="space-y-2">
              <AutocompleteCombobox
                label="Doctor"
                required
                value={doctorOptions.find(
                  (option) => String(option.value) === String(doctorId),
                )}
                options={doctorOptions.filter((option) =>
                  option.label
                    .toLocaleLowerCase()
                    .includes(doctorQuery.trim().toLocaleLowerCase()),
                )}
                query={doctorQuery}
                onQueryChange={setDoctorQuery}
                onSelect={(option) => {
                  setDoctor(option.value);
                  setSlot("");
                  setRejectedSlot("");
                }}
                disabled={saving || doctors.loading || Boolean(doctors.error)}
                loading={doctors.loading}
                emptyMessage="No active doctors match your search."
              />
              {doctors.loading && (
                <p role="status" className="text-sm">
                  Loading doctors…
                </p>
              )}
              {doctors.error && (
                <>
                  <ErrorMessage
                    message={workflowError(doctors.error, "load doctors")}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDoctorRevision((key) => key + 1)}
                  >
                    Retry doctors
                  </Button>
                </>
              )}
              {!doctors.loading &&
                !doctors.error &&
                doctors.data?.length === 0 && (
                  <p role="status" className="text-sm">
                    No active doctors are available.
                  </p>
                )}
            </div>
            <Input
              name="booking-date"
              label="Appointment Date"
              type="date"
              required
              min={clinicToday()}
              disabled={saving}
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                setSlot("");
                setRejectedSlot("");
              }}
            />
            <fieldset disabled={saving} className="min-w-0 space-y-2">
              <legend className="mb-2 text-sm font-medium text-neutral-900">
                Available Time Slots{" "}
                <span aria-hidden="true" className="text-danger-600">
                  *
                </span>
              </legend>
              <AvailableSlotPicker
                doctorId={doctorId}
                date={date}
                value={slot}
                onChange={setSlot}
                refreshKey={refreshKey}
                disabled={saving}
              />
              {rejectedSlot && (
                <p className="text-sm text-primary-900">
                  Previously selected: {rejectedSlot}. Please choose another
                  available time.
                </p>
              )}
            </fieldset>
            <Input
              name="booking-reason"
              label="Reason for visit (optional)"
              value={reason}
              disabled={saving}
              onChange={(event) => setReason(event.target.value)}
            />
            <p className="text-xs text-neutral-600">
              Appointment times use the clinic timezone: Asia/Colombo.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-primary-100 pt-3">
            <Button variant="outline" disabled={saving} onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={saving}
              disabled={doctors.loading || Boolean(doctors.error)}
            >
              Book Appointment
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
