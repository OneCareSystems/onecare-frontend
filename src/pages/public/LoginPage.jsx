import { useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

import Button from "../../components/Button";
import ErrorMessage from "../../components/ErrorMessage";
import Input from "../../components/Input";
import { store } from "../../app/store";
import { dashboardPathForRole } from "../../constants/roles";
import { login } from "../../services/authService";

/**
 * AC1 (end-to-end) — after a successful sign-in the user is sent to the
 * deep link the guard preserved (`location.state.from`), otherwise to their
 * own role dashboard, falling back to the public home page when the role is
 * unknown. The guard stays the authority: if a mustChangePassword flag is
 * ever set, the dashboard target bounces to /change-password on its own.
 */
const LoginPage = () => {
  const [searchParams] = useSearchParams();
  const sessionExpired = searchParams.get("reason") === "session-expired";

  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitted(true);
    setApiError(null);

    if (!email.trim() || !password) return;

    setSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      const { role } = store.getState().auth;
      const target =
        location.state?.from ?? (role ? dashboardPathForRole(role) : "/home");
      navigate(target, { replace: true });
    } catch (error) {
      setApiError(
        error?.userMessage ??
          error?.message ??
          "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto mt-16 w-full max-w-md rounded-lg border border-neutral-200 bg-neutral-0 p-8">
      <h1 className="text-2xl font-semibold text-neutral-900">Login</h1>
      {sessionExpired && (
        <p
          role="alert"
          className="mt-4 rounded-md border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700"
        >
          Your session has expired. Please sign in again.
        </p>
      )}
      {apiError && (
        <ErrorMessage className="mt-4" message={apiError} />
      )}

      <form onSubmit={handleSubmit} noValidate className="mt-6">
        <Input
          id="email"
          name="email"
          type="email"
          label="Email"
          className="mt-4"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="username"
          required
          submitted={submitted}
          disabled={submitting}
        />
        <Input
          id="password"
          name="password"
          type="password"
          label="Password"
          className="mt-4"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
          submitted={submitted}
          disabled={submitting}
        />
        <Button
          type="submit"
          className="mt-2 w-full"
          loading={submitting}
          disabled={submitting}
        >
          Sign in
        </Button>
      </form>
    </div>
  );
};

export default LoginPage;
