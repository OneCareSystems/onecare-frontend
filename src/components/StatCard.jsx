import Icon from "./Icon";

/**
 * Summary stat tile: small uppercase label, large value, trailing chip and
 * an accent icon.
 *
 * Accent colours arrive as classes so each caller picks its own token
 * pairing (e.g. iconClass "bg-primary-50 text-primary-700" with chipClass
 * "bg-primary-100 text-primary-800") instead of the component hard-coding
 * a palette.
 */
const StatCard = ({
  label,
  value,
  chip,
  icon,
  iconClass = "bg-primary-50 text-primary-700",
  chipClass = "bg-primary-100 text-primary-800",
  valueClass = "text-neutral-900",
}) => (
  <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs sm:p-5">
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
        {label}
      </span>
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
      >
        <Icon name={icon} className="h-4 w-4" />
      </span>
    </div>
    <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
      <h3 className={`text-2xl font-bold ${valueClass}`}>{value}</h3>
      {chip ? (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${chipClass}`}
        >
          {chip}
        </span>
      ) : null}
    </div>
  </div>
);

export default StatCard;
