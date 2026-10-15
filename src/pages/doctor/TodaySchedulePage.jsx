import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import Button from "../../components/Button";
import DatePicker from "../../components/DatePicker";
import ErrorMessage from "../../components/ErrorMessage";
import LoadingSpinner from "../../components/LoadingSpinner";
import StatusBadge from "../../components/StatusBadge";
import Table from "../../components/Table";
import {
  fetchQueue,
  selectQueueRecords,
  selectQueueStatus,
} from "../../features/queue/queueSlice";
import useQueuePolling from "../../hooks/useQueuePolling";
import { formatDisplayDate, toLocalDateString } from "../../utils/dateUtils";

/** `09:00:00` → `09:00`; echoes anything unexpected. */
const formatTimeSlot = (timeSlot) => {
  const value = String(timeSlot ?? "");
  return /^\d{2}:\d{2}/.test(value) ? value.slice(0, 5) : value || "—";
};

/**
 * DOC — Doctor's Today Schedule / Consultation Queue.
 *
 * Shows the signed-in doctor's queue in server-authoritative order
 * (`queuePosition` from the backend), filtered to the locally selected
 * calendar date, refreshing every ~2s.
 *
 * The queue itself is read-only here: "Start Consultation" opens DOC-04,
 * where the whole consultation workflow — clinical notes, prescriptions
 * and completion — takes place. Admin-only actions such as Check In /
 * No Show are deliberately absent, and the queue never changes
 * optimistically: it is re-fetched on every tick.
 */
const TodaySchedulePage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const records = useSelector(selectQueueRecords);
  const queueStatus = useSelector(selectQueueStatus);

  const [selectedDate, setSelectedDate] = useState(() => toLocalDateString());

  const loading = queueStatus === "loading";
  const firstLoad = loading && records.length === 0;
  const failed = queueStatus === "failed";

  const refresh = useCallback(() => {
    dispatch(fetchQueue({ date: selectedDate }));
  }, [dispatch, selectedDate]);

  // Initial fetch and re-fetch whenever the doctor picks another date.
  useEffect(() => {
    refresh();
  }, [refresh]);

  // ~2s polling keeps the queue fresh without any manual refresh.
  useQueuePolling({ enabled: true, onTick: refresh });

  const handleDateChange = useCallback((event) => {
    setSelectedDate(event.target.value || toLocalDateString());
  }, []);

  const columns = useMemo(
    () => [
      {
        key: "queuePosition",
        header: "#",
        render: (row) => row.queuePosition ?? "—",
      },
      {
        key: "patientFullName",
        header: "Patient",
        // Guaranteed by the queue adapter; "—" only if the backend omits both
        // the name and the patient id.
        render: (row) => row.patientFullName ?? "—",
      },
      {
        key: "timeSlot",
        header: "Time",
        render: (row) => formatTimeSlot(row.timeSlot),
      },
      {
        key: "status",
        header: "Status",
        render: (row) => <StatusBadge status={row.status} />,
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) => {
          if (row.status !== "SCHEDULED") return "—";
          return (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                navigate(`/doctor/consultation/${row.appointmentId}`)
              }
            >
              Start Consultation
            </Button>
          );
        },
      },
    ],
    [navigate],
  );

  return (
    <div className="mx-auto max-w-6xl py-4 sm:py-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">
            Today’s schedule
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Review appointments for the selected date and open the consultation
            screen to treat patients and complete appointments.
          </p>
          <p className="mt-1 text-sm font-medium text-neutral-800">
            {formatDisplayDate(selectedDate)}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <DatePicker
            id="schedule-date"
            name="scheduleDate"
            label="Date"
            value={selectedDate}
            onChange={handleDateChange}
            className="min-w-40"
          />
          <Button
            variant="outline"
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-2"
          >
            Refresh
          </Button>
        </div>
      </header>

      <section aria-labelledby="schedule-queue-heading">
        <h2
          id="schedule-queue-heading"
          className="mb-3 text-lg font-semibold text-neutral-900"
        >
          Appointment queue
        </h2>

        {firstLoad ? (
          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <LoadingSpinner label="Loading appointment queue" />
          </div>
        ) : failed ? (
          <div className="space-y-3">
            <ErrorMessage
              title="Unable to load the schedule"
              message="Please check your connection and try again."
            />
            <Button onClick={refresh} loading={loading}>
              Retry
            </Button>
          </div>
        ) : (
          <Table
            columns={columns}
            data={records}
            getRowKey={(row) => row.appointmentId}
            emptyTitle="No appointments scheduled for the selected date."
            emptyMessage="Pick another date or refresh to check again."
            label="Appointment queue for the selected date"
          />
        )}
      </section>
    </div>
  );
};

export default TodaySchedulePage;
