import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import Button from "../../components/Button";
import ConfirmDialog from "../../components/ConfirmDialog";
import ErrorMessage from "../../components/ErrorMessage";
import Icon from "../../components/Icon";
import SearchBar from "../../components/SearchBar";
import Select from "../../components/Select";
import StatCard from "../../components/StatCard";
import Table from "../../components/Table";
import Toast from "../../components/Toast";
import { SuperAdminPageHeader } from "../../features/superAdmin/SuperAdminPageHeader";
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

/* ------------------------------------------------------------------ */
/* Visual helpers                                                      */
/* ------------------------------------------------------------------ */

const roleHue = (role) => {
  let h = 0;
  for (const ch of String(role)) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
};

const RoleBadge = memo(({ role, size = "sm" }) => {
  const hue = roleHue(role);
  const letters = roleLabel(role)
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
  const dim = size === "sm" ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-[11px]";

  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${dim}`}
      style={{ backgroundColor: `hsl(${hue} 60% 45%)` }}
      title={roleLabel(role)}
    >
      {letters}
    </span>
  );
});
RoleBadge.displayName = "RoleBadge";

const Highlight = memo(({ text, query }) => {
  if (!query) return <>{text}</>;
  const q = query.toLowerCase();
  const source = String(text ?? "");
  const idx = source.toLowerCase().indexOf(q);
  if (idx < 0) return <>{source}</>;
  return (
    <>
      {source.slice(0, idx)}
      <mark className="rounded bg-warning-100 px-0.5 text-warning-900">
        {source.slice(idx, idx + q.length)}
      </mark>
      {source.slice(idx + q.length)}
    </>
  );
});
Highlight.displayName = "Highlight";

const SavedPulse = memo(({ show, children }) => (
  <span className={show ? "animate-[pulse-once_1s_ease-out]" : ""}>
    {children}
  </span>
));
SavedPulse.displayName = "SavedPulse";

/* ------------------------------------------------------------------ */
/* Scope cell                                                          */
/* ------------------------------------------------------------------ */

const ScopeInfoCell = memo(({ row, query, selected, onSelect, bulkMode }) => (
  <div className="max-w-md whitespace-normal py-1">
    <div className="flex flex-wrap items-center gap-1.5">
      {bulkMode && (
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect?.(row.code)}
          aria-label={`Select scope ${row.name}`}
          className="h-3.5 w-3.5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
        />
      )}
      <span className="rounded-md border border-warning-200 bg-warning-50 px-2 py-0.5 text-xs font-semibold text-warning-800">
        <Highlight text={row.category} query={query} />
      </span>
      <span className="font-mono text-xs text-neutral-500">
        <Highlight text={row.code} query={query} />
      </span>
      {row.privileged && (
        <span className="rounded-md border border-danger-200 bg-danger-50 px-2 py-0.5 text-xs font-semibold text-danger-700">
          Privileged
        </span>
      )}
    </div>
    <p className="mt-1 text-sm font-semibold text-neutral-900">
      <Highlight text={row.name} query={query} />
    </p>
    <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-neutral-600 hover:line-clamp-none">
      <Highlight text={row.description} query={query} />
    </p>
  </div>
));
ScopeInfoCell.displayName = "ScopeInfoCell";

/* ------------------------------------------------------------------ */
/* Matrix cell                                                         */
/* ------------------------------------------------------------------ */

const MatrixCell = memo(
  ({
    row,
    role,
    isGranted,
    isSaving,
    isJustSaved,
    totalRoleGrants,
    onToggle,
    density,
  }) => {
    const isSuperAdmin = role === IMMUTABLE_ROLE;
    const isLastGranted = isGranted && totalRoleGrants <= 1;
    const isPrivilegedForNonAdmin = Boolean(row.privileged) && !isSuperAdmin;
    const isBlocked = isLastGranted || isPrivilegedForNonAdmin;
    const blockReason = isLastGranted
      ? "BR006: A role's permission set cannot be empty"
      : isPrivilegedForNonAdmin
        ? "BR004: Only SUPER_ADMIN may hold this privileged scope"
        : null;

    const size = density === "compact" ? "h-7 w-7" : "h-9 w-9";

    if (isSuperAdmin) {
      return (
        <div className="flex items-center justify-center">
          <span
            className={`inline-flex ${size} items-center justify-center rounded-full bg-neutral-50`}
            title={SUPER_ADMIN_READONLY_TITLE}
            aria-label={`SUPER_ADMIN ${
              isGranted ? "Authorized" : "Denied"
            } (Immutable)`}
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
        <SavedPulse show={isJustSaved}>
          <button
            type="button"
            onClick={() => !isBlocked && onToggle(row.code, role, row)}
            disabled={isSaving || isBlocked}
            aria-pressed={isGranted}
            aria-label={`${isGranted ? "Revoke" : "Grant"} ${row.name} for ${roleLabel(
              role,
            )}`}
            title={
              isBlocked
                ? blockReason
                : `${isGranted ? "Authorized" : "Denied"} — click to toggle`
            }
            className={`relative inline-flex ${size} items-center justify-center rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
              isBlocked
                ? "cursor-not-allowed bg-neutral-50 opacity-50"
                : isGranted
                  ? "bg-success-50 text-success-700 hover:bg-success-100"
                  : "bg-neutral-50 text-neutral-400 hover:bg-neutral-100"
            }`}
          >
            {isSaving ? (
              <Icon
                name="loader"
                className="h-4 w-4 animate-spin text-primary-600"
              />
            ) : isBlocked ? (
              <Icon name="lock" className="h-3.5 w-3.5 text-neutral-400" />
            ) : (
              <Icon
                name={isGranted ? "circle-check" : "circle-x"}
                className={`h-5 w-5 ${
                  isGranted ? "text-success-600" : "text-neutral-400"
                }`}
              />
            )}
          </button>
        </SavedPulse>
      </div>
    );
  },
);
MatrixCell.displayName = "MatrixCell";

/* ------------------------------------------------------------------ */
/* Main page                                                           */
/* ------------------------------------------------------------------ */

const AccessControlPage = () => {
  const [status, setStatus] = useState("loading");
  const [grantsByRole, setGrantsByRole] = useState({});
  const [loadError, setLoadError] = useState(null);
  const [savingKey, setSavingKey] = useState(null);
  const [justSavedKey, setJustSavedKey] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState(ALL_CATEGORIES);

  const [bulkMode, setBulkMode] = useState(false);
  const [selectedCodes, setSelectedCodes] = useState(() => new Set());
  const [density, setDensity] = useState("comfortable");

  const [recentChanges, setRecentChanges] = useState([]);
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [showHelp, setShowHelp] = useState(false);

  const searchInputRef = useRef(null);

  /* ---- search debounce ---- */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 150);
    return () => clearTimeout(t);
  }, [searchQuery]);

  /* ---- shortcuts ---- */
  useEffect(() => {
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "Escape") {
        setBulkMode(false);
        setSelectedCodes(new Set());
        setShowHelp(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ---- fetch ---- */
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
        setLoadError(
          error?.userMessage ?? "Failed to load permissions matrix.",
        );
        setStatus("failed");
      });
    return () => {
      active = false;
    };
  }, [fetchPermissions]);

  /* ---- derived state ---- */
  const grantsByRoleSets = useMemo(() => {
    const map = {};
    for (const [role, permissions] of Object.entries(grantsByRole)) {
      map[role] = new Set(permissions);
    }
    return map;
  }, [grantsByRole]);

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
    for (const entry of catalog) if (entry.category) seen.add(entry.category);
    return [
      { value: ALL_CATEGORIES, label: "All Categories" },
      ...Array.from(seen).map((val) => ({ value: val, label: val })),
    ];
  }, [catalog]);

  const filteredPermissions = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return catalog.filter((entry) => {
      const matchesCategory =
        category === ALL_CATEGORIES || entry.category === category;
      const matchesText =
        !q ||
        entry.code.toLowerCase().includes(q) ||
        entry.name.toLowerCase().includes(q) ||
        entry.description.toLowerCase().includes(q) ||
        entry.category.toLowerCase().includes(q);
      return matchesCategory && matchesText;
    });
  }, [catalog, category, debouncedSearch]);

  const totalGrantedEdges = useMemo(
    () =>
      Object.values(grantsByRole).reduce(
        (sum, list) => sum + (list?.length || 0),
        0,
      ),
    [grantsByRole],
  );

  /* ---- mutations ---- */
  const applyRolePermissions = useCallback(
    async (role, nextPermissions, entry, wasGranted) => {
      const key = `${role}:${entry.code}`;
      setSavingKey(key);
      const previousPermissions = grantsByRole[role] ?? [];
      setGrantsByRole((prev) => ({ ...prev, [role]: nextPermissions }));

      try {
        const updated = await setRolePermissions(role, nextPermissions);
        setGrantsByRole((prev) => ({ ...prev, [role]: updated.permissions }));
        setJustSavedKey(key);
        setTimeout(() => setJustSavedKey(null), 1200);

        setRecentChanges((prev) =>
          [
            {
              id: `${Date.now()}-${key}`,
              role,
              code: entry.code,
              name: entry.name,
              action: wasGranted ? "revoked" : "granted",
              at: new Date(),
            },
            ...prev,
          ].slice(0, 5),
        );

        setToast({
          type: "success",
          message: `${roleLabel(role)} updated: ${entry.name} ${
            wasGranted ? "revoked" : "granted"
          }.`,
        });
      } catch (error) {
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
    },
    [grantsByRole],
  );

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
          role,
        )}]? Changes take effect immediately.`,
        confirmLabel: isGranted ? "Confirm Revocation" : "Authorize Scope",
        variant: isGranted ? "danger" : "primary",
        run: () => applyRolePermissions(role, nextList, entry, isGranted),
      });
    },
    [applyRolePermissions, grantsByRole],
  );

  /* ---- bulk apply ---- */
  const requestBulkGrant = useCallback(
    (role) => {
      const codesToGrant = [...selectedCodes];
      if (!codesToGrant.length) return;
      const current = new Set(grantsByRole[role] ?? []);
      const next = [...new Set([...current, ...codesToGrant])];

      setConfirm({
        title: `Bulk grant ${codesToGrant.length} scope${
          codesToGrant.length === 1 ? "" : "s"
        }?`,
        message: `Grant ${codesToGrant.length} selected scope${
          codesToGrant.length === 1 ? "" : "s"
        } to [${roleLabel(role)}]. This will be applied to the backend.`,
        confirmLabel: "Apply Bulk Grant",
        variant: "primary",
        run: async () => {
          setSavingKey(`bulk:${role}`);
          const prev = grantsByRole[role] ?? [];
          setGrantsByRole((p) => ({ ...p, [role]: next }));
          try {
            const updated = await setRolePermissions(role, next);
            setGrantsByRole((p) => ({ ...p, [role]: updated.permissions }));
            setToast({
              type: "success",
              message: `Bulk update applied to ${roleLabel(role)}.`,
            });
            setRecentChanges((prevList) =>
              [
                {
                  id: `${Date.now()}-bulk`,
                  role,
                  code: `${codesToGrant.length} scopes`,
                  name: "Bulk grant",
                  action: "granted",
                  at: new Date(),
                },
                ...prevList,
              ].slice(0, 5),
            );
            setSelectedCodes(new Set());
            setBulkMode(false);
          } catch (error) {
            setGrantsByRole((p) => ({ ...p, [role]: prev }));
            setToast({
              type: "error",
              message:
                error?.userMessage ?? "Bulk update failed. State rolled back.",
            });
          } finally {
            setSavingKey(null);
          }
        },
      });
    },
    [selectedCodes, grantsByRole],
  );

  /* ---- columns ---- */
  const permissionColumns = useMemo(
    () => [
      {
        key: "scope",
        header: "Permission Scope",
        render: (row) => (
          <ScopeInfoCell
            row={row}
            query={debouncedSearch.trim()}
            bulkMode={bulkMode}
            selected={selectedCodes.has(row.code)}
            onSelect={(code) =>
              setSelectedCodes((prev) => {
                const next = new Set(prev);
                next.has(code) ? next.delete(code) : next.add(code);
                return next;
              })
            }
          />
        ),
      },
      ...ROLE_ORDER.map((role) => ({
        key: role,
        header: (
          <span className="inline-flex items-center gap-1.5">
            <RoleBadge role={role} />
            <span className="hidden text-xs font-semibold text-neutral-700 sm:inline">
              {roleLabel(role)}
            </span>
          </span>
        ),
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
              isJustSaved={justSavedKey === `${role}:${row.code}`}
              totalRoleGrants={totalGrants}
              onToggle={requestToggle}
              density={density}
            />
          );
        },
      })),
    ],
    [
      grantsByRoleSets,
      grantsByRole,
      savingKey,
      justSavedKey,
      requestToggle,
      debouncedSearch,
      bulkMode,
      selectedCodes,
      density,
    ],
  );

  const isFiltering = Boolean(debouncedSearch) || category !== ALL_CATEGORIES;

  /* ---- render ---- */
  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      {/* ============ Hero ============ */}
      <SuperAdminPageHeader
        icon="shield"
        badgeText="Access control · RBAC"
        title="Role Permission Matrix"
        description="Toggle entitlements per role. Every change is persisted and audited."
        actions={
          <>
            <button
              type="button"
              onClick={() => setShowHelp((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition hover:border-neutral-300 hover:text-neutral-900"
            >
              <Icon name="info" className="h-3.5 w-3.5" />
              How this works
            </button>
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
          </>
        }
      />

      {/* ============ Stats ============ */}
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

      {/* ============ Recent activity trail ============ */}
      {recentChanges.length > 0 && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-3 shadow-xs sm:p-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Recent changes
            </span>
            <div className="h-px flex-1 bg-neutral-100" />
            <button
              type="button"
              onClick={() => setRecentChanges([])}
              className="text-[11px] text-neutral-400 hover:text-neutral-700"
            >
              Clear
            </button>
          </div>
          <ul className="mt-2 flex flex-wrap gap-2">
            {recentChanges.map((c) => (
              <li
                key={c.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-neutral-50 py-1 pl-1 pr-2.5 text-[11px] text-neutral-700 ring-1 ring-inset ring-neutral-200"
              >
                <RoleBadge role={c.role} />
                <span className="font-medium">{c.name}</span>
                <span
                  className={
                    c.action === "granted"
                      ? "text-success-700"
                      : "text-danger-700"
                  }
                >
                  {c.action}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ============ Sticky filter bar ============ */}
      <div className="sticky top-3 z-20 rounded-2xl border border-neutral-200 bg-white/95 p-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/80 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchBar
            ref={searchInputRef}
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search scope, code, or description…  ( / )"
            searchLabel="Search permission scopes"
            className="w-full sm:max-w-md"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Select
              id="category-filter"
              name="category-filter"
              label="Domain"
              options={categoryOptions}
              value={category}
              onChange={(e) => setCategory(e.target.value || ALL_CATEGORIES)}
              className="w-full sm:w-52"
            />
            {isFiltering && (
              <Button
                variant="tertiary"
                onClick={() => {
                  setSearchQuery("");
                  setCategory(ALL_CATEGORIES);
                }}
                className="text-xs text-neutral-500 hover:text-neutral-800"
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {bulkMode && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-primary-50 p-2.5 ring-1 ring-inset ring-primary-100">
            <Icon name="layers" className="h-4 w-4 text-primary-700" />
            <span className="text-xs font-medium text-primary-900">
              {selectedCodes.size} scope
              {selectedCodes.size === 1 ? "" : "s"} selected
            </span>
            <div className="h-4 w-px bg-primary-200" />
            {ROLE_ORDER.filter((r) => r !== IMMUTABLE_ROLE).map((role) => (
              <button
                key={role}
                type="button"
                disabled={!selectedCodes.size}
                onClick={() => requestBulkGrant(role)}
                className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[11px] font-medium text-neutral-700 shadow-xs transition hover:bg-neutral-50 disabled:opacity-40"
              >
                <RoleBadge role={role} /> Grant to {roleLabel(role)}
              </button>
            ))}
            {selectedCodes.size > 0 && (
              <button
                type="button"
                onClick={() => setSelectedCodes(new Set())}
                className="ml-auto text-[11px] text-primary-700 hover:text-primary-900"
              >
                Clear selection
              </button>
            )}
          </div>
        )}
      </div>

      {/* ============ Matrix ============ */}
      <section aria-labelledby="permission-matrix-heading">
        {status === "ready" && (
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2
                id="permission-matrix-heading"
                className="text-sm font-semibold text-neutral-900"
              >
                Granular Permission Boundaries
              </h2>
              <p className="text-xs text-neutral-500">
                {filteredPermissions.length === catalog.length
                  ? `${catalog.length} scopes across ${ROLE_ORDER.length} roles`
                  : `${filteredPermissions.length} of ${catalog.length} scopes shown`}
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-neutral-600">
              <span className="inline-flex items-center gap-1">
                <Icon
                  name="circle-check"
                  className="h-3.5 w-3.5 text-success-600"
                />
                Authorized
              </span>
              <span className="inline-flex items-center gap-1">
                <Icon
                  name="circle-x"
                  className="h-3.5 w-3.5 text-neutral-400"
                />
                Denied
              </span>
              <span className="inline-flex items-center gap-1">
                <Icon name="lock" className="h-3.5 w-3.5 text-neutral-400" />
                Blocked
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
          <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-xs">
            <ErrorMessage
              title="Unable to load permission entitlements"
              message={loadError}
            />
            <Button
              onClick={loadPermissions}
              className="mt-2 inline-flex items-center gap-2"
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
              stickyHeader
              emptyTitle="No matching permissions found"
              emptyMessage={
                isFiltering
                  ? "No permission scopes match your search or domain query."
                  : "The permission matrix catalog is empty."
              }
              label="Role entitlement matrix"
            />
          </div>
        )}
      </section>

      {/* ============ Help popover ============ */}
      {showHelp && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-neutral-900/30 p-4 backdrop-blur-sm"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-900">
                How the matrix works
              </h3>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                aria-label="Close help"
                className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100"
              >
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>
            <ul className="mt-3 space-y-2.5 text-sm text-neutral-700">
              <li className="flex gap-2">
                <Icon
                  name="circle-check"
                  className="mt-0.5 h-4 w-4 shrink-0 text-success-600"
                />
                <span>
                  <strong>Authorized</strong> — role currently holds this scope.
                  Click to revoke.
                </span>
              </li>
              <li className="flex gap-2">
                <Icon
                  name="circle-x"
                  className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400"
                />
                <span>
                  <strong>Denied</strong> — role does not hold this scope. Click
                  to grant.
                </span>
              </li>
              <li className="flex gap-2">
                <Icon
                  name="lock"
                  className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400"
                />
                <span>
                  <strong>Blocked</strong> — protected by rule{" "}
                  <code className="rounded bg-neutral-100 px-1 font-mono text-[11px]">
                    BR004
                  </code>{" "}
                  (privileged scope) or{" "}
                  <code className="rounded bg-neutral-100 px-1 font-mono text-[11px]">
                    BR006
                  </code>{" "}
                  (last grant). Hover for details.
                </span>
              </li>
              <li className="flex gap-2">
                <Icon
                  name="shield"
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary-600"
                />
                <span>
                  <strong>SUPER_ADMIN</strong> is immutable (rule{" "}
                  <code className="rounded bg-neutral-100 px-1 font-mono text-[11px]">
                    BR005
                  </code>
                  ).
                </span>
              </li>
            </ul>
            <div className="mt-4 rounded-xl bg-neutral-50 p-3 text-xs text-neutral-600">
              <p className="font-semibold text-neutral-800">Keyboard</p>
              <ul className="mt-1 grid grid-cols-2 gap-1">
                <li>
                  <kbd className="rounded border border-neutral-200 bg-white px-1.5 py-0.5 font-mono text-[10px]">
                    ⌘F
                  </kbd>{" "}
                  or{" "}
                  <kbd className="rounded border border-neutral-200 bg-white px-1.5 py-0.5 font-mono text-[10px]">
                    /
                  </kbd>{" "}
                  search
                </li>
                <li>
                  <kbd className="rounded border border-neutral-200 bg-white px-1.5 py-0.5 font-mono text-[10px]">
                    Esc
                  </kbd>{" "}
                  exit bulk mode
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ============ Confirm dialog ============ */}
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

export default AccessControlPage;
