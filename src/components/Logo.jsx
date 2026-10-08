const SIZES = {
  sm: "h-9 w-9",
  md: "h-12 w-12",
  lg: "h-16 w-16",
};

/**
 * CFG-01 — logo placed inside the designated rounded region (client feedback #1).
 * The rounded region is a token-driven surface; the mark itself is the
 * static asset in public/logo.svg.
 */
const Logo = ({ size = "md", showWordmark = true }) => {
  return (
    <span className="inline-flex items-center gap-3">
      <span
        className={`flex items-center justify-center overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-0 p-1.5 shadow-sm ${SIZES[size]}`}
      >
        <img src="/logo.svg" alt="OneCare logo" className="h-full w-full" />
      </span>
      {showWordmark && (
        <span className="flex flex-col">
          <span className="text-xl font-bold leading-tight text-neutral-900">
            OneCare
          </span>
          <span className="text-sm leading-tight text-neutral-600">
            Healthcare platform
          </span>
        </span>
      )}
    </span>
  );
};

export default Logo;
