import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import Button from "../../components/Button";
import "../../components/chatbot/onecare-chat-widget.js";

const HomePage = () => {
  const navigate = useNavigate();
  const chatRef = useRef(null);
  const [chatOpen, setChatOpen] = useState(false);
  const { i18n } = useTranslation();

  useEffect(() => {
    const chat = chatRef.current;
    const handleBooking = () => navigate("/appointments"); // Placeholder until the booking page is implemented.
    chat.addEventListener("onecare-chat:book-appointment", handleBooking);
    const handleOpen = () => setChatOpen(true);
    const handleClose = () => setChatOpen(false);
    chat.addEventListener("onecare-chat:open", handleOpen);
    chat.addEventListener("onecare-chat:close", handleClose);
    return () => {
      chat.removeEventListener("onecare-chat:book-appointment", handleBooking);
      chat.removeEventListener("onecare-chat:open", handleOpen);
      chat.removeEventListener("onecare-chat:close", handleClose);
    };
  }, [navigate]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <h1 className="text-3xl font-bold text-neutral-900">Welcome to OneCare</h1>
      <section aria-labelledby="chat-heading" className="space-y-3">
        <h2 id="chat-heading" className="text-xl font-semibold text-neutral-900">
          How can we help?
        </h2>
        <p className="text-neutral-600">
          Ask the OneCare assistant about clinic hours, services, and other clinic information.
        </p>
        <Button
          onClick={() => chatRef.current?.open()}
          aria-controls="home-chat"
          aria-expanded={chatOpen}
        >
          Chat with OneCare
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
};

export default HomePage;
