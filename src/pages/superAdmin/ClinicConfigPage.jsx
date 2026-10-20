import { useEffect, useMemo, useRef, useState, memo } from "react";
import Button from "../../components/Button";
import ErrorMessage from "../../components/ErrorMessage";
import Icon from "../../components/Icon";
import Toast from "../../components/Toast";
import { SuperAdminPageHeader } from "../../features/superAdmin/SuperAdminPageHeader";
import ConsultationFeeCard from "../../features/superAdmin/ConsultationFeeCard";
import DoctorScheduleModal from "../../features/superAdmin/DoctorScheduleModal";
import {
  DAY_LABELS,
  WORKING_DAYS,
  isValidTime,
} from "../../constants/schedule";
import {
  extractConflictSlots,
  getDoctorSchedule,
  setDoctorSchedule,
} from "../../services/doctorScheduleService";
import { getUsers } from "../../services/userService";
import {
  getConsultationFee,
  updateConsultationFee,
} from "../../services/systemSettingService";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const createEmptyWeek = () =>
  WORKING_DAYS.map((dayOfWeek) => ({ dayOfWeek, timeSlots: [] }));

const normalizeWeek = (days = []) =>
  WORKING_DAYS.map((dayOfWeek) => ({
    dayOfWeek,
    timeSlots: (
      days.find((day) => day.dayOfWeek === dayOfWeek)?.timeSlots ?? []
    ).map((slot) => ({ start: slot.start, end: slot.end })),
  }));

const getSlotCount = (days) =>
  days.reduce((total, day) => total + day.timeSlots.length, 0);

const minutesBetween = (a, b) => {
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  return bh * 60 + bm - (ah * 60 + am);
};

const weeklyHours = (days) =>
  days.reduce(
    (sum, d) =>
      sum +
      d.timeSlots.reduce(
        (ds, s) =>
          isValidTime(s.start) && isValidTime(s.end)
            ? ds + Math.max(0, minutesBetween(s.start, s.end))
            : ds,
        0
      ),
    0
  );

const fmtHours = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
};

const overlaps = (a, b) => a.start < b.end && b.start < a.end;

/** Group slots by day, detect overlaps per day. */
const validateWeek = (days) => {
  const errors = [];
  for (const day of days) {
    const slots = day.timeSlots;
    if (slots.some((s) => !isValidTime(s.start) || !isValidTime(s.end))) {
      errors.push({
        dayOfWeek: day.dayOfWeek,
        message: `${DAY_LABELS[day.dayOfWeek]}: every slot needs a valid start and end.`,
      });
      continue;
    }
    if (slots.some((s) => s.end <= s.start)) {
      errors.push({
        dayOfWeek: day.dayOfWeek,
        message: `${DAY_LABELS[day.dayOfWeek]}: each slot must end after it starts.`,
      });
      continue;
    }
    const sorted = [...slots].sort((a, b) => a.start.localeCompare(b.start));
    for (let i = 1; i < sorted.length; i++) {
      if (overlaps(sorted[i - 1], sorted[i])) {
        errors.push({
          dayOfWeek: day.dayOfWeek,
          message: `${DAY_LABELS[day.dayOfWeek]}: time slots cannot overlap.`,
        });
        break;
      }
    }
  }
  return errors;
};

/* ------------------------------------------------------------------ */
/* Visual primitives                                                   */
/* ------------------------------------------------------------------ */

const hueFromId = (s) => {
  let h = 0;
  for (const ch of String(s ?? "")) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
};

