import { emptyPatient, validatePatient } from "./patientRegistration";

export const patientEditFields = [
  "full_name",
  "contactNo",
  "address",
  "email",
  "gender",
];
export function patientEditValues(patient) {
  return {
    full_name: patient.fullName,
    contactNo: patient.contactNo,
    address: patient.address,
    email: patient.email,
    gender: patient.gender,
  };
}
export function validatePatientEdit(values, original) {
  // Reuse ADM-02 validation; DOB is read-only and not part of PUT.
  const errors = validatePatient({
    ...emptyPatient,
    ...values,
    dateOfBirth: "2000-01-01",
    bloodGroup: "",
  });
  if (original.gender && !values.gender)
    errors.gender =
      "Gender cannot be cleared by this API. Choose a value or cancel.";
  return errors;
}
export function patientChanges(values, original) {
  return Object.fromEntries(
    patientEditFields
      .filter((field) => values[field] !== original[field])
      .map((field) => [field, values[field]]),
  );
}
