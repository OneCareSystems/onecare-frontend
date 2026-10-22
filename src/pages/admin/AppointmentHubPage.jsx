import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Select from "../../components/Select";
import Table from "../../components/Table";
import ErrorMessage from "../../components/ErrorMessage";
import ConfirmDialog from "../../components/ConfirmDialog";
import AvailableSlotPicker from "../../components/admin/AvailableSlotPicker";
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
} from "../../services/adminWorkflowService";
import {
  APPOINTMENT_STATUSES,
  bookingError,
  dateRangeError,
  statusLabel,
  workflowError,
} from "../../utils/adminWorkflows";
import { toLocalDateString } from "../../utils/dateUtils";

export default function AppointmentHubPage() {
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
      subtitle="View and manage appointments"
    >
      <Link
        to="/admin/book-appointment"
        className="inline-block rounded-md bg-primary-800 px-4 py-2 text-sm text-white"
      >
        Book Appointment
      </Link>
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
        <div className="flex flex-wrap gap-3">
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
            variant="outline"
            onClick={() => setRefresh((key) => key + 1)}
            disabled={records.loading}
          >
            Refresh appointments
          </Button>
        </div>
      </WorkflowCard>
      <ErrorMessage
        message={
          error ||
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
                    <div className="flex gap-2">
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
      {action?.type === "reschedule" && (
        <WorkflowCard
          title={`Reschedule appointment ${action.appointment.appointmentId}`}
        >
          <fieldset disabled={pending} className="space-y-3">
            <Input
              name="reschedule-date"
              label="New appointment date"
              type="date"
              min={toLocalDateString()}
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
            <div className="flex gap-3">
              <Button onClick={requestConfirmation}>Review reschedule</Button>
              <Button variant="outline" onClick={() => setAction(null)}>
                Close reschedule
              </Button>
            </div>
          </fieldset>
        </WorkflowCard>
      )}
      <ConfirmDialog
        isOpen={confirm}
        title={
          action?.type === "cancel"
            ? "Cancel appointment?"
            : "Confirm reschedule"
        }
        message={
          action?.type === "cancel"
            ? `Cancel appointment ${action?.appointment.appointmentId}?`
            : `Move appointment ${action?.appointment.appointmentId} to ${date} at ${slot}?`
        }
        confirmLabel={
          action?.type === "cancel"
            ? "Confirm cancellation"
            : "Confirm reschedule"
        }
        loading={pending}
        onClose={() => {
          if (!pending) {
            setConfirm(false);
            if (action?.type === "cancel") setAction(null);
          }
        }}
        onConfirm={execute}
      />
    </WorkflowPage>
  );
}
