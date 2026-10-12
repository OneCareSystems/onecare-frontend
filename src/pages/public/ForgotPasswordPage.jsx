import { useState } from "react";
import { Link } from "react-router-dom";
import Button from "../../components/Button";
import ErrorMessage from "../../components/ErrorMessage";
import Input from "../../components/Input";
import Icon from "../../components/Icon";
import { forgotPassword } from "../../services/authService";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const validateEmail = (val) => {
    if (!val || !val.trim()) {
      return "Email is required.";
    }
    if (!EMAIL_REGEX.test(val.trim())) {
      return "Please enter a valid email address.";
    }
    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitted(true);
    setError("");

    const validationMsg = validateEmail(email);
    if (validationMsg) {
      return;
    }

    setSubmitting(true);
    try {
      await forgotPassword(email.trim());
      // Backend returns identical external outcome (silent no-op if email not found)
      setSuccess(true);
    } catch (err) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message;

      if (status === 429) {
        setError("Too many attempts, please try again shortly.");
      } else {
        setError(message || "Something went wrong. Please try again later.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-slate-50 px-4 py-8 lg:px-8">
      {/* Background decoration */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-blue-100/60 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 right-0 h-80 w-80 rounded-full bg-indigo-100/60 blur-3xl"
      />

      <div className="relative w-full max-w-md">
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xl shadow-slate-200/70 sm:p-8">
          {/* Header logo / branding */}
          <div className="mb-6 flex items-center justify-between">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-md"
            >
              <Icon name="arrow-left" className="h-3.5 w-3.5" />
              <span>Back to sign in</span>
            </Link>

            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
              <Icon name="stethoscope" className="h-4 w-4" />
            </div>
          </div>

          <div className="mb-6">
            <div className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
              <Icon name="key-round" className="h-5 w-5" />
            </div>

            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
              Forgot password?
            </h1>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
              Enter your registered email address and we will send you instructions to reset your password.
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
              className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <Icon name="circle-check" className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-emerald-950">
                    Check your email
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-emerald-800">
                    If an account is associated with{" "}
                    <span className="font-semibold text-emerald-950">{email}</span>,
                    a password reset link has been sent. Please check your inbox and spam folder.
                  </p>
                </div>
              </div>

              <div className="mt-5 border-t border-emerald-200/60 pt-4">
                <Link
                  to="/login"
                  className="group flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-600/25"
                >
                  <Icon name="arrow-left" className="h-3.5 w-3.5" />
                  <span>Return to login</span>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <Input
                  id="reset-email"
                  name="email"
                  type="email"
                  label="Registered Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  validate={validateEmail}
                  autoComplete="email"
                  required
                  disabled={submitting}
                  submitted={submitted}
                  placeholder="doctor@onecare.com"
                  leftIcon={
                    <Icon name="mail" className="h-4 w-4 text-slate-400" />
                  }
                />
              </div>

              <Button
                type="submit"
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/20 transition duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/25 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                loading={submitting}
                disabled={submitting}
              >
                <span>Send reset instructions</span>
                <Icon
                  name="arrow-right"
                  className="h-4 w-4 transition-transform group-hover:translate-x-1"
                />
              </Button>

              <div className="pt-2 text-center">
                <Link
                  to="/login"
                  className="text-xs font-medium text-slate-600 hover:text-blue-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
                >
                  Remember your password? <span className="font-semibold text-blue-600">Sign in</span>
                </Link>
              </div>
            </form>
          )}

          <div className="mt-6 flex items-center justify-center gap-2 border-t border-slate-100 pt-4 text-center text-[10px] leading-relaxed text-slate-400">
            <Icon name="shield" className="h-3.5 w-3.5 shrink-0" />
            <span>
              Secure password recovery for OneCare authorized personnel.
            </span>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ForgotPasswordPage;
