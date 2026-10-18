import { useMemo, useState } from "react";

import Button from "../../components/Button";
import ConfirmDialog from "../../components/ConfirmDialog";
import Icon from "../../components/Icon";
import SearchBar from "../../components/SearchBar";
import Select from "../../components/Select";
import StatusBadge from "../../components/StatusBadge";
import Table from "../../components/Table";
import Tabs from "../../components/Tabs";
import Toast from "../../components/Toast";
import {
  PERMISSION_CATEGORIES,
  PERMISSION_MATRIX,
} from "../../constants/permissions";
import { ROLES } from "../../constants/roles";

const ALL_CATEGORIES = "ALL";

/** Column order mirrors the reference matrix (role constants, CFG-03). */
const ROLE_ORDER = Object.values(ROLES);

const roleLabel = (role) => String(role ?? "").replace(/_/g, " ");

/**
 * Session-local fixtures: no machine-token endpoint exists (nor is one
 * planned), so the daemon tokens below are illustrative only.
 */
const INITIAL_API_TOKENS = [
  {
    id: "TOK-9921",
    name: "DICOM PACS Gateway Bridge",
    roleTarget: "SERVICE_ACCOUNT",
    scope: "IMAGING_INGEST_READ_WRITE",
    lastUsed: "2 mins ago",
    ipWhitelist: "10.0.4.12, 10.0.4.15",
    status: "ACTIVE",
  },
  {
    id: "TOK-9920",
    name: "HL7 Lab Integration Daemon",
    roleTarget: "SERVICE_ACCOUNT",
    scope: "LAB_RESULTS_STREAM",
    lastUsed: "14 secs ago",
    ipWhitelist: "192.168.10.88",
    status: "ACTIVE",
  },
  {
    id: "TOK-9919",
    name: "Telehealth Video Session Broker",
    roleTarget: "DOCTOR",
    scope: "WEBRTC_ROOM_MINT",
    lastUsed: "1 hour ago",
    ipWhitelist: "0.0.0.0/0 (VPN required)",
    status: "ACTIVE",
  },
];

const CATEGORY_FILTER_OPTIONS = PERMISSION_CATEGORIES.map((category) => ({
  value: category,
  label: category,
}));

