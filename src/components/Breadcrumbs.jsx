import { Link, useLocation } from "react-router-dom";

import Icon from "./Icon";

const SEGMENT_LABELS = {
  admin: "Admin",
  doctor: "Doctor",
  pharmacist: "Pharmacist",
  "super-admin": "Super Admin",
  dashboard: "Dashboard",
  queue: "Queue",
  appointments: "Appointment Hub",
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
  const isDoctorConsultation =
    segments[0] === "doctor" && segments[1] === "consultation";

  return (
    <nav aria-label="Breadcrumb" className="overflow-x-auto px-4 py-4 sm:px-6">
      <ol className="flex min-w-max items-center gap-2 text-sm text-neutral-600">
        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1;
          const path =
            segments[0] === "doctor" && index === 0
              ? "/doctor/dashboard"
              : `/${segments.slice(0, index + 1).join("/")}`;
          const label =
            isDoctorConsultation && isLast && index > 1
              ? `Appointment #${segment}`
              : crumbLabel(segment);
          const isConsultationParent =
            isDoctorConsultation && segment === "consultation" && !isLast;

          return (
            <li key={path} className="flex shrink-0 items-center gap-2">
              {index > 0 && (
                <Icon
                  name="chevron-right"
                  className="h-4 w-4 shrink-0 text-neutral-400"
                  aria-hidden="true"
                />
              )}

              {isLast ? (
                <span
                  aria-current="page"
                  className="whitespace-nowrap font-semibold text-neutral-900"
                >
                  {label}
                </span>
              ) : isConsultationParent ? (
                <span className="whitespace-nowrap text-neutral-600">
                  {label}
                </span>
              ) : (
                <Link
                  to={path}
                  className="whitespace-nowrap rounded px-1 hover:text-primary-700 hover:underline"
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
