import { Navigate, useLocation } from "react-router-dom";

// Preserve old bookmarks without maintaining a second appointment UI.
export default function BookAppointmentPage() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  params.set("booking", "new");
  return (
    <Navigate
      replace
      to={{
        pathname: "/admin/appointments",
        search: `?${params}`,
        hash: location.hash,
      }}
      state={location.state}
    />
  );
}
