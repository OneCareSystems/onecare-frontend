
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import Button from "../../components/Button";
import "../../components/chatbot/onecare-chat-widget.js";

// Change this path only if your Spring Boot endpoint is different.
const DOCTORS_API_URL = "/api/doctors";

const HomePage = () => {
  const navigate = useNavigate();
  const chatRef = useRef(null);

  const [chatOpen, setChatOpen] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [doctorsError, setDoctorsError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const { i18n } = useTranslation();

  const isTamil = i18n.resolvedLanguage?.startsWith("ta");

  // Patient landing page translations
  const content = isTamil
    ? {
        welcome: "OneCare-க்கு வரவேற்கிறோம்",
        subtitle:
          "உங்களுக்கும் உங்கள் குடும்பத்தினருக்கும் எளிதான மற்றும் நம்பகமான மருத்துவ சேவை.",
        bookAppointment: "முன்பதிவு செய்யுங்கள்",
        ourServices: "எங்கள் சேவைகள்",
        servicesDescription:
          "உங்கள் உடல்நலத் தேவைகளுக்கான மருத்துவ சேவைகள்.",
        consultation: "மருத்துவ ஆலோசனை",
        consultationDescription:
          "உங்கள் உடல்நலக் கவலைகளுக்கான மருத்துவ ஆலோசனை.",
        appointments: "முன்பதிவு சேவை",
        appointmentsDescription:
          "உங்களுக்கு ஏற்ற நேரத்தில் மருத்துவரைச் சந்திக்க முன்பதிவு செய்யுங்கள்.",
        assistance: "நோயாளி உதவி",
        assistanceDescription:
          "கிளினிக் தகவல்கள் மற்றும் முன்பதிவு தொடர்பான உதவி.",
        ourDoctors: "எங்கள் மருத்துவர்கள்",
        doctorsDescription:
          "எங்கள் மருத்துவர்களைப் பற்றிய தகவல்களைப் பாருங்கள்.",
        loadingDoctors: "மருத்துவர் தகவல்கள் ஏற்றப்படுகின்றன...",
        doctorsError:
          "மருத்துவர் தகவல்களை தற்போது பெற முடியவில்லை.",
        retry: "மீண்டும் முயற்சிக்கவும்",
        noDoctors:
          "மருத்துவர் தகவல்கள் தற்போது கிடைக்கவில்லை.",
        doctor: "மருத்துவர்",
        specialty: "சிறப்புத் துறை",
        chatHeading: "நாங்கள் எவ்வாறு உதவலாம்?",
        chatDescription:
          "கிளினிக் நேரம், சேவைகள் மற்றும் பிற தகவல்களை OneCare உதவியாளரிடம் கேளுங்கள்.",
        chatButton: "OneCare உடன் உரையாடுங்கள்",
      }
    : {
        welcome: "Welcome to OneCare",
        subtitle:
          "Simple and reliable healthcare support for you and your family.",
        bookAppointment: "Book an Appointment",
        ourServices: "Our Services",
        servicesDescription:
          "Healthcare services to support your needs.",
        consultation: "Medical Consultation",
        consultationDescription:
          "Consult a doctor about your healthcare concerns.",
        appointments: "Appointment Booking",
        appointmentsDescription:
          "Schedule a visit with a doctor at a convenient time.",
        assistance: "Patient Assistance",
        assistanceDescription:
          "Get help with clinic information and appointments.",
        ourDoctors: "Our Doctors",
        doctorsDescription:
          "Explore information about our medical professionals.",
        loadingDoctors: "Loading doctor information...",
        doctorsError:
          "Unable to load doctor information at the moment.",
        retry: "Try Again",
        noDoctors:
          "Doctor information is currently unavailable.",
        doctor: "Doctor",
        specialty: "Specialty",
        chatHeading: "How can we help?",
        chatDescription:
          "Ask the OneCare assistant about clinic hours, services, and other clinic information.",
        chatButton: "Chat with OneCare",
      };

  // Existing chatbot functionality - preserved
  useEffect(() => {
    const chat = chatRef.current;

    if (!chat) return;

    const handleBooking = () => navigate("/appointments");

    const handleOpen = () => setChatOpen(true);
    const handleClose = () => setChatOpen(false);

    chat.addEventListener(
      "onecare-chat:book-appointment",
      handleBooking
    );
    chat.addEventListener("onecare-chat:open", handleOpen);
    chat.addEventListener("onecare-chat:close", handleClose);

    return () => {
      chat.removeEventListener(
        "onecare-chat:book-appointment",
        handleBooking
      );
      chat.removeEventListener("onecare-chat:open", handleOpen);
      chat.removeEventListener("onecare-chat:close", handleClose);
    };
  }, [navigate]);

  // New functionality - fetch public doctor information
  useEffect(() => {
    const controller = new AbortController();

    const loadDoctors = async () => {
      setDoctorsLoading(true);
      setDoctorsError(false);

      try {
        const response = await fetch(DOCTORS_API_URL, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          credentials: "omit",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to load doctors");
        }

        const result = await response.json();

        // Supports common API response structures.
        const doctorList = Array.isArray(result)
          ? result
          : Array.isArray(result?.data)
            ? result.data
            : Array.isArray(result?.data?.content)
              ? result.data.content
              : Array.isArray(result?.content)
                ? result.content
                : [];

        if (!controller.signal.aborted) {
          setDoctors(doctorList);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Unable to load doctors:", error);
          setDoctorsError(true);
          setDoctors([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setDoctorsLoading(false);
        }
      }
    };

    loadDoctors();

    return () => controller.abort();
  }, [retryCount]);

  const handleRetryDoctors = () => {
    setRetryCount((previous) => previous + 1);
  };

  const services = [
    {
      icon: "🩺",
      title: content.consultation,
      description: content.consultationDescription,
    },
    {
      icon: "📅",
      title: content.appointments,
      description: content.appointmentsDescription,
    },
    {
      icon: "💬",
      title: content.assistance,
      description: content.assistanceDescription,
    },
  ];

  return (
    <main className="mx-auto max-w-6xl space-y-12 px-4 py-8 sm:px-6 sm:py-12">
      {/* PUB-01: Welcome section */}
      <section className="rounded-2xl bg-blue-50 px-5 py-10 sm:px-10 sm:py-14">
        <div className="max-w-3xl space-y-5">
          <h1 className="text-3xl font-bold leading-tight text-neutral-900 sm:text-4xl lg:text-5xl">
            {content.welcome}
          </h1>

          <p className="text-base leading-relaxed text-neutral-700 sm:text-lg">
            {content.subtitle}
          </p>

          <Button onClick={() => navigate("/appointments")}>
            {content.bookAppointment}
          </Button>
        </div>
      </section>

      {/* PUB-01: Clinic services */}
      <section
        aria-labelledby="services-heading"
        className="space-y-6"
      >
        <div className="space-y-2">
          <h2
            id="services-heading"
            className="text-2xl font-bold text-neutral-900"
          >
            {content.ourServices}
          </h2>

          <p className="text-neutral-600">
            {content.servicesDescription}
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <article
              key={service.title}
              className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm"
            >
              <div
                aria-hidden="true"
                className="mb-4 text-3xl"
              >
                {service.icon}
              </div>

              <h3 className="mb-2 text-lg font-semibold text-neutral-900">
                {service.title}
              </h3>

              <p className="text-sm leading-relaxed text-neutral-600">
                {service.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* PUB-01: Doctor information */}
      <section
        aria-labelledby="doctors-heading"
        className="space-y-6"
      >
        <div className="space-y-2">
          <h2
            id="doctors-heading"
            className="text-2xl font-bold text-neutral-900"
          >
            {content.ourDoctors}
          </h2>

          <p className="text-neutral-600">
            {content.doctorsDescription}
          </p>
        </div>

        {doctorsLoading && (
          <p role="status" className="text-neutral-600">
            {content.loadingDoctors}
          </p>
        )}

        {!doctorsLoading && doctorsError && (
          <div
            role="alert"
            className="space-y-4 rounded-xl border border-red-200 bg-red-50 p-5"
          >
            <p className="text-red-800">
              {content.doctorsError}
            </p>

            <Button onClick={handleRetryDoctors}>
              {content.retry}
            </Button>
          </div>
        )}

        {!doctorsLoading &&
          !doctorsError &&
          doctors.length === 0 && (
            <p className="rounded-xl bg-neutral-50 p-5 text-neutral-600">
              {content.noDoctors}
            </p>
          )}

        {!doctorsLoading &&
          !doctorsError &&
          doctors.length > 0 && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {doctors.map((doctor, index) => {
                const doctorName =
                  doctor.fullName ||
                  doctor.name ||
                  [
                    doctor.firstName,
                    doctor.lastName,
                  ]
                    .filter(Boolean)
                    .join(" ") ||
                  content.doctor;

                const doctorSpecialty =
                  doctor.specialization ||
                  doctor.specialty ||
                  doctor.speciality ||
                  "";

                return (
                  <article
                    key={doctor.id ?? doctor.doctorId ?? index}
                    className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm"
                  >
                    <h3 className="text-lg font-semibold text-neutral-900">
                      {doctorName}
                    </h3>

                    {doctorSpecialty && (
                      <p className="mt-2 text-sm text-neutral-600">
                        {content.specialty}: {doctorSpecialty}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          )}
      </section>

      {/* Existing chatbot functionality - preserved */}
      <section
        aria-labelledby="chat-heading"
        className="space-y-4 rounded-2xl bg-neutral-50 p-6 sm:p-8"
      >
        <h2
          id="chat-heading"
          className="text-2xl font-semibold text-neutral-900"
        >
          {content.chatHeading}
        </h2>

        <p className="text-neutral-600">
          {content.chatDescription}
        </p>

        <Button
          onClick={() => chatRef.current?.open()}
          aria-controls="home-chat"
          aria-expanded={chatOpen}
        >
          {content.chatButton}
        </Button>
      </section>

      <onecare-chat-widget
        ref={chatRef}
        id="home-chat"
        api-url="/api/chatbot/query"
        timeout-ms="90000"
        lang={
          i18n.resolvedLanguage?.startsWith("ta")
            ? "ta"
            : "en"
        }
      />
    </main>
  );
};

export default HomePage;
