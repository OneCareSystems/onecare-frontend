import Icon from "../../components/Icon";

/**
 * SuperAdminPageHeader
 * Standardizes the page header layout, eyebrow, title, description, and action buttons.
 */
export const SuperAdminPageHeader = ({
  icon,
  badgeText,
  title,
  description,
  actions,
  className = "",
}) => {
  return (
    <header
      className={`flex flex-col gap-4 border-b border-neutral-200 pb-5 sm:flex-row sm:items-end sm:justify-between ${className}`}
    >
      <div className="min-w-0">
        {badgeText && (
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            {icon && (
              <Icon name={icon} className="h-3.5 w-3.5 text-primary-600" />
            )}
            {badgeText}
          </p>
        )}
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-neutral-500 max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </header>
  );
};
