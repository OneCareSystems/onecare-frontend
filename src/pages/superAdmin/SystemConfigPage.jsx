import { useState } from "react";

import Button from "../../components/Button";
import Icon from "../../components/Icon";
import Input from "../../components/Input";
import Toast from "../../components/Toast";
import {
  DEFAULT_BASE_URL,
  DEFAULT_EXPIRES_IN_SECONDS,
  HEALTH_TIMEOUT_MS,
  applySessionBaseUrl,
  normalizeBaseUrl,
  testBackendHealth,
} from "../../services/systemConfigService";

/** Vite's real build profile (development / production), not a mock. */
const ACTIVE_PROFILE = String(import.meta.env.MODE ?? "unknown").toUpperCase();

const FALLBACK_EXPIRY_MINUTES = Math.round(
  DEFAULT_EXPIRES_IN_SECONDS / 60,
);

/** Probe outcomes → status-box presentation (token colours only). */
const probeCopy = (probe) => {
  switch (probe.outcome) {
    case "testing":
      return {
        box: "border-neutral-200 bg-neutral-50 text-neutral-800",
        icon: "refresh",
        iconClass: "animate-spin text-primary-700",
        title: "Pinging backend...",
        body: "Sending GET /health from this browser.",
      };
    case "healthy":
      return {
        box: "border-success-200 bg-success-50 text-success-900",
        icon: "circle-check",
        iconClass: "text-success-700",
        title: "Backend reachable",
        body: `GET /health answered HTTP ${probe.status} OK.`,
      };
    case "responding":
      return {
        box: "border-primary-200 bg-primary-50 text-primary-900",
        icon: "info",
        iconClass: "text-primary-700",
        title: "Backend responding",
        body: `The gateway answered HTTP ${probe.status}. The server is up — this backend may simply not expose /health (a 401 or 404 here still proves reachability).`,
      };
    case "timeout":
      return {
        box: "border-danger-200 bg-danger-50 text-danger-900",
        icon: "triangle-alert",
        iconClass: "text-danger-700",
        title: "Probe timed out",
        body: `No response within ${HEALTH_TIMEOUT_MS / 1000} seconds.`,
      };
    case "unreachable":
      return {
        box: "border-danger-200 bg-danger-50 text-danger-900",
        icon: "triangle-alert",
        iconClass: "text-danger-700",
        title: "No response",
        body: "The server could not be reached — it may be down, the URL may be wrong, or the browser blocked the request (CORS).",
      };
    default:
      return {
        box: "border-neutral-200 bg-neutral-50 text-neutral-800",
        icon: "info",
        iconClass: "text-neutral-500",
        title: "No probe run yet",
        body: "Run Test Connection to send GET /health from this browser.",
      };
  }
};

/**
 * Super-admin clinic configuration (route: /super-admin/clinic-configuration).
 *
 * Real pieces: the build-time VITE_API_BASE_URL, the /health reachability
 * probe, and the session-scoped re-pointing of the shared Axios client.
 * The backend offers no configuration API (none planned), so the security
 * policies are a read-only mirror and the maintenance schedule is static
 * copy — labelled as such on the page instead of faking a save.
 */
