import { useSearchParams } from "react-router-dom";

const LoginPage = () => {
  const [searchParams] = useSearchParams();
  const sessionExpired = searchParams.get("reason") === "session-expired";

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
    </div>
  );
};

export default LoginPage;
