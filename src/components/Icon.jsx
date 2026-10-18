import {
  LuActivity,
  LuArrowLeft,
  LuArrowRight,
  LuArrowUpRight,
  LuBaby,
  LuBone,
  LuBrain,
  LuCalendar,
  LuCalendarClock,
  LuCheck,
  LuChevronRight,
  LuCircleCheck,
  LuCircleHelp,
  LuCircleX,
  LuClipboardList,
  LuClock,
  LuCpu,
  LuDatabase,
  LuDownload,
  LuDroplet,
  LuEar,
  LuEye,
  LuEyeOff,
  LuFileCode,
  LuHardDrive,
  LuHeartPulse,
  LuHospital,
  LuInbox,
  LuInfo,
  LuKeyRound,
  LuLayoutDashboard,
  LuListChecks,
  LuLogOut,
  LuLock,
  LuMail,
  LuMicroscope,
  LuPackageCheck,
  LuPencil,
  LuPill,
  LuPlus,
  LuPrinter,
  LuRefreshCw,
  LuSave,
  LuScanLine,
  LuSearch,
  LuServer,
  LuShield,
  LuShieldAlert,
  LuShieldPlus,
  LuSparkles,
  LuStethoscope,
  LuSyringe,
  LuTestTube,
  LuThermometer,
  LuTrash2,
  LuTriangleAlert,
  LuUser,
  LuUserCheck,
  LuUsers,
  LuWifi,
  LuWrench,
  LuX,
} from "react-icons/lu";

/**
 * CFG-07 — Shared icon registry.
 *
 * Centralizes medical and UI icons for consistent use throughout
 * the application.
 *
 * Accessibility:
 * - Decorative icons are hidden from screen readers by default.
 * - Icons with a label are exposed as accessible images.
 * - Accessibility props take precedence over forwarded props.
 */

// Medical icons
const MEDICAL_ICONS = {
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
  "eye-off": LuEyeOff,
  scan: LuScanLine,
  "shield-plus": LuShieldPlus,
};

// Shared UI icons
const UI_ICONS = {
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
  "circle-check": LuCircleCheck,
  clock: LuClock,
  download: LuDownload,
  "triangle-alert": LuTriangleAlert,
  info: LuInfo,
  "circle-help": LuCircleHelp,
  "circle-x": LuCircleX,
  "package-check": LuPackageCheck,
  "user-check": LuUserCheck,
  "arrow-up-right": LuArrowUpRight,
  print: LuPrinter,
  "file-code": LuFileCode,
  database: LuDatabase,
  "hard-drive": LuHardDrive,
  server: LuServer,
  wrench: LuWrench,
  save: LuSave,
  wifi: LuWifi,
  cpu: LuCpu,
};

// Authentication icons
const AUTH_ICONS = {
  shield: LuShield,
  "shield-alert": LuShieldAlert,
  "key-round": LuKeyRound,
  sparkles: LuSparkles,
  "arrow-right": LuArrowRight,
  "arrow-left": LuArrowLeft,
  lock: LuLock,
  user: LuUser,
  mail: LuMail,
};

// Combined registry preserves all existing icon names.
const ICONS = {
  ...MEDICAL_ICONS,
  ...UI_ICONS,
  ...AUTH_ICONS,
};

const FALLBACK_ICON = LuCircleHelp;

/**
 * Shared icon component.
 *
 * @param {object} props
 * @param {string} props.name - Registry key.
 * @param {string} [props.label] - Accessible name for meaningful icons.
 * @param {string|number} [props.size="1em"] - Icon dimensions.
 * @param {string} [props.className=""] - CSS classes.
 */
const Icon = ({ name, label, size = "1em", className = "", ...rest }) => {
  const Glyph = ICONS[name] ?? FALLBACK_ICON;

  const accessibilityProps = label
    ? {
        role: "img",
        "aria-label": label,
      }
    : {
        "aria-hidden": true,
        focusable: false,
      };

  return (
    <Glyph
      {...rest}
      {...accessibilityProps}
      size={size}
      className={className}
    />
  );
};

export default Icon;
