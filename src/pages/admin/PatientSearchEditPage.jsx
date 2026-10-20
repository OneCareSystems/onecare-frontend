import { useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Button from "../../components/Button";
import PatientSearch from "../../components/PatientSearch";
import PatientDemographicsEditor from "../../components/PatientDemographicsEditor";
import { selectRole } from "../../features/auth/authSlice";

export default function PatientSearchEditPage() {
  const role = useSelector(selectRole);
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <section aria-labelledby="patient-search-title">
      <h1
        id="patient-search-title"
        className="text-xl font-bold text-primary-950"
      >
        Search Patients
      </h1>
      <p className="mb-4 text-sm text-primary-800">
        Find and manage patient details
      </p>
      <div
        className={`grid items-start gap-4 ${selectedId ? "xl:grid-cols-[minmax(0,1fr)_22rem]" : ""}`}
      >
        <PatientSearch
          selectedId={selectedId}
          onSelect={setSelectedId}
          onSearchChange={() => setSelectedId(null)}
          refreshKey={refreshKey}
          registerAction={
            <Button
              onClick={() =>
                navigate(
                  role === "SUPER_ADMIN"
                    ? "/super-admin/register-patient"
                    : "/admin/register-patient",
                )
              }
            >
              Register Patient
            </Button>
          }
        />
        {selectedId && (
          <PatientDemographicsEditor
            key={selectedId}
            patientId={selectedId}
            onCancel={() => setSelectedId(null)}
            onUpdated={() => setRefreshKey((key) => key + 1)}
          />
        )}
      </div>
    </section>
  );
}
