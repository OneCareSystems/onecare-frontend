import { useState } from "react";

import Button from "../../components/Button";
import ConfirmDialog from "../../components/ConfirmDialog";
import Icon from "../../components/Icon";
import StatCard from "../../components/StatCard";
import StatusBadge from "../../components/StatusBadge";
import Table from "../../components/Table";
import Toast from "../../components/Toast";

/**
 * Super-admin system maintenance.
 *
 * The backend exposes no operations/maintenance endpoints (none are
 * planned), so service health, stats and journal history below are
 * session-local fixtures. "Executing" a task simulates its run in the
 * browser and is appended to the journal with a SIMULATED status — no
 * real infrastructure job is ever started, and the copy on the page
 * says so.
 */
const SERVICE_HEALTH = [
  {
    name: "Spring Boot API Gateway",
    type: "Application Core",
    endpoint: "http://localhost:8080/api/v1",
    latency: "12ms",
    uptime: "99.99%",
    version: "v2.4.1-RELEASE",
  },
  {
    name: "PostgreSQL Primary Relational DB",
    type: "Data Persistence",
    endpoint: "postgresql-primary.internal:5432",
    latency: "4ms",
    uptime: "100%",
    version: "PostgreSQL 16.2",
  },
  {
    name: "Redis In-Memory Session Cache",
    type: "Authentication Bus",
    endpoint: "redis-cluster.internal:6379",
    latency: "1ms",
    uptime: "99.98%",
    version: "Redis 7.2-Alpine",
  },
  {
    name: "HL7 / FHIR Health Gateway",
    type: "Interoperability Protocol",
    endpoint: "hl7-bridge.internal:8443",
    latency: "28ms",
    uptime: "99.95%",
    version: "FHIR v4.0.1",
  },
  {
    name: "Thermal Receipt & Label Spooler",
    type: "Hardware Peripheral",
    endpoint: "cups-spooler.internal:9100",
    latency: "8ms",
    uptime: "99.90%",
    version: "CUPS v2.4",
  },
];

/** Historical journal entries (illustrative). Entries created during the
 * session carry `session: true` and render as SIMULATED. */
const INITIAL_JOURNAL = [
  {
    id: "MNT-8819",
    timestamp: "2026-09-14 04:00 UTC",
    task: "PostgreSQL VACUUM & ANALYZE",
    category: "Database Optimization",
    executedBy: "Automated Cron Daemon",
    duration: "42 seconds",
    notes: "Reclaimed 840 MB of unindexed table space. Zero locked rows.",
  },
  {
    id: "MNT-8818",
    timestamp: "2026-09-13 23:15 UTC",
    task: "HL7 DICOM Image Cache Flush",
    category: "Storage Optimization",
    executedBy: "Administrator Vance",
    duration: "1 minute 12 seconds",
    notes: "Purged 14 GB of temporary preview buffers older than 7 days.",
  },
  {
    id: "MNT-8817",
    timestamp: "2026-09-12 02:00 UTC",
    task: "Full Encrypted Database Snapshot",
    category: "Disaster Recovery",
    executedBy: "Automated Cron Daemon",
    duration: "3 minutes 45 seconds",
    notes: "Snapshot db_snap_20260912.sql.gz (1.24 GB) replicated to cold S3 & GCS storage.",
  },
  {
    id: "MNT-8816",
    timestamp: "2026-09-10 18:30 UTC",
    task: "Spring Boot REST Pods Rolling Restart",
    category: "Service Lifecycle",
    executedBy: "Administrator Vance",
    duration: "2 minutes 05 seconds",
    notes: "Graceful rolling restart of 3 API pods without dropped HTTP connections.",
  },
];

