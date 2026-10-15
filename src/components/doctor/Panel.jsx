import { useId } from "react";

import Button from "../Button";
import ErrorMessage from "../ErrorMessage";
import Icon from "../Icon";

/** Heading for a section that is not wrapped in a Panel (tables, stat grids). */
export const SectionTitle = ({ id, children, aside }) => (
  <div className="mb-3 flex items-center justify-between gap-3">
    <h2 id={id} className="text-base font-semibold text-neutral-900">
      {children}
    </h2>
    {aside}
  </div>
);

/** The single card style used across the doctor module. */
export const Panel = ({
  icon,
  title,
  titleId,
  aside,
  children,
  padded = true,
  className = "",
  bodyClassName = "space-y-4",
}) => {
  const generatedId = useId();
  const headingId = titleId ?? generatedId;

  return (
    <section
      aria-labelledby={title ? headingId : undefined}
      className={`overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xs ${className}`}
    >
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4">
          <div className="flex min-w-0 items-center gap-2">
            {icon && (
              <Icon name={icon} className="h-4 w-4 shrink-0 text-primary-600" />
            )}
            <h2
              id={headingId}
              className="truncate text-base font-semibold text-neutral-900"
            >
              {title}
            </h2>
          </div>
          {aside}
        </div>
      )}
      <div className={`${padded ? "p-5" : ""} ${bodyClassName}`}>
        {children}
      </div>
    </section>
  );
};

/** Label/value pair. Render inside a <dl>. */
export const DetailTile = ({ label, children, className = "" }) => (
  <div
    className={`min-w-0 rounded-xl border border-neutral-100 bg-neutral-50 p-3 ${className}`}
  >
    <dt className="text-xs font-medium text-neutral-500">{label}</dt>
    <dd className="mt-1 truncate text-sm font-semibold text-neutral-900">
      {children}
    </dd>
  </div>
);

/** Loading placeholder exposed to assistive tech as a named status region. */
export const SkeletonBlock = ({ label, rows = 3, className = "" }) => (
  <div
    role="status"
    aria-label={label}
    aria-busy="true"
    className={`space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs motion-safe:animate-pulse ${className}`}
  >
    {Array.from({ length: rows }, (_, index) => (
      <div
        key={index}
        className="h-4 rounded bg-neutral-100"
        style={{ width: `${Math.max(40, 92 - index * 14)}%` }}
      />
    ))}
  </div>
);

/** Error card with an optional retry-style action. */
export const ErrorPanel = ({
  title,
  message,
  actionLabel,
  actionIcon,
  onAction,
  actionLoading = false,
  children,
}) => (
  <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs">
    <ErrorMessage title={title} message={message} />
    {children}
    {onAction && (
      <Button
        onClick={onAction}
        loading={actionLoading}
        className="inline-flex items-center gap-2"
      >
        {actionIcon && <Icon name={actionIcon} className="h-4 w-4" />}
        {actionLabel}
      </Button>
    )}
  </div>
);
