import { useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Select from "../../components/Select";
import Table from "../../components/Table";
import ErrorMessage from "../../components/ErrorMessage";
import ConfirmDialog from "../../components/ConfirmDialog";
import Modal from "../../components/Modal";
import AvailableSlotPicker from "../../components/admin/AvailableSlotPicker";
import BookAppointmentModal from "../../components/admin/BookAppointmentModal";
import {
  WorkflowPage,
  WorkflowCard,
  WorkflowStatus,
} from "../../components/admin/WorkflowUI";
import useWorkflowResource from "../../hooks/useWorkflowResource";
import {
  cancelAppointment,
  listAdminAppointments,
  rescheduleAppointment,
  updateAdminQueue,
} from "../../services/adminWorkflowService";
import {
  APPOINTMENT_STATUSES,
  bookingError,
  dateRangeError,
  statusLabel,
  workflowError,
} from "../../utils/adminWorkflows";
import { clinicToday } from "../../utils/clinicTime";

export default function AppointmentHubPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const bookingButton = useRef(null);
  const bookingOpen = searchParams.get("booking") === "new";
  const setBookingOpen = (open) => {
    const next = new URLSearchParams(location.search);
    if (open) next.set("booking", "new");
    else next.delete("booking");
    navigate(
      {
        pathname: location.pathname,
        search: next.toString() ? `?${next}` : "",
        hash: location.hash,
      },
      { replace: true, state: location.state },
    );
  };
  const [draft, setDraft] = useState({ from: "", to: "", search: "" }),
    [filters, setFilters] = useState({});
  const [status, setStatus] = useState(""),
    [doctor, setDoctor] = useState("");
  const [refresh, setRefresh] = useState(0),
    [slotRefresh, setSlotRefresh] = useState(0);
  const records = useWorkflowResource(listAdminAppointments, filters, refresh);
  const [action, setAction] = useState(null),
    [date, setDate] = useState(""),
    [slot, setSlot] = useState("");
  const [confirm, setConfirm] = useState(false),
    [pending, setPending] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const lock = useRef(false);
  const rescheduleOpen = action?.type === "reschedule";
  const all = records.data ?? [];
  const rows = all.filter(
    (a) =>
      (!status || a.status === status) &&
      (!doctor || String(a.doctorId) === doctor),
  );
  const start = (type, appointment) => {
    setAction({ type, appointment });
    setDate(appointment.appointmentDate);
    setSlot("");
    setError("");
    setMessage("");
    setConfirm(type === "cancel");
  };
  const arrive = async (appointment) => {
    if (lock.current || appointment.status !== "SCHEDULED") return;
    lock.current = true;
    setPending(true);
    setError("");
    setMessage("");
    try {
      const result = await updateAdminQueue(
        appointment.appointmentId,
        "ARRIVED",
      );
      setMessage(
        `Appointment ${result.appointmentId}: ${statusLabel(result.status)}.`,
      );
    } catch (failure) {
      setError(workflowError(failure, "update the queue"));
    } finally {
      lock.current = false;
      setPending(false);
      setRefresh((key) => key + 1);
    }
  };
  const closeReschedule = () => {
    if (pending) return;
    setAction(null);
    setConfirm(false);
    setError("");
  };
  const requestConfirmation = () => {
    const validation = bookingError({
      patientId: action.appointment.patientId,
      doctorId: action.appointment.doctorId,
      date,
      slot,
    });
    if (validation) {
      setError(validation);
      return;
    }
    setError("");
    setConfirm(true);
  };
  const execute = async () => {
    if (lock.current || !action || action.appointment.status !== "SCHEDULED")
      return;
    if (
      records.data?.find(
        (row) =>
          String(row.appointmentId) ===
          String(action.appointment.appointmentId),
      )?.status !== "SCHEDULED"
    ) {
      setError(
        "This appointment has changed. Refresh and select a Scheduled appointment.",
      );
      setConfirm(false);
      setAction(null);
      return;
    }
    lock.current = true;
    setPending(true);
    setError("");
    try {
      const result =
        action.type === "cancel"
          ? await cancelAppointment(action.appointment.appointmentId)
          : await rescheduleAppointment(
              action.appointment.appointmentId,
              date,
              slot,
            );
      setMessage(
        `Appointment ${result.appointmentId}: ${result.appointmentDate} ${result.timeSlot} — ${statusLabel(result.status)}.`,
      );
      setAction(null);
      setRefresh((key) => key + 1);
    } catch (failure) {
      setError(workflowError(failure, "update the appointment"));
      setRefresh((key) => key + 1);
      if ([409, 422].includes(failure.status)) {
        setSlot("");
        setSlotRefresh((key) => key + 1);
      }
    } finally {
      lock.current = false;
      setPending(false);
      setConfirm(false);
    }
  };
  const changeFilter = (event) =>
    setDraft((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  return (
    <WorkflowPage
      title="Appointment Hub"
      subtitle="Manage patient appointments"
    >
      <div
        className="space-y-4"
        aria-hidden={bookingOpen || rescheduleOpen || undefined}
        inert={bookingOpen || rescheduleOpen || undefined}
      >
        <Button ref={bookingButton} onClick={() => setBookingOpen(true)}>
          + Book Appointment
        </Button>
        <WorkflowCard title="Find appointments">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const validation = dateRangeError(draft.from, draft.to);
              setError(validation);
              if (!validation) setFilters({ ...draft });
            }}
            className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            <Input
              name="from"
              label="From date"
              type="date"
              value={draft.from}
              onChange={changeFilter}
            />
            <Input
              name="to"
              label="To date"
              type="date"
              value={draft.to}
              onChange={changeFilter}
            />
            <Input
              name="search"
              label="Patient name or stored phone"
              value={draft.search}
              onChange={changeFilter}
            />
            <Button type="submit">Apply filters</Button>
          </form>
          <div className="flex flex-wrap items-end gap-3">
            <Select
              name="hub-status"
              label="Status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              placeholder="All statuses"
              options={APPOINTMENT_STATUSES.map((value) => ({
                value,
                label: statusLabel(value),
              }))}
            />
            <Select
              name="hub-doctor"
              label="Doctor"
              value={doctor}
              onChange={(event) => setDoctor(event.target.value)}
              placeholder="All doctors"
              options={[...new Set(all.map((a) => String(a.doctorId)))].map(
                (value) => ({ value, label: `Doctor ${value}` }),
              )}
            />
            <Button
              className="h-[38px] shrink-0"
              onClick={() => setRefresh((key) => key + 1)}
              disabled={records.loading}
            >
              Refresh appointments
            </Button>
          </div>
        </WorkflowCard>
        <ErrorMessage
          message={
            (!rescheduleOpen && error) ||
            (records.error
              ? workflowError(records.error, "load appointments")
              : "")
          }
        />
        {message && <p role="status">{message}</p>}
        {records.loading && <p role="status">Loading appointments…</p>}
        <WorkflowCard>
          {records.data && (
            <Table
              className="[&_th]:px-2 [&_td]:px-2"
              label="Appointments"
              data={rows}
              getRowKey={(a) => a.appointmentId}
              emptyTitle="No appointments found"
              emptyMessage="Try another date range or book an appointment."
              columns={[
                { key: "appointmentId", header: "Appointment ID" },
                {
                  key: "appointmentDate",
                  header: "Date & Time",
                  render: (a) => `${a.appointmentDate} · ${a.timeSlot}`,
                },
                { key: "patientFullName", header: "Patient Name" },
                { key: "patientId", header: "Patient ID" },
                { key: "doctorId", header: "Doctor ID" },
                {
                  key: "status",
                  header: "Status",
                  render: (a) => <WorkflowStatus status={a.status} />,
                },
                {
                  key: "actions",
                  header: "Actions",
                  render: (a) =>
                    a.status === "SCHEDULED" ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          disabled={pending}
                          onClick={() => arrive(a)}
                          aria-label={`Mark appointment ${a.appointmentId} arrived`}
                        >
                          Arrived
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() => start("reschedule", a)}
                          aria-label={`Reschedule appointment ${a.appointmentId}`}
                        >
                          Reschedule
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={pending}
                          onClick={() => start("cancel", a)}
                          aria-label={`Cancel appointment ${a.appointmentId}`}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      "—"
                    ),
                },
              ]}
            />
          )}
        </WorkflowCard>
        <ConfirmDialog
          isOpen={confirm && action?.type === "cancel"}
          title="Cancel appointment?"
          message={`Cancel appointment ${action?.appointment.appointmentId}?`}
          confirmLabel="Confirm cancellation"
          loading={pending}
          onClose={() => {
            if (!pending) {
              setConfirm(false);
              setAction(null);
            }
          }}
          onConfirm={execute}
        />
      </div>
      {rescheduleOpen && (
        <Modal
          isOpen
          title={`Reschedule appointment ${action.appointment.appointmentId}`}
          onClose={closeReschedule}
          closeLabel="Close reschedule dialog"
          closeDisabled={pending}
          trapFocus
          className="max-w-lg max-h-[90dvh] overflow-y-auto"
          bodyClassName="space-y-3"
        >
          <p className="text-sm text-neutral-600">
            Patient {action.appointment.patientId} · Doctor{" "}
            {action.appointment.doctorId}
            {" · "}
            {action.appointment.appointmentDate} {action.appointment.timeSlot}
          </p>
          <ErrorMessage message={error} />
          <fieldset disabled={pending || confirm} className="space-y-3">
            <Input
              name="reschedule-date"
              label="New appointment date"
              type="date"
              min={clinicToday()}
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                setSlot("");
              }}
            />
            <AvailableSlotPicker
              doctorId={action.appointment.doctorId}
              date={date}
              value={slot}
              onChange={setSlot}
              refreshKey={slotRefresh}
              disabled={pending}
            />
          </fieldset>
          {slot && (
            <p>
              Selected slot: {date} at {slot}
            </p>
          )}
          {confirm && (
            <p>
              Move appointment {action.appointment.appointmentId} to {date} at{" "}
              {slot}?
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            {confirm ? (
              <>
                <Button onClick={execute} loading={pending}>
                  Confirm reschedule
                </Button>
                <Button
                  variant="outline"
                  disabled={pending}
                  onClick={() => setConfirm(false)}
                >
                  Back
                </Button>
              </>
            ) : (
              <Button onClick={requestConfirmation}>Review reschedule</Button>
            )}
            <Button
              variant="outline"
              disabled={pending}
              onClick={closeReschedule}
            >
              Close reschedule
            </Button>
          </div>
        </Modal>
      )}
      {bookingOpen && (
        <BookAppointmentModal
          returnFocusRef={bookingButton}
          onClose={() => setBookingOpen(false)}
          onBooked={() => setRefresh((key) => key + 1)}
        />
      )}
    </WorkflowPage>
  );
}