const SystemConfigPage = () => {
  const [apiUrl, setApiUrl] = useState(DEFAULT_BASE_URL);
  const [isTesting, setIsTesting] = useState(false);
  const [probe, setProbe] = useState({ outcome: "idle" });
  const [attemptedSave, setAttemptedSave] = useState(false);
  const [toast, setToast] = useState(null);

  const urlCheck = normalizeBaseUrl(apiUrl);
  const copy = probeCopy(probe);

  const handleTestConnection = async () => {
    if (!urlCheck.ok) {
      setToast({
        type: "error",
        message: urlCheck.error,
      });
      return;
    }

    setIsTesting(true);
    setProbe({ outcome: "testing" });
    try {
      const result = await testBackendHealth(urlCheck.url);
      setProbe(result);
    } finally {
      setIsTesting(false);
    }
  };

  const handleReset = () => {
    setApiUrl(DEFAULT_BASE_URL);
    setAttemptedSave(false);
  };

  const handleSave = (event) => {
    event.preventDefault();
    setAttemptedSave(true);

    if (!urlCheck.ok) return; // inline error under the input explains

    try {
      applySessionBaseUrl(urlCheck.url);
      setToast({
        type: "success",
        message:
          "API base URL applied for this browser session. Reload the page to return to the build-time VITE_API_BASE_URL.",
      });
    } catch (error) {
      setToast({
        type: "error",
        message: error?.message ?? "Could not apply the base URL.",
      });
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs">
        <span className="text-xs font-semibold uppercase tracking-wider text-secondary-700">
          Active profile: {ACTIVE_PROFILE}
        </span>
        <h1 className="mt-1 text-2xl font-semibold text-neutral-900">
          Clinic Configuration & Microservices
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          Spring Boot REST gateway parameters, JWT cipher policies, and
          automated failover settings.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Backend integration */}
        <section
          aria-labelledby="backend-heading"
          className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs"
        >
          <div className="flex items-center justify-between gap-3 border-b border-neutral-200 pb-3">
            <div className="flex items-center gap-2.5">
              <Icon
                name="server"
                className="h-5 w-5 shrink-0 text-primary-700"
              />
              <h2
                id="backend-heading"
                className="text-base font-semibold text-neutral-900"
              >
                Spring Boot REST Backend Integration
              </h2>
            </div>
            <span className="shrink-0 rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-semibold text-primary-800">
              REST / JSON
            </span>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Input
              id="api-base-url"
              name="api-base-url"
              label="Backend API base URL"
              value={apiUrl}
              onChange={(event) => setApiUrl(event.target.value)}
              placeholder="http://localhost:8080/api"
              error={urlCheck.error}
              submitted={attemptedSave}
              hint="Build-time default from VITE_API_BASE_URL (src/services/config.js). Saving applies the URL to this browser session only — reload restores the environment value."
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="shrink-0"
            >
              <Icon
                name="wifi"
                className={`h-4 w-4 ${
                  isTesting
                    ? "animate-spin text-primary-700"
                    : "text-secondary-700"
                }`}
              />
              {isTesting ? "Testing..." : "Test Connection"}
            </Button>
          </div>

          <div
            role="status"
            aria-live="polite"
            className={`flex items-start gap-2.5 rounded-2xl border p-3.5 text-sm ${copy.box}`}
          >
            <Icon
              name={copy.icon}
              className={`mt-0.5 h-4 w-4 shrink-0 ${copy.iconClass}`}
            />
            <div className="min-w-0">
              <p className="font-semibold">{copy.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed opacity-90">
                {copy.body}
              </p>
            </div>
          </div>
        </section>

        {/* Security policies (read-only mirror) */}
        <section
          aria-labelledby="security-heading"
          className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs"
        >
          <div className="flex items-center gap-2.5 border-b border-neutral-200 pb-3">
            <Icon name="lock" className="h-5 w-5 shrink-0 text-secondary-700" />
            <div className="min-w-0">
              <h2
                id="security-heading"
                className="text-base font-semibold text-neutral-900"
              >
                Security & Encryption Policies
              </h2>
              <p className="text-sm text-neutral-600">
                Read-only — these policies are enforced by the backend and
                cannot be changed from the browser.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input
              id="jwt-expiry"
              name="jwt-expiry"
              label="JWT expiry lifetime"
              defaultValue={`${FALLBACK_EXPIRY_MINUTES} min fallback`}
              disabled
              hint="The backend issues the real lifetime at each login."
            />
            <Input
              id="password-hashing"
              name="password-hashing"
              label="Password hashing"
              defaultValue="BCrypt (12 rounds)"
              disabled
            />
            <Input
              id="phi-cipher"
              name="phi-cipher"
              label="PHI storage cipher"
              defaultValue="AES-256-GCM"
              disabled
            />
          </div>
        </section>

        {/* Automated maintenance & telemetry */}
        <section
          aria-labelledby="telemetry-heading"
          className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs"
        >
          <div className="flex items-center gap-2.5 border-b border-neutral-200 pb-3">
            <Icon name="cpu" className="h-5 w-5 shrink-0 text-secondary-700" />
            <div className="min-w-0">
              <h2
                id="telemetry-heading"
                className="text-base font-semibold text-neutral-900"
              >
                Automated Maintenance & Telemetry
              </h2>
              <p className="text-sm text-neutral-600">
                Static schedule mirror — see the System Maintenance screen
                for the operational journal.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3.5">
              <p className="text-sm font-semibold text-neutral-900">
                Database VACUUM & REINDEX
              </p>
              <p className="mt-0.5 text-xs text-neutral-600">
                Every Sunday at 03:00 UTC
              </p>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3.5">
              <p className="text-sm font-semibold text-neutral-900">
                HL7 / FHIR polling rate
              </p>
              <p className="mt-0.5 text-xs text-neutral-600">
                15-second realtime interval
              </p>
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={handleReset}>
            Reset to environment default
          </Button>
          <Button
            type="submit"
            className="inline-flex shrink-0 items-center gap-2"
          >
            <Icon name="save" className="h-4 w-4" />
            Save System Settings
          </Button>
        </div>
      </form>

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

export default SystemConfigPage;
