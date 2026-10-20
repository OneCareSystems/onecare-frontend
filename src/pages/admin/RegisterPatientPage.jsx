import { useRef, useState } from "react";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Select from "../../components/Select";
import ErrorMessage from "../../components/ErrorMessage";
import Toast from "../../components/Toast";
import { createPatient } from "../../services/patientService";
import { emptyPatient, validatePatient } from "../../utils/patientRegistration";

export default function RegisterPatientPage() {
  const [values, setValues] = useState({ ...emptyPatient });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const [formKey, setFormKey] = useState(0);
  const inFlight = useRef(false);
  const formRef = useRef(null);
  const reset = () => {
    setValues({ ...emptyPatient });
    setErrors({});
    setSubmitted(false);
    setMessage("");
    setResult(null);
    setFormKey((key) => key + 1);
  };
  const change = ({ target: { name, value } }) => {
    setValues((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: undefined }));
  };
  const submit = async (event) => {
    event.preventDefault();
    if (inFlight.current || result) return;
    setSubmitted(true);
    setMessage("");
    const validation = validatePatient(values);
    setErrors(validation);
    if (Object.keys(validation).length) {
      formRef.current.elements.namedItem(Object.keys(validation)[0])?.focus();
      return;
    }
    inFlight.current = true;
    setSaving(true);
    try {
      setResult(await createPatient(values));
    } catch (error) {
      if (error.config?._isRefresh) {
        setMessage("Unable to refresh your session. Please try again shortly.");
        return;
      }
      const fieldErrors = {};
      if (error.status === 400 && Array.isArray(error.data)) {
        for (const entry of error.data) {
          if (Object.hasOwn(emptyPatient, entry.field))
            fieldErrors[entry.field] = entry.message;
        }
      }
      setErrors(fieldErrors);
      // Do not render arbitrary backend text: database errors can contain patient data.
      setMessage(
        error.status === 403
          ? "You do not have permission to register patients."
          : error.status === 400
            ? "Registration was not accepted. Review the entered details."
            : error.status === 409
              ? "A patient conflict prevented registration. Review the details before trying again."
              : "Registration could not be confirmed. Check with clinic staff before submitting again to avoid creating another record.",
      );
      formRef.current?.elements.namedItem(Object.keys(fieldErrors)[0])?.focus();
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };
  const field = (name, label, extra = {}) => (
    <Input
      name={name}
      label={label}
      value={values[name]}
      onChange={change}
      error={errors[name]}
      submitted={submitted}
      {...extra}
    />
  );
  return (
    <section aria-labelledby="register-title">
      <h1 id="register-title" className="text-xl font-bold text-primary-950">
        Register New Patient
      </h1>
      <p className="mb-3 text-sm text-primary-800">
        Add a new patient to the system
      </p>
      {result ? (
        <div className="space-y-4">
          <Toast
            type="success"
            message={
              <>
                Patient registered successfully. Patient ID:{" "}
                <strong>{result.patientId}</strong>
                <span className="block break-words">{result.fullName}</span>
              </>
            }
          />
          {result.duplicateSuspected && (
            <Toast
              type="warning"
              message="A probable duplicate was detected. This patient has already been saved. Do not register them again; verify the records with clinic staff."
            />
          )}
          <Button onClick={reset}>Register another patient</Button>
        </div>
      ) : (
        <form
          key={formKey}
          ref={formRef}
          noValidate
          onSubmit={submit}
          className="space-y-4 rounded-xl border border-primary-100 bg-neutral-0/70 p-4 shadow-sm"
          aria-busy={saving}
        >
          <ErrorMessage message={message} />
          <fieldset disabled={saving}>
            <legend className="sr-only">Patient registration details</legend>
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
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
              {field("dateOfBirth", "Date of Birth", {
                required: true,
                type: "date",
                autoComplete: "bday",
              })}
              <Select
                name="gender"
                label="Gender"
                value={values.gender}
                onChange={change}
                submitted={submitted}
                error={errors.gender}
                placeholder="Select gender (optional)"
                options={[
                  { value: "MALE", label: "Male" },
                  { value: "FEMALE", label: "Female" },
                  { value: "OTHER", label: "Other" },
                ]}
              />
              {field("address", "Address", {
                maxLength: 255,
                autoComplete: "street-address",
              })}
              {field("email", "Email", {
                type: "email",
                maxLength: 100,
                autoComplete: "email",
              })}
            </div>
            <div className="mt-5 flex items-center justify-between gap-3">
              <Button variant="outline" onClick={reset}>
                Reset
              </Button>
              <Button type="submit" loading={saving}>
                {saving ? "Saving patient…" : "Save Patient"}
              </Button>
            </div>
          </fieldset>
        </form>
      )}
    </section>
  );
}
