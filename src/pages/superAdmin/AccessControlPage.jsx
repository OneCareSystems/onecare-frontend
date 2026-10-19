import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";

import Button from "../../components/Button";
import ConfirmDialog from "../../components/ConfirmDialog";
import ErrorMessage from "../../components/ErrorMessage";
import Icon from "../../components/Icon";
import SearchBar from "../../components/SearchBar";
import Select from "../../components/Select";
import StatCard from "../../components/StatCard";
import Table from "../../components/Table";
import Tabs from "../../components/Tabs";
import Toast from "../../components/Toast";
import {
  PERMISSION_CODES,
  PERMISSION_MATRIX,
} from "../../constants/permissions";
import { ROLES } from "../../constants/roles";
import {
  getRolePermissions,
  setRolePermissions,
} from "../../services/rolePermissionService";

const ALL_CATEGORIES = "ALL";
const UNCATEGORIZED = "Uncategorized";
const ROLE_ORDER = Object.values(ROLES);
const IMMUTABLE_ROLE = ROLES.SUPER_ADMIN;
const SUPER_ADMIN_READONLY_TITLE =
  "BR005: SUPER_ADMIN permissions are system-locked and immutable.";

const roleLabel = (role) => String(role ?? "").replace(/_/g, " ");

/**
 * Sub-component for scope cell rendering to avoid unneeded re-renders.
 */
const ScopeInfoCell = memo(({ row }) => (
  <div className="max-w-md whitespace-normal py-1">
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="rounded-md bg-warning-50 px-2 py-0.5 text-xs font-semibold text-warning-800 border border-warning-200">
        {row.category}
      </span>
      <span className="font-mono text-xs text-neutral-500">{row.code}</span>
      {row.privileged && (
        <span className="rounded-md bg-danger-50 px-2 py-0.5 text-xs font-semibold text-danger-700 border border-danger-200">
          Privileged
        </span>
      )}
    </div>
    <p className="mt-1 font-semibold text-neutral-900 text-sm">{row.name}</p>
    <p className="mt-0.5 text-xs leading-relaxed text-neutral-600 line-clamp-2 hover:line-clamp-none">
      {row.description}
    </p>
  </div>
));
ScopeInfoCell.displayName = "ScopeInfoCell";

/**
 * Individual Matrix Cell Component with localized state & memoization.
 */
