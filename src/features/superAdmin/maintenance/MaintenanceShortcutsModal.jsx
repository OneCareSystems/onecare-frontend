import { memo } from "react";
import Icon from "../../../components/Icon";

export const MaintenanceShortcutsModal = memo(({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-900">
            Keyboard Shortcuts
          </h3>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 transition"
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>

        <ul className="mt-4 space-y-2.5 text-xs">
          {[
            ["⌘ / Ctrl + B", "Run backup snapshot now"],
            ["⌘ / Ctrl + K", "Toggle shortcuts dialog"],
            ["Esc", "Dismiss active dialog/drawer"],
          ].map(([k, label]) => (
            <li
              key={k}
              className="flex items-center justify-between py-1 border-b border-neutral-100 last:border-0"
            >
              <span className="text-neutral-600">{label}</span>
              <kbd className="rounded border border-neutral-200 bg-neutral-50 px-2 py-0.5 font-mono text-[11px] font-medium text-neutral-700">
                {k}
              </kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
});

MaintenanceShortcutsModal.displayName = "MaintenanceShortcutsModal";

export default MaintenanceShortcutsModal;
