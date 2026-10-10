
const VARIANTS = {
  primary:
    "bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-primary-500",
  secondary:
    "bg-neutral-100 text-neutral-900 hover:bg-neutral-200 focus-visible:ring-neutral-500",
  outline:
    "border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50 focus-visible:ring-primary-500",
  danger:
    "bg-danger-600 text-white hover:bg-danger-700 focus-visible:ring-danger-500",
  ghost:
    "bg-transparent text-neutral-800 hover:bg-neutral-100 focus-visible:ring-primary-500",
};

const SIZES = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-3 text-base",
};

const Button = ({
  children,
  type = "button",
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  className = "",
  onClick,
  ...rest
}) => {
  const selectedVariant = VARIANTS[variant] ?? VARIANTS.primary;
  const selectedSize = SIZES[size] ?? SIZES.md;

  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      aria-busy={loading || undefined}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-md font-medium",
        "transition-colors focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        selectedVariant,
        selectedSize,
        className,
      ].join(" ")}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
        />
      )}
      {children}
    </button>
  );
};

export default Button;
