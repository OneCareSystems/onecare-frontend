import Button from "../../../components/Button";
import ErrorMessage from "../../../components/ErrorMessage";
import Icon from "../../../components/Icon";
import DoctorCard from "./DoctorCard";
import { createEmptyWeek } from "./clinicConfigUtils";

const DoctorRoster = ({
  doctors,
  filteredDoctors,
  doctorsStatus,
  schedulesMap,
  justSavedId,
  rosterQuery,
  onRosterQueryChange,
  onRetry,
  onStartEdit,
}) => (
  <section className="space-y-4 lg:col-span-2">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-sm font-semibold text-neutral-900">
          Doctor working schedules
        </h2>
        <p className="text-xs text-neutral-500">
          {filteredDoctors.length === doctors.length
            ? `${doctors.length} doctors`
            : `${filteredDoctors.length} of ${doctors.length} shown`}
        </p>
      </div>
      <div className="relative">
        <input
          type="search"
          value={rosterQuery}
          onChange={(event) => onRosterQueryChange(event.target.value)}
          placeholder="Filter doctors…"
          className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-900 shadow-xs placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 sm:w-56"
        />
      </div>
    </div>

    {doctorsStatus === "failed" ? (
      <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-xs">
        <ErrorMessage
          title="Unable to load doctors"
          message="The staff directory could not be fetched."
        />
        <Button variant="outline" onClick={onRetry}>
          <Icon name="refresh" className="mr-1 h-3.5 w-3.5" /> Retry
        </Button>
      </div>
    ) : doctorsStatus === "loading" ? (
      <div className="animate-pulse space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-28 rounded-2xl border border-neutral-200 bg-neutral-50"
          />
        ))}
      </div>
    ) : doctors.length === 0 ? (
      <p className="rounded-2xl border border-dashed border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500">
        No doctors provisioned yet.
      </p>
    ) : (
      <div className="space-y-3">
        {filteredDoctors.map((doctor) => (
          <div
            key={doctor.userId}
            className={
              justSavedId === doctor.userId
                ? "animate-[pulse-once_1s_ease-out]"
                : ""
            }
          >
            <DoctorCard
              doctor={doctor}
              schedule={
                schedulesMap[doctor.userId] ?? {
                  status: "loading",
                  days: createEmptyWeek(),
                }
              }
              onStartEdit={onStartEdit}
            />
          </div>
        ))}
      </div>
    )}
  </section>
);

export default DoctorRoster;