const DoctorAvatar = memo(({ name, seed }) => {
  const initials = String(name || "?")
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
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

/** 7-dot strip showing which days have hours and the size of each slot block. */
const WeekStrip = memo(({ days }) => (
  <div
    className="flex items-end gap-1"
    aria-label="Weekly load indicator"
    title="Weekly load"
  >
    {days.map((d) => {
      const count = d.timeSlots.length;
      const height = count === 0 ? "h-1.5" : count === 1 ? "h-3" : count === 2 ? "h-4" : "h-5";
      const tone =
        count === 0
          ? "bg-neutral-200"
          : "bg-primary-500";
      return (
        <span
          key={d.dayOfWeek}
          title={`${DAY_LABELS[d.dayOfWeek]}: ${count} slot${count === 1 ? "" : "s"}`}
          className={`w-1.5 rounded-sm ${height} ${tone}`}
        />
      );
    })}
  </div>
));
WeekStrip.displayName = "WeekStrip";


/* ------------------------------------------------------------------ */
/* Doctor card                                                         */
/* ------------------------------------------------------------------ */

const DoctorCard = memo(
  ({
    doctor,
    schedule,
    onStartEdit,
  }) => {
    const totalMinutes = weeklyHours(schedule.days);
    const slotCount = getSlotCount(schedule.days);

    return (
      <article
        className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xs transition hover:border-neutral-300"
      >
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
                        : `${fmtHours(totalMinutes)} / week`}
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
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-20 rounded-lg bg-neutral-100" />
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
                    className={`rounded-lg border p-2 ${isWorking
                        ? "border-primary-200 bg-primary-50/60"
                        : "border-neutral-200 bg-neutral-50/60"
                      }`}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                      {DAY_LABELS[day.dayOfWeek]?.slice(0, 3) ?? day.dayOfWeek}
                    </p>
                    {isWorking ? (
                      <div className="mt-1 space-y-0.5">
                        {day.timeSlots.map((s, i) => (
                          <p
                            key={i}
                            className="font-mono text-[11px] text-primary-800"
                          >
                            {s.start}–{s.end}
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
  }
);
DoctorCard.displayName = "DoctorCard";

/* ------------------------------------------------------------------ */
/* Main page                                                           */
/* ------------------------------------------------------------------ */

const ClinicConfigPage = () => {
  const [toast, setToast] = useState(null);

  const [doctors, setDoctors] = useState([]);
  const [doctorsStatus, setDoctorsStatus] = useState("loading");
  const [doctorsReload, setDoctorsReload] = useState(0);
  const [schedulesMap, setSchedulesMap] = useState({});

  const [editingDoctorId, setEditingDoctorId] = useState(null);
  const [editDays, setEditDays] = useState(createEmptyWeek);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleFormError, setScheduleFormError] = useState("");
  const [scheduleSaveError, setScheduleSaveError] = useState(null);
  const [justSavedId, setJustSavedId] = useState(null);

  const [rosterQuery, setRosterQuery] = useState("");

  const [consultationFee, setConsultationFee] = useState("");
  const [savedConsultationFee, setSavedConsultationFee] = useState("");
  const [feeStatus, setFeeStatus] = useState("loading");
  const [feeReload, setFeeReload] = useState(0);
  const [feeSaving, setFeeSaving] = useState(false);
  const [feeError, setFeeError] = useState("");

  const rosterSearchRef = useRef(null);

  /* ---- load fee ---- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setFeeStatus("loading");
      setFeeError("");
      try {
        const res = await getConsultationFee();
        if (cancelled) return;
        const fee = String(res.consultationFee ?? "");
        setConsultationFee(fee);
        setSavedConsultationFee(fee);
        setFeeStatus("ready");
      } catch (e) {
        if (cancelled) return;
        setFeeError(e?.userMessage ?? "Could not load fee.");
        setFeeStatus("failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [feeReload]);

  /* ---- load doctors + schedules ---- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setDoctorsStatus("loading");
      try {
        const users = await getUsers();
        if (cancelled) return;
        const docs = users.filter((u) => u.role === "DOCTOR");
        setDoctors(docs);
        setDoctorsStatus("ready");

        const initial = {};
        docs.forEach((d) => {
          initial[d.userId] = {
            status: "loading",
            days: createEmptyWeek(),
            loadError: null,
          };
        });
        setSchedulesMap(initial);

        await Promise.all(
          docs.map(async (d) => {
            try {
              const schedule = await getDoctorSchedule(d.userId);
              if (cancelled) return;
              setSchedulesMap((p) => ({
                ...p,
                [d.userId]: {
                  status: "ready",
                  days: normalizeWeek(schedule.days),
                  loadError: null,
                },
              }));
            } catch (e) {
              if (cancelled) return;
              setSchedulesMap((p) => ({
                ...p,
                [d.userId]: {
                  status: "failed",
                  days: createEmptyWeek(),
                  loadError: e?.userMessage ?? "Could not load schedule.",
                },
              }));
            }
          })
        );
      } catch {
        if (!cancelled) setDoctorsStatus("failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [doctorsReload]);

  /* ---- fee save ---- */
  const handleFeeSave = async (e) => {
    e.preventDefault();
    setFeeError("");
    const trimmed = consultationFee.trim();
    if (!trimmed) return setFeeError("Enter a consultation fee.");
    const amount = Number(trimmed);
    if (!Number.isFinite(amount) || amount < 0)
      return setFeeError("Enter a valid fee ≥ 0.");
    setFeeSaving(true);
    try {
      const res = await updateConsultationFee(amount);
      const updated = String(res.consultationFee);
      setConsultationFee(updated);
      setSavedConsultationFee(updated);
      setToast({ type: "success", message: "Consultation fee updated." });
    } catch (e) {
      setFeeError(e?.userMessage ?? "Could not update fee.");
    } finally {
      setFeeSaving(false);
    }
  };

  /* ---- schedule edit handlers ---- */
  const startEdit = (doctor) => {
    const s = schedulesMap[doctor.userId];
    setEditingDoctorId(doctor.userId);
    setEditDays(normalizeWeek(s?.days));
    setScheduleFormError("");
    setScheduleSaveError(null);
  };

  const cancelEdit = () => {
    setEditingDoctorId(null);
    setEditDays(createEmptyWeek());
    setScheduleFormError("");
    setScheduleSaveError(null);
  };

  const changeSlot = (dayOfWeek, index, field, value) =>
    setEditDays((cur) =>
      cur.map((d) =>
        d.dayOfWeek === dayOfWeek
          ? {
            ...d,
            timeSlots: d.timeSlots.map((s, i) =>
              i === index ? { ...s, [field]: value } : s
            ),
          }
          : d
      )
    );

  const addSlot = (dayOfWeek) =>
    setEditDays((cur) =>
      cur.map((d) =>
        d.dayOfWeek === dayOfWeek
          ? { ...d, timeSlots: [...d.timeSlots, { start: "", end: "" }] }
          : d
      )
    );

  const removeSlot = (dayOfWeek, index) =>
    setEditDays((cur) =>
      cur.map((d) =>
        d.dayOfWeek === dayOfWeek
          ? { ...d, timeSlots: d.timeSlots.filter((_, i) => i !== index) }
          : d
      )
    );

  const clearDay = (dayOfWeek) =>
    setEditDays((cur) =>
      cur.map((d) =>
        d.dayOfWeek === dayOfWeek ? { ...d, timeSlots: [] } : d
      )
    );

  const applyPreset = (mutator) => setEditDays((cur) => mutator(cur));

  /* ---- schedule save ---- */
  const saveSchedule = async (doctorId) => {
    setScheduleFormError("");
    setScheduleSaveError(null);

    if (getSlotCount(editDays) === 0) {
      setScheduleFormError(
        "Add at least one time slot — a schedule cannot be empty."
      );
      return;
    }

    const errors = validateWeek(editDays);
    if (errors.length > 0) {
      setScheduleFormError(errors[0].message);
      return;
    }

    setSavingSchedule(true);
    try {
      const updated = await setDoctorSchedule(doctorId, { days: editDays });
      setSchedulesMap((p) => ({
        ...p,
        [doctorId]: {
          status: "ready",
          days: normalizeWeek(updated.days),
          loadError: null,
        },
      }));
      const doc = doctors.find((d) => d.userId === doctorId);
      setToast({
        type: "success",
        message: `Schedule saved for ${doc?.fullName ?? "doctor"}.`,
      });
      setJustSavedId(doctorId);
      setTimeout(() => setJustSavedId(null), 1200);
      setEditingDoctorId(null);
    } catch (e) {
      setScheduleSaveError({
        message:
          e?.userMessage ??
          e?.message ??
          "Could not save schedule. No changes saved.",
        conflicts: extractConflictSlots(e),
      });
    } finally {
      setSavingSchedule(false);
    }
  };

  /* ---- roster filter ---- */
  const filteredDoctors = useMemo(() => {
    const q = rosterQuery.trim().toLowerCase();
    if (!q) return doctors;
    return doctors.filter(
      (d) =>
        d.fullName?.toLowerCase().includes(q) ||
        d.username?.toLowerCase().includes(q)
    );
  }, [doctors, rosterQuery]);

  /* ---- headline stats ---- */
  const headlineStats = useMemo(() => {
    let configured = 0;
    let totalSlots = 0;
    let totalMinutes = 0;
    for (const d of doctors) {
      const s = schedulesMap[d.userId];
      if (s?.status === "ready") {
        const n = getSlotCount(s.days);
        if (n > 0) configured++;
        totalSlots += n;
        totalMinutes += weeklyHours(s.days);
      }
    }
    return {
      doctorCount: doctors.length,
      configured,
      totalSlots,
      totalMinutes,
    };
  }, [doctors, schedulesMap]);

  /* ---- render ---- */
  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      {/* Hero */}
      <SuperAdminPageHeader
        icon="settings"
        badgeText="Clinic configuration · Operations"
        title="Operations & Availability"
        description="Fee structure and doctor working schedules — what the clinic charges and when it's open."
      />

      {/* Headline stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Doctors",
            value: headlineStats.doctorCount,
            hint: `${headlineStats.configured} scheduled`,
            tone: "primary",
          },
          {
            label: "Weekly slots",
            value: headlineStats.totalSlots,
            hint: "All doctors",
            tone: "teal",
          },
          {
            label: "Weekly coverage",
            value: fmtHours(headlineStats.totalMinutes),
            hint: "Aggregate hours",
            tone: "emerald",
          },
          {
            label: "Consultation fee",
            value: savedConsultationFee ? `$${Number(savedConsultationFee).toFixed(2)}` : "—",
            hint: "Active clinic-wide",
            tone: "amber",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-neutral-200 bg-white p-3.5 shadow-xs"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              {s.label}
            </p>
            <p className="mt-1 text-xl font-semibold text-neutral-900">
              {s.value}
            </p>
            <p className="mt-0.5 text-[11px] text-neutral-500">{s.hint}</p>
          </div>
        ))}
      </div>

      {/* Two-column: fee + roster */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <ConsultationFeeCard
            status={feeStatus}
            fee={consultationFee}
            setFee={setConsultationFee}
            saved={savedConsultationFee}
            saving={feeSaving}
            error={feeError}
            onSave={handleFeeSave}
            onRetry={() => setFeeReload((k) => k + 1)}
          />
        </div>

        <div className="space-y-4 lg:col-span-2">
          {/* Roster heading + search */}
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
                ref={rosterSearchRef}
                type="search"
                value={rosterQuery}
                onChange={(e) => setRosterQuery(e.target.value)}
                placeholder="Filter doctors…"
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-900 shadow-xs placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 sm:w-56"
              />
            </div>
          </div>

          {/* Roster */}
          {doctorsStatus === "failed" ? (
            <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-xs">
              <ErrorMessage
                title="Unable to load doctors"
                message="The staff directory could not be fetched."
              />
              <Button
                variant="outline"
                onClick={() => setDoctorsReload((k) => k + 1)}
              >
                <Icon name="refresh" className="mr-1 h-3.5 w-3.5" /> Retry
              </Button>
            </div>
          ) : doctorsStatus === "loading" ? (
            <div className="animate-pulse space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
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
              {filteredDoctors.map((doc) => (
                <div
                  key={doc.userId}
                  className={
                    justSavedId === doc.userId
                      ? "animate-[pulse-once_1s_ease-out]"
                      : ""
                  }
                >
                  <DoctorCard
                    doctor={doc}
                    schedule={
                      schedulesMap[doc.userId] ?? {
                        status: "loading",
                        days: createEmptyWeek(),
                      }
                    }
                    onStartEdit={startEdit}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Schedule Edit Modal */}
      <DoctorScheduleModal
        isOpen={Boolean(editingDoctorId)}
        onClose={cancelEdit}
        doctor={doctors.find((d) => d.userId === editingDoctorId)}
        days={editDays}
        onChangeSlot={changeSlot}
        onAddSlot={addSlot}
        onRemoveSlot={removeSlot}
        onClearDay={clearDay}
        onApplyPreset={applyPreset}
        onSave={() => saveSchedule(editingDoctorId)}
        saving={savingSchedule}
        formError={scheduleFormError}
        saveError={scheduleSaveError}
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
          duration={5000}
          className="fixed bottom-4 right-4 z-50 max-w-sm shadow-xl"
        />
      )}
    </div>
  );
};

export default ClinicConfigPage;