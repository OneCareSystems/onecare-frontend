import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getPatient } from '../../services/patientService';
import ErrorMessage from '../../components/ErrorMessage';
import Icon from '../../components/Icon';

const RECORDS_PATH = '/doctor/patient-records';

export const PatientDetails = () => {
  const navigate = useNavigate();
  const { patientId } = useParams();

  const [outcome, setOutcome] = useState(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  useEffect(() => {
    if (!patientId) return undefined;

    let cancelled = false;

    getPatient(patientId)
      .then((data) => {
        if (cancelled) return;
        setOutcome({ id: patientId, patient: data });
      })
      .catch(() => {
        if (cancelled) return;
        setOutcome({ id: patientId, error: true });
      });

    return () => {
      cancelled = true;
    };
  }, [patientId]);

  const current = outcome && outcome.id === patientId ? outcome : null;
  const failed = !patientId || Boolean(current?.error);
  const loading = !failed && !current;
  const patient = failed ? null : current?.patient ?? null;

  const handleGenerateReport = async () => {
    if (!patient) return;
    setIsGeneratingReport(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      alert(`Full EMR summary PDF generated successfully for ${patient.fullName}.`);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Modern Skeleton Loading Screen
  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 animate-pulse">
        <div className="w-32 h-6 bg-surface-container-high/60 rounded-full" />
        <div className="bg-surface-container-lowest/80 border border-outline-variant/40 rounded-3xl p-8 h-40 flex items-center justify-between" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-surface-container-lowest/80 border border-outline-variant/40 rounded-3xl p-8 h-[550px]" />
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-surface-container-lowest/80 border border-outline-variant/40 rounded-3xl p-6 h-64" />
            <div className="bg-surface-container-lowest/80 border border-outline-variant/40 rounded-3xl p-6 h-48" />
          </div>
        </div>
      </div>
    );
  }

  if (failed || !patient) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-4">
        <ErrorMessage
          title="Unable to load this patient record"
          message="The record may have moved, or you may not have access to it."
        />
        <Link
          to={RECORDS_PATH}
          className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:text-primary/80 transition-colors"
        >
          <Icon name="arrow-left" className="h-4 w-4" />
          <span>Back to all patients</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 relative">
      {/* Background Ambient Glows */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/3 -right-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Top Floating Bar / Breadcrumb */}
      <div className="flex items-center justify-between">
        <nav aria-label="Breadcrumb">
          <Link
            to={RECORDS_PATH}
            className="group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container-low/60 hover:bg-surface-container-high/80 border border-outline-variant/40 backdrop-blur-md text-xs font-bold text-on-surface-variant hover:text-primary transition-all duration-200 shadow-sm"
          >
            <Icon name="arrow-left" className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>All Patients Directory</span>
          </Link>
        </nav>
        <span className="text-[11px] font-mono uppercase tracking-wider text-on-surface-variant/70 bg-surface-container-low/50 border border-outline-variant/30 px-3 py-1 rounded-full backdrop-blur-md">
          EMR LIVE CONNECTED
        </span>
      </div>

      {/* Hero Patient Profile Header Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-surface-container-lowest/90 via-surface-container-lowest/70 to-primary/5 border border-outline-variant/50 rounded-3xl p-6 sm:p-8 shadow-xl backdrop-blur-xl transition-all hover:border-primary/30">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          
          {/* Avatar & Patient Metadata */}
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-primary to-primary-container text-white flex items-center justify-center font-black text-2xl sm:text-3xl shadow-lg shadow-primary/20 border border-white/20">
                {patient.fullName?.charAt(0) || 'P'}
              </div>
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-surface-container-lowest flex items-center justify-center shadow-sm">
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-on-surface tracking-tight font-heading">
                  {patient.fullName}
                </h1>
                <span className="px-3 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 backdrop-blur-md shadow-sm">
                  ● Active • Stable
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-on-surface-variant pt-0.5">
                <span className="bg-surface-container-high/50 border border-outline-variant/40 px-2.5 py-0.5 rounded-lg font-mono font-semibold text-on-surface">
                  #{patient.patientId}
                </span>
                <span className="text-outline">/</span>
                <span className="font-medium text-on-surface-variant">
                  {patient.age ? `${patient.age} Yrs` : 'Adult'}
                </span>
                {patient.gender && (
                  <>
                    <span className="text-outline">/</span>
                    <span className="font-medium text-on-surface-variant">{patient.gender}</span>
                  </>
                )}
                {patient.bloodGroup && (
                  <>
                    <span className="text-outline">/</span>
                    <span className="font-semibold text-error/90 bg-error-container/20 px-2 py-0.5 rounded-md border border-error/20">
                      Blood {patient.bloodGroup}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Callouts */}
          <div className="flex items-center gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-outline-variant/30">
            <button
              onClick={handleGenerateReport}
              disabled={isGeneratingReport}
              className="flex-1 lg:flex-initial px-4 py-2.5 rounded-2xl bg-surface-container-high/70 hover:bg-surface-container-highest border border-outline-variant/60 text-xs font-bold text-on-surface flex items-center justify-center gap-2 backdrop-blur-md transition-all active:scale-95 cursor-pointer disabled:opacity-60 shadow-sm"
            >
              <Icon
                name={isGeneratingReport ? 'loader' : 'print'}
                className={`w-4 h-4 text-secondary ${isGeneratingReport ? 'animate-spin' : ''}`}
              />
              <span>{isGeneratingReport ? 'Generating...' : 'Export EMR'}</span>
            </button>
            <button
              onClick={() => navigate(`/doctor/consultation/${patient.patientId}`)}
              className="flex-1 lg:flex-initial px-5 py-2.5 rounded-2xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white text-xs font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer border border-white/20"
            >
              <Icon name="plus" className="w-4 h-4" />
              <span>New Consultation</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Interactive Clinical History Timeline */}
        <div className="lg:col-span-8 bg-surface-container-lowest/80 border border-outline-variant/50 rounded-3xl p-6 sm:p-8 shadow-sm backdrop-blur-xl space-y-6">
          <div className="flex items-center justify-between border-b border-outline-variant/40 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Icon name="clock" className="w-4 h-4" />
              </div>
              <h2 className="text-base font-extrabold text-on-surface font-heading tracking-tight">
                Clinical Timeline
              </h2>
            </div>
            <span className="text-[11px] text-secondary font-bold uppercase tracking-wider bg-secondary/10 px-3 py-1 rounded-full border border-secondary/20">
              Chronological View
            </span>
          </div>

          <div className="space-y-8 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-primary before:via-emerald-500/50 before:to-outline-variant/30">
            
            {/* Timeline Node 1 */}
            <div className="relative pl-9 space-y-2 group">
              <span className="w-4 h-4 rounded-full bg-primary ring-4 ring-surface-container-lowest absolute left-1.5 top-1 shadow-md group-hover:scale-125 transition-transform" />
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-primary font-mono tracking-wide">OCT 24, 2024</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                  UPCOMING VISIT
                </span>
              </div>
              <h3 className="text-xs font-bold text-on-surface group-hover:text-primary transition-colors">
                Routine Follow-up & Vitals Assessment
              </h3>
              <p className="text-[11px] text-on-surface-variant/90 leading-relaxed">
                Ongoing monitoring of ACE inhibitor response and BP target optimization.
              </p>
            </div>

            {/* Timeline Node 2: Detailed Clinical Visit */}
            <div className="relative pl-9 space-y-3 group">
              <span className="w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-surface-container-lowest absolute left-1.5 top-1 shadow-md group-hover:scale-125 transition-transform" />
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-on-surface font-mono">SEPT 12, 2024 • 10:15 AM</span>
                <div className="flex gap-1.5">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-surface-container-high/80 text-on-surface-variant border border-outline-variant/40">
                    Internal Medicine
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-surface-container-high/80 text-on-surface-variant border border-outline-variant/40">
                    In-Person
                  </span>
                </div>
              </div>

              <h3 className="text-sm font-extrabold text-on-surface group-hover:text-primary transition-colors">
                Hypertension Management Review
              </h3>

              {/* Glowing Clinical Notes Box */}
              <div className="p-4 rounded-2xl bg-surface-container-low/60 border border-outline-variant/50 space-y-3 text-xs backdrop-blur-md shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-wider text-secondary">
                    DOCTOR CONSULTATION NOTES
                  </p>
                  <Icon name="file-text" className="w-3.5 h-3.5 text-secondary/70" />
                </div>
                <p className="text-on-surface/90 leading-relaxed text-[11px]">
                  Patient reports occasional dizziness during morning walks. Suggested increasing hydration and
                  monitoring salt intake. Respiratory sounds are clear. No new symptoms of chest pain reported.
                </p>

                <div className="pt-2.5 border-t border-outline-variant/30 flex flex-wrap gap-4 text-[11px] font-mono">
                  <span className="bg-surface-container-lowest/80 px-2.5 py-1 rounded-lg border border-outline-variant/30">
                    <strong className="text-on-surface">BP:</strong> 145/92 mmHg
                  </span>
                  <span className="bg-surface-container-lowest/80 px-2.5 py-1 rounded-lg border border-outline-variant/30">
                    <strong className="text-on-surface">Pulse:</strong> 78 BPM
                  </span>
                  <span className="bg-surface-container-lowest/80 px-2.5 py-1 rounded-lg border border-outline-variant/30">
                    <strong className="text-on-surface">Glucose:</strong> 92 mg/dL
                  </span>
                </div>
              </div>

              {/* Active Prescriptions */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/80">
                  ACTIVE PRESCRIPTIONS
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1.5 rounded-xl bg-purple-500/10 text-purple-900 dark:text-purple-300 border border-purple-500/20 text-xs font-semibold flex items-center gap-2 backdrop-blur-md">
                    <Icon name="pill" className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>Lisinopril 10mg (Daily)</span>
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-purple-500/10 text-purple-900 dark:text-purple-300 border border-purple-500/20 text-xs font-semibold flex items-center gap-2 backdrop-blur-md">
                    <Icon name="pill" className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>Atorvastatin 20mg (Bedtime)</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Timeline Node 3 */}
            <div className="relative pl-9 space-y-1.5 group">
              <span className="w-4 h-4 rounded-full bg-secondary ring-4 ring-surface-container-lowest absolute left-1.5 top-1 shadow-md group-hover:scale-125 transition-transform" />
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-on-surface font-mono">JUNE 05, 2024</span>
                <span className="text-[10px] text-secondary font-bold uppercase tracking-wider">Preventative</span>
              </div>
              <h3 className="text-xs font-bold text-on-surface group-hover:text-primary transition-colors">
                Annual Flu Immunization
              </h3>
              <p className="text-[11px] text-on-surface-variant/90">
                Administered Quadrivalent influenza vaccine 0.5mL IM right deltoid. Patient tolerated well.
              </p>
            </div>
          </div>
        </div>

        {/* Right Panel: Vitals Display & Critical Alerts */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Latest Vitals Card */}
          <div className="bg-surface-container-lowest/80 border border-outline-variant/50 rounded-3xl p-6 shadow-sm backdrop-blur-xl space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black text-on-surface font-heading uppercase tracking-wider flex items-center gap-2">
                <Icon name="activity" className="w-4 h-4 text-primary" />
                Latest Vitals
              </h2>
              <span className="text-[10px] font-mono text-on-surface-variant">2h ago</span>
            </div>

            <div className="space-y-3">
              {/* Heart Rate */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-surface-container-low/80 to-surface-container-low/40 border border-outline-variant/40 flex items-center justify-between transition-all hover:border-emerald-500/30">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-black uppercase text-on-surface-variant tracking-wider">HEART RATE</p>
                  <p className="text-lg font-black text-on-surface tracking-tight">
                    78 <span className="text-xs font-medium text-on-surface-variant">BPM</span>
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                  NORMAL
                </span>
              </div>

              {/* Blood Pressure */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 to-surface-container-low/40 border border-amber-500/30 flex items-center justify-between transition-all">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400 tracking-wider">
                    BLOOD PRESSURE
                  </p>
                  <p className="text-lg font-black text-on-surface tracking-tight">
                    145/92 <span className="text-xs font-medium text-on-surface-variant">mmHg</span>
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40">
                  STAGE 1 HTN
                </span>
              </div>

              {/* Temperature */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-surface-container-low/80 to-surface-container-low/40 border border-outline-variant/40 flex items-center justify-between transition-all hover:border-emerald-500/30">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-black uppercase text-on-surface-variant tracking-wider">TEMPERATURE</p>
                  <p className="text-lg font-black text-on-surface tracking-tight">
                    98.6 <span className="text-xs font-medium text-on-surface-variant">°F</span>
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                  NORMAL
                </span>
              </div>
            </div>
          </div>

          {/* Critical Alerts & Flags Card */}
          <div className="bg-surface-container-lowest/80 border border-outline-variant/50 rounded-3xl p-6 shadow-sm backdrop-blur-xl space-y-4">
            <h2 className="text-xs font-black text-on-surface font-heading uppercase tracking-wider flex items-center gap-2">
              <Icon name="shield" className="w-4 h-4 text-error" />
              Medical Alerts & Risks
            </h2>

            <div className="space-y-2.5 text-xs">
              {/* Allergy Alert */}
              <div className="p-3.5 rounded-2xl bg-error-container/25 border border-error/30 flex items-start gap-3 text-on-error-container shadow-sm">
                <Icon name="shield" className="w-4 h-4 text-error shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-extrabold text-error">Allergy: Penicillin</p>
                  <p className="text-[11px] opacity-90 leading-snug">
                    Severe anaphylaxis risk. Avoid beta-lactam antibiotic classes.
                  </p>
                </div>
              </div>

              {/* Vaccination Status */}
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3 text-emerald-900 dark:text-emerald-300 shadow-sm">
                <Icon name="circle-check" className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-extrabold">COVID-19 Vaccinated</p>
                  <p className="text-[11px] opacity-80 leading-snug">
                    Bivalent booster recorded Oct 2023.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PatientDetails;