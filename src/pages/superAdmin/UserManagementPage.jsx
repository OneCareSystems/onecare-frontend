import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
} from "react";

import Button from "../../components/Button";
import ConfirmDialog from "../../components/ConfirmDialog";
import ErrorMessage from "../../components/ErrorMessage";
import Icon from "../../components/Icon";
import Pagination from "../../components/Pagination";
import SearchBar from "../../components/SearchBar";
import Select from "../../components/Select";
import StatusBadge from "../../components/StatusBadge";
import Table from "../../components/Table";
import Toast from "../../components/Toast";
import { SuperAdminPageHeader } from "../../features/superAdmin/SuperAdminPageHeader";
import UserCreateModal from "../../features/superAdmin/UserCreateModal";
import UserEditModal from "../../features/superAdmin/UserEditModal";
import { ROLES } from "../../constants/roles";
import {
  assignUserRole,
  createUser,
  deactivateUser,
  getUsers,
  resetUserPassword,
  unlockUser,
  updateUserEmail,
} from "../../services/userService";

const PAGE_SIZE = 10;

const STATUS_ACTIVE = "ACTIVE";
const STATUS_INACTIVE = "INACTIVE";
const STATUS_LOCKED = "LOCKED";
const ALL_FILTER = "ALL";

const roleLabel = (role) => String(role ?? "").replace(/_/g, " ");

const ROLE_BADGE_CLASSES = {
  [ROLES.SUPER_ADMIN]: "border-warning-200 bg-warning-100 text-warning-900",
  [ROLES.ADMIN]: "border-primary-200 bg-primary-100 text-primary-800",
  [ROLES.DOCTOR]: "border-teal-200 bg-teal-100 text-teal-800",
  [ROLES.PHARMACIST]:
    "border-secondary-200 bg-secondary-100 text-secondary-800",
};

