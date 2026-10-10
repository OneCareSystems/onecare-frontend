import { useState } from "react";
import { useTranslation } from "react-i18next";

const DatePicker = ({
  id,
  name,
  label,
  value,
  defaultValue = "",
  onChange,
  onBlur,
  required = false,
  disabled = false,
  min,
  max,
  error,
  submitted = false,
  className = "",
  ...rest
}) => {
  const { t } = useTranslation();
  const [touched, setTouched] = useState(false);
  const [internalValue, setInternalValue] = useState(defaultValue);

  const dateValue = value !== undefined ? value : internalValue;

  const validationMessage =
    error ||
    (required && !String(dateValue).trim()
      ? t("validation.required")
      : "");

  const showError = Boolean(validationMessage) && (touched || submitted);
  const dateId = id ?? name;
  const errorId = `${dateId}-error`;

  const handleChange = (event) => {
    if (value === undefined) {
      setInternalValue(event.target.value);
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
        htmlFor={dateId}
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
        id={dateId}
        name={name}
        type="date"
        value={dateValue}
        onChange={handleChange}
        onBlur={handleBlur}
        required={required}
        disabled={disabled}
        min={min}
        max={max}
        aria-invalid={showError}
        aria-describedby={showError ? errorId : undefined}
        className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-neutral-100 ${
          showError ? "border-danger-600" : "border-neutral-300"
        }`}
      />

      {showError && (
        <p id={errorId} role="alert" className="text-sm text-danger-700">
          {validationMessage}
        </p>
      )}
    </div>
  );
};

export default DatePicker;
