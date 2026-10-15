import { Link } from "react-router-dom";

import Icon from "../Icon";

/** One page width and rhythm for every doctor screen. */
export const PageShell = ({ children, className = "" }) => (
  <div
    className={`mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 ${className}`}
  >
    {children}
  </div>
);

/**
 * Shared page header: optional back link, optional status line, title,
 * description, meta row and an actions slot. `back` is `{ to, label }`.
 */
export const PageHeader = ({
  back,
  eyebrow,
  title,
  description,
  meta,
  actions,
}) => (
  <header className="flex flex-col gap-4 border-b border-neutral-200 pb-6 md:flex-row md:items-end md:justify-between">
    <div className="min-w-0 space-y-2">
      {back && (
        <Link
          to={back.to}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 transition-colors hover:text-primary-700"
        >
          <Icon name="arrow-left" className="h-4 w-4" />
          <span>{back.label}</span>
        </Link>
      )}
      {eyebrow && (
        <p className="flex items-center gap-2 text-sm font-medium text-primary-700">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-primary-600 motion-safe:animate-pulse"
          />
          {eyebrow}
        </p>
      )}
      <h1 className="text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">
        {title}
      </h1>
      {description && (
        <p className="max-w-2xl text-sm text-neutral-600">{description}</p>
      )}
      {meta && (
        <div className="flex flex-wrap items-center gap-2 pt-1 text-sm text-neutral-700">
          {meta}
        </div>
      )}
    </div>
    {actions && (
      <div className="flex flex-wrap items-center gap-3">{actions}</div>
    )}
  </header>
);
