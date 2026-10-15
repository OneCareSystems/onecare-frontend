import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/Button";
import DatePicker from "../../components/DatePicker";
import Icon from "../../components/Icon";
import StatusBadge from "../../components/StatusBadge";
import Table from "../../components/Table";
import { PageHeader, PageShell } from "../../components/doctor/PageLayout";
import {
  ErrorPanel,
  SectionTitle,
  SkeletonBlock,
} from "../../components/doctor/Panel";
import { getAppointments } from "../../services/appointmentService";
import useQueuePolling from "../../hooks/useQueuePolling";
import usePageVisible from "../../hooks/usePageVisible";
import { formatDisplayDate, toLocalDateString } from "../../utils/dateUtils";
import { formatTimeSlot } from "../../utils/timeUtils";

const DASH = "\u2014";

/**
 * DOC - Doctor's Today Schedule / Consultation Queue.
 *
 * Server-authoritative order (`queuePosition`), scoped to the selected local
 * date and refreshed about every 2s while the tab is visible. The queue is
 * read-only here: "Start Consultation" opens DOC-04, where notes,
 * prescriptions and completion happen. No optimistic changes are made.
 */
const TodaySchedulePage = () => {
  const navigate = useNavigate();
  const pageVisible = usePageVisible();

  const [selectedDate, setSelectedDate] = useState(() => toLocalDateString());
  const [records, setRecords] = useState([]);
  const [queueStatus, setQueueStatus] = useState("idle");
  const requestIdRef = useRef(0);

  const loading = queueStatus === "loading";
  const firstLoad = loading && records.length === 0;
  const failed = queueStatus === "failed";

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setQueueStatus("loading");
    try {
      const appointments = await getAppointments({ date: selectedDate });
      if (requestId !== requestIdRef.current) return;
      setRecords(appointments);
      setQueueStatus("succeeded");
    } catch {
      if (requestId !== requestIdRef.current) return;
      setQueueStatus("failed");
    }
  }, [selectedDate]);

  // Initial fetch and re-fetch whenever the doctor picks another date.
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Poll only while the tab is visible; catch up as soon as it returns.
  useQueuePolling({ enabled: pageVisible, onTick: refresh });
  const wasHiddenRef = useRef(false);
  useEffect(() => {
    if (!pageVisible) {
      wasHiddenRef.current = true;
    } else if (wasHiddenRef.current) {
      wasHiddenRef.current = false;
      refresh();
    }
  }, [pageVisible, refresh]);

  const handleDateChange = useCallback((event) => {
    setSelectedDate(event.target.value || toLocalDateString());
  }, []);

  const columns = useMemo(
    () => [
      {
        key: "queuePosition",
        header: "#",
        render: (row) => row.appointmentId ?? DASH,
      },
      {
        key: "patientFullName",
        header: "Patient",
        render: (row) => (
          <span className="font-medium text-neutral-900">
            {row.patientFullName ?? DASH}
          </span>
        ),
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
        render: (row) =>
          row.status !== "SCHEDULED" ? (
            DASH
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                navigate(`/doctor/consultation/${row.appointmentId}`)
              }
            >
              Start Consultation
            </Button>
          ),
      },
    ],
    [navigate],
  );

  return (
    <PageShell>
      <PageHeader
        title={"Today\u2019s schedule"}
        description="Review appointments for the selected date and open the consultation screen to treat patients and complete appointments."
        meta={
          <>
            <p className="font-medium text-neutral-800">
              {formatDisplayDate(selectedDate)}
            </p>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse"
              />
              {pageVisible ? "Live" : "Paused"}
            </span>
          </>
        }
        actions={
          <>
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
              disabled={firstLoad}
              className="inline-flex items-center gap-2"
            >
              <Icon name="refresh" className="h-4 w-4" />
              Refresh
            </Button>
          </>
        }
      />

      <section aria-labelledby="schedule-queue-heading">
        <SectionTitle id="schedule-queue-heading">
          Appointment queue
        </SectionTitle>

        {firstLoad ? (
          <SkeletonBlock label="Loading appointment queue" rows={5} />
        ) : failed ? (
          <ErrorPanel
            title="Unable to load the schedule"
            message="Please check your connection and try again."
            actionLabel="Retry"
            onAction={refresh}
            actionLoading={loading}
          />
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
    </PageShell>
  );
};

export default TodaySchedulePage;
