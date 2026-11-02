import ConfirmDialog from "../../components/ConfirmDialog";
import Toast from "../../components/Toast";
import { SuperAdminPageHeader } from "../../features/superAdmin/SuperAdminPageHeader";
import BackupScheduleEditor from "../../features/superAdmin/BackupScheduleEditor";
import BackupDetailDrawer from "../../features/superAdmin/BackupDetailDrawer";
import {
  SafetyBanner,
  UpcomingRuns,
  MaintenanceActivityLog,
  BackupHistoryTable,
  RestoreBackupModal,
  MaintenanceShortcutsModal,
  useSystemMaintenance,
} from "../../features/superAdmin/maintenance";

const SystemMaintenancePage = () => {
  const {
    toast,
    setToast,
    confirm,
    setConfirm,
    selectedBackup,
    setSelectedBackup,
    showShortcuts,
    setShowShortcuts,
    showRestoreDialog,
    setShowRestoreDialog,

    backups,
    backupsStatus,
    creatingBackup,
    downloadingId,
    restoring,
    latestBackupAt,
    nextRun,

    schedule,
    scheduleLoading,
    scheduleSaving,
    scheduleError,
    scheduleMessage,

    activity,
    clearActivity,

    handleCreateBackup,
    handleDownloadBackup,
    handleRestoreBackup,
    handleSaveSchedule,
    retryBackups,
    retrySchedule,
  } = useSystemMaintenance();

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Page Header */}
      <SuperAdminPageHeader
        icon="settings"
        badgeText="System Maintenance · Operations"
        title="Backup & Recovery"
        description="Timestamped, encrypted snapshots of clinic database records alongside automated schedule cadence."
        actions={
          <button
            type="button"
            onClick={() => setShowShortcuts((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 shadow-2xs transition hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900"
          >
            <kbd className="rounded border border-neutral-200 bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] text-neutral-500">
              ⌘K
            </kbd>
            Shortcuts
          </button>
        }
      />

      {/* Safety Status */}
      <section aria-labelledby="safety-status-heading" className="space-y-3">
        <h2
          id="safety-status-heading"
          className="text-sm font-semibold text-neutral-900"
        >
          Safety Status
        </h2>
        <SafetyBanner
          latestBackupAt={latestBackupAt}
          nextRun={nextRun}
          creating={creatingBackup}
          onRunBackup={handleCreateBackup}
        />
      </section>

      {/* Automatic Cadence and Upcoming Runs */}
      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
        <section
          aria-labelledby="automatic-cadence-heading"
          className="flex flex-col rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-xs"
        >
          <div className="mb-3">
            <h2
              id="automatic-cadence-heading"
              className="text-sm font-semibold text-neutral-900"
            >
              Automatic Cadence
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Configure the automated recurring monthly snapshot window.
            </p>
          </div>

          <BackupScheduleEditor
            key={schedule?.dayOfMonth}
            schedule={schedule}
            loading={scheduleLoading}
            error={scheduleError}
            saving={scheduleSaving}
            scheduleMessage={scheduleMessage}
            onSave={handleSaveSchedule}
            onRetry={retrySchedule}
          />
        </section>

        {schedule && !scheduleLoading && (
          <section
            aria-labelledby="upcoming-runs-heading"
            className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-xs"
          >
            <div className="mb-3">
              <h2
                id="upcoming-runs-heading"
                className="text-sm font-semibold text-neutral-900"
              >
                Upcoming Runs
              </h2>
              <p className="mt-0.5 text-xs text-neutral-500">
                The next scheduled snapshot windows.
              </p>
            </div>
            <UpcomingRuns schedule={schedule} />
          </section>
        )}
      </div>

      {/* Recent Activity Trail */}
      <MaintenanceActivityLog activity={activity} onClear={clearActivity} />

      {/* Backup History Table */}
      <BackupHistoryTable
        backups={backups}
        status={backupsStatus}
        onRetry={retryBackups}
        onOpenRestore={() => setShowRestoreDialog(true)}
        onSelectBackup={setSelectedBackup}
        onDownloadBackup={handleDownloadBackup}
        downloadingId={downloadingId}
        restoring={restoring}
      />

      {/* Modals & Drawers */}
      <MaintenanceShortcutsModal
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />

      <RestoreBackupModal
        isOpen={showRestoreDialog}
        onClose={() => setShowRestoreDialog(false)}
        backups={backups}
        onRestore={handleRestoreBackup}
        restoring={restoring}
        initialBackupId={selectedBackup?.backupId}
      />

      <BackupDetailDrawer
        backup={selectedBackup}
        onClose={() => setSelectedBackup(null)}
      />

      <ConfirmDialog
        isOpen={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          confirm?.run?.();
          setConfirm(null);
        }}
        title={confirm?.title ?? ""}
        message={confirm?.message ?? ""}
        confirmLabel={confirm?.confirmLabel}
        variant={confirm?.variant ?? "primary"}
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
          duration={5000}
          className="fixed bottom-4 right-4 z-50 max-w-sm shadow-xl"
        />
      )}
    </div>
  );
};

export default SystemMaintenancePage;
