import { Link, Navigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { bookingDocumentId } from "../../utils/bookingNavigation";
import {
  formatPatientDate,
  formatPatientTime,
  isValidDate,
} from "../../utils/publicDateTime";
import ClinicContact from "../../components/ClinicContact";

export default function BookingConfirmedPage() {
  const { state } = useLocation();
  const { t, i18n } = useTranslation();
  const booking = state?.booking;

  /* Guard: bad / missing state -> bounce to the appointments list. */
  if (
    state?.documentId !== bookingDocumentId ||
    !isValidDate(booking?.date ?? "") ||
    !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(booking?.time ?? "")
  ) {
    return (
      <Navigate to="/appointments" replace state={{ missingConfirmation: true }} />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-slate-50 to-emerald-100 font-sans text-slate-800 selection:bg-blue-600 selection:text-white">
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
        {/* Success banner */}
        <div
          role="status"
          className="flex items-start gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6"
        >
          <span
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-lg font-bold text-white"
          >
            ✓
          </span>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-emerald-950 sm:text-2xl">
              {t("confirmation.title")}
            </h1>
            <p className="mt-1 text-sm text-emerald-800">
              {t(
                "confirmation.subtitle",
                "Your appointment has been booked. Please arrive a few minutes early."
              )}
            </p>
          </div>
        </div>

        {/* Appointment details — compact fact grid */}
        <section
          aria-labelledby="appt-details-heading"
          className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
        >
          <h2
            id="appt-details-heading"
            className="text-base font-bold text-slate-900"
          >
            {t("confirmation.detailsTitle", "Appointment details")}
          </h2>

          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("confirmation.doctor")}
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">
                {booking.doctor}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("confirmation.date")}
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">
                {formatPatientDate(booking.date, i18n.language)}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("confirmation.time")}
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">
                {formatPatientTime(booking.time, i18n.language)}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("confirmation.status")}
              </dt>
              <dd className="mt-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 rounded-full bg-emerald-600"
                  />
                  {t("confirmation.scheduled")}
                </span>
              </dd>
            </div>

            {booking.reference ? (
              <div className="col-span-2 sm:col-span-1">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t("confirmation.reference", "Reference")}
                </dt>
                <dd className="mt-1 font-mono text-sm font-semibold text-slate-900">
                  {booking.reference}
                </dd>
              </div>
            ) : null}
          </dl>
        </section>

        {/* What happens next + contact — single split card */}
        <section
          aria-labelledby="next-steps-heading"
          className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
        >
          <h2
            id="next-steps-heading"
            className="text-base font-bold text-slate-900"
          >
            {t("confirmation.nextStepsTitle", "What happens next")}
          </h2>

          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <ol className="space-y-3 text-sm text-slate-700">
              <li className="flex items-start gap-2.5">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700"
                >
                  1
                </span>
                <span>{t("confirmation.sms")}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700"
                >
                  2
                </span>
                <span>{t("confirmation.contact")}</span>
              </li>
            </ol>

            <ClinicContact embedded />
          </div>
        </section>

        {/* Actions — side-by-side on sm+ */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            to="/appointments"
            state={null}
            className="block w-full rounded-xl bg-blue-700 px-6 py-3.5 text-center text-base font-bold text-white shadow-sm transition hover:bg-blue-800 active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            {t("confirmation.another")}
          </Link>
          <Link
            to="/"
            className="block w-full rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            {t("booking.back", "Back to home")}
          </Link>
        </div>
      </main>
    </div>
  );
}
