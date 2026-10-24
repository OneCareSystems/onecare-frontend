import { useTranslation } from "react-i18next";

const phone = import.meta.env.VITE_CLINIC_PHONE?.trim() || "0218700530";
const email = import.meta.env.VITE_CLINIC_EMAIL?.trim() || "onecaresystems@gmail.com";
const address =
  import.meta.env.VITE_CLINIC_ADDRESS?.trim() || "QW2M+39, Moolai, Jaffna";

/**
 * Clinic contact block.
 * Pass `embedded` to flatten the wrapper so it can sit as a column
 * inside another card (e.g. the booking confirmation page).
 */
export default function ClinicContact({ embedded = false }) {
  const { t } = useTranslation();
  const shellClass = embedded
    ? "space-y-2"
    : "mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6";

  return (
    <section aria-labelledby="clinic-contact-heading" className={shellClass}>
      <h3
        id="clinic-contact-heading"
        className={
          embedded
            ? "text-xs font-semibold uppercase tracking-wide text-slate-500"
            : "text-base font-bold text-slate-900"
        }
      >
        {t("publicCommon.contactTitle")}
      </h3>

      <ul className="space-y-1.5 text-sm text-slate-700">
        <li>
          <span className="font-medium text-slate-500">
            {t("publicCommon.phone")}:{" "}
          </span>
          <a
            href={`tel:${phone.replace(/\s/g, "")}`}
            className="font-semibold text-blue-700 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            {phone}
          </a>
        </li>
        <li>
          <span className="font-medium text-slate-500">
            {t("publicCommon.email")}:{" "}
          </span>
          <a
            href={`mailto:${email}`}
            className="font-semibold text-blue-700 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            {email}
          </a>
        </li>
        <li>
          <span className="font-medium text-slate-500">
            {t("publicCommon.address")}:{" "}
          </span>
          <span className="font-semibold text-slate-900">
            {address}
          </span>
        </li>
      </ul>

    </section>
  );
}
