import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FaPhoneAlt, FaMapMarkerAlt } from "react-icons/fa";
import Logo from "./Logo";
import "./Footer.css";

export default function Footer() {
  const { t } = useTranslation();
  const copy = (key, values) => t(`publicCommon.footerContent.${key}`, values);
  const phone = import.meta.env.VITE_CLINIC_PHONE?.trim();
  const email = import.meta.env.VITE_CLINIC_EMAIL?.trim();
  const address = import.meta.env.VITE_CLINIC_ADDRESS?.trim();

  return (
    <footer className="onecare-footer">
      <div className="onecare-footer-inner">
        <div className="onecare-footer-grid">
          <section className="onecare-footer-brand" aria-label="OneCare">
            <Link
              to="/home"
              className="onecare-footer-logo"
              aria-label={copy("home")}
            >
              <Logo showWordmark={false} />
              <span>OneCare</span>
            </Link>
            <p className="onecare-footer-tagline">{copy("tagline")}</p>
            <p>{copy("description")}</p>
            <p className="onecare-footer-caption">{t("publicCommon.footer")}</p>
          </section>

          <nav aria-labelledby="footer-quick-links">
            <h2 id="footer-quick-links">{copy("quickLinks")}</h2>
            <ul>
              <li>
                <Link to="/home">{copy("home")}</Link>
              </li>
              <li>
                <Link to="/home#doctors-heading">{copy("doctors")}</Link>
              </li>
              <li>
                <Link to="/appointments">{copy("appointment")}</Link>
              </li>
              <li>
                <Link to="#footer-contact">{copy("contact")}</Link>
              </li>
            </ul>
          </nav>

          <section id="footer-contact" aria-labelledby="footer-contact-heading">
            <h2 id="footer-contact-heading">{copy("contactHeading")}</h2>
            {phone || email || address ? (
              <address>
                {phone && (
                  <p>
                    <a href={`tel:${phone.replace(/\s/g, "")}`}>{phone}</a>
                  </p>
                )}
                {email && (
                  <p>
                    <a href={`mailto:${email}`}>{email}</a>
                  </p>
                )}
                {address && <p>{address}</p>}
              </address>
            ) : (
              <p>{copy("contactPending")}</p>
            )}
          </section>

          <section aria-labelledby="footer-support">
            <h2 id="footer-support">{copy("support")}</h2>
            <Link to="/appointments">{copy("guidelines")}</Link>
            <p className="onecare-footer-guidance">{copy("guidance")}</p>
            <div className="onecare-footer-emergency">
              <h3>{copy("emergencyTitle")}</h3>
              <p>{copy("emergency")}</p>
            </div>
          </section>

          <section aria-labelledby="footer-connected">
            <h2 id="footer-connected">{copy("connected")}</h2>
            <p>{copy("updates")}</p>
            <div className="onecare-footer-newsletter">
              <label htmlFor="footer-newsletter-email">
                {copy("emailLabel")}
              </label>
              <div className="onecare-footer-email-row">
                <input
                  id="footer-newsletter-email"
                  type="email"
                  placeholder={copy("emailPlaceholder")}
                  disabled
                  aria-describedby="footer-newsletter-status"
                />
                <button type="button" disabled>
                  {copy("subscribe")}
                </button>
              </div>
              <p
                id="footer-newsletter-status"
                className="onecare-footer-caption"
              >
                {copy("newsletterPending")}
              </p>
            </div>
            <div className="onecare-footer-socials">
              <a
                href="https://maps.app.goo.gl/xx8a9bjBEqesxzDx7?g_st=aw"
                aria-label={`${t("publicCommon.address")}: OneCare`}
                title={t("publicCommon.address")}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaMapMarkerAlt aria-hidden="true" />
              </a>
              <a
                href="tel:0218700530"
                aria-label={`${t("publicCommon.phone")}: 0218700530`}
                title="0218700530"
              >
                <FaPhoneAlt aria-hidden="true" />
              </a>
            </div>
          </section>
        </div>
        <div className="onecare-footer-bottom">
          <p>{copy("copyright", { year: new Date().getFullYear() })}</p>
          <Link to="#footer-contact">{copy("contact")}</Link>
        </div>
      </div>
    </footer>
  );
}
