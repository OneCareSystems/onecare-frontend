import { useState, useMemo } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import Button from "../../components/Button";
import ErrorMessage from "../../components/ErrorMessage";
import Input from "../../components/Input";
import Icon from "../../components/Icon";
import { resetPassword } from "../../services/authService";

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const tokenFromUrl = searchParams.get("token") || "";

  const [token, setToken] = useState(tokenFromUrl);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const passwordCriteria = useMemo(() => {
    return {
      minLength: newPassword.length >= 8 && newPassword.length <= 64,
      hasLetter: /[a-zA-Z]/.test(newPassword),
      hasNumberOrSymbol: /[\d\W]/.test(newPassword),
    };
  }, [newPassword]);

  const validatePassword = (pwd) => {
    if (!pwd) return "New password is required.";
    if (pwd.length < 8) return "Password must be at least 8 characters.";
    if (pwd.length > 64) return "Password cannot exceed 64 characters.";
    return "";
  };

  const validateConfirmPassword = (val) => {
    if (!val) return "Please confirm your new password.";
    if (val !== newPassword) return "Passwords do not match.";
    return "";
  };

  const validateToken = (t) => {
    if (!t || !t.trim()) return "Reset token is required.";
    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitted(true);
    setError("");

    const tokenErr = validateToken(token);
    const pwdErr = validatePassword(newPassword);
    const confirmErr = validateConfirmPassword(confirmPassword);

    if (tokenErr || pwdErr || confirmErr) {
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(token.trim(), newPassword);
      setSuccess(true);
    } catch (err) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message;

      if (status === 400 || status === 401 || status === 404 || status === 422) {
        setError(
          message ||
          "This reset link is invalid or has expired. Please request a new password reset link."
        );
      } else if (status === 429) {
        setError("Too many attempts. Please try again later.");
      } else {
        setError(message || "Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-slate-50 px-4 py-8 lg:px-8">
      {/* Background decoration - optimized for lighter paint overhead */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-blue-100/40 blur-2xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-20 right-0 h-64 w-64 rounded-full bg-indigo-100/40 blur-2xl"
      />

      <div className="relative w-full max-w-md">
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-md"
            >
              <Icon name="arrow-left" className="h-3.5 w-3.5" />
              <span>Back to sign in</span>
            </Link>

            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/20">
              <Icon name="stethoscope" className="h-4 w-4" />
            </div>
          </div>

          <div className="mb-6">
            <div className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
              <Icon name="lock" className="h-5 w-5" />
            </div>

            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
              Reset your password
            </h1>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
              Choose a strong, unique password between 8 and 64 characters to secure your account.
            </p>
          </div>

          {error && (
            <ErrorMessage
              className="mb-4 text-xs"
              message={error}
              role="alert"
            />
          )}

          {success ? (
            <div
              role="alert"
              aria-live="polite"
              className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <Icon name="circle-check" className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-emerald-950">
                    Password reset successful!
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-emerald-800">
                    Your password has been changed successfully. You can now log in using your new credentials.
                  </p>
                </div>
              </div>

              <div className="mt-5 border-t border-emerald-200/60 pt-4">
                <Button
                  onClick={() => navigate("/login")}
                  className="group flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-600/25"
                >
                  <span>Sign in with new password</span>
                  <Icon
                    name="arrow-right"
                    className="h-4 w-4 transition-transform group-hover:translate-x-1"
                  />
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {!tokenFromUrl && (
                <div>
                  <Input
                    id="reset-token"
                    name="token"
                    type="text"
                    label="Reset Token"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    validate={validateToken}
                    required
                    disabled={submitting}
                    submitted={submitted}
                    placeholder="Paste your reset token"
                    hint="The token provided in your reset email"
                    leftIcon={
                      <Icon name="key-round" className="h-4 w-4 text-slate-400" />
                    }
                  />
                </div>
              )}

              <div>
                <Input
                  id="new-password"
                  name="newPassword"
                  type={showPassword ? "text" : "password"}
                  label="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  validate={validatePassword}
                  autoComplete="new-password"
                  required
                  disabled={submitting}
                  submitted={submitted}
                  placeholder="Enter new password (8-64 characters)"
                  leftIcon={
                    <Icon name="lock" className="h-4 w-4 text-slate-400" />
                  }
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
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

                <div className="mt-2 rounded-lg bg-slate-50 p-2.5 text-[11px] text-slate-600 border border-slate-100">
                  <p className="font-semibold text-slate-700 mb-1">
                    Password requirements:
                  </p>
                  <ul className="space-y-1">
                    <li className="flex items-center gap-1.5">
                      <Icon
                        name={passwordCriteria.minLength ? "circle-check" : "circle-help"}
                        className={`h-3.5 w-3.5 ${passwordCriteria.minLength ? "text-emerald-600" : "text-slate-400"
                          }`}
                      />
                      <span className={passwordCriteria.minLength ? "text-slate-900 font-medium" : ""}>
                        Between 8 and 64 characters
                      </span>
                    </li>
                  </ul>
                </div>
              </div>

              <div>
                <Input
                  id="confirm-password"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  label="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  validate={validateConfirmPassword}
                  autoComplete="new-password"
                  required
                  disabled={submitting}
                  submitted={submitted}
                  placeholder="Re-enter your new password"
                  leftIcon={
                    <Icon name="lock" className="h-4 w-4 text-slate-400" />
                  }
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      aria-label={
                        showConfirmPassword
                          ? "Hide confirm password"
                          : "Show confirm password"
                      }
                      aria-pressed={showConfirmPassword}
                      className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    >
                      <Icon
                        name={showConfirmPassword ? "eye-off" : "eye"}
                        className="h-4 w-4"
                      />
                    </button>
                  }
                />
              </div>

              <Button
                type="submit"
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/10 transition duration-200 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/25 disabled:cursor-not-allowed disabled:opacity-60"
                loading={submitting}
                disabled={submitting}
              >
                <span>Reset password</span>
                <Icon
                  name="arrow-right"
                  className="h-4 w-4 transition-transform group-hover:translate-x-1"
                />
              </Button>
            </form>
          )}

          <div className="mt-6 flex items-center justify-center gap-2 border-t border-slate-100 pt-4 text-center text-[10px] leading-relaxed text-slate-400">
            <Icon name="shield" className="h-3.5 w-3.5 shrink-0" />
            <span>
              Authorized access only. OneCare Healthcare Management System.
            </span>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ResetPasswordPage;