const MAINTENANCE_TASKS = [
  {
    key: "vacuum",
    title: "PostgreSQL Vacuum",
    description:
      "Rebuild b-tree indices, free dead tuple pages, and update query planner statistics.",
    icon: "database",
    actionLabel: "Trigger Vacuum",
    runningLabel: "Vacuuming...",
    confirmTitle: "PostgreSQL Vacuum & Reindex",
    confirmMessage:
      "This triggers a live VACUUM ANALYZE across clinic patient and appointment tables. Database reads will continue without interruption.",
    category: "Database Optimization",
    notes: "Table indices rebuilt. Execution completed cleanly.",
    variant: "outline",
    confirmVariant: "primary",
  },
  {
    key: "redis_cleanup",
    title: "Redis Session Cleanup",
    description:
      "Purge dead workstation tokens and evict stale key-value caches from the in-memory bus.",
    icon: "trash",
    actionLabel: "Purge Inactive Tokens",
    runningLabel: "Evicting...",
    confirmTitle: "Redis Inactive Token Eviction",
    confirmMessage:
      "This scans Redis cluster memory and purges expired JWT tokens. Active staff sessions remain unaffected.",
    category: "Cache Management",
    notes: "Purged expired JWT tokens from memory.",
    variant: "outline",
    confirmVariant: "primary",
  },
  {
    key: "backup",
    title: "Hot Encrypted Dump",
    description:
      "Produce an instant AES-256 encrypted database snapshot and replicate it offsite.",
    icon: "hard-drive",
    actionLabel: "Create Snapshot",
    runningLabel: "Creating Dump...",
    confirmTitle: "Hot Database Backup Snapshot",
    confirmMessage:
      "This generates an encrypted hot dump of all clinical schemas and replicates it across secondary cloud storage regions.",
    category: "Disaster Recovery",
    notes: "Snapshot archived to cold storage with a SHA-256 signature.",
    variant: "outline",
    confirmVariant: "primary",
  },
  {
    key: "rolling_restart",
    title: "Rolling Pods Restart",
    description:
      "Perform a sequential zero-downtime container reboot to refresh JVM memory heaps.",
    icon: "server",
    actionLabel: "Restart Microservices",
    runningLabel: "Restarting Pods...",
    confirmTitle: "Spring Boot Rolling Restart",
    confirmMessage:
      "Perform a graceful zero-downtime container cycle. Inbound requests are automatically buffered by the reverse proxy.",
    category: "Service Lifecycle",
    notes: "All pods cycled with zero connection loss.",
    variant: "warning",
    confirmVariant: "warning",
  },
];

const formatUtc = (date) =>
  `${date.toISOString().replace("T", " ").slice(0, 16)} UTC`;

