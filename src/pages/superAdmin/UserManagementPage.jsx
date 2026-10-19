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
  assignUserRole,
  createUser,
  deactivateUser,
  getUsers,
  resetUserPassword,
  unlockUser,
  updateUserEmail,
} from "../../services/userService";

/** `GET /users` returns the whole directory, so paging is client-side. */
const PAGE_SIZE = 10;

/** Account state mirrors the backend model (isActive + lock window). */
const STATUS_ACTIVE = "ACTIVE";
const STATUS_INACTIVE = "INACTIVE";
const STATUS_LOCKED = "LOCKED";

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
  [user.fullName, user.username, user.email].some((field) =>
    String(field ?? "").toLowerCase().includes(query)
  );

/**
 * Super-admin user management (access governance), backed by the
 * user endpoints:
 *   POST   /users                    — provision an account (USER_CREATE)
 *   PUT    /users/{id}              — update the email (USER_UPDATE)
 *   PUT    /users/{id}/role         — assign a role (USER_ROLE_ASSIGN)
 *   PUT    /users/{id}/unlock       — clear the sign-in lockout (SA)
 *   POST   /users/{id}/reset-password — admin reset (SA/ADMIN)
 *   DELETE /users/{id}              — deactivate the account (USER_DELETE)
 *
 * The Status column reflects what the backend models itself: the
 * `isActive` flag plus the automatic failed-sign-in lockout
 * (AuthServiceImpl's `lockedUntil`, cleared by a successful sign-in, a
 * password reset or the unlock action below).
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
  const [page, setPage] = useState(1);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [resettingUserId, setResettingUserId] = useState(null);

  /** { title, message, confirmLabel, variant, run } | null */
  const [confirm, setConfirm] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ email: "", role: ROLES.DOCTOR });
  const [editAttempted, setEditAttempted] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");

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
        error?.userMessage ?? "Unable to create the account. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  /** Apply an accepted change locally; the next fetch resyncs anyway. */
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
        message: `Deactivate ${user.fullName} (${user.username})? They will no longer be able to sign in. The record stays on file.`,
        confirmLabel: "Deactivate account",
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
              message: `${user.fullName} was deactivated and can no longer sign in.`,
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
        message: `Clear the failed sign-in lockout for ${user.fullName}? They will be able to sign in again immediately.`,
        confirmLabel: "Unlock account",
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
              message: `Sign-in lockout cleared for ${user.fullName}.`,
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
        message: `Account for ${editTarget.username} updated.`,
      });
    } catch (error) {
      setEditError(
        error?.userMessage ?? "Unable to update the account. Please try again."
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
        message: `Admin password reset requested for ${user.email || user.username
          }.`,
      });
    } catch (error) {
      setToast({
        type: "error",
        message:
          error?.userMessage ??
          "Unable to trigger the password reset. Please try again.",
      });
    } finally {
      setResettingUserId(null);
    }
  }, []);

  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      users.filter((user) => {
        return (
          (!normalizedQuery || matchesQuery(user, normalizedQuery))
        );
      }),
    [users, normalizedQuery]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleUsers = useMemo(
    () => filtered.slice(startIndex, startIndex + PAGE_SIZE),
    [filtered, startIndex]
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
              {String(row.fullName ?? "?").charAt(0).toUpperCase()}
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
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${ROLE_BADGE_CLASSES[row.role] ??
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
        render: (row) => {
          if (row.status === STATUS_LOCKED) {
            return (
              <span
                title="Locked by the failed sign-in counter — clears automatically after a successful sign-in or a password reset."
                className="inline-flex"
              >
                <StatusBadge status="warning">Locked</StatusBadge>
              </span>
            );
          }
          if (row.status === STATUS_INACTIVE) {
            return <StatusBadge status="danger">Inactive</StatusBadge>;
          }
          if (row.status === STATUS_ACTIVE) {
            return <StatusBadge status="success">Active</StatusBadge>;
          }
          return (
            <StatusBadge status="neutral">
              {row.status || "Unknown"}
            </StatusBadge>
          );
        },
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              loading={resettingUserId === row.userId}
              onClick={() => handleResetKey(row)}
            >
              Reset key
            </Button>
            {row.status === STATUS_LOCKED && (
              <Button
                size="sm"
                variant="warning"
                onClick={() => requestUnlock(row)}
              >
                Unlock
              </Button>
            )}
            {row.status !== STATUS_INACTIVE && (
              <Button
                size="sm"
                variant="danger"
                onClick={() => requestDeactivate(row)}
              >
                Deactivate
              </Button>
            )}
          </div>
        ),
      },
    ],
    [handleResetKey, openEdit, requestDeactivate, requestUnlock, resettingUserId]
  );

  const emptyTitle = "No staff accounts found.";
  const emptyMessage =
    normalizedQuery 
      ? "No accounts match the current filters. Try a different search or role."
      : "There are no staff accounts yet. Use Create new account to provision the first one.";

  return (
    <div className="mx-auto max-w-7xl space-y-6">

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <SearchBar
            value={query}
            onChange={handleQueryChange}
            placeholder="Search by name, username, email"
            searchLabel="Search users"
            className="w-full sm:max-w-md"
          />

          <Button
            onClick={openCreate}
            className="inline-flex shrink-0 items-center gap-2"
          >
            <Icon name="plus" className="h-4 w-4" />
            Create new account
          </Button>
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

      {/* Deactivate / unlock confirmation */}
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

      {/* Provision new account */}
      <Modal isOpen={isCreateOpen} onClose={closeCreate} title="Provision new user">
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

      {/* Update email / role */}
      <Modal
        isOpen={isEditOpen}
        onClose={closeEdit}
        title={
          editTarget ? `Edit account — ${editTarget.username}` : "Edit account"
        }
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {editError && (
            <ErrorMessage
              title="Unable to update account"
              message={editError}
            />
          )}

          <Input
            id="edit-email"
            name="email"
            label="Clinic email address"
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
            label="Role clearance"
            options={Object.values(ROLES).map((role) => ({
              value: role,
              label: roleLabel(role),
            }))}
            value={editForm.role}
            onChange={handleEditChange}
            required
            submitted={editAttempted}
          />

          <p className="text-xs text-neutral-500">
            Email and role changes are written to the backend immediately; role
            changes apply from the user&apos;s next token refresh.
          </p>

          <div className="flex justify-end gap-2 border-t border-neutral-100 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={closeEdit}
              disabled={editSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" loading={editSubmitting}>
              Save changes
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