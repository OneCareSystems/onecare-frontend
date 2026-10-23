import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../../components/Icon";
import StatCard from "../../components/StatCard";
import Button from "../../components/Button";
import ErrorMessage from "../../components/ErrorMessage";
import { SuperAdminPageHeader } from "../../features/superAdmin/SuperAdminPageHeader";
import { getUsers } from "../../services/userService";
import { getAuditLogs } from "../../services/auditService";
import { listBackups } from "../../services/systemBackupService";
import { getConsultationFee } from "../../services/systemSettingService";

const SuperAdminDashboardPage = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    lockedUsers: 0,
    backupsCount: 0,
    recentAuditsCount: 0,
    consultationFee: "$0.00",
  });
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [users, backups, logs, fee] = await Promise.allSettled([
        getUsers(),
        listBackups(),
        getAuditLogs({ page: 0, size: 5 }),
        getConsultationFee(),
      ]);

      const userList = users.status === "fulfilled" ? users.value || [] : [];
      const backupList =
        backups.status === "fulfilled" ? backups.value || [] : [];
      const auditPayload = logs.status === "fulfilled" ? logs.value || {} : {};
      const auditList = auditPayload.content || [];
      const feeAmount =
        fee.status === "fulfilled" && fee.value
          ? (fee.value.consultationFee ?? fee.value)
          : null;
      const feeVal =
        feeAmount !== null && Number.isFinite(Number(feeAmount))
          ? `${Number(feeAmount).toFixed(2)}`
          : "—";

      const active = userList.filter((u) => u.status === "ACTIVE").length;
      const locked = userList.filter((u) => u.status === "LOCKED").length;

      setStats({
        totalUsers: userList.length,
        activeUsers: active,
        lockedUsers: locked,
        backupsCount: backupList.length,
        recentAuditsCount: auditPayload.totalElements ?? auditList.length,
        consultationFee: feeVal,
      });
      setRecentLogs(auditList);
    } catch {
      setError("Unable to load overview data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(loadDashboardData);
  }, []);

  const quickActions = [
    {
      title: "User Management",
      desc: "Provision staff, manage roles, unlock and deactivate accounts.",
      icon: "users",
      to: "/super-admin/user-management",
      color: "bg-primary-50 text-primary-700",
    },
    {
      title: "Access Control",
      desc: "Fine-grained role permissions and RBAC matrix enforcement.",
      icon: "shield",
      to: "/super-admin/access-control",
      color: "bg-warning-50 text-warning-800",
    },
    {
      title: "Clinic Configuration",
      desc: "Set standard consultation fees and configure weekly doctor schedules.",
      icon: "hospital",
      to: "/super-admin/clinic-configuration",
      color: "bg-emerald-50 text-emerald-700",
    },
    {
      title: "System Maintenance",
      desc: "Automated monthly backups, snapshot archives, and integrity status.",
      icon: "activity",
      to: "/super-admin/system-maintenance",
      color: "bg-violet-50 text-violet-700",
    },
    {
      title: "Audits",
      desc: "Full immutable compliance audit trail with security filters.",
      icon: "clipboard",
      to: "/super-admin/audits",
      color: "bg-blue-50 text-blue-700",
    },
    {
      title: "Knowledge Base",
      desc: "Curate clinical articles and care guidelines for medical staff.",
      icon: "brain",
      to: "/super-admin/knowledge-base",
      color: "bg-pink-50 text-pink-700",
    },
    {
      title: "Reports",
      desc: "Clinic and pharmacy reports with date filters and export options.",
      icon: "clipboard",
      to: "/super-admin/reports",
      color: "bg-cyan-50 text-cyan-700",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <SuperAdminPageHeader
        icon="shield"
        badgeText="System Governance · Overview"
        title="Super Admin Dashboard"
        description="Comprehensive monitoring, governance controls, and clinic administration overview."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={loadDashboardData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 bg-white"
          >
            <Icon
              name="refresh"
              className={`h-4 w-4 ${loading ? "motion-safe:animate-spin text-primary-600" : ""}`}
            />
            Refresh Data
          </Button>
        }
      />

      {error && (
        <ErrorMessage title="Data Synchronization Notice" message={error} />
      )}

      {/* Overview Stat Cards */}
      <section aria-labelledby="system-stats-heading">
        <h2 id="system-stats-heading" className="sr-only">
          System Metrics
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Staff"
            value={loading ? "…" : stats.totalUsers}
            chip={
              stats.lockedUsers > 0
                ? `${stats.lockedUsers} Locked`
                : `${stats.activeUsers} Active`
            }
            icon="users"
            iconClass="bg-primary-50 text-primary-700"
            chipClass={
              stats.lockedUsers > 0
                ? "bg-warning-100 text-warning-900"
                : "bg-emerald-100 text-emerald-800"
            }
          />
          <StatCard
            label="Consultation Fee"
            value={loading ? "…" : stats.consultationFee}
            chip="Active Rate"
            icon="banknote"
            iconClass="bg-emerald-50 text-emerald-700"
            chipClass="bg-emerald-100 text-emerald-800"
          />
          <StatCard
            label="System Backups"
            value={loading ? "…" : stats.backupsCount}
            chip="Encrypted"
            icon="archive"
            iconClass="bg-violet-50 text-violet-700"
            chipClass="bg-violet-100 text-violet-800"
          />
          <StatCard
            label="Audit Events"
            value={loading ? "…" : stats.recentAuditsCount}
            chip="Logged"
            icon="shield"
            iconClass="bg-blue-50 text-blue-700"
            chipClass="bg-blue-100 text-blue-800"
          />
        </div>
      </section>

      {/* Navigation & Operational Hub */}
      <section className="space-y-3" aria-labelledby="quick-actions-heading">
        <h2
          id="quick-actions-heading"
          className="text-sm font-semibold text-neutral-900"
        >
          Governance Modules
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="group flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs transition hover:border-neutral-300 hover:shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.color}`}
                  >
                    <Icon name={item.icon} className="h-5 w-5" />
                  </span>
                  <Icon
                    name="arrow-right"
                    className="h-4 w-4 text-neutral-400 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-700"
                  />
                </div>
                <h3 className="mt-3 text-base font-semibold text-neutral-900 group-hover:text-primary-700">
                  {item.title}
                </h3>
                <p className="mt-1 text-xs text-neutral-500 leading-relaxed">
                  {item.desc}
                </p>
              </div>
              <div className="mt-4 border-t border-neutral-100 pt-3">
                <span className="text-xs font-semibold text-primary-600 group-hover:underline">
                  Manage module &rarr;
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent System Activity Preview */}
      <section className="space-y-3" aria-labelledby="recent-activity-heading">
        <div className="flex items-center justify-between">
          <h2
            id="recent-activity-heading"
            className="text-sm font-semibold text-neutral-900"
          >
            Recent Audit Activity
          </h2>
          <Link
            to="/super-admin/audits"
            className="text-xs font-semibold text-primary-600 hover:underline"
          >
            View all logs &rarr;
          </Link>
        </div>
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xs">
          {recentLogs.length === 0 ? (
            <div className="py-8 text-center text-sm text-neutral-500">
              {loading
                ? "Loading audit trail..."
                : "No recent audit activity records found."}
            </div>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {recentLogs.map((log) => (
                <li
                  key={log.logId || log.id}
                  className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-neutral-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-bold text-neutral-700">
                      {String(log.username || "?")
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">
                        {log.username}{" "}
                        <span className="font-normal text-neutral-500">
                          {log.description || log.actionType}
                        </span>
                      </p>
                      <p className="font-mono text-xs text-neutral-400">
                        {log.timestamp
                          ? new Date(log.timestamp).toLocaleString()
                          : "—"}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex w-fit rounded-md bg-neutral-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-neutral-700">
                    {log.actionType}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
};

export default SuperAdminDashboardPage;
