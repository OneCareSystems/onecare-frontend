import { useCallback, useEffect, useMemo, useState } from "react";

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

/** Column order mirrors the role constants (CFG-03). */
const ROLE_ORDER = Object.values(ROLES);

const roleLabel = (role) => String(role ?? "").replace(/_/g, " ");

/** BR005 — the SUPER_ADMIN role's own set is immutable through the API. */
const IMMUTABLE_ROLE = ROLES.SUPER_ADMIN;

const SUPER_ADMIN_READONLY_TITLE =
  "BR005: the SUPER_ADMIN role's own permission set cannot be modified";


/**
 * Super-admin access control (FR003/UC3).
 *
 * The role entitlement matrix is live: GET/PUT
 * /api/roles/{role}/permissions read and rewrite each role's full
 * permission set (src/services/rolePermissionService.js). Backend rules
 * shape the UI: SUPER_ADMIN's own column is read-only (BR005), a role's
 * last permission cannot be revoked (BR006) and privileged scopes such
 * as SYSTEM_BACKUP cannot be granted to non-SUPER_ADMIN roles (BR004) —
 * blocked cells explain themselves, and any rule the server still
 * rejects is surfaced verbatim through the error toast (the backend
 * leaves the stored set untouched on failure).
 *
 * Catalog metadata (names, descriptions, domains) comes from
 * src/constants/permissions.js; codes granted by the backend but absent
 * from the local catalog are appended as UNCATEGORIZED rows instead of
 * being hidden. The API-token and break-glass tabs remain session-local
 * fixtures — no backend exists for either.
 */
