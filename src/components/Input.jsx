import { useState } from "react";
import { useTranslation } from "react-i18next";

const Input = ({
  id,
  name,
  label,
  type = "text",
  value,
  defaultValue,
  onChange,
  onBlur,
  required = false,
  disabled = false,
  placeholder,
  validate,
  error,
  submitted = false,
  hint,
  className = "",
  ...rest
}) => {
const { t } = useTranslation();
  const [touched, setTouched] = useState(false);
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");

  const inputValue = value !== undefined ? value : internalValue;

  const validationMessage = (() => {
    if (error) return error;

    if (required && !String(inputValue ?? "").trim()) {
      return t("validation.required");
    }

    if (validate) {
      return validate(inputValue);
    }

    return "";
  })();

  const showError = Boolean(validationMessage) && (touched || submitted);
  const inputId = id ?? name;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  const handleChange = (event) => {
    const nextValue = event.target.value;

    if (value === undefined) {
      setInternalValue(nextValue);
    }

    onChange?.(event);
  };

  const handleBlur = (event) => {
    setTouched(true);
    onBlur?.(event);
  };

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label
        htmlFor={inputId}
        className="text-sm font-medium text-neutral-800"
      >
        {label}
        {required && (
          <span aria-hidden="true" className="ml-1">
            *
          </span>
        )}
      </label>

      <input
        {...rest}
        id={inputId}
        name={name}
        type={type}
        value={inputValue}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        aria-invalid={showError}
        aria-describedby={[
          hint ? hintId : null,
          showError ? errorId : null,
        ]
          .filter(Boolean)
          .join(" ") || undefined}
        className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-neutral-100 ${
          showError
            ? "border-danger-600"
            : "border-neutral-300"
        }`}
      />

      {hint && (
        <p id={hintId} className="text-sm text-neutral-600">
          {hint}
        </p>
      )}

      {showError && (
        <p
          id={errorId}
          role="alert"
          className="text-sm text-danger-700"
        >
          {validationMessage}
        </p>
      )}
    </div>
  );
};

export default Input;