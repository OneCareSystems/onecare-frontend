import { useNavigate, useParams } from "react-router-dom";

import Button from "../../components/Button";

/**
 * DOC-04 — Consultation screen (placeholder shell).
 *
 * The ticket's "Start Consultation" action needs a destination, but the
 * clinical workspace itself is not specified yet — so this route only
 * confirms which appointment was opened and links back to the schedule.
 * No patient history, vitals or other clinical data is invented here.
 */
const ConsultationPage = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-3xl py-4 sm:py-6">
      <p className="text-sm font-semibold text-primary-700">Consultation</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">
        Consultation for appointment {appointmentId}
      </h1>
      <p className="mt-4 text-sm text-neutral-600">
        The consultation workspace for this appointment is being built. No
        clinical details are available on this screen yet.
      </p>
      <div className="mt-6">
        <Button
          variant="outline"
          onClick={() => navigate("/doctor/today-schedule")}
        >
          Back to today’s schedule
        </Button>
      </div>
    </div>
  );
};

export default ConsultationPage;
