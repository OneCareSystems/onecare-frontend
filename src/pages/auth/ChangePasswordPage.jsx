/**
 * CFG-03 — placeholder for the change-password screen.
 * The full form is delivered by the login ticket; CFG-03 only wires the
 * route so AC5 redirects have a real destination.
 */
const ChangePasswordPage = () => {
  return (
    <div className="mx-auto mt-16 w-full max-w-md rounded-lg border border-neutral-200 bg-neutral-0 p-8">
      <h1 className="text-2xl font-semibold text-neutral-900">
        Change password
      </h1>
      <p className="mt-2 text-sm text-neutral-600">
        You must change your password before continuing.
      </p>
    </div>
  );
};

export default ChangePasswordPage;
