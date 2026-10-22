import { useEffect, useRef, useState } from "react";
import Input from "./Input";
import Select from "./Select";
import Button from "./Button";
import ErrorMessage from "./ErrorMessage";
import Toast from "./Toast";
import LoadingSpinner from "./LoadingSpinner";
import StatusBadge from "./StatusBadge";
import {
  getPatientDemographics,
  updatePatientDemographics,
} from "../services/patientService";
import {
  patientChanges,
  patientEditFields,
  patientEditValues,
  validatePatientEdit,
} from "../utils/patientValidation";
import { patientErrorMessage } from "../utils/patientSearch";

export default function PatientDemographicsEditor({
  patientId,
  onCancel,
  onUpdated,
}) {
  const [loaded, setLoaded] = useState(null);
  const [values, setValues] = useState(null);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const form = useRef(null);
  useEffect(() => {
    mounted.current = true;
    let current = true;
    const controller = new AbortController();
    getPatientDemographics(patientId, { signal: controller.signal })
      .then((patient) => {
        if (current) {
          setLoaded(patient);
          setValues(patientEditValues(patient));
        }
      })
      .catch((error) => {
        if (current) setMessage(patientErrorMessage(error, "load"));
      });
    return () => {
      current = false;
      mounted.current = false;
      controller.abort();
    };
  }, [patientId]);
  const change = ({ target: { name, value } }) => {
    setValues((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: undefined }));
    setSuccess("");
  };
  const submit = async (event) => {
    event.preventDefault();
    if (inFlight.current) return;
    setSubmitted(true);
    setMessage("");
    setSuccess("");
    const original = patientEditValues(loaded);
    const validation = validatePatientEdit(values, original);
    setErrors(validation);
    if (Object.keys(validation).length) {
      form.current.elements.namedItem(Object.keys(validation)[0])?.focus();
      return;
    }
    const changes = patientChanges(values, original);
    if (!Object.keys(changes).length) {
      setSuccess("No changes to save.");
      return;
    }
    inFlight.current = true;
    setSaving(true);
    try {
      const updated = await updatePatientDemographics(patientId, changes);
      if (!mounted.current) return;
      setLoaded(updated);
      setValues(patientEditValues(updated));
      setSuccess("Patient updated successfully.");
      onUpdated?.();
    } catch (error) {
      if (!mounted.current) return;
      setMessage(patientErrorMessage(error, "update"));
      const fields = {};
      if (error.status === 400 && Array.isArray(error.data)) {
        for (const entry of error.data)
          if (patientEditFields.includes(entry.field))
            fields[entry.field] = "Review this value.";
      }
      setErrors(fields);
      form.current?.elements.namedItem(Object.keys(fields)[0])?.focus();
    } finally {
      inFlight.current = false;
      if (mounted.current) setSaving(false);
    }
  };
  const field = (name, label, props = {}) => (
    <Input
      name={name}
      label={label}
      value={values[name]}
      onChange={change}
      submitted={submitted}
      error={errors[name]}
      {...props}
    />
  );
  return (
    <section
      aria-label="Edit patient"
      className="min-w-0 space-y-4 rounded-xl border border-primary-100 bg-neutral-0/70 p-4 shadow-sm"
    >
      <h2 className="text-lg font-bold text-primary-950">Edit Patient</h2>
      <ErrorMessage message={message} />
      {!loaded && !message && (
        <LoadingSpinner label="Loading patient details" />
      )}
      {success && <Toast type="success" message={success} />}
      {loaded && (
        <form ref={form} onSubmit={submit} noValidate aria-busy={saving}>
          <fieldset disabled={saving} className="space-y-4">
            <legend className="sr-only">Patient demographic details</legend>
            <Input
              name="clinic-id"
              label="Clinic ID (read-only)"
              value={String(loaded.patientId)}
              readOnly
            />
            <Input
              name="patient-dob"
              label="Date of Birth (read-only)"
              value={loaded.dateOfBirth}
              readOnly
            />
            <StatusBadge status={loaded.isActive ? "success" : "neutral"}>
              {loaded.isActive ? "Active" : "Inactive"}
            </StatusBadge>
            {field("full_name", "Full Name", {
              required: true,
              maxLength: 100,
              autoComplete: "name",
            })}
            {field("contactNo", "Phone Number", {
              required: true,
              maxLength: 20,
              type: "tel",
              autoComplete: "tel",
            })}
            {field("address", "Address", {
              maxLength: 255,
              autoComplete: "street-address",
            })}
            {field("email", "Email", {
              maxLength: 100,
              type: "email",
              autoComplete: "email",
            })}
            <Select
              name="gender"
              label="Gender"
              value={values.gender}
              onChange={change}
              error={errors.gender}
              submitted={submitted}
              placeholder="Not specified"
              options={[
                { value: "MALE", label: "Male" },
                { value: "FEMALE", label: "Female" },
                { value: "OTHER", label: "Other" },
              ]}
            />
            <p className="text-xs text-neutral-600">
              Clinic ID and date of birth cannot be changed. An existing gender
              cannot be cleared.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                {saving ? "Updating…" : "Update Patient"}
              </Button>
            </div>
          </fieldset>
        </form>
      )}
      {!loaded && message && (
        <Button variant="outline" onClick={onCancel}>
          Close
        </Button>
      )}
    </section>
  );
}
