import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import Button from "../../components/Button";
import { getPublicDoctors } from "../../services/publicBookingService";
import "../../components/chatbot/onecare-chat-widget.js";
import "../../styles/patient-public.css";

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const chatRef = useRef(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [live, setLive] = useState({
    doctors: [],
    loading: true,
    error: false,
  });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    getPublicDoctors(controller.signal)
      .then((doctors) => {
        if (!controller.signal.aborted)
          setLive({ doctors, loading: false, error: false });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setLive({ doctors: [], loading: false, error: true });
      });
    return () => controller.abort();
  }, [retry]);
  useEffect(() => {
    const chat = chatRef.current;
    const book = () => navigate("/appointments");
    const opened = () => setChatOpen(true);
    const closed = () => setChatOpen(false);
    chat.addEventListener("onecare-chat:book-appointment", book);
    chat.addEventListener("onecare-chat:open", opened);
    chat.addEventListener("onecare-chat:close", closed);
    return () => {
      chat.removeEventListener("onecare-chat:book-appointment", book);
      chat.removeEventListener("onecare-chat:open", opened);
      chat.removeEventListener("onecare-chat:close", closed);
    };
  }, [navigate]);
  return (

    <div className="patient-shell">
      <section className="patient-hero">
        <h1>{t("publicLanding.welcome")}</h1>
        <p>{t("publicLanding.intro")}</p>
        <Button onClick={() => navigate("/appointments")}>
          {t("publicLanding.book")}
        </Button>
      </section>
      <section aria-labelledby="services-heading">
        <h2 id="services-heading">{t("publicLanding.servicesTitle")}</h2>
        <div className="patient-grid">
          {[
            ["consultation", "🩺"],
            ["appointments", "📅"],
            ["information", "ℹ️"],
          ].map(([key, icon]) => (
            <article className="patient-card" key={key}>
              <span aria-hidden="true">{icon}</span>
              <h3>{t(`publicLanding.services.${key}`)}</h3>
            </article>
          ))}
        </div>
      </section>
      <section aria-labelledby="doctors-heading">
        <h2 id="doctors-heading">{t("publicLanding.doctorsTitle")}</h2>
        <h3>{t("publicLanding.hoursTitle")}</h3>
        <p>{t("publicLanding.hoursFallback")}</p>
        {live.loading && <p role="status">{t("common.loading")}</p>}
        {live.error && (
          <div role="alert" className="patient-alert">
            <p>{t("publicLanding.doctorError")}</p>
            <Button
              onClick={() => {
                setLive((x) => ({ ...x, loading: true, error: false }));
                setRetry((x) => x + 1);
              }}
            >
              {t("publicLanding.retry")}
            </Button>
          </div>
        )}
        {!live.loading && !live.error && !live.doctors.length && (
          <p>{t("publicLanding.noDoctors")}</p>
        )}
        <div className="patient-grid">
          {live.doctors.map((doctor) => (
            <article className="patient-card" key={doctor.id}>
              <h3>{doctor.name}</h3>
              <p>{doctor.hours || t("publicLanding.hoursUnavailable")}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="patient-card">
        <h2>{t("publicLanding.chatTitle")}</h2>

    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <h1 className="text-3xl font-bold text-neutral-900">
        Welcome to OneCare
      </h1>
      <section aria-labelledby="chat-heading" className="space-y-3">
        <h2
          id="chat-heading"
          className="text-xl font-semibold text-neutral-900"
        >
          How can we help?
        </h2>
        <p className="text-neutral-600">
          Ask the OneCare assistant about clinic hours, services, and other
          clinic information.
        </p>

        <Button
          onClick={() => chatRef.current?.open()}
          aria-controls="home-chat"
          aria-expanded={chatOpen}
        >
          {t("publicLanding.chatOpen")}
        </Button>
      </section>
      <onecare-chat-widget
        ref={chatRef}
        id="home-chat"
        api-url="/api/chatbot/query"
        timeout-ms="90000"
        lang={i18n.resolvedLanguage?.startsWith("ta") ? "ta" : "en"}
      />
    </div>
  );
}
