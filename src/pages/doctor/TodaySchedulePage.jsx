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
 * Server-authoritative order, scoped to the selected local date.
 * The queue refreshes approximately every 2 seconds while the tab is visible.
 *
 * This page is read-only. Starting a consultation opens DOC-04, where
 * notes, prescriptions and consultation completion are handled.
 */
const TodaySchedulePage = () => {
  const navigate = useNavigate();
  const pageVisible = usePageVisible();

  const [selectedDate, setSelectedDate] = useState(() => toLocalDateString());
  const [records, setRecords] = useState([]);
  const [queueStatus, setQueueStatus] = useState("idle");

  const requestIdRef = useRef(0);
  const wasHiddenRef = useRef(false);

  const loading = queueStatus === "loading";
  const firstLoad = loading && records.length === 0;
  const failed = queueStatus === "failed";

  /**
   * Refresh appointments manually or through polling.
   * Request IDs prevent older requests from overwriting newer results.
   */
  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    setQueueStatus("loading");

    try {
      const appointments = await getAppointments({
        date: selectedDate,
      });

      if (requestId !== requestIdRef.current) {
        return;
      }

      setRecords(appointments);
      setQueueStatus("succeeded");
    } catch {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setQueueStatus("failed");
    }
  }, [selectedDate]);

  /**
   * Initial fetch and re-fetch whenever the selected date changes.
   *
   * The request is started inside the effect rather than by calling
   * refresh(), avoiding the set-state-in-effect lint warning.
   */
  useEffect(() => {
    let cancelled = false;
    const requestId = ++requestIdRef.current;

    const loadSchedule = async () => {
      setQueueStatus("loading");

      try {
        const appointments = await getAppointments({
          date: selectedDate,
        });

        if (cancelled || requestId !== requestIdRef.current) {
          return;
        }

        setRecords(appointments);
        setQueueStatus("succeeded");
      } catch {
        if (cancelled || requestId !== requestIdRef.current) {
          return;
        }

        setQueueStatus("failed");
      }
    };

    loadSchedule();

    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  /**
   * Poll only while the tab is visible.
   */
  useQueuePolling({
    enabled: pageVisible,
    onTick: refresh,
  });

  /**
   * Refresh immediately when the user returns to the tab.
   */
  useEffect(() => {
    if (!pageVisible) {
      wasHiddenRef.current = true;
      return;
    }

    if (wasHiddenRef.current) {
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
          row.status === "CANCELLED" ? (
            DASH
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                navigate(`/doctor/consultation/${row.appointmentId}`)
              }
            >
              {row.status === "COMPLETED"
                ? "View Consultation"
                : "Start Consultation"}
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
