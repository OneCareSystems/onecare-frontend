import { useCallback, useEffect, useRef, useState } from "react";
import useWorkflowResource from "./useWorkflowResource";
import {
  dashboardAppointments,
  dashboardPendingInvoices,
} from "../services/adminWorkflowService";
import { clinicToday } from "../utils/clinicTime";

export default function useAdminDashboard() {
  const [date, setDate] = useState(clinicToday);
  const [appointmentRevision, setAppointmentRevision] = useState(0);
  const [invoiceRevision, setInvoiceRevision] = useState(0);
  const appointments = useWorkflowResource(
    dashboardAppointments,
    { date },
    appointmentRevision,
  );
  const invoices = useWorkflowResource(
    dashboardPendingInvoices,
    {},
    invoiceRevision,
  );
  const [openedAt] = useState(() => Date.now());
  const lastRefresh = useRef(openedAt);
  const retryAppointments = useCallback(
    () => setAppointmentRevision((n) => n + 1),
    [],
  );
  const retryInvoices = useCallback(() => setInvoiceRevision((n) => n + 1), []);
  const refresh = useCallback(() => {
    lastRefresh.current = Date.now();
    setDate(clinicToday());
    retryAppointments();
    retryInvoices();
  }, [retryAppointments, retryInvoices]);

  useEffect(() => {
    const resume = () => {
      if (document.hidden) return;
      setDate(clinicToday());
      if (
        !appointments.loading &&
        !invoices.loading &&
        Date.now() - lastRefresh.current >= 15000
      )
        refresh();
    };
    window.addEventListener("focus", resume);
    document.addEventListener("visibilitychange", resume);
    // Clock check only: fetch appointments when the clinic date changes.
    const timer = setInterval(() => {
      if (!document.hidden) setDate(clinicToday());
    }, 1000);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [appointments.loading, invoices.loading, refresh]);

  return {
    date,
    appointments,
    invoices,
    refresh,
    retryAppointments,
    retryInvoices,
  };
}