const StatCard = ({
  label,
  value,
  chip,
  icon,
  iconClass,
  chipClass,
  valueClass = "text-neutral-900",
}) => (
  <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs sm:p-5">
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
        {label}
      </span>
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
      >
        <Icon name={icon} className="h-4 w-4" />
      </span>
    </div>
    <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
      <h3 className={`text-2xl font-bold ${valueClass}`}>{value}</h3>
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${chipClass}`}
      >
        {chip}
      </span>
    </div>
  </div>
);

/**
 * Super-admin access control: the RBAC entitlement matrix mirrored from
 * the backend `RolePermission` policy (static — no endpoint exists or is
 * planned), service-account tokens and the break-glass protocol.
 *
 * Because the policy service does not exist, every change here is
 * session-local and clearly labelled as such; the confirm dialog keeps
 * the sensitive-operation ritual the reference design asks for.
 */
const AccessControlPage = () => {
  // Editable copy of the static mirror — toggles never mutate the import.
  const [matrix, setMatrix] = useState(() =>
    PERMISSION_MATRIX.map((entry) => ({
      ...entry,
      granted: [...entry.granted],
    })),
  );
  const [tokens, setTokens] = useState(INITIAL_API_TOKENS);
  const [activeTab, setActiveTab] = useState("matrix");

  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState(ALL_CATEGORIES);

  const [toast, setToast] = useState(null);
  /** { title, message, confirmLabel, variant, run } | null */
  const [confirm, setConfirm] = useState(null);

  const filteredPermissions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return matrix.filter((entry) => {
      const matchesCategory =
        category === ALL_CATEGORIES || entry.category === category;
      const matchesText =
        !query ||
        [entry.code, entry.name, entry.description, entry.category].some(
          (field) => field.toLowerCase().includes(query),
        );
      return matchesCategory && matchesText;
    });
  }, [matrix, category, searchQuery]);

  const activeTokenCount = useMemo(
    () => tokens.filter((token) => token.status === "ACTIVE").length,
    [tokens],
  );

  const grantedCells = useMemo(
    () => matrix.reduce((sum, entry) => sum + entry.granted.length, 0),
    [matrix],
  );

  const requestToggle = (code, role) => {
    const entry = matrix.find((item) => item.code === code);
    if (!entry) return;

    const isGranted = entry.granted.includes(role);
    const willGrant = !isGranted;

    setConfirm({
      title: willGrant ? "Grant security scope?" : "Revoke security scope?",
      message: `You are about to ${willGrant ? "grant" : "revoke"} "${entry.name}" (${entry.code}) for the [${roleLabel(
        role,
      )}] role group across all clinic workstations.`,
      confirmLabel: willGrant
        ? "Authorize scope"
        : "Confirm revocation",
      variant: willGrant ? "primary" : "danger",
      run: () => {
        setMatrix((current) =>
          current.map((item) =>
            item.code === code
              ? {
                  ...item,
                  granted: willGrant
                    ? [...item.granted, role]
                    : item.granted.filter((granted) => granted !== role),
                }
              : item,
          ),
        );
        setToast({
          type: "success",
          message: `Security scope "${entry.code}" ${
            willGrant ? "granted to" : "revoked from"
          } ${role} (session-only until the policy service ships).`,
        });
      },
    });
  };

  const requestRevokeToken = (token) => {
    setConfirm({
      title: "Revoke API machine token?",
      message: `Immediately invalidate ${token.name} (#${token.id}). Any daemon service relying on this token will start receiving HTTP 401 Unauthorized responses.`,
      confirmLabel: "Revoke token immediately",
      variant: "danger",
      run: () => {
        setTokens((current) =>
          current.map((item) =>
            item.id === token.id ? { ...item, status: "REVOKED" } : item,
          ),
        );
        setToast({
          type: "success",
          message: `Token ${token.id} has been revoked for this session.`,
        });
      },
    });
  };

  const requestBreakGlass = () => {
    setConfirm({
      title: "Initiate emergency break-glass elevation?",
      message:
        "This temporarily elevates emergency on-call clinicians with full system privileges for 60 minutes. Every clinical query executed during this window will be flagged as an elevated emergency event in HIPAA SIEM records.",
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
          </div>
          <p className="mt-1 font-medium text-neutral-900">{row.name}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-neutral-600">
            {row.description}
          </p>
        </div>
      ),
    },
    ...ROLE_ORDER.map((role) => ({
      key: role,
      header: roleLabel(role),
      render: (row) => {
        const granted = row.granted.includes(role);
        return (
          <button
            type="button"
            onClick={() => requestToggle(row.code, role)}
            aria-pressed={granted}
            aria-label={`${granted ? "Revoke" : "Grant"} ${row.name} for ${roleLabel(
              role,
            )}`}
            title={`${granted ? "Authorized" : "Denied"} — click to toggle`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
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
    })),
  ];

  const tokenColumns = [
    {
      key: "id",
      header: "Token",
      render: (token) => (
        <div className="min-w-0 whitespace-normal">
          <span className="block font-mono text-xs font-semibold text-secondary-700">
            {token.id}
          </span>
          <span className="block font-medium text-neutral-900">
            {token.name}
          </span>
        </div>
      ),
    },
    {
      key: "roleTarget",
      header: "Role target",
      render: (token) => (
        <span className="font-medium text-neutral-800">
          {roleLabel(token.roleTarget)}
        </span>
      ),
    },
    {
      key: "scope",
      header: "Scope",
      render: (token) => (
        <span className="rounded-md bg-neutral-100 px-2 py-0.5 font-mono text-xs text-neutral-700">
          {token.scope}
        </span>
      ),
    },
    {
      key: "ipWhitelist",
      header: "Allowed IP subnet",
      render: (token) => (
        <span className="font-mono text-xs text-neutral-600">
          {token.ipWhitelist}
        </span>
      ),
    },
    {
      key: "lastUsed",
      header: "Last active",
      render: (token) => (
        <span className="text-xs text-neutral-600">{token.lastUsed}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (token) =>
        token.status === "ACTIVE" ? (
          <StatusBadge status="success">Active</StatusBadge>
        ) : (
          <StatusBadge status="danger">Revoked</StatusBadge>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (token) =>
        token.status === "ACTIVE" ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => requestRevokeToken(token)}
          >
            Revoke token
          </Button>
        ) : (
          <span className="text-sm font-semibold text-danger-700">
            Permanently inactive
          </span>
        ),
    },
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
            options={CATEGORY_FILTER_OPTIONS}
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
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2
              id="permission-matrix-heading"
              className="text-base font-semibold text-neutral-900"
            >
              Granular permission boundaries
            </h2>
            <p className="text-sm text-neutral-600">
              Select any cell to toggle authorization status. Changes
              require explicit confirmation and apply to this session only.
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

        <Table
          columns={permissionColumns}
          data={filteredPermissions}
          getRowKey={(row) => row.code}
          emptyTitle="No permission scopes found."
          emptyMessage={
            searchQuery || category !== ALL_CATEGORIES
              ? "No scopes match the current filters. Try a different search or domain."
              : "The policy mirror contains no permission scopes."
          }
          label="Role entitlement matrix"
        />
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
            bridges.
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

      <Table
        columns={tokenColumns}
        data={tokens}
        getRowKey={(row) => row.id}
        emptyTitle="No machine tokens."
        emptyMessage="No service-account tokens have been issued."
        label="Daemon API tokens"
      />
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
          Legal Compliance Officer.
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
          value={`${matrix.length} scopes`}
          chip="Enforced"
          icon="shield"
          iconClass="bg-primary-50 text-primary-700"
          chipClass="bg-primary-100 text-primary-800"
        />
        <StatCard
          label="Machine tokens"
          value={`${activeTokenCount} tokens`}
          chip="IP restricted"
          icon="file-code"
          iconClass="bg-secondary-50 text-secondary-700"
          chipClass="bg-secondary-100 text-secondary-800"
        />
        <StatCard
          label="Granted edges"
          value={String(grantedCells)}
          chip={`of ${matrix.length * ROLE_ORDER.length} cells`}
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