const EMPTY_FORM = {
  password: "",
  username: "",
  email: "",
  role: ROLES.DOCTOR,
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ------------------------------------------------------------------ */
/* Presentational bits                                                 */
/* ------------------------------------------------------------------ */

const roleHue = (role) => {
  let h = 0;
  for (const ch of String(role || "")) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
};

const EmployeeCell = memo(({ username, email }) => {
  const initial = String(username ?? "?")
    .charAt(0)
    .toUpperCase();
  const hue = roleHue(username);
  return (
    <div className="flex items-center gap-3 py-1">
      <span
        aria-hidden="true"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white shadow-xs"
        style={{ backgroundColor: `hsl(${hue} 55% 45%)` }}
      >
        {initial}
      </span>
      <div className="min-w-0">
        <span className="block truncate font-medium text-neutral-900">
          {username}
        </span>
        <span className="block truncate font-mono text-xs text-neutral-500">
          {email || "—"}
        </span>
      </div>
    </div>
  );
});
EmployeeCell.displayName = "EmployeeCell";

const RolePill = memo(({ role }) => (
  <span
    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
      ROLE_BADGE_CLASSES[role] ??
      "border-neutral-200 bg-neutral-100 text-neutral-800"
    }`}
  >
    {roleLabel(role) || "—"}
  </span>
));
RolePill.displayName = "RolePill";

/** Live-updating lock countdown. */
const LockCountdown = memo(({ lockedUntil }) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  if (!lockedUntil) return null;
  const diff = new Date(lockedUntil).getTime() - now;
  if (diff <= 0)
    return (
      <span className="text-[11px] text-warning-700">
        Lock expired — retry signing in
      </span>
    );
  const mins = Math.ceil(diff / 60000);
  const label = mins >= 60 ? `${Math.ceil(mins / 60)}h` : `${mins}m`;
  return (
    <span className="text-[11px] text-warning-700">Unlocks in ~{label}</span>
  );
});
LockCountdown.displayName = "LockCountdown";

const UserStatusBadge = memo(({ status, lockedUntil }) => {
  if (status === STATUS_LOCKED) {
    return (
      <div className="flex flex-col gap-0.5">
        <span
          title="Account locked due to consecutive failed login attempts."
          className="inline-flex cursor-help"
        >
          <StatusBadge status="warning">Locked</StatusBadge>
        </span>
        <LockCountdown lockedUntil={lockedUntil} />
      </div>
    );
  }
  if (status === STATUS_INACTIVE)
    return <StatusBadge status="danger">Inactive</StatusBadge>;
  if (status === STATUS_ACTIVE)
    return <StatusBadge status="success">Active</StatusBadge>;
  return <StatusBadge status="neutral">{status || "Unknown"}</StatusBadge>;
});
UserStatusBadge.displayName = "UserStatusBadge";

/* ------------------------------------------------------------------ */
/* Row actions (kebab menu)                                            */
/* ------------------------------------------------------------------ */

const RowActionsMenu = memo(
  ({ row, onEdit, onUnlock, onDeactivate, onReset }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
      if (!open) return;
      const onDocClick = (e) => {
        if (ref.current && !ref.current.contains(e.target)) setOpen(false);
      };
      const onKey = (e) => e.key === "Escape" && setOpen(false);
      document.addEventListener("mousedown", onDocClick);
      document.addEventListener("keydown", onKey);
      return () => {
        document.removeEventListener("mousedown", onDocClick);
        document.removeEventListener("keydown", onKey);
      };
    }, [open]);

    const item = (label, icon, handler, { danger, hidden } = {}) => {
      if (hidden) return null;
      return (
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            handler?.();
          }}
          className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition ${
            danger
              ? "text-danger-700 hover:bg-danger-50"
              : "text-neutral-700 hover:bg-neutral-50"
          }`}
        >
          <Icon name={icon} className="h-3.5 w-3.5" />
          {label}
        </button>
      );
    };

    return (
      <div ref={ref} className="relative inline-block text-right">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-500 shadow-xs transition hover:border-neutral-300 hover:text-neutral-800"
        >
          <Icon name="more-vertical" className="h-4 w-4" />
        </button>
        {open && (
          <div
            role="menu"
            className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-neutral-200 bg-white p-1 shadow-lg"
          >
            {item("Edit account", "pencil", () => onEdit(row))}
            {item("Reset password", "key-round", () => onReset(row))}
            {item("Unlock account", "unlock", () => onUnlock(row), {
              hidden: row.status !== STATUS_LOCKED,
            })}
            <div className="my-1 h-px bg-neutral-100" />
            {item("Deactivate account", "ban", () => onDeactivate(row), {
              danger: true,
              hidden: row.status === STATUS_INACTIVE,
            })}
          </div>
        )}
      </div>
    );
  },
);
RowActionsMenu.displayName = "RowActionsMenu";

