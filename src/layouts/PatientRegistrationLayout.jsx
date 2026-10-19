import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import Icon from "../components/Icon";
import "../pages/admin/registerPatient.css";

export default function PatientRegistrationLayout() {
  return (
    <div className="patient-registration-shell">
      <aside className="registration-sidebar">
        <div className="registration-brand">
          <Icon name="stethoscope" size={30} />
          <span>One Care<small>FAMILY CLINIC</small></span>
        </div>
        <Sidebar />
      </aside>
      <div className="registration-content">
        <TopBar />
        <main><Outlet /></main>
      </div>
    </div>
  );
}
