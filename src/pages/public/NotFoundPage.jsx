import { Link } from "react-router-dom";

/** Public 404 screen — unknown URLs land here instead of a blank page. */
const NotFoundPage = () => {
  return (
    <div className="mx-auto mt-16 w-full max-w-md rounded-lg border border-neutral-200 bg-neutral-0 p-8 text-center">
      <h1 className="text-2xl font-semibold text-neutral-900">
        Page not found
      </h1>
      <p className="mt-2 text-sm text-neutral-600">
        The page you are looking for does not exist or may have moved.
      </p>
      <Link
        to="/home"
        className="mt-4 inline-block rounded-lg px-3 py-2 text-base font-semibold text-neutral-700 hover:bg-primary-50 hover:text-primary-700"
      >
        Go to home
      </Link>
    </div>
  );
};

export default NotFoundPage;
