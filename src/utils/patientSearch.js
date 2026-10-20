// Mirrors backend PhoneNumberUtil. Unrecognized phones/names remain literal.
export function normalizePatientSearch(value, mode = "all") {
  const raw = value.trim();
  if (mode === "name" || mode === "id") return raw;
  const match = raw
    .replace(/[\s\-()]/g, "")
    .match(/^(?:\+94|0094|94|0)?([1-9]\d{8})$/);
  return match
    ? `+94 ${match[1].slice(0, 3)} ${match[1].slice(3, 6)} ${match[1].slice(6)}`
    : raw;
}

// Search-mode UX validation; this does not change backend DTO validation.
export function validatePatientSearch(value, mode) {
  const raw = value.trim();
  if (!raw) return "";
  if (mode === "phone") {
    const digits = raw.replace(/\D/g, "");
    if (
      !/^\+?[\d\s()-]+$/.test(raw) ||
      /[()]/.test(raw.replace(/\([^()]*\)/g, "")) ||
      digits.length < 7 ||
      digits.length > 15
    ) {
      return "Enter a phone number with 7–15 digits. Use only digits, spaces, parentheses, hyphens and an optional leading +.";
    }
  } else if (mode === "id") {
    if (
      !/^[1-9]\d*$/.test(raw) ||
      raw.length > 19 ||
      BigInt(raw) > 9223372036854775807n
    ) {
      return "Enter a positive numeric clinic ID without leading zeros (maximum 9223372036854775807).";
    }
  } else if (mode === "name") {
    if (!/\p{L}/u.test(raw) || !/^[\p{L}\p{M}\s.'’,-]+$/u.test(raw)) {
      return "Enter a patient name using letters, spaces, apostrophes, hyphens, commas or periods.";
    }
  }
  return "";
}

export const patientErrorMessage = (error, action) => {
  if (error.config?._isRefresh)
    return "Unable to refresh your session. Please try again shortly.";
  if (error.status === 401)
    return "Your session could not be verified. Please sign in again.";
  if (error.status === 403)
    return `You do not have permission to ${action} patients.`;
  if (error.status === 404)
    return "This patient could not be found. Search again to select another record.";
  if (error.status === 409)
    return "This record could not be updated because of a conflict. Your changes have been kept; review the record before trying again.";
  if (error.status === 400)
    return "The request was not accepted. Review the entered details.";
  return `Unable to ${action} patients. Your input has been kept. Please try again.`;
};
