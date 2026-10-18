import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";

import Button from "../../components/Button";
import ConfirmDialog from "../../components/ConfirmDialog";
import ErrorMessage from "../../components/ErrorMessage";
import Icon from "../../components/Icon";
import Input from "../../components/Input";
import Modal from "../../components/Modal";
import Pagination from "../../components/Pagination";
import SearchBar from "../../components/SearchBar";
import Select from "../../components/Select";
import StatusBadge from "../../components/StatusBadge";
import Table from "../../components/Table";
import Toast from "../../components/Toast";
import { ROLES } from "../../constants/roles";
import {
  createUser,
  getUsers,
  resetUserPassword,
  updateUserStatus,
} from "../../services/userService";

/** `GET /users` returns the whole directory, so paging is client-side. */
const PAGE_SIZE = 10;

const ALL_ROLES = "ALL";
const STATUS_ACTIVE = "ACTIVE";
const STATUS_SUSPENDED = "SUSPENDED";

const roleLabel = (role) => String(role ?? "").replace(/_/g, " ");

/**
 * Role colours follow the approved contrast pairs (label-on-*-subtle in
 * theme/tokens.js); SUPER_ADMIN reads as the amber "elevated" clearance.
 */
const ROLE_BADGE_CLASSES = {
  [ROLES.SUPER_ADMIN]: "border-warning-200 bg-warning-100 text-warning-900",
  [ROLES.ADMIN]: "border-primary-200 bg-primary-100 text-primary-800",
  [ROLES.DOCTOR]: "border-teal-200 bg-teal-100 text-teal-800",
  [ROLES.PHARMACIST]:
    "border-secondary-200 bg-secondary-100 text-secondary-800",
};

/** Select renders an extra empty placeholder option; "" maps to ALL_ROLES. */
const ROLE_FILTER_OPTIONS = Object.values(ROLES).map((role) => ({
  value: role,
  label: roleLabel(role),
}));