/* ------------------------------------------------------------------ */
/* Main page                                                           */
/* ------------------------------------------------------------------ */

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [status, setStatus] = useState("loading");
  const [reloadKey, setReloadKey] = useState(0);

  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [roleFilter, setRoleFilter] = useState(ALL_FILTER);
  const [statusFilter, setStatusFilter] = useState(ALL_FILTER);
  const [page, setPage] = useState(1);
  const [density, setDensity] = useState("comfortable");
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [confirm, setConfirm] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ email: "", role: ROLES.DOCTOR });
  const [editAttempted, setEditAttempted] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");

  const [toast, setToast] = useState(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const searchInputRef = useRef(null);

  const openCreate = useCallback(() => {
    setForm(EMPTY_FORM);
    setSubmitAttempted(false);
    setSubmitError("");
    setIsCreateOpen(true);
  }, []);

  /* ---- shortcuts ---- */
  useEffect(() => {
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowShortcuts((v) => !v);
      } else if (mod && e.key.toLowerCase() === "n") {
        e.preventDefault();
        openCreate();
      } else if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "Escape") {
        setShowShortcuts(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openCreate]);

  /* ---- fetch ---- */
  useEffect(() => {
    let active = true;
    getUsers()
      .then((data) => {
        if (!active) return;
        setUsers(data || []);
        setStatus("ready");
      })
      .catch(() => active && setStatus("failed"));
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const retry = useCallback(() => {
    setStatus("loading");
    setReloadKey((k) => k + 1);
  }, []);

  const handleQueryChange = useCallback((v) => {
    setQuery(v);
    setPage(1);
  }, []);

  const closeCreate = useCallback(() => {
    if (submitting) return;
    setIsCreateOpen(false);
  }, [submitting]);

  const handleFormChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((c) => ({ ...c, [name]: value }));
  }, []);

  const handleCreateSubmit = async (event) => {
    event.preventDefault();
    setSubmitAttempted(true);
    setSubmitError("");
    if (
      !form.password.trim() ||
      !form.username.trim() ||
      !form.email.trim() ||
      !EMAIL_PATTERN.test(form.email.trim())
    )
      return;

    setSubmitting(true);
    try {
      const newUser = await createUser(form);
      setIsCreateOpen(false);
      setForm(EMPTY_FORM);
      setSubmitAttempted(false);
      if (newUser && newUser.userId) {
        setUsers((prev) => [newUser, ...prev]);
      } else {
        setReloadKey((k) => k + 1);
      }
      setToast({
        type: "success",
        message: `Account for ${form.username.trim()} provisioned. Onboarding email dispatched.`,
      });
    } catch (error) {
      setSubmitError(
        error?.userMessage ??
          "Unable to create user account. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const patchUserLocally = useCallback((userId, patch) => {
    setUsers((current) =>
      current.map((u) => (u.userId === userId ? { ...u, ...patch } : u)),
    );
  }, []);

  const handleConfirm = async () => {
    if (!confirm?.run) return;
    setConfirmBusy(true);
    try {
      await confirm.run();
    } finally {
      setConfirmBusy(false);
      setConfirm(null);
    }
  };

  const requestDeactivate = useCallback(
    (user) => {
      setConfirm({
        title: "Deactivate account?",
        message: `Deactivate ${user.username}? Access is revoked immediately; all actions remain in the compliance audit log.`,
        confirmLabel: "Deactivate Account",
        variant: "danger",
        run: async () => {
          const prev = user.status;
          patchUserLocally(user.userId, {
            status: STATUS_INACTIVE,
            lockedUntil: null,
          });
          try {
            await deactivateUser(user.userId);
            setToast({
              type: "success",
              message: `${user.username} has been deactivated.`,
            });
          } catch (error) {
            patchUserLocally(user.userId, { status: prev });
            setToast({
              type: "error",
              message:
                error?.userMessage ??
                "Unable to deactivate the account. State rolled back.",
            });
          }
        },
      });
    },
    [patchUserLocally],
  );

  const requestUnlock = useCallback(
    (user) => {
      setConfirm({
        title: "Clear sign-in lockout?",
        message: `Clear authentication lockout for ${user.username}? They will be able to sign in immediately.`,
        confirmLabel: "Unlock Account",
        variant: "primary",
        run: async () => {
          const prev = { status: user.status, lockedUntil: user.lockedUntil };
          patchUserLocally(user.userId, {
            status: STATUS_ACTIVE,
            lockedUntil: null,
          });
          try {
            await unlockUser(user.userId);
            setToast({
              type: "success",
              message: `Lockout cleared for ${user.username}.`,
            });
          } catch (error) {
            patchUserLocally(user.userId, prev);
            setToast({
              type: "error",
              message:
                error?.userMessage ??
                "Unable to clear the lockout. State rolled back.",
            });
          }
        },
      });
    },
    [patchUserLocally],
  );

  const handleResetKey = useCallback(async (user) => {
    try {
      await resetUserPassword(user.userId);
      setToast({
        type: "success",
        message: `Password reset dispatched to ${user.email || user.username}.`,
      });
    } catch (error) {
      setToast({
        type: "error",
        message:
          error?.userMessage ?? "Unable to initiate password reset sequence.",
      });
    }
  }, []);

  const openEdit = useCallback((user) => {
    setEditTarget(user);
    setEditForm({ email: user.email, role: user.role });
    setEditAttempted(false);
    setEditError("");
    setIsEditOpen(true);
  }, []);

  const closeEdit = useCallback(() => {
    if (editSubmitting) return;
    setIsEditOpen(false);
  }, [editSubmitting]);

  const handleEditChange = useCallback((e) => {
    const { name, value } = e.target;
    setEditForm((c) => ({ ...c, [name]: value }));
  }, []);

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    setEditAttempted(true);
    setEditError("");
    const email = editForm.email.trim();
    if (!email || !EMAIL_PATTERN.test(email)) return;
    const emailChanged = email !== editTarget.email;
    const roleChanged = editForm.role !== editTarget.role;
    if (!emailChanged && !roleChanged) {
      setIsEditOpen(false);
      return;
    }
    setEditSubmitting(true);
    try {
      if (emailChanged) {
        await updateUserEmail(editTarget.userId, email);
        patchUserLocally(editTarget.userId, { email });
      }
      if (roleChanged) {
        await assignUserRole(editTarget.userId, editForm.role);
        patchUserLocally(editTarget.userId, { role: editForm.role });
      }
      setIsEditOpen(false);
      setToast({
        type: "success",
        message: `Account settings for ${editTarget.username} updated.`,
      });
    } catch (error) {
      setEditError(
        error?.userMessage ??
          "Unable to update account details. Please try again.",
      );
    } finally {
      setEditSubmitting(false);
    }
  };

  /* ---- bulk selection ---- */
  const toggleSelectOne = (userId) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });

  /* ---- derived ---- */
  const filteredUsers = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch =
        !q ||
        [user.username, user.email].some((f) =>
          String(f ?? "")
            .toLowerCase()
            .includes(q),
        );
      const matchesRole = roleFilter === ALL_FILTER || user.role === roleFilter;
      const matchesStatus =
        statusFilter === ALL_FILTER || user.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, deferredQuery, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleUsers = useMemo(
    () => filteredUsers.slice(startIndex, startIndex + PAGE_SIZE),
    [filteredUsers, startIndex],
  );

  const counts = useMemo(() => {
    let active = 0,
      locked = 0,
      inactive = 0;
    for (const u of users) {
      if (u.status === STATUS_ACTIVE) active++;
      else if (u.status === STATUS_LOCKED) locked++;
      else if (u.status === STATUS_INACTIVE) inactive++;
    }
    return { total: users.length, active, locked, inactive };
  }, [users]);

  const allOnPageSelected =
    visibleUsers.length > 0 &&
    visibleUsers.every((u) => selectedIds.has(u.userId));

  const toggleSelectAllOnPage = useCallback(() =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        visibleUsers.forEach((u) => next.delete(u.userId));
      } else {
        visibleUsers.forEach((u) => next.add(u.userId));
      }
      return next;
    }), [allOnPageSelected, visibleUsers]);

  /* ---- columns ---- */
  const columns = useMemo(
    () => [
      {
        key: "select",
        header: (
          <input
            type="checkbox"
            aria-label="Select all on page"
            checked={allOnPageSelected}
            onChange={toggleSelectAllOnPage}
            className="h-3.5 w-3.5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
          />
        ),
        headerClass: "w-8",
        render: (row) => (
          <input
            type="checkbox"
            aria-label={`Select ${row.username}`}
            checked={selectedIds.has(row.userId)}
            onChange={() => toggleSelectOne(row.userId)}
            className="h-3.5 w-3.5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
          />
        ),
      },
      {
        key: "fullName",
        header: "Employee",
        render: (row) => (
          <EmployeeCell username={row.username} email={row.email} />
        ),
      },
      {
        key: "role",
        header: "Security Role",
        render: (row) => <RolePill role={row.role} />,
      },
      {
        key: "status",
        header: "Status",
        render: (row) => (
          <UserStatusBadge status={row.status} lockedUntil={row.lockedUntil} />
        ),
      },
      {
        key: "actions",
        header: "",
        headerClass: "text-right w-12",
        render: (row) => (
          <RowActionsMenu
            row={row}
            onEdit={openEdit}
            onUnlock={requestUnlock}
            onDeactivate={requestDeactivate}
            onReset={handleResetKey}
          />
        ),
      },
    ],
    [
      allOnPageSelected,
      toggleSelectAllOnPage,
      selectedIds,
      openEdit,
      requestUnlock,
      requestDeactivate,
      handleResetKey,
    ],
  );

  const roleOptions = useMemo(
    () => [
      { value: ALL_FILTER, label: "All Roles" },
      ...Object.values(ROLES).map((r) => ({ value: r, label: roleLabel(r) })),
    ],
    [],
  );
  const statusOptions = useMemo(
    () => [
      { value: ALL_FILTER, label: "All Statuses" },
      { value: STATUS_ACTIVE, label: "Active" },
      { value: STATUS_LOCKED, label: "Locked" },
      { value: STATUS_INACTIVE, label: "Inactive" },
    ],
    [],
  );

  const isFiltered =
    query || roleFilter !== ALL_FILTER || statusFilter !== ALL_FILTER;

  /* ---- render ---- */
  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      {/* ============ Hero ============ */}
      <SuperAdminPageHeader
        icon="users"
        badgeText="Identity · Staff directory"
        title="User Management"
        description="Provision, edit, and lock down staff accounts. All actions are audited."
        actions={
          <>
            <div className="inline-flex rounded-lg border border-neutral-200 bg-neutral-50 p-0.5">
              {[
                { id: "comfortable", label: "Comfortable" },
                { id: "compact", label: "Compact" },
              ].map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDensity(d.id)}
                  aria-pressed={density === d.id}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                    density === d.id
                      ? "bg-white text-neutral-900 shadow-xs"
                      : "text-neutral-500 hover:text-neutral-800"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowShortcuts((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition hover:border-neutral-300 hover:text-neutral-900"
            >
              <kbd className="rounded bg-neutral-100 px-1 font-mono text-[10px]">
                ⌘K
              </kbd>
              Shortcuts
            </button>
            <Button
              onClick={openCreate}
              className="inline-flex shrink-0 items-center gap-1.5"
            >
              <Icon name="plus" className="h-4 w-4" />
              Create User
            </Button>
          </>
        }
      />

      {/* ============ Stat strip ============ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            key: ALL_FILTER,
            label: "All accounts",
            value: counts.total,
            tone: "neutral",
          },
          {
            key: STATUS_ACTIVE,
            label: "Active",
            value: counts.active,
            tone: "success",
          },
          {
            key: STATUS_LOCKED,
            label: "Locked",
            value: counts.locked,
            tone: "warning",
          },
          {
            key: STATUS_INACTIVE,
            label: "Inactive",
            value: counts.inactive,
            tone: "danger",
          },
        ].map((c) => {
          const tone =
            c.tone === "success"
              ? "text-success-700 bg-success-50 ring-success-200"
              : c.tone === "warning"
                ? "text-warning-800 bg-warning-50 ring-warning-200"
                : c.tone === "danger"
                  ? "text-danger-700 bg-danger-50 ring-danger-200"
                  : "text-neutral-700 bg-neutral-50 ring-neutral-200";
          const active = statusFilter === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => {
                setStatusFilter(c.key);
                setPage(1);
              }}
              className={`flex items-center justify-between rounded-2xl border bg-white p-3.5 text-left shadow-xs transition hover:shadow-sm ${
                active
                  ? "border-neutral-900 ring-1 ring-neutral-900"
                  : "border-neutral-200"
              }`}
            >
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                  {c.label}
                </p>
                <p className="mt-1 text-xl font-semibold text-neutral-900">
                  {c.value}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${tone}`}
              >
                {active ? "Filtered" : "View"}
              </span>
            </button>
          );
        })}
      </div>

      {/* ============ Sticky filter bar ============ */}
      <div className="sticky top-3 z-20 rounded-2xl border border-neutral-200 bg-white/95 p-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/80 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <SearchBar
              ref={searchInputRef}
              value={query}
              onChange={handleQueryChange}
              placeholder="Search by name or email…  ( / )"
              className="w-full sm:max-w-xs"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Select
                id="role-filter"
                name="roleFilter"
                options={roleOptions}
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
                className="w-36"
              />
              <Select
                id="status-filter"
                name="statusFilter"
                options={statusOptions}
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-36"
              />
              {isFiltered && (
                <Button
                  variant="tertiary"
                  onClick={() => {
                    setQuery("");
                    setRoleFilter(ALL_FILTER);
                    setStatusFilter(ALL_FILTER);
                    setPage(1);
                  }}
                  className="text-xs text-neutral-500 hover:text-neutral-800"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
          <span className="text-xs text-neutral-500">
            {filteredUsers.length === users.length
              ? `${users.length} accounts`
              : `${filteredUsers.length} of ${users.length} shown`}
          </span>
        </div>
      </div>

      {/* ============ Table ============ */}
      {status === "loading" ? (
        <div
          role="status"
          aria-label="Loading staff accounts"
          className="animate-pulse space-y-3 rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs"
        >
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="flex items-center gap-4">
              <div className="h-9 w-9 shrink-0 rounded-full bg-neutral-100" />
              <div className="h-4 w-1/3 rounded bg-neutral-100" />
              <div className="h-4 w-1/6 rounded bg-neutral-100" />
              <div className="h-4 w-1/6 rounded bg-neutral-100" />
            </div>
          ))}
        </div>
      ) : status === "failed" ? (
        <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-xs">
          <ErrorMessage
            title="Unable to load staff directory"
            message="We encountered an issue connecting to the identity provider."
          />
          <Button
            onClick={retry}
            className="mt-2 inline-flex items-center gap-2"
          >
            <Icon name="refresh" className="h-4 w-4" />
            Retry
          </Button>
        </div>
      ) : (
        <section
          aria-labelledby="staff-directory-heading"
          className="space-y-3"
        >
          <h2
            id="staff-directory-heading"
            className="text-sm font-semibold text-neutral-900"
          >
            Staff Directory
          </h2>
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xs">
            <Table
              columns={columns}
              data={visibleUsers}
              getRowKey={(row) => row.userId}
              stickyHeader
              density={density}
              emptyTitle="No accounts match criteria"
              emptyMessage={
                isFiltered
                  ? "No staff accounts match the specified filter conditions."
                  : "No staff accounts exist yet. Create a new account to populate the directory."
              }
              label="Staff Directory Table"
            />
          </div>
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

      {/* ============ Shortcuts popover ============ */}
      {showShortcuts && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-neutral-900/30 p-4 backdrop-blur-sm"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-neutral-900">
              Keyboard shortcuts
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              {[
                ["⌘ / Ctrl + F", "Focus search"],
                ["/", "Focus search"],
                ["⌘ / Ctrl + N", "Create new user"],
                ["⌘ / Ctrl + K", "Toggle shortcuts"],
                ["Esc", "Close drawer / dialog"],
              ].map(([k, label]) => (
                <li key={k} className="flex items-center justify-between">
                  <span className="text-neutral-600">{label}</span>
                  <kbd className="rounded border border-neutral-200 bg-neutral-50 px-2 py-0.5 font-mono text-[11px] text-neutral-700">
                    {k}
                  </kbd>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ============ Confirm ============ */}
      <ConfirmDialog
        isOpen={Boolean(confirm)}
        onClose={() => !confirmBusy && setConfirm(null)}
        onConfirm={handleConfirm}
        title={confirm?.title ?? ""}
        message={confirm?.message ?? ""}
        confirmLabel={confirm?.confirmLabel}
        variant={confirm?.variant ?? "danger"}
        loading={confirmBusy}
      />

      {/* ============ Create modal ============ */}
      <UserCreateModal
        isOpen={isCreateOpen}
        onClose={closeCreate}
        form={form}
        onChange={handleFormChange}
        onSubmit={handleCreateSubmit}
        isSubmitting={submitting}
        error={submitError}
        attempted={submitAttempted}
      />

      {/* ============ Edit modal ============ */}
      <UserEditModal
        isOpen={isEditOpen}
        onClose={closeEdit}
        targetUser={editTarget}
        editForm={editForm}
        onChange={handleEditChange}
        onSubmit={handleEditSubmit}
        isSubmitting={editSubmitting}
        error={editError}
        attempted={editAttempted}
      />

      {/* ============ Toast ============ */}
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

export default UserManagementPage;