const MatrixCell = memo(
  ({
    row,
    role,
    isGranted,
    isSaving,
    totalRoleGrants,
    onToggle,
  }) => {
    const isSuperAdmin = role === IMMUTABLE_ROLE;
    const isLastGranted = isGranted && totalRoleGrants <= 1; // BR006
    const isPrivilegedForNonAdmin = Boolean(row.privileged) && !isSuperAdmin; // BR004
    const isBlocked = isLastGranted || isPrivilegedForNonAdmin;

    const blockReason = isLastGranted
      ? "BR006: A role's permission set cannot be empty"
      : isPrivilegedForNonAdmin
      ? "BR004: Only SUPER_ADMIN may hold this privileged scope"
      : null;

    if (isSuperAdmin) {
      return (
        <div className="flex items-center justify-center">
          <span
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-neutral-50"
            title={SUPER_ADMIN_READONLY_TITLE}
            aria-label={`SUPER_ADMIN ${isGranted ? "Authorized" : "Denied"} (Immutable)`}
          >
            <Icon
              name={isGranted ? "circle-check" : "circle-x"}
              className={`h-5 w-5 ${
                isGranted ? "text-success-600" : "text-neutral-300"
              }`}
            />
          </span>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center">
        <button
          type="button"
          onClick={() => onToggle(row.code, role, row)}
          disabled={isSaving || isBlocked}
          aria-pressed={isGranted}
          aria-label={`${isGranted ? "Revoke" : "Grant"} ${row.name} for ${roleLabel(
            role
          )}`}
          title={
            isBlocked
              ? blockReason
              : `${isGranted ? "Authorized" : "Denied"} — click to toggle`
          }
          className={`relative inline-flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
            isBlocked
              ? "cursor-not-allowed opacity-40 bg-neutral-50"
              : isGranted
              ? "bg-success-50 hover:bg-success-100 text-success-700"
              : "bg-neutral-50 hover:bg-neutral-100 text-neutral-400"
          }`}
        >
          {isSaving ? (
            <Icon name="loader" className="h-4 w-4 animate-spin text-primary-600" />
          ) : (
            <Icon
              name={isGranted ? "circle-check" : "circle-x"}
              className={`h-5 w-5 ${
                isGranted ? "text-success-600" : "text-neutral-400"
              }`}
            />
          )}
        </button>
      </div>
    );
  }
);
MatrixCell.displayName = "MatrixCell";

const AccessControlPage = () => {
  const [status, setStatus] = useState("loading"); // loading | ready | failed
  const [grantsByRole, setGrantsByRole] = useState({});
  const [loadError, setLoadError] = useState(null);
  const [savingKey, setSavingKey] = useState(null); // tracking cell key: `${role}:${code}`

  const [activeTab, setActiveTab] = useState("matrix");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState(ALL_CATEGORIES);

  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const searchInputRef = useRef(null);

  // Debounce search query to keep matrix filtering smooth
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Keyboard shortcut Ctrl/Cmd + F for search focus
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

  // Fetch all permissions in parallel
  const fetchPermissions = useCallback(
    () =>
      Promise.all(
        ROLE_ORDER.map(async (role) => {
          const { permissions } = await getRolePermissions(role);
          return [role, permissions];
        })
      ),
    []
  );

  const loadPermissions = useCallback(async () => {
    setStatus("loading");
    setLoadError(null);
    try {
      const results = await fetchPermissions();
      setGrantsByRole(Object.fromEntries(results));
      setStatus("ready");
    } catch (error) {
      setLoadError(error?.userMessage ?? "Failed to load permissions matrix.");
      setStatus("failed");
    }
  }, [fetchPermissions]);

  useEffect(() => {
    let active = true;

    fetchPermissions()
      .then((results) => {
        if (!active) return;
        setGrantsByRole(Object.fromEntries(results));
        setStatus("ready");
      })
      .catch((error) => {
        if (!active) return;
        setLoadError(error?.userMessage ?? "Failed to load permissions matrix.");
        setStatus("failed");
      });

    return () => {
      active = false;
    };
  }, [fetchPermissions]);

  // Fast Set lookups per role: Map<role, Set<code/permission>>
  const grantsByRoleSets = useMemo(() => {
    const map = {};
    for (const [role, permissions] of Object.entries(grantsByRole)) {
      map[role] = new Set(permissions);
    }
    return map;
  }, [grantsByRole]);

  // Catalog metadata merged with dynamic extra backend permissions
  const catalog = useMemo(() => {
    const grantedCodes = Object.values(grantsByRole).flat();
    const extras = [...new Set(grantedCodes)]
      .filter((code) => !PERMISSION_CODES.includes(code))
      .sort();

    return [
      ...PERMISSION_MATRIX,
      ...extras.map((code) => ({
        code,
        category: UNCATEGORIZED,
        name: code,
        description:
          "Granted through the backend API but absent from local catalog metadata.",
      })),
    ];
  }, [grantsByRole]);

  const categoryOptions = useMemo(() => {
    const seen = new Set();
    for (const entry of catalog) {
      if (entry.category) seen.add(entry.category);
    }
    return [
      { value: ALL_CATEGORIES, label: "All Categories" },
      ...Array.from(seen).map((val) => ({ value: val, label: val })),
    ];
  }, [catalog]);

  const filteredPermissions = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    return catalog.filter((entry) => {
      const matchesCategory =
        category === ALL_CATEGORIES || entry.category === category;
      const matchesText =
        !query ||
        entry.code.toLowerCase().includes(query) ||
        entry.name.toLowerCase().includes(query) ||
        entry.description.toLowerCase().includes(query) ||
        entry.category.toLowerCase().includes(query);
      return matchesCategory && matchesText;
    });
  }, [catalog, category, debouncedSearch]);

  const totalGrantedEdges = useMemo(
    () =>
      Object.values(grantsByRole).reduce(
        (sum, list) => sum + (list?.length || 0),
        0
      ),
    [grantsByRole]
  );

  /** Optimistic update handler with failure fallback */
  const applyRolePermissions = useCallback(async (
    role,
    nextPermissions,
    entry,
    wasGranted
  ) => {
    const key = `${role}:${entry.code}`;
    setSavingKey(key);

    // Backup state for rollback on error
    const previousPermissions = grantsByRole[role] ?? [];

    // Optimistically apply state change
    setGrantsByRole((prev) => ({ ...prev, [role]: nextPermissions }));

    try {
      const updated = await setRolePermissions(role, nextPermissions);
      setGrantsByRole((prev) => ({
        ...prev,
        [role]: updated.permissions,
      }));
      setToast({
        type: "success",
        message: `${roleLabel(role)} updated: ${entry.name} ${
          wasGranted ? "revoked" : "granted"
        }.`,
      });
    } catch (error) {
      // Revert optimistic update
      setGrantsByRole((prev) => ({ ...prev, [role]: previousPermissions }));
      setToast({
        type: "error",
        message:
          error?.userMessage ??
          error?.message ??
          "Failed to update permission set on server.",
      });
    } finally {
      setSavingKey(null);
    }
  }, [grantsByRole]);

  const requestToggle = useCallback(
    (code, role, entry) => {
      const currentList = grantsByRole[role] ?? [];
      const isGranted = currentList.includes(code);
      const nextList = isGranted
        ? currentList.filter((c) => c !== code)
        : [...currentList, code];

      setConfirm({
        title: isGranted ? "Revoke Security Scope?" : "Grant Security Scope?",
        message: `Are you sure you want to ${
          isGranted ? "revoke" : "grant"
        } "${entry.name}" (${code}) for [${roleLabel(
          role
        )}]? Changes take effect immediately.`,
        confirmLabel: isGranted ? "Confirm Revocation" : "Authorize Scope",
        variant: isGranted ? "danger" : "primary",
        run: () => applyRolePermissions(role, nextList, entry, isGranted),
      });
    },
    [applyRolePermissions, grantsByRole]
  );

  const requestBreakGlass = () => {
    setConfirm({
      title: "Initiate Emergency Break-Glass Elevation?",
      message:
        "This temporarily elevates emergency clinicians with full system privileges for 60 minutes. Every clinical query executed during this window will be logged under HIPAA SIEM audit logs.",
      confirmLabel: "Authorize Emergency Elevation (1 Hr)",
      variant: "warning",
      run: () =>
        setToast({
          type: "warning",
          message:
            "Emergency break-glass active for 60 minutes. Audit logging triggered.",
        }),
    });
  };

  const permissionColumns = useMemo(
    () => [
      {
        key: "scope",
        header: "Permission Scope",
        render: (row) => <ScopeInfoCell row={row} />,
      },
      ...ROLE_ORDER.map((role) => ({
        key: role,
        header: roleLabel(role),
        headerClass: "text-center",
        render: (row) => {
          const roleSet = grantsByRoleSets[role];
          const isGranted = roleSet ? roleSet.has(row.code) : false;
          const totalGrants = grantsByRole[role]?.length || 0;
          const isSaving = savingKey === `${role}:${row.code}`;

          return (
            <MatrixCell
              row={row}
              role={role}
              isGranted={isGranted}
              isSaving={isSaving}
              totalRoleGrants={totalGrants}
              onToggle={requestToggle}
            />
          );
        },
      })),
    ],
    [grantsByRoleSets, grantsByRole, savingKey, requestToggle]
  );

  const matrixPanel = (
    <div className="space-y-4">
      {/* Search & Domain Controls */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <SearchBar
              ref={searchInputRef}
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search scope, code, or description... (⌘F)"
              searchLabel="Search permission scopes"
              className="w-full"
            />
          </div>

          <div className="flex items-center gap-3">
            <Select
              id="category-filter"
              name="category-filter"
              label="Domain"
              options={categoryOptions}
              value={category}
              onChange={(e) => setCategory(e.target.value || ALL_CATEGORIES)}
              className="w-full sm:w-56"
            />
            {(searchQuery || category !== ALL_CATEGORIES) && (
              <Button
                variant="tertiary"
                onClick={() => {
                  setSearchQuery("");
                  setCategory(ALL_CATEGORIES);
                }}
                className="mt-6 sm:mt-0 text-xs text-neutral-500 hover:text-neutral-800"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Emergency Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-warning-200 bg-warning-50/50 p-4">
        <div className="flex items-center gap-3">
          <Icon name="shield-alert" className="h-5 w-5 text-warning-700 shrink-0" />
          <p className="text-xs sm:text-sm text-warning-900">
            <strong>Need temporary elevated access?</strong> Emergency Break-Glass override elevates session permissions for 60 mins.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={requestBreakGlass}
          className="whitespace-nowrap border-warning-300 bg-white text-warning-800 hover:bg-warning-100 text-xs"
        >
          Break-Glass Access
        </Button>
      </div>

      {/* Matrix Main Section */}
      <section aria-labelledby="permission-matrix-heading">
        {status === "ready" && (
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2
                id="permission-matrix-heading"
                className="text-base font-semibold text-neutral-900"
              >
                Granular Permission Boundaries
              </h2>
              <p className="text-xs text-neutral-500">
                Click any cell indicator to toggle role access. Changes persist directly to the security backend.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-neutral-600">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Icon name="circle-check" className="h-4 w-4 text-success-600" />
                Authorized
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Icon name="circle-x" className="h-4 w-4 text-neutral-400" />
                Denied
              </span>
            </div>
          </div>
        )}

        {status === "loading" ? (
          <div
            role="status"
            aria-label="Loading matrix"
            className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs animate-pulse"
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="h-6 w-1/3 rounded bg-neutral-100" />
                <div className="h-6 w-1/6 rounded bg-neutral-100" />
                <div className="h-6 w-1/6 rounded bg-neutral-100" />
                <div className="h-6 w-1/6 rounded bg-neutral-100" />
              </div>
            ))}
          </div>
        ) : status === "failed" ? (
          <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs text-center">
            <ErrorMessage
              title="Unable to load permission entitlements"
              message={loadError}
            />
            <Button
              onClick={loadPermissions}
              className="inline-flex items-center gap-2 mt-2"
            >
              <Icon name="refresh" className="h-4 w-4" />
              Retry Connection
            </Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xs">
            <Table
              columns={permissionColumns}
              data={filteredPermissions}
              getRowKey={(row) => row.code}
              emptyTitle="No matching permissions found"
              emptyMessage={
                searchQuery || category !== ALL_CATEGORIES
                  ? "No permission scopes match your search or domain query."
                  : "The permission matrix catalog is empty."
              }
              label="Role entitlement matrix"
            />
          </div>
        )}
      </section>
    </div>
  );

  const tabs = [
    {
      id: "matrix",
      label: "Role entitlement matrix",
      content: matrixPanel,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      {/* Header Summary Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          label="Role Profiles"
          value={`${ROLE_ORDER.length} Roles`}
          chip="RBAC"
          icon="key-round"
          iconClass="bg-warning-50 text-warning-700"
          chipClass="bg-warning-100 text-warning-900"
        />
        <StatCard
          label="Active Scopes"
          value={`${catalog.length} Catalog Scopes`}
          chip="Enforced"
          icon="shield"
          iconClass="bg-primary-50 text-primary-700"
          chipClass="bg-primary-100 text-primary-800"
        />
        <StatCard
          label="Granted Entitlements"
          value={String(totalGrantedEdges)}
          chip={`of ${catalog.length * ROLE_ORDER.length} total max`}
          icon="circle-check"
          iconClass="bg-success-50 text-success-700"
          chipClass="bg-success-100 text-success-800"
        />
      </div>

      {/* Tabs Nav */}
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        ariaLabel="Access control tabs"
      />

      {/* Confirmation Modal */}
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
        variant={confirm?.variant ?? "danger"}
      />

      {/* Dynamic Toast Feedback */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
          duration={5000}
          className="fixed bottom-4 right-4 z-50 max-w-sm shadow-xl animate-bounce-short"
        />
      )}
    </div>
  );
};

export default AccessControlPage;
