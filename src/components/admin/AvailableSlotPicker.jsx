import useWorkflowResource from "../../hooks/useWorkflowResource";
import { availableSlots } from "../../services/adminWorkflowService";
import { validDate, workflowError } from "../../utils/adminWorkflows";
import Button from "../Button";
import ErrorMessage from "../ErrorMessage";
import LoadingSpinner from "../LoadingSpinner";
import { clinicToday, isFutureClinicSlot } from "../../utils/clinicTime";

const loadSlots = ({ doctorId, date, signal }) =>
  availableSlots(doctorId, date, { signal });
function SlotOptions({
  doctorId,
  date,
  value,
  onChange,
  refreshKey,
  disabled,
}) {
  const { data, error, loading } = useWorkflowResource(
    loadSlots,
    { doctorId, date },
    refreshKey,
  );
  const slots = (data ?? []).filter((slot) => isFutureClinicSlot(date, slot));
  return (
    <div className="space-y-3" aria-busy={loading}>
      {loading && <LoadingSpinner label="Loading available slots" />}
      {error && (
        <ErrorMessage message={workflowError(error, "load available slots")} />
      )}
      {!loading && !error && slots.length === 0 && (
        <p role="status">No available slots. Choose another date.</p>
      )}
      <div
        className="grid grid-cols-3 gap-2 sm:grid-cols-4"
        role="group"
        aria-label="Available time slots"
      >
        {!error &&
          slots.map((slot) => (
            <Button
              key={slot}
              variant={value === slot ? "primary" : "outline"}
              size="sm"
              aria-pressed={value === slot}
              disabled={disabled || loading}
              onClick={() => onChange(slot)}
            >
              {slot}
            </Button>
          ))}
      </div>
      {value && !loading && !slots.includes(value) && (
        <p role="alert">
          The selected time is no longer available. Choose another time.
        </p>
      )}
    </div>
  );
}
export default function AvailableSlotPicker(props) {
  if (validDate(props.date) && props.date < clinicToday())
    return <p role="alert">Appointment date cannot be in the past.</p>;
  return props.doctorId && validDate(props.date) ? (
    <SlotOptions key={`${props.doctorId}:${props.date}`} {...props} />
  ) : (
    <p className="text-sm text-neutral-600">
      Select a doctor and date to see available time slots.
    </p>
  );
}
