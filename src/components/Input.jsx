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
  leftIcon,
  rightIcon,
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

  const hasLeftIcon = Boolean(leftIcon);
  const hasRightIcon = Boolean(rightIcon);

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={inputId} className="...">
        <span>{label}</span>
        {required && (
          <span aria-hidden="true" className="ml-1">
            *
          </span>
        )}
      </label>

      <div className="relative">
        {hasLeftIcon && (
          <div
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          >
            {leftIcon}
          </div>
        )}

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
          aria-describedby={
            [hint ? hintId : null, showError ? errorId : null]
              .filter(Boolean)
              .join(" ") || undefined
          }
          className={`w-full rounded-xl border bg-slate-50/70 py-3.5 text-sm outline-none focus:ring-4 focus:ring-teal-600/10 disabled:cursor-not-allowed disabled:bg-neutral-100 transition placeholder:text-slate-400 hover:border-slate-300 focus:border-teal-600 focus:bg-white ${hasLeftIcon ? "pl-12" : "pl-4"
            } ${hasRightIcon ? "pr-12" : "pr-4"} ${showError ? "border-danger-600" : "border-slate-200"
            }`}
        />

        {hasRightIcon && (
          <div className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center">
            {rightIcon}
          </div>
        )}
      </div>

      {hint && (
        <p id={hintId} className="text-sm text-neutral-600">
          {hint}
        </p>
      )}

      {showError && (
        <p id={errorId} role="alert" className="text-sm text-danger-700">
          {validationMessage}
        </p>
      )}
    </div>
  );
};

export default Input;
