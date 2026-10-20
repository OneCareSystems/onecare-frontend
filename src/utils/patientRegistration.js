export const emptyPatient = {
  full_name: "",
  contactNo: "",
  dateOfBirth: "",
  gender: "",
  address: "",
  email: "",
};

export function validatePatient(values) {
  const errors = {};
  for (const [field, label, limit, required] of [
    ["full_name", "Full name", 100, true],
    ["contactNo", "Phone number", 20, true],
    ["address", "Address", 255, false],
    ["email", "Email", 100, false],
  ]) {
    if (required && !values[field].trim())
      errors[field] = `${label} is required.`;
    else if (values[field].length > limit)
      errors[field] = `${label} must be ${limit} characters or fewer.`;
  }
  if (!values.dateOfBirth) errors.dateOfBirth = "Date of birth is required.";
  else {
    const date = new Date(`${values.dateOfBirth}T00:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(values.dateOfBirth) ||
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== values.dateOfBirth
    ) {
      errors.dateOfBirth = "Enter a valid date of birth.";
    }
  }
  if (values.email && !/^[^\s@]+@[^\s@]+$/.test(values.email))
    errors.email = "Enter a valid email address.";
  if (values.gender && !["MALE", "FEMALE", "OTHER"].includes(values.gender))
    errors.gender = "Select a valid gender.";
  return errors;
}
