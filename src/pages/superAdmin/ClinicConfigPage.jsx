import { useEffect, useMemo, useState } from "react";
import Toast from "../../components/Toast";
import { SuperAdminPageHeader } from "../../features/superAdmin/SuperAdminPageHeader";
import ConsultationFeeCard from "../../features/superAdmin/ConsultationFeeCard";
import DoctorScheduleModal from "../../features/superAdmin/DoctorScheduleModal";
import ClinicConfigStats from "../../features/superAdmin/clinicConfig/ClinicConfigStats";
import DoctorRoster from "../../features/superAdmin/clinicConfig/DoctorRoster";
import {
  createEmptyWeek,
  getHeadlineStats,
  getSlotCount,
  normalizeWeek,
  validateWeek,
} from "../../features/superAdmin/clinicConfig/clinicConfigUtils";
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
          }),
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
                i === index ? { ...s, [field]: value } : s,
              ),
            }
          : d,
      ),
    );

  const addSlot = (dayOfWeek) =>
    setEditDays((cur) =>
      cur.map((d) =>
        d.dayOfWeek === dayOfWeek
          ? { ...d, timeSlots: [...d.timeSlots, { start: "", end: "" }] }
          : d,
      ),
    );

  const removeSlot = (dayOfWeek, index) =>
    setEditDays((cur) =>
      cur.map((d) =>
        d.dayOfWeek === dayOfWeek
          ? { ...d, timeSlots: d.timeSlots.filter((_, i) => i !== index) }
          : d,
      ),
    );

  const clearDay = (dayOfWeek) =>
    setEditDays((cur) =>
      cur.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, timeSlots: [] } : d)),
    );

  const applyPreset = (mutator) => setEditDays((cur) => mutator(cur));

  /* ---- schedule save ---- */
  const saveSchedule = async (doctorId) => {
    setScheduleFormError("");
    setScheduleSaveError(null);

    if (getSlotCount(editDays) === 0) {
      setScheduleFormError(
        "Add at least one time slot — a schedule cannot be empty.",
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
        d.username?.toLowerCase().includes(q),
    );
  }, [doctors, rosterQuery]);

  /* ---- headline stats ---- */
  const headlineStats = useMemo(
    () => getHeadlineStats(doctors, schedulesMap),
    [doctors, schedulesMap],
  );

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

      <ClinicConfigStats
        stats={headlineStats}
        savedConsultationFee={savedConsultationFee}
      />

      <div>
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
      </div>

      <DoctorRoster
        doctors={doctors}
        filteredDoctors={filteredDoctors}
        doctorsStatus={doctorsStatus}
        schedulesMap={schedulesMap}
        justSavedId={justSavedId}
        rosterQuery={rosterQuery}
        onRosterQueryChange={setRosterQuery}
        onRetry={() => setDoctorsReload((current) => current + 1)}
        onStartEdit={startEdit}
      />

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