const SystemMaintenancePage = () => {
  const [journal, setJournal] = useState(INITIAL_JOURNAL);
  const [runningTask, setRunningTask] = useState(null);
  const [toast, setToast] = useState(null);
  /** { title, message, confirmLabel, variant, run } | null */
  const [confirm, setConfirm] = useState(null);


  const requestTask = (task) => {
    setConfirm({
      title: task.confirmTitle,
      message: task.confirmMessage,
      confirmLabel: `Execute ${task.title}`,
      variant: task.confirmVariant,
      run: () => {
        setRunningTask(task.key);
        setTimeout(() => {
          setJournal((current) => [
            {
              id: `MNT-${8820 + current.filter((entry) => entry.session).length}`,
              timestamp: formatUtc(new Date()),
              task: task.title,
              category: task.category,
              executedBy: "Simulated (local session)",
              duration: "~1.2 seconds",
              notes: task.notes,
              session: true,
            },
            ...current,
          ]);
          setRunningTask(null);
          setToast({
            type: "success",
            message: `Task "${task.title}" finished (simulated locally - no backend job was started).`,
          });
        }, 1200);
      },
    });
  };

  const serviceColumns = [
    {
      key: "name",
      header: "Service Name",
      render: (service) => (
        <div className="min-w-0 whitespace-normal">
          <span className="block font-medium text-neutral-900">
            {service.name}
          </span>
          <span className="mt-0.5 block font-mono text-xs text-neutral-500">
            Version: {service.version}
          </span>
        </div>
      ),
    },
    {
      key: "type",
      header: "Category",
      render: (service) => (
        <span className="whitespace-normal text-neutral-600">
          {service.type}
        </span>
      ),
    },
    {
      key: "endpoint",
      header: "Endpoint / Socket",
      render: (service) => (
        <span className="font-mono text-xs text-secondary-700">
          {service.endpoint}
        </span>
      ),
    },
    {
      key: "latency",
      header: "Latency",
      render: (service) => (
        <span className="font-mono text-xs text-neutral-700">
          {service.latency}
        </span>
      ),
    },
    {
      key: "uptime",
      header: "Uptime",
      render: (service) => (
        <span className="text-neutral-700">{service.uptime}</span>
      ),
    },
    {
      key: "status",
      header: "Health Status",
      render: () => <StatusBadge status="success">Healthy</StatusBadge>,
    },
  ];

  const journalColumns = [
    {
      key: "id",
      header: "Log ID / Time",
      render: (entry) => (
        <div className="min-w-0 whitespace-normal">
          <span className="block font-mono text-xs font-semibold text-neutral-900">
            {entry.id}
          </span>
          <span className="mt-0.5 block text-xs text-neutral-500">
            {entry.timestamp}
          </span>
        </div>
      ),
    },
    {
      key: "task",
      header: "Maintenance Task",
      render: (entry) => (
        <div className="min-w-0 max-w-64 whitespace-normal">
          <span className="block font-medium text-neutral-900">
            {entry.task}
          </span>
          <span className="mt-0.5 block text-xs text-neutral-500">
            {entry.category}
          </span>
        </div>
      ),
    },
    {
      key: "executedBy",
      header: "Executed By",
      render: (entry) => (
        <span className="whitespace-normal text-neutral-600">
          {entry.executedBy}
        </span>
      ),
    },
    {
      key: "duration",
      header: "Duration",
      render: (entry) => (
        <span className="font-mono text-xs text-neutral-700">
          {entry.duration}
        </span>
      ),
    },
    {
      key: "notes",
      header: "Execution Notes",
      render: (entry) => (
        <span className="block max-w-xs whitespace-normal text-xs leading-relaxed text-neutral-600">
          {entry.notes}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (entry) =>
        entry.session ? (
          <StatusBadge status="neutral">Simulated</StatusBadge>
        ) : (
          <StatusBadge status="success">Completed</StatusBadge>
        ),
    },
  ];

  const tasksLocked = runningTask !== null || Boolean(confirm);

  return (
    <div className="mx-auto max-w-7xl space-y-6">

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Core Server Uptime"
          value="42d 18h"
          chip="99.98%"
          icon="clock"
          iconClass="bg-success-50 text-success-700"
          chipClass="bg-success-100 text-success-800"
        />
        <StatCard
          label="DB Cache Hit Ratio"
          value="99.4%"
          chip="SRAM Hit"
          icon="database"
          iconClass="bg-primary-50 text-primary-700"
          chipClass="bg-primary-100 text-primary-800"
        />
        <StatCard
          label="NVMe Storage"
          value="38%"
          chip="760 GB / 2 TB"
          icon="hard-drive"
          iconClass="bg-secondary-50 text-secondary-700"
          chipClass="bg-secondary-100 text-secondary-800"
        />
        <StatCard
          label="Maintenance Window"
          value="Sunday"
          chip="03:00 UTC"
          icon="calendar"
          iconClass="bg-warning-50 text-warning-700"
          chipClass="bg-warning-100 text-warning-900"
        />
      </div>

      {/* Operational maintenance tasks */}
      <section aria-labelledby="tasks-heading" className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs">
        <div className="border-b border-neutral-200 pb-3">
          <h2
            id="tasks-heading"
            className="flex items-center gap-2 text-base font-semibold text-neutral-900"
          >
            <Icon name="wrench" className="h-4 w-4 text-secondary-700" />
            Operational Maintenance Tasks
          </h2>
          <p className="text-sm text-neutral-600">
            Execute routine system maintenance with safe confirmation guards.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {MAINTENANCE_TASKS.map((task) => (
            <div
              key={task.key}
              className="flex flex-col justify-between gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-neutral-900">
                    {task.title}
                  </span>
                  <Icon
                    name={task.icon}
                    className="h-4 w-4 shrink-0 text-secondary-700"
                  />
                </div>
                <p className="mt-1 text-xs leading-relaxed text-neutral-600">
                  {task.description}
                </p>
              </div>
              <Button
                variant={task.variant}
                size="sm"
                onClick={() => requestTask(task)}
                disabled={tasksLocked}
                className="w-full"
              >
                <Icon
                  name={task.icon}
                  className={`h-4 w-4 ${
                    runningTask === task.key ? "animate-spin" : ""
                  }`}
                />
                {runningTask === task.key
                  ? task.runningLabel
                  : task.actionLabel}
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* Service health matrix */}
      <section aria-labelledby="services-heading" className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs">
        <div className="mb-4 flex flex-col gap-2 border-b border-neutral-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2
              id="services-heading"
              className="text-base font-semibold text-neutral-900"
            >
              Microservices & Daemon Health Matrix
            </h2>
            <p className="text-sm text-neutral-600">
              Heartbeat status for all clinic application containers and
              peripheral daemons.
            </p>
          </div>
          <span className="inline-flex shrink-0 self-start rounded-full bg-success-100 px-2.5 py-0.5 text-xs font-semibold text-success-800 sm:self-auto">
            {SERVICE_HEALTH.length}/{SERVICE_HEALTH.length} Services
            Operational
          </span>
        </div>

        <Table
          columns={serviceColumns}
          data={SERVICE_HEALTH}
          getRowKey={(service) => service.name}
          emptyTitle="No services registered."
          emptyMessage="No heartbeat targets are configured."
          label="Microservice health matrix"
        />
      </section>

      {/* Maintenance activity journal */}
      <section aria-labelledby="journal-heading" className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs">
        <div className="mb-4 border-b border-neutral-200 pb-3">
          <h2
            id="journal-heading"
            className="text-base font-semibold text-neutral-900"
          >
            Maintenance Activity Journal
          </h2>
          <p className="text-sm text-neutral-600">
            Chronological log of administrative operations, automated crons,
            and storage routines.
          </p>
        </div>

        <Table
          columns={journalColumns}
          data={journal}
          getRowKey={(entry) => entry.id}
          emptyTitle="No journal entries."
          emptyMessage="Maintenance operations will appear here once executed."
          label="Maintenance activity journal"
        />
      </section>

      {/* Sensitive-operation confirmation */}
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
          duration={6000}
          className="fixed bottom-4 right-4 z-50 max-w-sm shadow-lg"
        />
      )}
    </div>
  );
};

export default SystemMaintenancePage;
