import { useRef, useState } from "react";
import Button from "../Button";
import Select from "../Select";
import Table from "../Table";
import ConfirmDialog from "../ConfirmDialog";
import ErrorMessage from "../ErrorMessage";
import { WorkflowCard, WorkflowPage, WorkflowStatus } from "./WorkflowUI";
import useAdminQueue from "../../hooks/useAdminQueue";
import { updateAdminQueue } from "../../services/adminWorkflowService";
import { statusLabel, workflowError } from "../../utils/adminWorkflows";

export default function AdminQueuePanel() {
  const [pending, setPending] = useState(false),
    [selected, setSelected] = useState(null),
    [status, setStatus] = useState(""),
    [doctor, setDoctor] = useState("");
  const [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const queue = useAdminQueue({ paused: pending });
  const lock = useRef(false);
  const update = async (row, target) => {
    if (lock.current || row.status !== "SCHEDULED") return;
    lock.current = true;
    setPending(true);
    setError("");
    setMessage("");
    try {
      const result = await updateAdminQueue(row.appointmentId, target);
      setMessage(
        `Appointment ${result.appointmentId}: ${statusLabel(result.status)}.`,
      );
    } catch (failure) {
      setError(workflowError(failure, "update the queue"));
    } finally {
      lock.current = false;
      setPending(false);
      setSelected(null);
      queue.refresh();
    }
  };
  const rows = queue.rows.filter(
    (row) =>
      (!status || row.status === status) &&
      (!doctor || String(row.doctorId) === doctor),
  );
  return (
    <WorkflowPage
      title="Queue Management"
      subtitle="Manage today’s patient queue and check-ins"
    >
      <div className="flex flex-wrap items-end gap-3">
        <Select
          name="queue-status"
          label="Queue status"
          placeholder="All statuses"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          options={["SCHEDULED", "ARRIVED", "COMPLETED", "NO_SHOW"].map(
            (value) => ({
              value,
              label: `${statusLabel(value)} (${queue.rows.filter((r) => r.status === value).length})`,
            }),
          )}
        />
        <Select
          name="queue-doctor"
          label="Queue doctor"
          placeholder="All doctors"
          value={doctor}
          onChange={(event) => setDoctor(event.target.value)}
          options={[...new Set(queue.rows.map((r) => String(r.doctorId)))].map(
            (value) => ({ value, label: `Doctor ${value}` }),
          )}
        />
        <Button variant="outline" disabled={pending} onClick={queue.refresh}>
          Refresh queue
        </Button>
      </div>
      <ErrorMessage
        message={
          error ||
          (queue.error ? workflowError(queue.error, "refresh the queue") : "")
        }
      />
      {message && <p role="status">{message}</p>}
      {queue.loading && <p role="status">Loading queue…</p>}
      <WorkflowCard>
        {(queue.rows.length > 0 || (!queue.loading && !queue.error)) && (
          <Table
            className="[&_th]:px-2 [&_td]:px-2"
            label="Today’s queue"
            data={rows}
            getRowKey={(row) => row.appointmentId}
            emptyTitle="No appointments in this queue"
            columns={[
              { key: "queuePosition", header: "Position" },
              { key: "appointmentId", header: "Appointment ID" },
              { key: "patientId", header: "Patient ID" },
              { key: "patientFullName", header: "Patient Name" },
              { key: "doctorId", header: "Doctor ID" },
              { key: "appointmentDate", header: "Date" },
              { key: "timeSlot", header: "Appointment Time" },
              {
                key: "status",
                header: "Status",
                render: (r) => <WorkflowStatus status={r.status} />,
              },
              {
                key: "action",
                header: "Action",
                render: (r) =>
                  r.status === "SCHEDULED" ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={pending}
                        onClick={() => update(r, "ARRIVED")}
                        aria-label={`Check in appointment ${r.appointmentId}`}
                      >
                        Check In
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => setSelected(r)}
                        aria-label={`Mark appointment ${r.appointmentId} no-show`}
                      >
                        No-show
                      </Button>
                    </div>
                  ) : (
                    "—"
                  ),
              },
            ]}
          />
        )}
        <p className="text-xs text-neutral-600">
          Position is today’s server queue index, not a permanent ticket.
          No-show records have no queue position. Late arrival after No-show is
          not supported.
        </p>
      </WorkflowCard>
      <ConfirmDialog
        isOpen={Boolean(selected)}
        title="Mark as no-show?"
        message={`Mark appointment ${selected?.appointmentId} as No-show? This cannot be changed back to Arrived.`}
        confirmLabel="Confirm no-show"
        loading={pending}
        onClose={() => {
          if (!pending) setSelected(null);
        }}
        onConfirm={() => update(selected, "NO_SHOW")}
      />
    </WorkflowPage>
  );
}
