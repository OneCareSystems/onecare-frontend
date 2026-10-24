
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FaPhoneAlt, FaMapMarkerAlt } from "react-icons/fa";

const linkClass =
  "rounded text-sm text-slate-600 transition hover:text-blue-700 hover:underline hover:underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";
const headingClass = "mb-3 text-sm font-bold text-slate-900";
const iconButtonClass =
  "inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-blue-700 transition hover:border-blue-300 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

export default function Footer() {
  const { t } = useTranslation();
  const copy = (key, values) => t(`publicCommon.footerContent.${key}`, values);
  const phone = import.meta.env.VITE_CLINIC_PHONE?.trim() || "0218700530";
  const email =
    import.meta.env.VITE_CLINIC_EMAIL?.trim() || "onecaresystems@gmail.com";
  const address =
    import.meta.env.VITE_CLINIC_ADDRESS?.trim() || "QW2M+39, Moolai, Jaffna";

  return (
    <footer className="mt-12 border-t border-slate-200 bg-white text-sm text-slate-600 [overflow-wrap:anywhere]">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <section aria-label="OneCare" className="space-y-3 sm:col-span-2 lg:col-span-1">
            <Link
              to="/home"
              aria-label={copy("home")}
              className="inline-flex items-center gap-2.5 rounded"
            >
              <span
                aria-hidden="true"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-700 font-bold text-white"
              >
                +
              </span>
              <span className="text-base font-bold text-slate-900">OneCare</span>
            </Link>
            <p className="font-semibold text-emerald-700">{copy("tagline")}</p>
            <p className="leading-relaxed">{copy("description")}</p>
          </section>

          {/* Quick links */}
          <nav aria-labelledby="footer-quick-links">
            <h2 id="footer-quick-links" className={headingClass}>
              {copy("quickLinks")}
            </h2>
            <ul className="m-0 grid list-none gap-2 p-0">
              <li>
                <Link to="/home" className={linkClass}>
                  {copy("home")}
                </Link>
              </li>
              <li>
                <Link to="/home#doctors-heading" className={linkClass}>
                  {copy("doctors")}
                </Link>
              </li>
              <li>
                <Link to="/appointments" className={linkClass}>
                  {copy("appointment")}
                </Link>
              </li>
              <li>
                <a href="#footer-contact" className={linkClass}>
                  {copy("contact")}
                </a>
              </li>
            </ul>
          </nav>

          {/* Contact */}
          <section id="footer-contact" aria-labelledby="footer-contact-heading" className="scroll-mt-20">
            <h2 id="footer-contact-heading" className={headingClass}>
              {copy("contactHeading")}
            </h2>
            {phone || email || address ? (
              <address className="grid gap-2 not-italic">
                {phone && (
                  <a href={`tel:${phone.replace(/\s/g, "")}`} className={linkClass}>
                    {phone}
                  </a>
                )}
                {email && (
                  <a href={`mailto:${email}`} className={linkClass}>
                    {email}
                  </a>
                )}
                {address && <p className="m-0">{address}</p>}
              </address>
            ) : (
              <p className="m-0">{copy("contactPending")}</p>
            )}

            <div className="mt-4 flex gap-2.5">
              <a
                href="https://maps.app.goo.gl/xx8a9bjBEqesxzDx7?g_st=aw"
                aria-label={`${t("publicCommon.address")}: OneCare`}
                title={t("publicCommon.address")}
                target="_blank"
                rel="noopener noreferrer"
                className={iconButtonClass}
              >
                <FaMapMarkerAlt aria-hidden="true" />
              </a>
              <a
                href="tel:0218700530"
                aria-label={`${t("publicCommon.phone")}: 0218700530`}
                title="0218700530"
                className={iconButtonClass}
              >
                <FaPhoneAlt aria-hidden="true" />
              </a>
            </div>
          </section>

          {/* Support & emergency */}
          <section aria-labelledby="footer-support">
            <h2 id="footer-support" className={headingClass}>
              {copy("support")}
            </h2>
            <p className="m-0 mb-2">
              <Link to="/appointments" className={linkClass}>
                {copy("guidelines")}
              </Link>
            </p>
            <p className="m-0 leading-relaxed">{copy("guidance")}</p>

            <div className="mt-4 rounded-lg border-l-4 border-red-500 bg-red-50 p-3">
              <h3 className="m-0 text-sm font-bold text-red-900">{copy("emergencyTitle")}</h3>
              <p className="m-0 mt-1 text-xs leading-relaxed text-red-800">{copy("emergency")}</p>
            </div>
          </section>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-slate-200 pt-5 text-xs text-slate-500 sm:flex-row">
          <p className="m-0">
            {copy("copyright", { year: new Date().getFullYear() })}
            <span className="sm:ml-2">{t("publicCommon.footer")}</span>
          </p>
          <a href="#footer-contact" className={linkClass}>
            {copy("contact")}
          </a>
        </div>
      </div>
    </footer>
  );
}
