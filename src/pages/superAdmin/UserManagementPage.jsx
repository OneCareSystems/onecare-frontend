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

/**
 * Sub-component for rendering employee profile cell (Memoized for performance)
 */
const EmployeeCell = memo(({ fullName, username, email }) => {
  const initial = String(fullName ?? "?")
    .charAt(0)
    .toUpperCase();

  return (
    <div className="flex items-center gap-3 py-1">
      <span
        aria-hidden="true"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-800 border border-primary-200 shadow-xs"
      >
        {initial}
      </span>
      <div className="min-w-0">
        <span className="block font-medium text-neutral-900 truncate">
          {fullName}
        </span>
        <span className="block font-mono text-xs text-neutral-500 truncate">
          {username} {email ? `• ${email}` : ""}
        </span>
      </div>
    </div>
  );
});
EmployeeCell.displayName = "EmployeeCell";

/**
 * Sub-component for account status badges (Memoized)
 */
const UserStatusBadge = memo(({ status }) => {
  if (status === STATUS_LOCKED) {
    return (
      <span
        title="Account locked due to consecutive failed login attempts."
        className="inline-flex cursor-help"
      >
        <StatusBadge status="warning">Locked</StatusBadge>
      </span>
    );
  }
  if (status === STATUS_INACTIVE) {
    return <StatusBadge status="danger">Inactive</StatusBadge>;
  }
  if (status === STATUS_ACTIVE) {
    return <StatusBadge status="success">Active</StatusBadge>;
  }
  return <StatusBadge status="neutral">{status || "Unknown"}</StatusBadge>;
});
UserStatusBadge.displayName = "UserStatusBadge";

/**
 * Action buttons per table row (Memoized)
 */
