import { formatHours } from "./clinicConfigUtils";

const ClinicConfigStats = ({ stats, savedConsultationFee }) => {
  const items = [
    {
      label: "Doctors",
      value: stats.doctorCount,
      hint: `${stats.configured} scheduled`,
    },
    {
      label: "Weekly slots",
      value: stats.totalSlots,
      hint: "All doctors",
    },
    {
      label: "Weekly coverage",
      value: formatHours(stats.totalMinutes),
      hint: "Aggregate hours",
    },
    {
      label: "Consultation fee",
      value: savedConsultationFee
        ? `${Number(savedConsultationFee).toFixed(2)}`
        : "—",
      hint: "Active clinic-wide",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-neutral-200 bg-white p-3.5 shadow-xs"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            {item.label}
          </p>
          <p className="mt-1 text-xl font-semibold text-neutral-900">
            {item.value}
          </p>
          <p className="mt-0.5 text-[11px] text-neutral-500">{item.hint}</p>
        </div>
      ))}
    </div>
  );
};

export default ClinicConfigStats;
