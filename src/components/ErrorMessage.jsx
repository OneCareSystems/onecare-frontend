
const ErrorMessage = ({
  title,
  message,
  children,
  role = "alert",
  className = "",
}) => {
  const content = message ?? children;

  if (!title && !content) return null;

  return (
    <div
      role={role}
      className={`rounded-md border border-red-200 bg-red-50 p-4 text-red-800 ${className}`}
    >
      {title && (
        <h2 className="mb-1 text-sm font-semibold">
          {title}
        </h2>
      )}

      {content && (
        <p className="text-sm">
          {content}
        </p>
      )}
    </div>
  );
};

export default ErrorMessage;
