import { Link, Navigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { bookingDocumentId } from "../../utils/bookingNavigation";
import {
  formatPatientDate,
  formatPatientTime,
  isValidDate,
} from "../../utils/publicDateTime";
import ClinicContact from "../../components/ClinicContact";
import "../../styles/patient-public.css";

export default function BookingConfirmedPage() {
  const { state } = useLocation();
  const { t, i18n } = useTranslation();
  const booking = state?.booking;
  if (
    state?.documentId !== bookingDocumentId ||
    !isValidDate(booking?.date ?? "") ||
    !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(booking?.time ?? "")
  ) {
    return (
      <Navigate
        to="/appointments"
        replace
        state={{ missingConfirmation: true }}
      />
    );
  }
  return (
    <div className="patient-shell">
      <section className="patient-card">
        <h1>{t("confirmation.title")}</h1>
        <dl className="patient-summary">
          <dt>{t("confirmation.doctor")}</dt>
          <dd>{booking.doctor}</dd>
          <dt>{t("confirmation.date")}</dt>
          <dd>{formatPatientDate(booking.date, i18n.language)}</dd>
          <dt>{t("confirmation.time")}</dt>
          <dd>{formatPatientTime(booking.time, i18n.language)}</dd>
          <dt>{t("confirmation.status")}</dt>
          <dd>{t("confirmation.scheduled")}</dd>
        </dl>
        <p>{t("confirmation.sms")}</p>
        <p>{t("confirmation.contact")}</p>
        <ClinicContact />
        <Link to="/appointments" state={null} className="patient-button">
          {t("confirmation.another")}
        </Link>
      </section>
    </div>
  );
}
