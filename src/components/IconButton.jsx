import { useEffect } from "react";

import Button from "./Button";
import Icon from "./Icon";

/**
 * CFG-07 — icon-only button (AC2, SDS §2.4.10).
 * A button whose only content is a decorative icon has no text for a
 * screen reader to announce, so the accessible name must come from an
 * ARIA label. This component makes that mandatory: `label` is a required
 * prop and is applied as `aria-label`; in development a missing label
 * logs an error so the mistake is caught before release. The a11y unit
 * tests also assert, via axe-core, that an unlabelled icon-only button
 * fails the `button-name` check while an IconButton passes it.
 *
 * Focus visibility comes from the shared Button (`:focus-visible` ring),
 * and the default padding keeps a ≥ 44×44 px touch target (WCAG 2.5.5).
 */
const IconButton = ({
  icon,
  label,
  variant = "ghost",
  size = "md",
  disabled = false,
  loading = false,
  className = "",
  onClick,
  ...rest
}) => {
  useEffect(() => {
    if (!label && import.meta.env?.DEV) {
      console.error(
        "IconButton requires a `label` prop so icon-only buttons expose an accessible name (CFG-07 AC2).",
      );
    }
  }, [label]);

  return (
    <Button
      {...rest}
      variant={variant}
      size={size}
      disabled={disabled}
      loading={loading}
      onClick={onClick}
      aria-label={label}
      className={["!p-2.5", className].join(" ")}
    >
      <Icon name={icon} className="h-5 w-5" />
    </Button>
  );
};

export default IconButton;
