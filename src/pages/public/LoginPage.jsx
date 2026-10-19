import { useEffect, useState } from "react";
import {
  useNavigate,
  useLocation,
  useSearchParams,
  Link,
} from "react-router-dom";
import Button from "../../components/Button";
import ErrorMessage from "../../components/ErrorMessage";
import Input from "../../components/Input";
import Icon from "../../components/Icon";
import { login } from "../../services/authService";

const LoginPage = () => {
  const [searchParams] = useSearchParams();
  const sessionExpired = searchParams.get("reason") === "session-expired";
  const navigate = useNavigate();
  const location = useLocation();
  const [passwordResetSuccess] = useState(
    () => location.state?.passwordResetSuccess || "",
  );

  useEffect(() => {
    if (!passwordResetSuccess) return;
    navigate(`${location.pathname}${location.search}${location.hash}`, {
      replace: true,
      state: null,
    });
  }, [
    location.hash,
    location.pathname,
    location.search,
    navigate,
    passwordResetSuccess,
  ]);

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

    if (!username.trim() || !password.trim() || submitting) return;

    setSubmitting(true);
    try {
      const result = await login({
        username: username.trim(),
        password,
      });

      const { redirectUrl } = result.data;
      const requestedPath = location.state?.from;

      const target =
        typeof requestedPath === "string" && requestedPath.startsWith("/")
          ? requestedPath
          : redirectUrl;

      if (
        typeof target !== "string" ||
        !target.startsWith("/") ||
        target.startsWith("//")
      ) {
        setError(
          "Unable to determine your destination. Please contact support.",
        );
        return;
      }

      navigate(target, { replace: true });
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
      } else if (!err?.response && err?.isAxiosError) {
        setError("Unable to reach the server. Please try again.");
      } else if (status === 502 || status === 503 || status === 504) {
        setError("Unable to reach the server. Please try again.");
      } else {
        setError("Something went wrong. Please try again.");
      }
      setPassword("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-slate-50 px-4 py-4 lg:px-8">
      {/* Background blobs - optimized for lighter paint overhead */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-blue-100/40 blur-2xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-20 right-0 h-64 w-64 rounded-full bg-indigo-100/40 blur-2xl"
      />

      {/* Main card container optimized for non-scrollable viewport fit */}
      <div className="relative w-full max-w-5xl my-auto">
        <div className="grid w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/50 lg:grid-cols-[1fr_0.92fr]">
          {/* Left Branding Section */}
          <section
            aria-hidden="true"
            className="hidden relative flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 p-6 text-white lg:flex xl:p-8"
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
              className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-blue-500/10 blur-2xl"
            />

            <div className="relative z-10">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/10 shadow-lg backdrop-blur">
                  <Icon name="stethoscope" className="h-4 w-4 text-blue-300" />
                </div>
                <div>
                  <p className="text-sm font-extrabold tracking-tight">
                    OneCare
                  </p>
                  <p className="text-[10px] font-medium tracking-[0.18em] text-blue-200">
                    FAMILY CLINIC
                  </p>
                </div>
              </div>

              <div className="mt-6 max-w-md">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1 text-xs font-semibold text-blue-200">
                  <Icon name="activity" className="h-3.5 w-3.5" />
                  Connected care. Simplified.
                </div>

                <h1 className="text-2xl font-extrabold leading-tight tracking-tight xl:text-3xl text-white">
                  Better care
                  <br />
                  starts with
                  <span className="text-blue-300"> better systems.</span>
                </h1>

                <p className="mt-3 max-w-sm text-xs leading-5 text-slate-300">
                  Your central workspace for clinical operations, patient care,
                  and healthcare management — all in one place.
                </p>
              </div>

              <div className="mt-5 space-y-2.5">
                {[
                  "A unified clinical workspace",
                  "Role-based access to your tools",
                  "Streamlined healthcare workflows",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-400/15">
                      <Icon
                        name="circle-check"
                        className="h-3.5 w-3.5 text-blue-300"
                      />
                    </span>
                    <span className="text-xs text-slate-200">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative z-10 mt-6 flex items-center justify-between border-t border-white/10 pt-3">
              <p className="text-[11px] text-slate-400">
                Healthcare Management System
              </p>
              <div className="flex items-center gap-2 text-[11px] text-blue-200">
                <Icon name="shield" className="h-3.5 w-3.5" />
                Secure workspace
              </div>
            </div>
          </section>

          {/* Right Form Section */}
          <section className="flex min-w-0 flex-col justify-center px-5 py-6 sm:px-8 sm:py-8 lg:px-8 xl:px-10">
            <div className="mb-4 flex items-center gap-3 lg:hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                <Icon name="stethoscope" className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-extrabold tracking-tight">
                  OneCare Family Clinic
                </p>
                <p className="text-[11px] text-slate-500">
                  Healthcare Management System
                </p>
              </div>
            </div>

            <div className="mx-auto w-full max-w-md">
              <div className="mb-4">
                <div className="mb-2.5 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                  <Icon name="heart-pulse" className="h-4 w-4" />
                </div>

                <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-blue-600">
                  Welcome back
                </p>
                <h2 className="text-xl font-extrabold tracking-tight text-slate-900 xl:text-2xl">
                  Sign in to OneCare
                </h2>
                <p className="mt-1 text-xs leading-normal text-slate-500">
                  Enter your professional credentials to access your workspace.
                </p>
              </div>

              {sessionExpired && (
                <p
                  role="alert"
                  aria-live="polite"
                  className="mb-3 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-800"
                >
                  Your session has expired. Please sign in again.
                </p>
              )}

              {passwordResetSuccess && (
                <p
                  role="status"
                  aria-live="polite"
                  className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-900"
                >
                  {passwordResetSuccess}
                </p>
              )}

              {error && (
                <ErrorMessage
                  className="mb-3 text-xs"
                  message={error}
                  role="alert"
                />
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
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
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <Link
                      to="/forgot-password"
                      className="text-xs font-semibold text-blue-600 transition hover:text-blue-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 rounded"
                    >
                      Forgot password?
                    </Link>
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
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                          aria-pressed={showPassword}
                          className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                        >
                          <Icon
                            name={showPassword ? "eye-off" : "eye"}
                            className="h-4 w-4"
                          />
                        </button>
                      }
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="group flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/15 transition duration-200 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/25 disabled:cursor-not-allowed disabled:opacity-60"
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

              <div className="mt-4 flex items-center justify-center gap-2 border-t border-slate-100 pt-3 text-center text-[10px] leading-relaxed text-slate-400">
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
