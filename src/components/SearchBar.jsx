import { useState } from "react";
import { useTranslation } from "react-i18next";
import Button from "./Button.jsx";

const SearchBar = ({
  value,
  defaultValue = "",
  onChange,
  onSearch,
  placeholder,
  searchLabel,
  clearLabel,
  disabled = false,
  className = "",
}) => {
  const { t } = useTranslation();
  const [internalValue, setInternalValue] = useState(defaultValue);

  const searchValue = value !== undefined ? value : internalValue;
  const resolvedSearchLabel = searchLabel ?? t("common.search");
  const resolvedClearLabel = clearLabel ?? t("common.clear");

  const handleChange = (event) => {
    if (value === undefined) {
      setInternalValue(event.target.value);
    }
    onChange?.(event.target.value);
  };

  const handleClear = () => {
    if (value === undefined) {
      setInternalValue("");
    }
    onChange?.("");
    onSearch?.("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSearch?.(searchValue);
  };

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className={`flex items-center gap-2 ${className}`}
    >
      <label htmlFor="component-search" className="sr-only">
        {resolvedSearchLabel}
      </label>

      <input
        id="component-search"
        type="search"
        value={searchValue}
        onChange={handleChange}
        placeholder={placeholder ?? resolvedSearchLabel}
        disabled={disabled}
        className="min-w-0 flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-neutral-100"
      />

      {searchValue && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClear}
          disabled={disabled}
        >
          {resolvedClearLabel}
        </Button>
      )}

      <Button type="submit" disabled={disabled}>
        {resolvedSearchLabel}
      </Button>
    </form>
  );
};

export default SearchBar;

