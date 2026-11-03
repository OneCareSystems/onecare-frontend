import { memo } from "react";
import ErrorMessage from "../../../components/ErrorMessage";
import Icon from "../../../components/Icon";
import { DAY_LABELS } from "../../../constants/schedule";
import { formatHours, getSlotCount, weeklyHours } from "./clinicConfigUtils";

const hueFromId = (value) => {
  let hue = 0;
  for (const character of String(value ?? "")) {
    hue = (hue * 31 + character.charCodeAt(0)) % 360;
  }
  return hue;
};

const DoctorAvatar = memo(({ name, seed }) => {
  const initials = String(name || "?")
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  const hue = hueFromId(seed ?? name);
  return (
    <span
      aria-hidden="true"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white shadow-xs"
      style={{ backgroundColor: `hsl(${hue} 55% 45%)` }}
    >
      {initials || "?"}
    </span>
  );
});
DoctorAvatar.displayName = "DoctorAvatar";

const WeekStrip = memo(({ days }) => (
  <div
    className="flex items-end gap-1"
    aria-label="Weekly load indicator"
    title="Weekly load"
  >
    {days.map((day) => {
      const count = day.timeSlots.length;
      const height =
        count === 0
          ? "h-1.5"
          : count === 1
            ? "h-3"
            : count === 2
              ? "h-4"
              : "h-5";
      const tone = count === 0 ? "bg-neutral-200" : "bg-primary-500";
      return (
        <span
          key={day.dayOfWeek}
          title={`${DAY_LABELS[day.dayOfWeek]}: ${count} slot${count === 1 ? "" : "s"}`}
          className={`w-1.5 rounded-sm ${height} ${tone}`}
        />
      );
    })}
  </div>
));
WeekStrip.displayName = "WeekStrip";

const DoctorCard = memo(({ doctor, schedule, onStartEdit }) => {
  const totalMinutes = weeklyHours(schedule.days);
  const slotCount = getSlotCount(schedule.days);

  return (
    <article className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xs transition hover:border-neutral-300">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <DoctorAvatar name={doctor.fullName} seed={doctor.userId} />
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-neutral-900">
              {doctor.fullName}
            </h3>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-neutral-500">
              <span className="truncate font-mono">@{doctor.username}</span>
              {schedule.status === "ready" && (
                <>
                  <span className="text-neutral-300">·</span>
                  <span>
                    {slotCount === 0
                      ? "No schedule"
                      : `${formatHours(totalMinutes)} / week`}
                  </span>
                </>
              )}
            </div>
          </div>
          {schedule.status === "ready" && (
            <div className="ml-2 hidden sm:block">
              <WeekStrip days={schedule.days} />
            </div>
          )}
        </div>

        {schedule.status === "ready" && (
          <button
            type="button"
            onClick={() => onStartEdit(doctor)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 shadow-xs transition hover:border-neutral-300 hover:text-neutral-900"
          >
            <Icon name="pencil" className="h-3.5 w-3.5" />
            Edit schedule
          </button>
        )}
      </header>

      <div className="p-4">
        {schedule.status === "loading" ? (
          <div className="animate-pulse grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className="h-20 rounded-lg bg-neutral-100" />
            ))}
          </div>
        ) : schedule.status === "failed" ? (
          <ErrorMessage
            title="Unable to load schedule"
            message={schedule.loadError ?? "Please try again."}
          />
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {schedule.days.map((day) => {
              const isWorking = day.timeSlots.length > 0;
              return (
                <div
                  key={day.dayOfWeek}
                  className={`rounded-lg border p-2 ${
                    isWorking
                      ? "border-primary-200 bg-primary-50/60"
                      : "border-neutral-200 bg-neutral-50/60"
                  }`}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                    {DAY_LABELS[day.dayOfWeek]?.slice(0, 3) ?? day.dayOfWeek}
                  </p>
                  {isWorking ? (
                    <div className="mt-1 space-y-0.5">
                      {day.timeSlots.map((slot, index) => (
                        <p
                          key={index}
                          className="font-mono text-[11px] text-primary-800"
                        >
                          {slot.start}–{slot.end}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-[11px] text-neutral-400">Off</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </article>
  );
});
DoctorCard.displayName = "DoctorCard";

export default DoctorCard;
