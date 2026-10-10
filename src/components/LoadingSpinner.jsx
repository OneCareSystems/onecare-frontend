
const LoadingSpinner = ({
  label = "Loading...",
  size = "md",
  className = "",
}) => {
  const sizes = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-[3px]",
    lg: "h-12 w-12 border-4",
  };

  const spinnerSize = sizes[size] ?? sizes.md;

  return (
    <div
      role="status"
      aria-label={label}
      className={`inline-flex items-center gap-3 ${className}`}
    >
      <span
        aria-hidden="true"
        className={`animate-spin rounded-full border-primary-600 border-r-transparent ${spinnerSize}`}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
};

export default LoadingSpinner;
