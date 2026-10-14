import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import Button from "../../components/Button";
import DatePicker from "../../components/DatePicker";
import ErrorMessage from "../../components/ErrorMessage";
import LoadingSpinner from "../../components/LoadingSpinner";
import StatusBadge from "../../components/StatusBadge";
import Table from "../../components/Table";
import Toast from "../../components/Toast";
import {
  fetchQueue,
  selectQueueRecords,
  selectQueueStatus,
} from "../../features/queue/queueSlice";
import useQueuePolling from "../../hooks/useQueuePolling";
import { getPatients } from "../../services/patientService";
import { completeAppointment } from "../../services/queueService";
import { formatDisplayDate, toLocalDateString } from "../../utils/dateUtils";

/**
 * Shown when the appointment changed status between render and the Complete
 * request (another staff member acted on it). Both 409 (per ticket) and 400
 * (what this backend actually returns for conflicting transitions) map here.
 */
export const CONCURRENT_CHANGE_MESSAGE =
  "This appointment's status has changed. The queue has been refreshed.";

const COMPLETE_FAILED_MESSAGE =
  "Unable to complete the consultation. Please try again.";

const COMPLETED_TOAST_MESSAGE = "Consultation marked as completed.";

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
 * calendar date, refreshing every ~2s. Doctors can start a consultation
 * (DOC-04) or mark one completed — admin-only actions such as Check In /
 * No Show are deliberately absent, and the queue never changes
 * optimistically: it is re-fetched after every mutation.
 */
const TodaySchedulePage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const records = useSelector(selectQueueRecords);
  const queueStatus = useSelector(selectQueueStatus);

  const [selectedDate, setSelectedDate] = useState(() => toLocalDateString());
  const [patientNames, setPatientNames] = useState({});
  const [toast, setToast] = useState(null);
  const [completingId, setCompletingId] = useState(null);
  // Request-level duplicate-click guard: appointment ids currently PATCHing.
  const completingRef = useRef(new Set());

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

  // Patient names label rows only; a failed lookup must never break the page.
  useEffect(() => {
    let cancelled = false;
    getPatients()
      .then((patients) => {
        if (cancelled) return;
        setPatientNames(
          Object.fromEntries(
            patients.map((patient) => [patient.id, patient.name]),
          ),
        );
      })
      .catch(() => {
        /* rows fall back to "Patient <id>" labels */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ~2s polling keeps the queue fresh without any manual refresh.
  useQueuePolling({ enabled: true, onTick: refresh });

  const handleComplete = useCallback(
    async (record) => {
      // Duplicate-click protection at the request level.
      if (completingRef.current.has(record.appointmentId)) return;
      completingRef.current.add(record.appointmentId);
      setCompletingId(record.appointmentId);

      try {
        await completeAppointment(record.appointmentId);
        setToast({ type: "success", message: COMPLETED_TOAST_MESSAGE });
      } catch (error) {
        const status = error?.response?.status;
        if (status === 409 || status === 400) {
          setToast({ type: "warning", message: CONCURRENT_CHANGE_MESSAGE });
        } else {
          setToast({ type: "error", message: COMPLETE_FAILED_MESSAGE });
        }
      } finally {
        completingRef.current.delete(record.appointmentId);
        setCompletingId(null);
        // Server-authoritative refresh — no optimistic queue changes.
        dispatch(fetchQueue({ date: selectedDate }));
      }
    },
    [dispatch, selectedDate],
  );

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
        key: "patientId",
        header: "Patient",
        render: (row) => patientNames[row.patientId] ?? `Patient ${row.patientId}`,
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
          const actionable = row.status === "SCHEDULED";
          if (!actionable) return "—";
          return (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  navigate(`/doctor/consultation/${row.appointmentId}`)
                }
              >
                Start Consultation
              </Button>
              <Button
                size="sm"
                onClick={() => handleComplete(row)}
                loading={completingId === row.appointmentId}
              >
                Complete
              </Button>
            </div>
          );
        },
      },
    ],
    [patientNames, completingId, handleComplete, navigate],
  );

  return (
    <div className="mx-auto max-w-6xl py-4 sm:py-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary-700">
            Doctor workspace
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">
            Today’s schedule
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Review appointments for the selected date, start consultations and
            mark them completed.
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

      {toast && (
        <div className="mb-4">
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        </div>
      )}

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