const AccessControlPage = () => {
  // Live permission sets per role, straight from the backend.
  const [status, setStatus] = useState("loading"); // loading | ready | failed
  const [grantsByRole, setGrantsByRole] = useState({});
  const [loadError, setLoadError] = useState(null);
  /** Role whose PUT is in flight — its column (and every toggle) locks. */
  const [savingRole, setSavingRole] = useState(null);

  const [activeTab, setActiveTab] = useState("matrix");

  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState(ALL_CATEGORIES);

  const [toast, setToast] = useState(null);
  /** { title, message, confirmLabel, variant, run } | null */
  const [confirm, setConfirm] = useState(null);

  const fetchPermissions = useCallback(
    () =>
      Promise.all(
        ROLE_ORDER.map(async (role) => {
          const { permissions } = await getRolePermissions(role);
          return [role, permissions];
        }),
      ),
    [],
  );

  const loadPermissions = useCallback(async () => {
    setStatus("loading");
    setLoadError(null);
    try {
      const pairs = await fetchPermissions();
      setGrantsByRole(Object.fromEntries(pairs));
      setStatus("ready");
    } catch (error) {
      setLoadError(error?.userMessage ?? null);
      setStatus("failed");
    }
  }, [fetchPermissions]);

  useEffect(() => {
    let active = true;

    fetchPermissions()
      .then((pairs) => {
        if (!active) return;
        setGrantsByRole(Object.fromEntries(pairs));
        setStatus("ready");
      })
      .catch((error) => {
        if (!active) return;
        setLoadError(error?.userMessage ?? null);
        setStatus("failed");
      });

    return () => {
      active = false;
    };
  }, [fetchPermissions]);

  /** Catalog rows + backend-granted codes missing from local metadata. */
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
          "Granted through the backend but missing from the local catalog metadata.",
      })),
    ];
  }, [grantsByRole]);

  const categoryOptions = useMemo(() => {
    const seen = [];
    for (const entry of catalog) {
      if (!seen.includes(entry.category)) seen.push(entry.category);
    }
    return seen.map((value) => ({ value, label: value }));
  }, [catalog]);

  const filteredPermissions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return catalog.filter((entry) => {
      const matchesCategory =
        category === ALL_CATEGORIES || entry.category === category;
      const matchesText =
        !query ||
        [entry.code, entry.name, entry.description, entry.category].some(
          (field) => field.toLowerCase().includes(query),
        );
      return matchesCategory && matchesText;
    });
  }, [catalog, category, searchQuery]);

  const grantedCells = useMemo(
    () =>
      Object.values(grantsByRole).reduce(
        (sum, permissions) => sum + permissions.length,
        0,
      ),
    [grantsByRole],
  );

  const applyRolePermissions = async (role, permissions, entry, wasGranted) => {
    setSavingRole(role);
    try {
      const updated = await setRolePermissions(role, permissions);
      setGrantsByRole((current) => ({
        ...current,
        [role]: updated.permissions,
      }));
      setToast({
        type: "success",
        message: `Permissions for ${roleLabel(
          role,
        )} updated — ${entry.code} ${wasGranted ? "granted" : "revoked"}.`,
      });
    } catch (error) {
      setToast({
        type: "error",
        message:
          error?.userMessage ??
          error?.message ??
          "Could not update the permission set — the stored set was left untouched.",
      });
    } finally {
      setSavingRole(null);
    }
  };

  const requestToggle = (code, role, entry) => {
    const current = grantsByRole[role] ?? [];
    const isGranted = current.includes(code);
    const next = isGranted
      ? current.filter((granted) => granted !== code)
      : [...current, code];

    setConfirm({
      title: isGranted ? "Revoke security scope?" : "Grant security scope?",
      message: `You are about to ${isGranted ? "revoke" : "grant"} "${
        entry.name
      }" (${entry.code}) for the [${roleLabel(
        role,
      )}] role group. The role's full permission set is written to the backend after confirmation.`,
      confirmLabel: isGranted ? "Confirm revocation" : "Authorize scope",
      variant: isGranted ? "danger" : "primary",
      run: () => {
        applyRolePermissions(role, next, entry, isGranted);
      },
    });
  };

  const requestBreakGlass = () => {
    setConfirm({
      title: "Initiate emergency break-glass elevation?",
      message:
        "This temporarily elevates emergency on-call clinicians with full system privileges for 60 minutes. Every clinical query executed during this window will be flagged as an elevated emergency event in HIPAA SIEM records. This action is local to this session.",
      confirmLabel: "Authorize emergency elevation (1 hour)",
      variant: "warning",
      run: () =>
        setToast({
          type: "warning",
          message:
            "Emergency break-glass window active for 60 minutes. Cryptographic audit alert triggered.",
        }),
    });
  };

  const permissionColumns = [
    {
      key: "scope",
      header: "Permission scope",
      render: (row) => (
        <div className="max-w-xl whitespace-normal">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-warning-100 px-2 py-0.5 text-xs font-semibold text-warning-900">
              {row.category}
            </span>
            <span className="font-mono text-xs text-neutral-500">
              {row.code}
            </span>
            {row.privileged ? (
              <span className="rounded-md bg-danger-100 px-2 py-0.5 text-xs font-semibold text-danger-800">
                Privileged
              </span>
            ) : null}
          </div>
          <p className="mt-1 font-medium text-neutral-900">{row.name}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-neutral-600">
            {row.description}
          </p>
        </div>
      ),
    },
    ...ROLE_ORDER.map((role) => {
      const readOnly = role === IMMUTABLE_ROLE;

      return {
        key: role,
        header: roleLabel(role),
        render: (row) => {
          const roleGrants = grantsByRole[role] ?? [];
          const granted = roleGrants.includes(row.code);
          const lastGranted = granted && roleGrants.length <= 1; // BR006
          const privilegedForRole =
            Boolean(row.privileged) && role !== IMMUTABLE_ROLE; // BR004
          const blocked = lastGranted || privilegedForRole;
          const blockReason = lastGranted
            ? "BR006: a role's permission set cannot be empty"
            : privilegedForRole
              ? "BR004: only SUPER_ADMIN may hold this privileged scope"
              : null;

          if (readOnly) {
            return (
              <span
                className="inline-flex h-8 w-8 items-center justify-center"
                title={SUPER_ADMIN_READONLY_TITLE}
              >
                <Icon
                  name={granted ? "circle-check" : "circle-x"}
                  className={
                    granted
                      ? "h-5 w-5 text-success-600"
                      : "h-5 w-5 text-neutral-400"
                  }
                />
                <span className="sr-only">
                  {granted ? "Authorized" : "Denied"} (read-only — the
                  SUPER_ADMIN permission set cannot be modified)
                </span>
              </span>
            );
          }

          return (
            <button
              type="button"
              onClick={() => requestToggle(row.code, role, row)}
              disabled={Boolean(savingRole) || blocked}
              aria-pressed={granted}
              aria-label={`${granted ? "Revoke" : "Grant"} ${row.name} for ${roleLabel(
                role,
              )}`}
              title={
                blocked
                  ? blockReason
                  : `${granted ? "Authorized" : "Denied"} — click to toggle`
              }
              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                blocked
                  ? "cursor-not-allowed opacity-50"
                  : "hover:bg-neutral-100"
              }`}
            >
              <Icon
                name={granted ? "circle-check" : "circle-x"}
                className={
                  granted
                    ? "h-5 w-5 text-success-600"
                    : "h-5 w-5 text-neutral-400"
                }
              />
            </button>
          );
        },
      };
    }),
  ];

  const matrixPanel = (
    <div className="space-y-4">
      {/* Search & category filter */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search permission scopes, description, or domain..."
            searchLabel="Search permission scopes"
            className="w-full sm:max-w-md"
          />

          <Select
            id="category-filter"
            name="category-filter"
            label="Domain"
            options={categoryOptions}
            placeholder="All categories"
            defaultValue=""
            onChange={(event) =>
              setCategory(event.target.value || ALL_CATEGORIES)
            }
            className="w-full sm:w-64"
          />
        </div>
      </div>

      {/* Matrix */}
      <section aria-labelledby="permission-matrix-heading">
        {status === "ready" ? (
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2
                id="permission-matrix-heading"
                className="text-base font-semibold text-neutral-900"
              >
                Granular permission boundaries
              </h2>
              <p className="text-sm text-neutral-600">
                Select any cell to rewrite the role's full permission set on
                the backend. SUPER_ADMIN's own column is read-only (BR005).
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm text-neutral-600">
              <span className="inline-flex items-center gap-1">
                <Icon
                  name="circle-check"
                  className="h-4 w-4 text-success-600"
                />
                Authorized
              </span>
              <span className="inline-flex items-center gap-1">
                <Icon name="circle-x" className="h-4 w-4 text-neutral-400" />
                Denied
              </span>
            </div>
          </div>
        ) : null}

        {status === "loading" ? (
          <div
            role="status"
            aria-label="Loading role permissions"
            aria-busy="true"
            className="motion-safe:animate-pulse space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs"
          >
            {Array.from({ length: 8 }, (_, index) => (
              <div
                key={index}
                className="h-4 rounded bg-neutral-100"
                style={{ width: `${Math.max(40, 92 - index * 10)}%` }}
              />
            ))}
          </div>
        ) : status === "failed" ? (
          <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs">
            <ErrorMessage
              title="Unable to load role permissions"
              message={
                loadError ?? "Please check your connection and try again."
              }
            />
            <Button
              onClick={loadPermissions}
              className="inline-flex items-center gap-2"
            >
              <Icon name="refresh" className="h-4 w-4" />
              Retry
            </Button>
          </div>
        ) : (
          <Table
            columns={permissionColumns}
            data={filteredPermissions}
            getRowKey={(row) => row.code}
            emptyTitle="No permission scopes found."
            emptyMessage={
              searchQuery || category !== ALL_CATEGORIES
                ? "No scopes match the current filters. Try a different search or domain."
                : "The permission catalog is empty."
            }
            label="Role entitlement matrix"
          />
        )}
      </section>
    </div>
  );

  const tokensPanel = (
    <section aria-labelledby="machine-tokens-heading" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2
            id="machine-tokens-heading"
            className="text-base font-semibold text-neutral-900"
          >
            Service account tokens & workstation IP restrictions
          </h2>
          <p className="text-sm text-neutral-600">
            Tokens used by backend daemons, PACS imaging systems, and lab
            bridges. Session-local preview — no token endpoint exists yet.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() =>
            setToast({
              type: "info",
              message:
                "Machine token provisioning requires the identity service, which is not available yet.",
            })
          }
          className="inline-flex shrink-0 items-center gap-2"
        >
          <Icon name="plus" className="h-4 w-4" />
          Generate machine token
        </Button>
      </div>

    </section>
  );

  const elevationPanel = (
    <section aria-labelledby="break-glass-heading" className="space-y-4">
      <div className="flex items-center gap-3 border-b border-neutral-200 pb-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-warning-50 text-warning-700">
          <Icon name="shield-alert" className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2
            id="break-glass-heading"
            className="text-base font-semibold text-neutral-900"
          >
            Emergency break-glass authorization protocol
          </h2>
          <p className="text-sm text-neutral-600">
            HIPAA-compliant emergency mechanism allowing clinicians
            temporary elevated access during mass casualties.
          </p>
        </div>
      </div>

      <div className="space-y-2 rounded-2xl border border-warning-200 bg-warning-50 p-4 text-warning-900">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Icon
            name="triangle-alert"
            className="h-4 w-4 shrink-0 text-warning-700"
          />
          Statutory notice on privileged access elevation
        </p>
        <p className="text-sm leading-relaxed text-warning-800">
          When triggered, any physician on duty can bypass
          cross-department EMR restrictions. In accordance with federal
          HIPAA Security Rule §164.312(a)(2)(ii), all queries, patient
          records opened, and diagnostic orders written will be stamped
          with the tag{" "}
          <code className="rounded bg-warning-100 px-1.5 py-0.5 font-mono text-xs font-semibold">
            EMERGENCY_OVERRIDE
          </code>{" "}
          and automatically dispatched to the Chief Medical Officer and
          Legal Compliance Officer. The trigger below is a session-local
          preview — no elevation endpoint exists yet.
        </p>
      </div>

      <div className="flex justify-end">
        <Button
          variant="warning"
          onClick={requestBreakGlass}
          className="inline-flex items-center gap-2"
        >
          <Icon name="shield-alert" className="h-4 w-4" />
          Activate 60-minute emergency window
        </Button>
      </div>
    </section>
  );

  const tabs = [
    {
      id: "matrix",
      label: "Role entitlement matrix",
      content: matrixPanel,
    },
    {
      id: "tokens",
      label: "Daemon API tokens & IP whitelist",
      content: tokensPanel,
    },
    {
      id: "elevation",
      label: "Break-glass emergency protocol",
      content: elevationPanel,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header — global security governance + break-glass action */}
      <div className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-2">
            <span className="rounded-full border border-warning-200 bg-warning-50 px-2.5 py-0.5 text-xs font-semibold text-warning-900">
              Global security governance
            </span>
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full bg-success-500"
            />
          </span>
          <h1 className="mt-2 text-2xl font-semibold text-neutral-900">
            Access control & RBAC matrix
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600">
            Fine-grained role entitlement policies, service tokens,
            workstation IP restrictions, and HIPAA access boundaries.
            Permission sets are read from and written to the
            role-permissions API.
          </p>
        </div>

        <Button
          variant="warning"
          onClick={requestBreakGlass}
          className="inline-flex shrink-0 items-center gap-2"
        >
          <Icon name="shield-alert" className="h-4 w-4" />
          Emergency break-glass
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Role profiles"
          value={`${ROLE_ORDER.length} roles`}
          chip="RBAC"
          icon="key-round"
          iconClass="bg-warning-50 text-warning-700"
          chipClass="bg-warning-100 text-warning-900"
        />
        <StatCard
          label="Active scopes"
          value={`${catalog.length} scopes`}
          chip="Enforced"
          icon="shield"
          iconClass="bg-primary-50 text-primary-700"
          chipClass="bg-primary-100 text-primary-800"
        />
        <StatCard
          label="Granted edges"
          value={String(grantedCells)}
          chip={`of ${catalog.length * ROLE_ORDER.length} cells`}
          icon="circle-check"
          iconClass="bg-success-50 text-success-700"
          chipClass="bg-success-100 text-success-800"
        />
      </div>

      {/* Section tabs */}
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        ariaLabel="Access control sections"
      />

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
        variant={confirm?.variant ?? "danger"}
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

export default AccessControlPage;
