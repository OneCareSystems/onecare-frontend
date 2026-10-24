import{
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import Icon from "../../components/Icon";
import { getPublicDoctors } from "../../services/publicBookingService";
import "../../components/chatbot/onecare-chat-widget.js";

/* Put one image at /public/images/home/hero-clinic.webp (about 900x700).
   If it is missing, a soft gradient is shown instead. */
const HERO_IMAGE = "https://tse1.explicit.bing.net/th/id/OIP.m5vBSYmbYA43M_2XRSFfJwHaE8?r=0&rs=1&pid=ImgDetMain&o=7&rm=3";

/* Use configured clinic hours when available, with the standard evening hours
   as the fallback. */
const CLINIC_HOURS =
  import.meta.env.VITE_CLINIC_HOURS?.trim() || "4:00 PM - 8:00 PM";

/* Facts below come from the OneCare SRS: booking needs no account (FR-043),
   payments are cash only (BR-011), patient pages are English and Tamil (NFR-U001),
   the chatbot gives general clinic information only (BR-009, BR-010). */
const TRUST = [
  { key: "noAccount", icon: "user-check", text: "No account needed to book" },
  { key: "bilingual", icon: "globe", text: "English and Tamil" },
  { key: "underOneRoof", icon: "building-2", text: "Clinic and pharmacy in one place" },
  { key: "private", icon: "shield-check", text: "Your records stay private" },
];

const STEPS = [
  {
    key: "book",
    icon: "calendar",
    title: "Book online",
    text: "Choose a doctor, date and time. You don't need an account, and you'll get a confirmation.",
  },
  {
    key: "consult",
    icon: "stethoscope",
    title: "See the doctor",
    text: "Your doctor keeps notes of your visit and writes your prescription digitally.",
  },
  {
    key: "collect",
    icon: "pill",
    title: "Collect your medicines",
    text: "The prescription goes straight to our pharmacy. Payment is in cash at the clinic.",
  },
];

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function SmartImage({ src, alt, className = "", width, height, priority = false }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`bg-gradient-to-br from-sky-100 to-emerald-100 ${className}`}
      />
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

const DoctorCard = memo(function DoctorCard({ doctor, onBook, fallbackHours, bookLabel }) {
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 transition hover:border-blue-300 hover:shadow-md">
      <div className="flex items-center gap-3.5">
        {doctor.photoUrl ? (
          <SmartImage
            src={doctor.photoUrl}
            alt={doctor.name}
            width={52}
            height={52}
            className="h-[52px] w-[52px] shrink-0 rounded-full object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-800"
          >
            {(doctor.name || "D").charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-slate-900">{doctor.name}</h3>
          {doctor.specialty && (
            <p className="truncate text-sm text-slate-600">{doctor.specialty}</p>
          )}
        </div>
      </div>

      <p className="flex items-center gap-2 text-sm text-slate-600">
        <Icon name="clock" className="h-4 w-4 shrink-0 text-slate-500" />
        <span className="truncate">{doctor.hours || fallbackHours}</span>
      </p>

      <button
        type="button"
        onClick={() => onBook(doctor.id)}
        className="mt-auto w-full rounded-lg bg-blue-700 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        {bookLabel}
      </button>
    </article>
  );
});

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const chatRef = useRef(null);
  const doctorsRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [specialty, setSpecialty] = useState("all");
  const [live, setLive] = useState({ doctors: [], loading: true, error: false });
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
    if (!chat) return;
    const book = () => navigate("/appointments");
    chat.addEventListener("onecare-chat:book-appointment", book);
    return () => chat.removeEventListener("onecare-chat:book-appointment", book);
  }, [navigate]);

  const go = useCallback((to) => navigate(to), [navigate]);
  const bookDoctor = useCallback((id) => navigate(`/appointments?doctor=${id}`), [navigate]);
  const openChat = useCallback(() => chatRef.current?.open(), []);

  const scrollToDoctors = useCallback((e) => {
    e?.preventDefault();
    doctorsRef.current?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "start",
    });
  }, []);

  const deferredQuery = useDeferredValue(searchQuery);

  const specialties = useMemo(
    () => Array.from(new Set(live.doctors.map((d) => d.specialty).filter(Boolean))).sort(),
    [live.doctors]
  );

  const filteredDoctors = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return live.doctors.filter((d) => {
      const matchesQuery =
        !q || d.name?.toLowerCase().includes(q) || (d.specialty || "").toLowerCase().includes(q);
      return matchesQuery && (specialty === "all" || d.specialty === specialty);
    });
  }, [live.doctors, deferredQuery, specialty]);

  const hasFilters = Boolean(searchQuery) || specialty !== "all";
  const hoursFallback = t("publicLanding.hoursUnavailable", "By appointment");
  const bookLabel = t("publicLanding.bookConsultation", "Book consultation");

  // The clinic may have one doctor today and more later, so only show
  // search and filters when there is more than one doctor to choose from.
  const showFilters = !live.loading && !live.error && live.doctors.length > 1;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-base text-slate-800 selection:bg-blue-600 selection:text-white">

      <main className="mx-auto max-w-6xl space-y-14 px-4 py-8 sm:px-6 sm:py-12">
        {/* Hero */}
        <section aria-labelledby="hero-heading" className="grid items-center gap-8 md:grid-cols-2">
          <div className="space-y-5">
            <h1 id="hero-heading" className="text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              {t("publicLanding.welcome", "Book your clinic visit online")}
            </h1>
            <p className="max-w-lg text-lg leading-relaxed text-slate-600">
              {t(
                "publicLanding.intro",
                "Pick a doctor and a time. Your prescription goes straight to our in-house pharmacy, so you can collect your medicines before you leave."
              )}
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => go("/appointments")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 active:scale-95"
              >
                <Icon name="calendar" className="h-5 w-5" />
                {t("publicLanding.bookAppointment", "Book an appointment")}
              </button>
              <button
                type="button"
                onClick={scrollToDoctors}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-base font-semibold text-slate-800 transition hover:border-blue-400 hover:text-blue-800 active:scale-95"
              >
                <Icon name="stethoscope" className="h-5 w-5 text-blue-700" />
                {t("publicLanding.seeDoctors", "See our doctor")}
              </button>
            </div>
          </div>

          <SmartImage
            src={HERO_IMAGE}
            alt="Doctor consulting with a patient"
            width={900}
            height={700}
            priority
            className="aspect-[4/3] w-full rounded-2xl object-cover shadow-lg ring-1 ring-slate-200"
          />
        </section>

        {/* Trust row: facts from the SRS */}
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST.map(({ key, icon, text }) => (
            <li
              key={key}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700"
            >
              <span className="shrink-0 rounded-lg bg-emerald-50 p-2 text-emerald-700">
                <Icon name={icon} className="h-5 w-5" />
              </span>
              {t(`publicLanding.trust.${key}`, text)}
            </li>
          ))}
        </ul>

        {/* Doctors */}
        <section ref={doctorsRef} id="doctors" aria-labelledby="doctors-heading" className="scroll-mt-20 space-y-4">
          <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-end">
            <h2 id="doctors-heading" className="text-2xl font-bold text-slate-900">
              {t("publicLanding.doctorsTitle", "Our doctors")}
            </h2>
            <p className="text-sm text-slate-600">
              {t("publicLanding.hoursLabel", "Clinic hours")}: {CLINIC_HOURS}
            </p>
          </div>

          {showFilters && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative w-full sm:max-w-xs">
                <Icon name="search" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label={t("publicLanding.searchLabel", "Search doctor name or specialty")}
                  placeholder={t("publicLanding.searchPlaceholder", "Search doctor or specialty")}
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-base text-slate-900 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              {specialties.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter by specialty">
                  {["all", ...specialties].map((s) => (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={specialty === s}
                      onClick={() => setSpecialty(s)}
                      className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                        specialty === s
                          ? "border-blue-700 bg-blue-700 text-white"
                          : "border-slate-300 bg-white text-slate-700 hover:border-blue-400"
                      }`}
                    >
                      {s === "all" ? t("publicLanding.all", "All") : s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {live.loading && (
            <div role="status" aria-label="Loading doctors" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 motion-safe:animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="h-[52px] w-[52px] rounded-full bg-slate-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 rounded bg-slate-200" />
                      <div className="h-3 w-1/2 rounded bg-slate-100" />
                    </div>
                  </div>
                  <div className="h-9 rounded-lg bg-slate-100" />
                </div>
              ))}
            </div>
          )}

          {live.error && (
            <div role="alert" className="flex flex-col items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center">
              <p className="flex items-center gap-2 text-sm font-medium text-red-800">
                <Icon name="alert-triangle" className="h-4 w-4 shrink-0 text-red-600" />
                {t("publicLanding.doctorError", "Unable to load live doctor schedules at the moment.")}
              </p>
              <button
                type="button"
                onClick={() => {
                  setLive((x) => ({ ...x, loading: true, error: false }));
                  setRetry((x) => x + 1);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                <Icon name="refresh" className="h-4 w-4" />
                {t("publicLanding.retry", "Try again")}
              </button>
            </div>
          )}

          {!live.loading && !live.error && filteredDoctors.length === 0 && (
            <div className="space-y-2 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <p className="text-base text-slate-600">
                {hasFilters
                  ? t("publicLanding.noMatch", "No doctors match your search.")
                  : t("publicLanding.noDoctors", "No doctors are currently available.")}
              </p>
              {hasFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSpecialty("all");
                  }}
                  className="text-sm font-semibold text-blue-700 hover:text-blue-900"
                >
                  {t("publicLanding.clearSearch", "Clear search")}
                </button>
              )}
            </div>
          )}

          {!live.loading && !live.error && filteredDoctors.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredDoctors.map((doctor) => (
                <DoctorCard
                  key={doctor.id}
                  doctor={doctor}
                  onBook={bookDoctor}
                  fallbackHours={hoursFallback}
                  bookLabel={bookLabel}
                />
              ))}
            </div>
          )}
        </section>

        {/* How a visit works: a real sequence, so numbered */}
        <section aria-labelledby="steps-heading" className="space-y-4">
          <h2 id="steps-heading" className="text-2xl font-bold text-slate-900">
            {t("publicLanding.stepsTitle", "How a visit works")}
          </h2>
          <ol className="grid gap-3 md:grid-cols-3">
            {STEPS.map(({ key, icon, title, text }, i) => (
              <li key={key} className="flex gap-4 rounded-xl border border-slate-200 bg-white p-5">
                <span className="relative shrink-0">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <Icon name={icon} className="h-6 w-6" />
                  </span>
                  <span
                    aria-hidden="true"
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-700 text-xs font-bold text-white"
                  >
                    {i + 1}
                  </span>
                </span>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    {t(`publicLanding.steps.${key}.title`, title)}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    {t(`publicLanding.steps.${key}.text`, text)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Assistant: hints for first-time users, plus an honest scope note */}
        <section
          aria-labelledby="assistant-heading"
          className="flex flex-col justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6 md:flex-row md:items-center"
        >
          <div className="max-w-2xl space-y-1.5">
            <h2 id="assistant-heading" className="flex items-center gap-2 text-lg font-bold text-emerald-950">
              <Icon name="message-square-text" className="h-5 w-5 text-emerald-700" />
              {t("publicLanding.assistantTitle", "Ask the clinic assistant")}
            </h2>
            <p className="text-sm text-emerald-900">
              {t(
                "publicLanding.assistantHint",
                "Try asking: What are the clinic hours? When is the doctor available? What services do you offer?"
              )}
            </p>
            <p className="text-sm text-emerald-800">
              {t(
                "publicLanding.assistantLimit",
                "It shares general clinic information only. It can't diagnose or prescribe, so please see the doctor for medical advice."
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={openChat}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-base font-semibold text-white transition hover:bg-emerald-800 active:scale-95"
          >
            <Icon name="message-square-text" className="h-5 w-5" />
            {t("publicLanding.chatOpen", "Open assistant")}
          </button>
        </section>
      </main>

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