const EMPTY_FORM = {
  fullName: "",
  username: "",
  email: "",
  role: ROLES.DOCTOR,
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateEmail = (value) =>
  !EMAIL_PATTERN.test(String(value ?? "").trim())
    ? "Enter a valid email address."
    : "";

const matchesQuery = (user, query) =>
  [user.fullName, user.username, user.email,].some((field) =>
    String(field ?? "").toLowerCase().includes(query),
  );

/**
 * Super-admin user management (access governance): provision staff
 * accounts, assign role clearance, audit 2FA enrolment, suspend or
 * re-activate accounts and trigger the reset-key email.
 *
 * Fetch status is `loading | ready | failed`; a failed load keeps the
 * header on screen with a retry instead of blanking the page.
 */
const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [status, setStatus] = useState("loading");
  const [reloadKey, setReloadKey] = useState(0);

  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [roleFilter, setRoleFilter] = useState(ALL_ROLES);
  const [page, setPage] = useState(1);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [resettingUserId, setResettingUserId] = useState(null);

  const [toast, setToast] = useState(null);

  useEffect(() => {
    let cancelled = false;

    getUsers()
      .then((data) => {
        if (cancelled) return;
        setUsers(data);
        setPage(1);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("failed");
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const retry = useCallback(() => {
    setStatus("loading");
    setReloadKey((key) => key + 1);
  }, []);

  const handleQueryChange = useCallback((value) => {
    setQuery(value);
    setPage(1);
  }, []);

  const openCreate = useCallback(() => {
    setForm(EMPTY_FORM);
    setSubmitAttempted(false);
    setSubmitError("");
    setIsCreateOpen(true);
  }, []);

  const closeCreate = useCallback(() => {
    if (submitting) return;
    setIsCreateOpen(false);
  }, [submitting]);

  const handleFormChange = useCallback((event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }, []);

  const handleCreateSubmit = async (event) => {
    event.preventDefault();
    setSubmitAttempted(true);
    setSubmitError("");

    if (
      !form.fullName.trim() ||
      !form.username.trim() ||
      !form.email.trim() ||
      !EMAIL_PATTERN.test(form.email.trim())
    ) {
      return;
    }

    setSubmitting(true);
    try {
      await createUser(form);
      setIsCreateOpen(false);
      setForm(EMPTY_FORM);
      setSubmitAttempted(false);
      setToast({
        type: "success",
        message: `Account for ${form.username.trim()} created. The temporary password was emailed to the user.`,
      });
      setStatus("loading");
      setReloadKey((key) => key + 1);
    } catch (error) {
      setSubmitError(
        error?.userMessage ??
          "Unable to create the account. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmStatusChange = async () => {
    const target = confirmTarget;
    if (!target) return;

    const nextStatus =
      target.status === STATUS_SUSPENDED ? STATUS_ACTIVE : STATUS_SUSPENDED;

    setConfirmBusy(true);
    try {
      await updateUserStatus(target.userId, nextStatus);
      setUsers((current) =>
        current.map((user) =>
          user.userId === target.userId
            ? { ...user, status: nextStatus }
            : user,
        ),
      );
      setConfirmTarget(null);
      setToast({
        type: "success",
        message:
          nextStatus === STATUS_SUSPENDED
            ? `${target.fullName} was suspended and can no longer sign in.`
            : `${target.fullName} was re-activated.`,
      });
    } catch (error) {
      setToast({
        type: "error",
        message:
          error?.userMessage ??
          "Unable to update the account status. Please try again.",
      });
    } finally {
      setConfirmBusy(false);
    }
  };

  const handleResetKey = useCallback(async (user) => {
    setResettingUserId(user.userId);
    try {
      await resetUserPassword(user.userId);
      setToast({
        type: "success",
        message: `Password reset link sent to ${
          user.email || user.username
        }.`,
      });
    } catch (error) {
      setToast({
        type: "error",
        message:
          error?.userMessage ??
          "Unable to send the password reset link. Please try again.",
      });
    } finally {
      setResettingUserId(null);
    }
  }, []);

  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      users.filter((user) => {
        const matchesRole =
          roleFilter === ALL_ROLES || user.role === roleFilter;
        return (
          matchesRole &&
          (!normalizedQuery || matchesQuery(user, normalizedQuery))
        );
      }),
    [users, roleFilter, normalizedQuery],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleUsers = useMemo(
    () => filtered.slice(startIndex, startIndex + PAGE_SIZE),
    [filtered, startIndex],
  );

  const columns = useMemo(
    () => [
      {
        key: "fullName",
        header: "Employee",
        render: (row) => (
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-semibold text-primary-700"
            >
              {String(row.fullName ?? "?")
                .charAt(0)
                .toUpperCase()}
            </span>
            <div className="min-w-0">
              <span className="block font-medium text-neutral-900">
                {row.fullName}
              </span>
              <span className="block font-mono text-xs text-neutral-500">
                {row.username}
                {row.email ? ` • ${row.email}` : ""}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: "role",
        header: "Security role",
        render: (row) => (
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
              ROLE_BADGE_CLASSES[row.role] ??
              "border-neutral-200 bg-neutral-100 text-neutral-800"
            }`}
          >
            {roleLabel(row.role) || "—"}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (row) =>
          row.status === STATUS_SUSPENDED ? (
            <StatusBadge status="danger">Suspended</StatusBadge>
          ) : (
            <StatusBadge status="success">Active</StatusBadge>
          ),
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              loading={resettingUserId === row.userId}
              onClick={() => handleResetKey(row)}
            >
              Reset key
            </Button>
            <Button
              size="sm"
              variant={
                row.status === STATUS_SUSPENDED ? "primary" : "danger"
              }
              onClick={() => setConfirmTarget(row)}
            >
              {row.status === STATUS_SUSPENDED ? "Activate" : "Suspend"}
            </Button>
          </div>
        ),
      },
    ],
    [handleResetKey, resettingUserId],
  );

  const total = users.length;
  const countLabel =
    normalizedQuery || roleFilter !== ALL_ROLES
      ? `${filtered.length} of ${total} staff accounts`
      : `${total} ${total === 1 ? "staff account" : "staff accounts"}`;

  const emptyTitle = "No staff accounts found.";
  const emptyMessage =
    normalizedQuery || roleFilter !== ALL_ROLES
      ? "No accounts match the current filters. Try a different search or role."
      : "There are no staff accounts yet. Use Create new account to provision the first one.";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header — access-governance framing + create action */}
      <div className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary-700">
            Access governance
          </span>
          <h1 className="mt-1 text-2xl font-semibold text-neutral-900">
            User management & role permissions
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600">
            Provision staff identity credentials, assign security clearance
            levels, and audit 2FA enrolment.
          </p>
          {status === "ready" && (
            <p className="mt-2 text-sm font-medium text-neutral-800">
              {countLabel}
            </p>
          )}
        </div>

        <Button
          onClick={openCreate}
          className="inline-flex shrink-0 items-center gap-2"
        >
          <Icon name="plus" className="h-4 w-4" />
          Create new account
        </Button>
      </div>

      {/* Search + role filter */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <SearchBar
            value={query}
            onChange={handleQueryChange}
            placeholder="Search by name, username, email"
            searchLabel="Search users"
            className="w-full sm:max-w-md"
          />

          <Select
            id="role-filter"
            name="role-filter"
            label="Security role"
            options={ROLE_FILTER_OPTIONS}
            placeholder="All roles"
            defaultValue=""
            onChange={(event) => {
              setRoleFilter(event.target.value || ALL_ROLES);
              setPage(1);
            }}
            className="w-full sm:w-56"
          />
        </div>
      </div>

      {/* User table */}
      {status === "loading" ? (
        <div
          role="status"
          aria-label="Loading staff accounts"
          aria-busy="true"
          className="motion-safe:animate-pulse space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs"
        >
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="h-4 rounded bg-neutral-100"
              style={{ width: `${Math.max(40, 92 - index * 14)}%` }}
            />
          ))}
        </div>
      ) : status === "failed" ? (
        <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs">
          <ErrorMessage
            title="Unable to load staff accounts"
            message="Please check your connection and try again."
          />
          <Button onClick={retry} className="inline-flex items-center gap-2">
            <Icon name="refresh" className="h-4 w-4" />
            Retry
          </Button>
        </div>
      ) : (
        <section aria-labelledby="staff-directory-heading">
          <h2
            id="staff-directory-heading"
            className="mb-3 text-base font-semibold text-neutral-900"
          >
            All staff accounts
          </h2>

          <Table
            columns={columns}
            data={visibleUsers}
            getRowKey={(row) => row.userId}
            emptyTitle={emptyTitle}
            emptyMessage={emptyMessage}
            label="All staff accounts"
          />

          {totalPages > 1 && (
            <Pagination
              className="mt-4"
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          )}
        </section>
      )}

      {/* Suspend / activate confirmation */}
      <ConfirmDialog
        isOpen={Boolean(confirmTarget)}
        onClose={() => {
          if (!confirmBusy) setConfirmTarget(null);
        }}
        onConfirm={handleConfirmStatusChange}
        title={
          confirmTarget?.status === STATUS_SUSPENDED
            ? "Activate account"
            : "Suspend account"
        }
        message={
          confirmTarget?.status === STATUS_SUSPENDED
            ? `Re-activate ${confirmTarget?.fullName}? They will be able to sign in again immediately.`
            : `Suspend ${confirmTarget?.fullName}? They will not be able to sign in until the account is re-activated.`
        }
        confirmLabel={
          confirmTarget?.status === STATUS_SUSPENDED ? "Activate" : "Suspend"
        }
        variant={
          confirmTarget?.status === STATUS_SUSPENDED ? "primary" : "danger"
        }
        loading={confirmBusy}
      />

      {/* Provision new account */}
      <Modal
        isOpen={isCreateOpen}
        onClose={closeCreate}
        title="Provision new user"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {submitError && (
            <ErrorMessage
              title="Unable to create account"
              message={submitError}
            />
          )}

          <Input
            id="fullName"
            name="fullName"
            label="Full legal name"
            value={form.fullName}
            onChange={handleFormChange}
            required
            submitted={submitAttempted}
            placeholder="e.g. Dr. Arthur Pendelton"
          />

          <Input
            id="username"
            name="username"
            label="Staff ID / username"
            value={form.username}
            onChange={handleFormChange}
            required
            submitted={submitAttempted}
            placeholder="e.g. PENDELTON-3312"
          />

          <Input
            id="email"
            name="email"
            label="Clinic email address"
            type="email"
            value={form.email}
            onChange={handleFormChange}
            required
            validate={validateEmail}
            submitted={submitAttempted}
            placeholder="staff@onecare.clinic"
            hint="The temporary password is emailed to this address."
          />

          <Select
            id="role"
            name="role"
            label="Role clearance"
            options={Object.values(ROLES).map((role) => ({
              value: role,
              label: roleLabel(role),
            }))}
            value={form.role}
            onChange={handleFormChange}
            required
            submitted={submitAttempted}
          />

          <div className="flex justify-end gap-2 border-t border-neutral-100 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={closeCreate}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Create user
            </Button>
          </div>
        </form>
      </Modal>

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

export default UserManagementPage;
