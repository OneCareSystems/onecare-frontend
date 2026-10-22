import { useEffect, useId, useRef, useState } from "react";
import Button from "./Button";
import ErrorMessage from "./ErrorMessage";
import Icon from "./Icon";

// A single editable input combines typing, selection and its attached list.
// Callers supply paged remote patients or filtered real doctor options.
export default function AutocompleteCombobox({
  label,
  value,
  options,
  query,
  onQueryChange,
  onSelect,
  onClear,
  onOpenChange,
  loading = false,
  error = "",
  onRetry,
  retryLabel = "Try again",
  disabled = false,
  pagination,
  emptyMessage = "No matches found.",
  required = false,
}) {
  const id = useId(),
    root = useRef(null),
    input = useRef(null);
  const [open, setOpen] = useState(false),
    [index, setIndex] = useState(0);
  const active = Math.min(index, options.length - 1);
  const changeOpen = (next, reset = false) => {
    setOpen(next);
    setIndex(0);
    onOpenChange?.(next);
    if (next && reset) onQueryChange("");
  };
  useEffect(() => {
    if (!open) return;
    const outside = (event) => {
      if (!root.current.contains(event.target)) {
        setOpen(false);
        onOpenChange?.(false);
      }
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open, onOpenChange]);
  const choose = (option) => {
    onSelect(option);
    onQueryChange("");
    changeOpen(false);
  };
  const keyDown = (event) => {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      changeOpen(false);
    } else if (
      ["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key) &&
      (open || event.key.startsWith("Arrow"))
    ) {
      event.preventDefault();
      if (!open) {
        changeOpen(true, true);
        return;
      }
      if (!options.length) return;
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? options.length - 1
            : (active + (event.key === "ArrowDown" ? 1 : -1) + options.length) %
              options.length;
      setIndex(next);
      root.current
        .querySelector(`[id="${id}-option-${next}"]`)
        ?.scrollIntoView?.({ block: "nearest" });
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (!open) changeOpen(true, true);
      else if (!loading && !error && options[active]) choose(options[active]);
    }
  };
  return (
    <div
      ref={root}
      className="relative min-w-0 space-y-1"
      onBlur={(event) => {
        if (open && !event.currentTarget.contains(event.relatedTarget))
          changeOpen(false);
      }}
    >
      <label
        htmlFor={id}
        className="block text-sm font-medium text-neutral-900"
      >
        {label}
        {required && (
          <span aria-hidden="true" className="text-danger-600">
            {" "}
            *
          </span>
        )}
      </label>
      <div className="relative flex min-w-0 items-center">
        <input
          id={id}
          ref={input}
          role="combobox"
          aria-expanded={open}
          aria-controls={open ? `${id}-list` : undefined}
          aria-autocomplete="list"
          aria-required={required || undefined}
          aria-activedescendant={
            open && !loading && !error && options[active]
              ? `${id}-option-${active}`
              : undefined
          }
          autoComplete="off"
          disabled={disabled}
          value={open ? query : (value?.label ?? query)}
          placeholder={`Select ${label.toLowerCase()}`}
          onFocus={() => changeOpen(true, true)}
          onClick={() => {
            if (!open) changeOpen(true, true);
          }}
          onChange={(event) => {
            if (!open) changeOpen(true);
            setIndex(0);
            onQueryChange(event.target.value);
          }}
          onKeyDown={keyDown}
          className={`w-full min-w-0 rounded-md border border-primary-200 bg-white py-2 pl-3 text-sm text-primary-950 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 ${value && onClear ? "pr-16" : "pr-9"}`}
        />
        {value && onClear && (
          <button
            type="button"
            disabled={disabled}
            aria-label={`Clear ${label.toLowerCase()}`}
            className="absolute right-8 rounded p-1 text-neutral-600 focus-visible:ring-2 focus-visible:ring-primary-500"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              onClear();
              onQueryChange("");
              changeOpen(false);
            }}
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          aria-label={`Toggle ${label.toLowerCase()} options`}
          aria-expanded={open}
          aria-controls={open ? `${id}-list` : undefined}
          className="absolute right-1 rounded p-1 text-primary-800 focus-visible:ring-2 focus-visible:ring-primary-500"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            changeOpen(!open, !open);
            if (!open) input.current?.focus();
          }}
        >
          <Icon name="chevron-right" className="h-4 w-4 rotate-90" />
        </button>
      </div>
      {open && (
        <div className="absolute inset-x-0 top-full z-20 mt-1 space-y-2 rounded-lg border border-primary-200 bg-white p-2 shadow-xl">
          {loading && (
            <p role="status" className="text-sm text-neutral-600">
              Loading {label.toLowerCase()} options...
            </p>
          )}
          <ErrorMessage message={error} />
          {error && onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry}>
              {retryLabel}
            </Button>
          )}
          {!loading && !error && options.length === 0 && (
            <p role="status" className="text-sm text-neutral-600">
              {emptyMessage}
            </p>
          )}
          <ul
            id={`${id}-list`}
            role="listbox"
            aria-label={`${label} options`}
            aria-busy={loading}
            className="max-h-44 overflow-y-auto overscroll-contain"
          >
            {!loading &&
              !error &&
              options.map((option, optionIndex) => (
                <li
                  key={option.value}
                  id={`${id}-option-${optionIndex}`}
                  role="option"
                  aria-selected={String(value?.value) === String(option.value)}
                  className={`cursor-pointer rounded-md p-2 text-sm ${active === optionIndex ? "bg-primary-100 text-primary-950" : "text-neutral-900 hover:bg-primary-50"}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(option)}
                >
                  <span className="block font-medium">{option.label}</span>
                  {option.detail && (
                    <span className="block text-xs text-neutral-600">
                      {option.detail}
                    </span>
                  )}
                </li>
              ))}
          </ul>
          {pagination}
        </div>
      )}
    </div>
  );
}
