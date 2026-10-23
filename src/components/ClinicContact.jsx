import { useTranslation } from "react-i18next";

// Example details requested for development; configure the real clinic before release.
const phone = import.meta.env.VITE_CLINIC_PHONE || "+94 11 000 0000";
const email = import.meta.env.VITE_CLINIC_EMAIL || "clinic@example.com";
const address = import.meta.env.VITE_CLINIC_ADDRESS;
export default function ClinicContact() {
  const { t } = useTranslation();
  return (
    <section
      className="patient-contact"
      aria-label={t("publicCommon.contactTitle")}
    >
      <h2>{t("publicCommon.contactTitle")}</h2>
      <dl>
        <dt>{t("publicCommon.phone")}</dt>
        <dd>
          <a href={`tel:${phone.replace(/\s/g, "")}`}>{phone}</a>
        </dd>
        <dt>{t("publicCommon.email")}</dt>
        <dd>
          <a href={`mailto:${email}`}>{email}</a>
        </dd>
        <dt>{t("publicCommon.address")}</dt>
        <dd>{address || t("publicCommon.addressValue")}</dd>
      </dl>
      {(!import.meta.env.VITE_CLINIC_PHONE ||
        !import.meta.env.VITE_CLINIC_EMAIL ||
        !address) && <p>{t("publicCommon.contactExample")}</p>}
    </section>
  );
}
