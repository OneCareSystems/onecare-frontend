import { Link, useLocation } from "react-router-dom";
import { LuChevronRight } from "react-icons/lu";

const SEGMENT_LABELS = {
  admin: "Admin",
  doctor: "Doctor",
  pharmacist: "Pharmacist",
  superadmin: "Super Admin",
  dashboard: "Dashboard",
  queue: "Queue",
};

const Breadcrumbs = () => {
  const location = useLocation();

  const segments = location.pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return null;
  }

  const crumbLabel = (segment) =>
    SEGMENT_LABELS[segment] ??
    segment
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  return (
    <nav aria-label="Breadcrumb" className="px-4 py-3 sm:px-6">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-neutral-600">
        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1;
          const path = `/${segments.slice(0, index + 1).join("/")}`;
          const label = crumbLabel(segment);

          return (
            <li key={path} className="flex items-center gap-1">
              {index > 0 && (
                <LuChevronRight aria-hidden="true" className="h-4 w-4" />
              )}

              {isLast ? (
                <span
                  aria-current="page"
                  className="font-semibold text-neutral-900"
                >
                  {label}
                </span>
              ) : (
                <Link
                  to={path}
                  className="rounded px-1 hover:text-primary-700 hover:underline"
                >
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