const UserTableRowActions = memo(
  ({ row, isResetting, onEdit, onResetKey, onUnlock, onDeactivate }) => {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => onEdit(row)}>
          Edit
        </Button>

        <Button
          size="sm"
          variant="outline"
          loading={isResetting}
          onClick={() => onResetKey(row)}
        >
          Reset key
        </Button>

        {row.status === STATUS_LOCKED && (
          <Button
            size="sm"
            variant="warning"
            onClick={() => onUnlock(row)}
          >
            Unlock
          </Button>
        )}

        {row.status !== STATUS_INACTIVE && (
          <Button
            size="sm"
            variant="danger"
            onClick={() => onDeactivate(row)}
          >
            Deactivate
          </Button>
        )}
      </div>
    );
  }
);
UserTableRowActions.displayName = "UserTableRowActions";

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [status, setStatus] = useState("loading");
  const [reloadKey, setReloadKey] = useState(0);

  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [roleFilter, setRoleFilter] = useState(ALL_FILTER);
  const [statusFilter, setStatusFilter] = useState(ALL_FILTER);
  const [page, setPage] = useState(1);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [resettingUserId, setResettingUserId] = useState(null);

  const [confirm, setConfirm] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ email: "", role: ROLES.DOCTOR });
  const [editAttempted, setEditAttempted] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");

  const [toast, setToast] = useState(null);
  const searchInputRef = useRef(null);

  // Keyboard shortcut Ctrl/Cmd + F for quick search navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch users with query race condition handling
  useEffect(() => {
    let isSubscribed = true;

    getUsers()
      .then((data) => {
        if (!isSubscribed) return;
        setUsers(data || []);
        setStatus("ready");
      })
      .catch(() => {
        if (isSubscribed) setStatus("failed");
      });

    return () => {
      isSubscribed = false;
    };
  }, [reloadKey]);

  const retry = useCallback(() => {
    setStatus("loading");
    setReloadKey((k) => k + 1);
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
      const newUser = await createUser(form);
      setIsCreateOpen(false);
      setForm(EMPTY_FORM);
      setSubmitAttempted(false);

      // Optimistically append created user locally
      if (newUser && newUser.userId) {
        setUsers((prev) => [newUser, ...prev]);
      } else {
        setReloadKey((k) => k + 1);
      }

      setToast({
        type: "success",
        message: `Account for ${form.username.trim()} provisioned successfully. Instructions sent to email.`,
      });
    } catch (error) {
      setSubmitError(
        error?.userMessage ?? "Unable to create user account. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const patchUserLocally = useCallback((userId, patch) => {
    setUsers((current) =>
      current.map((user) =>
        user.userId === userId ? { ...user, ...patch } : user
      )
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
        message: `Are you sure you want to deactivate ${user.fullName} (${user.username})? Access will be revoked immediately while maintaining compliance audit logs.`,
        confirmLabel: "Deactivate Account",
        variant: "danger",
        run: async () => {
          try {
            await deactivateUser(user.userId);
            patchUserLocally(user.userId, {
              status: STATUS_INACTIVE,
              lockedUntil: null,
            });
            setToast({
              type: "success",
              message: `${user.fullName} has been deactivated.`,
            });
          } catch (error) {
            setToast({
              type: "error",
              message:
                error?.userMessage ??
                "Unable to deactivate the account. Please try again.",
            });
          }
        },
      });
    },
    [patchUserLocally]
  );

  const requestUnlock = useCallback(
    (user) => {
      setConfirm({
        title: "Clear sign-in lockout?",
        message: `Clear authentication lockout for ${user.fullName}? The account will regain standard access privileges immediately.`,
        confirmLabel: "Unlock Account",
        variant: "primary",
        run: async () => {
          try {
            await unlockUser(user.userId);
            patchUserLocally(user.userId, {
              status: STATUS_ACTIVE,
              lockedUntil: null,
            });
            setToast({
              type: "success",
              message: `Lockout cleared for ${user.fullName}.`,
            });
          } catch (error) {
            setToast({
              type: "error",
              message:
                error?.userMessage ??
                "Unable to clear the lockout. Please try again.",
            });
          }
        },
      });
    },
    [patchUserLocally]
  );

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

  const handleEditChange = useCallback((event) => {
    const { name, value } = event.target;
    setEditForm((current) => ({ ...current, [name]: value }));
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
        error?.userMessage ?? "Unable to update account details. Please try again."
      );
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleResetKey = useCallback(async (user) => {
    setResettingUserId(user.userId);
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
          error?.userMessage ??
          "Unable to initiate password reset sequence.",
      });
    } finally {
      setResettingUserId(null);
    }
  }, []);

  // Filter pipeline optimized using deferred searching
  const filteredUsers = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !normalizedQuery ||
        [user.fullName, user.username, user.email].some((field) =>
          String(field ?? "")
            .toLowerCase()
            .includes(normalizedQuery)
        );

      const matchesRole =
        roleFilter === ALL_FILTER || user.role === roleFilter;

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
    [filteredUsers, startIndex]
  );

  const columns = useMemo(
    () => [
      {
        key: "fullName",
        header: "Employee",
        render: (row) => (
          <EmployeeCell
            fullName={row.fullName}
            username={row.username}
            email={row.email}
          />
        ),
      },
      {
        key: "role",
        header: "Security Role",
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
        render: (row) => <UserStatusBadge status={row.status} />,
      },
      {
        key: "actions",
        header: "Actions",
        headerClass: "text-right",
        render: (row) => (
          <UserTableRowActions
            row={row}
            isResetting={resettingUserId === row.userId}
            onEdit={openEdit}
            onResetKey={handleResetKey}
            onUnlock={requestUnlock}
            onDeactivate={requestDeactivate}
          />
        ),
      },
    ],
    [
      resettingUserId,
      openEdit,
      handleResetKey,
      requestUnlock,
      requestDeactivate,
    ]
  );

  const roleOptions = useMemo(
    () => [
      { value: ALL_FILTER, label: "All Roles" },
      ...Object.values(ROLES).map((role) => ({
        value: role,
        label: roleLabel(role),
      })),
    ],
    []
  );

  const statusOptions = useMemo(
    () => [
      { value: ALL_FILTER, label: "All Statuses" },
      { value: STATUS_ACTIVE, label: "Active" },
      { value: STATUS_LOCKED, label: "Locked" },
      { value: STATUS_INACTIVE, label: "Inactive" },
    ],
    []
  );

  const isFiltered =
    query || roleFilter !== ALL_FILTER || statusFilter !== ALL_FILTER;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      {/* Controls Bar: Search, Role/Status Filters & Actions */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <SearchBar
              ref={searchInputRef}
              value={query}
              onChange={handleQueryChange}
              placeholder="Search by name, username, email... (⌘F)"
              searchLabel="Search staff directory"
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
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          <Button
            onClick={openCreate}
            className="inline-flex shrink-0 items-center justify-center gap-2"
          >
            <Icon name="plus" className="h-4 w-4" />
            Provision New User
          </Button>
        </div>
      </div>

      {/* Staff Table Section */}
      {status === "loading" ? (
        <div
          role="status"
          aria-label="Loading staff accounts"
          className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs animate-pulse"
        >
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="flex gap-4 items-center">
              <div className="h-9 w-9 rounded-full bg-neutral-100 shrink-0" />
              <div className="h-4 w-1/3 rounded bg-neutral-100" />
              <div className="h-4 w-1/6 rounded bg-neutral-100" />
              <div className="h-4 w-1/6 rounded bg-neutral-100" />
            </div>
          ))}
        </div>
      ) : status === "failed" ? (
        <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs text-center">
          <ErrorMessage
            title="Unable to load staff directory"
            message="We encountered an issue connecting to the identity provider. Please check your connection."
          />
          <Button onClick={retry} className="inline-flex items-center gap-2 mt-2">
            <Icon name="refresh" className="h-4 w-4" />
            Retry Connection
          </Button>
        </div>
      ) : (
        <section aria-labelledby="staff-directory-heading" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2
              id="staff-directory-heading"
              className="text-base font-semibold text-neutral-900"
            >
              Staff Directory ({filteredUsers.length})
            </h2>
          </div>

          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xs">
            <Table
              columns={columns}
              data={visibleUsers}
              getRowKey={(row) => row.userId}
              emptyTitle="No accounts match criteria"
              emptyMessage={
                isFiltered
                  ? "No staff accounts match the specified filter conditions. Try adjusting your search query."
                  : "No staff accounts exist yet. Provision a new account to populate the directory."
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

      {/* Deactivate/Unlock Confirmation Modal */}
      <ConfirmDialog
        isOpen={Boolean(confirm)}
        onClose={() => {
          if (!confirmBusy) setConfirm(null);
        }}
        onConfirm={handleConfirm}
        title={confirm?.title ?? ""}
        message={confirm?.message ?? ""}
        confirmLabel={confirm?.confirmLabel}
        variant={confirm?.variant ?? "danger"}
        loading={confirmBusy}
      />

      {/* Provision User Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={closeCreate}
        title="Provision New User"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {submitError && (
            <ErrorMessage
              title="Creation Failed"
              message={submitError}
            />
          )}

          <Input
            id="fullName"
            name="fullName"
            label="Full Legal Name"
            value={form.fullName}
            onChange={handleFormChange}
            required
            submitted={submitAttempted}
            placeholder="e.g. Dr. Arthur Pendelton"
          />

          <Input
            id="username"
            name="username"
            label="Staff ID / Username"
            value={form.username}
            onChange={handleFormChange}
            required
            submitted={submitAttempted}
            placeholder="e.g. PENDELTON-3312"
          />

          <Input
            id="email"
            name="email"
            label="Clinic Email Address"
            type="email"
            value={form.email}
            onChange={handleFormChange}
            required
            validate={validateEmail}
            submitted={submitAttempted}
            placeholder="staff@onecare.clinic"
            hint="An onboarding password activation key will be dispatched to this email address."
          />

          <Select
            id="role"
            name="role"
            label="Role Clearance"
            options={Object.values(ROLES).map((role) => ({
              value: role,
              label: roleLabel(role),
            }))}
            value={form.role}
            onChange={handleFormChange}
            required
            submitted={submitAttempted}
          />

          <div className="flex justify-end gap-2 border-t border-neutral-100 pt-4 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={closeCreate}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Provision Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={closeEdit}
        title={
          editTarget
            ? `Edit Account — ${editTarget.username}`
            : "Edit Account"
        }
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {editError && (
            <ErrorMessage
              title="Update Failed"
              message={editError}
            />
          )}

          <Input
            id="edit-email"
            name="email"
            label="Clinic Email Address"
            type="email"
            value={editForm.email}
            onChange={handleEditChange}
            required
            validate={validateEmail}
            submitted={editAttempted}
            placeholder="staff@onecare.clinic"
          />

          <Select
            id="edit-role"
            name="role"
            label="Role Clearance"
            options={Object.values(ROLES).map((role) => ({
              value: role,
              label: roleLabel(role),
            }))}
            value={editForm.role}
            onChange={handleEditChange}
            required
            submitted={editAttempted}
          />

          <p className="text-xs text-neutral-500 bg-neutral-50 p-2.5 rounded-lg border border-neutral-100">
            Note: Role revisions take effect immediately on subsequent authentication updates or token refreshes.
          </p>

          <div className="flex justify-end gap-2 border-t border-neutral-100 pt-4 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={closeEdit}
              disabled={editSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" loading={editSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Global Toast Component */}
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