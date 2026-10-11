import {
  LuActivity,
  LuArrowUpRight,
  LuBaby,
  LuBone,
  LuBrain,
  LuCalendar,
  LuCalendarClock,
  LuCheck,
  LuChevronRight,
  LuCircleHelp,
  LuClipboardList,
  LuClock,
  LuDroplet,
  LuEar,
  LuEye,
  LuHeartPulse,
  LuHospital,
  LuInbox,
  LuInfo,
  LuLayoutDashboard,
  LuListChecks,
  LuLogOut,
  LuMicroscope,
  LuPackageCheck,
  LuPencil,
  LuPill,
  LuPlus,
  LuPrinter,
  LuRefreshCw,
  LuScanLine,
  LuSearch,
  LuShieldPlus,
  LuStethoscope,
  LuSyringe,
  LuTestTube,
  LuThermometer,
  LuTrash2,
  LuTriangleAlert,
  LuUserCheck,
  LuUsers,
  LuX,
} from "react-icons/lu";

/**
 * CFG-07 — shared icon component (SDS §2.4.10; client feedback #4:
 * medical symbols). One registry so every screen draws icons from the
 * same set: medical glyphs (stethoscope, pill, calendar, …) plus the
 * UI glyphs shared chrome already needs.
 *
 * Accessibility contract (AC2):
 * - Decorative by default: `aria-hidden="true"` + `focusable="false"`,
 *   so a labelled parent (link, button, heading) owns the accessible
 *   name and screen readers never announce the glyph twice.
 * - Meaningful standalone icons pass `label`, which renders
 *   `role="img"` + `aria-label` so the icon itself is announced.
 */
const ICONS = {
  // Medical set (client feedback #4)
  stethoscope: LuStethoscope,
  pill: LuPill,
  calendar: LuCalendar,
  "calendar-clock": LuCalendarClock,
  "heart-pulse": LuHeartPulse,
  syringe: LuSyringe,
  thermometer: LuThermometer,
  hospital: LuHospital,
  microscope: LuMicroscope,
  "test-tube": LuTestTube,
  activity: LuActivity,
  clipboard: LuClipboardList,
  users: LuUsers,
  baby: LuBaby,
  brain: LuBrain,
  bone: LuBone,
  droplet: LuDroplet,
  ear: LuEar,
  eye: LuEye,
  scan: LuScanLine,
  "shield-plus": LuShieldPlus,
  // Shared UI set
  dashboard: LuLayoutDashboard,
  "list-checks": LuListChecks,
  "log-out": LuLogOut,
  "chevron-right": LuChevronRight,
  close: LuX,
  inbox: LuInbox,
  refresh: LuRefreshCw,
  pencil: LuPencil,
  trash: LuTrash2,
  search: LuSearch,
  plus: LuPlus,
  check: LuCheck,
  clock: LuClock,
  "triangle-alert": LuTriangleAlert,
  info: LuInfo,
  "circle-help": LuCircleHelp,
  "package-check": LuPackageCheck,
  "user-check": LuUserCheck,
  "arrow-up-right": LuArrowUpRight,
  print: LuPrinter,
};

const FALLBACK_ICON = LuCircleHelp;

const Icon = ({ name, label, size = "1em", className = "", ...rest }) => {
  const Glyph = ICONS[name] ?? FALLBACK_ICON;

  const accessibilityProps = label
    ? { role: "img", "aria-label": label }
    : { "aria-hidden": "true", focusable: "false" };

  return (
    <Glyph
      size={size}
      className={className}
      {...accessibilityProps}
      {...rest}
    />
  );
};

export default Icon;
