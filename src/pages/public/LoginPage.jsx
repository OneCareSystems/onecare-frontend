import { useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";

import Button from "../../components/Button";
import ErrorMessage from "../../components/ErrorMessage";
import Input from "../../components/Input";
import Icon from "../../components/Icon";
import { store } from "../../app/store";
import { dashboardPathForRole } from "../../constants/roles";
import { login } from "../../services/authService";

const LoginPage = () => {
  const [searchParams] = useSearchParams();
  const sessionExpired = searchParams.get("reason") === "session-expired";
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitted(true);
    setError("");

    if (!username.trim() || !password) return;

    setSubmitting(true);
    try {
      const result = await login({ username: username.trim(), password });
      const { role, mustChangePassword } = result.data;
      if (mustChangePassword) {
        navigate("/change-password", { replace: true });
      } else {
        const target = location.state?.from ?? dashboardPathForRole(role);
        navigate(target, { replace: true });
      }
    } catch (err) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message;

      if (status === 429) {
        setError("Too many attempts, try again shortly");
      } else if (status === 403 || status === 423) {
        setError(
          message ||
          "Account locked. Wait for timed unlock, contact Super Admin, or use Forgot Password.",
        );
      } else if (status === 401) {
        setError("Invalid username or password.");
      } else {
        setError("Something went wrong. Please try again.");
      }
      setPassword("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-x-hidden overflow-y-auto bg-slate-50 px-4 py-6 lg:px-8">
      {/* Background blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-teal-100/60 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 right-0 h-80 w-80 rounded-full bg-primary-100/60 blur-3xl"
      />

      {/* Main card container optimized for height and responsiveness */}
      <div className="relative w-full max-w-6xl my-auto">
        <div className="grid w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-200/70 lg:grid-cols-[1fr_0.92fr]">

          {/* Left Branding Section */}
          <section
            aria-hidden="true"
            className="hidden relative flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-950 via-teal-950 to-emerald-900 p-8 text-white lg:flex xl:p-10"
          >
            <div
              aria-hidden="true"
              className="absolute -right-24 top-20 h-80 w-80 rounded-full border border-white/10"
            />
            <div
              aria-hidden="true"
              className="absolute -right-12 top-32 h-56 w-56 rounded-full border border-white/10"
            />
            <div
              aria-hidden="true"
              className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-teal-400/10 blur-2xl"
            />

            <div className="relative z-10">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 shadow-lg backdrop-blur">
                  <Icon name="stethoscope" className="h-5 w-5 text-teal-300" />
                </div>
                <div>
                  <p className="text-base font-extrabold tracking-tight">
                    OneCare
                  </p>
                  <p className="text-[10px] font-medium tracking-[0.18em] text-teal-200">
                    FAMILY CLINIC
                  </p>
                </div>
              </div>

              <div className="mt-10 max-w-md">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal-300/20 bg-teal-300/10 px-3 py-1 text-xs font-semibold text-teal-200">
                  <Icon name="activity" className="h-3.5 w-3.5" />
                  Connected care. Simplified.
                </div>

                <h1 className="text-3xl font-extrabold leading-tight tracking-tight xl:text-4xl">
                  Better care
                  <br />
                  starts with
                  <span className="text-teal-300"> better systems.</span>
                </h1>

                <p className="mt-4 max-w-sm text-xs leading-6 text-slate-300 xl:text-sm">
                  Your central workspace for clinical operations, patient care,
                  and healthcare management — all in one place.
                </p>
              </div>

              <div className="mt-8 space-y-3">
                {[
                  "A unified clinical workspace",
                  "Role-based access to your tools",
                  "Streamlined healthcare workflows",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-300/15">
                      <Icon
                        name="circle-check"
                        className="h-3.5 w-3.5 text-teal-300"
                      />
                    </span>
                    <span className="text-xs text-slate-200 xl:text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative z-10 mt-8 flex items-center justify-between border-t border-white/10 pt-4">
              <p className="text-[11px] text-slate-400">
                Healthcare Management System
              </p>
              <div className="flex items-center gap-2 text-[11px] text-teal-200">
                <Icon name="shield" className="h-3.5 w-3.5" />
                Secure workspace
              </div>
            </div>
          </section>

          {/* Right Form Section */}
          <section className="flex min-w-0 flex-col justify-center px-5 py-8 sm:px-10 sm:py-10 lg:px-10 xl:px-12">
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-700 text-white shadow-lg shadow-teal-700/20">
                <Icon name="stethoscope" className="h-5 w-5" />
              </div>
              <div>
                <p className="text-base font-extrabold tracking-tight">
                  OneCare Family Clinic
                </p>
                <p className="text-xs text-slate-500">
                  Healthcare Management System
                </p>
              </div>
            </div>

            <div className="mx-auto w-full max-w-md">
              <div className="mb-6">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-100">
                  <Icon name="heart-pulse" className="h-5 w-5" />
                </div>

                <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-teal-700">
                  Welcome back
                </p>
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 xl:text-3xl">
                  Sign in to OneCare
                </h2>
                <p className="mt-1.5 text-xs leading-5 text-slate-500 xl:text-sm">
                  Enter your professional credentials to access your workspace.
                </p>
              </div>

              {sessionExpired && (
                <p
                  role="alert"
                  className="mb-4 rounded-xl border border-danger-200 bg-danger-50 p-3 text-xs text-danger-800 xl:text-sm"
                >
                  Your session has expired. Please sign in again.
                </p>
              )}

              {error && (
                <ErrorMessage className="mb-4 text-xs xl:text-sm" message={error} role="alert" />
              )}

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div>
                  <Input
                    id="professional-id"
                    name="username"
                    type="text"
                    label="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    required
                    disabled={submitting}
                    submitted={submitted}
                    placeholder="Enter your professional ID"
                    leftIcon={
                      <Icon name="user" className="h-4 w-4 text-slate-400" />
                    }
                  />
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <a
                      href="/forgot-password"
                      className="text-xs font-semibold text-teal-700 transition hover:text-teal-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
                    >
                      Forgot password?
                    </a>
                  </div>

                  <div className="group relative">
                    <Input
                      id="professional-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      label="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                      disabled={submitting}
                      submitted={submitted}
                      placeholder="Enter your password"
                      leftIcon={
                        <Icon name="lock" className="h-4 w-4 text-slate-400" />
                      }
                      rightIcon={
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          aria-pressed={showPassword}
                          className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                        >
                          <Icon name={showPassword ? "eye-off" : "eye"} className="h-4 w-4" />
                        </button>
                      }
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="group flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-teal-700/20 transition duration-200 hover:-translate-y-0.5 hover:bg-teal-800 hover:shadow-xl hover:shadow-teal-700/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-600/25 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                  loading={submitting}
                  disabled={submitting}
                >
                  <span>Sign in securely</span>
                  <Icon
                    name="arrow-right"
                    className="h-4 w-4 transition-transform group-hover:translate-x-1"
                  />
                </Button>
              </form>

              <div className="mt-6 flex items-center justify-center gap-2 border-t border-slate-100 pt-4 text-center text-[11px] leading-relaxed text-slate-400">
                <Icon name="shield" className="h-3.5 w-3.5 shrink-0" />
                <span>
                  Authorized access only. Protect patient information and sign
                  out when finished.
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};

export default LoginPage;