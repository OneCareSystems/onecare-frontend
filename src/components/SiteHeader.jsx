import { Link } from "react-router-dom";
import Logo from "./Logo";

const NAV_LINKS = [
  { to: "/home", label: "Home" },
  { to: "/styleguide", label: "Style guide" },
  { to: "/login", label: "Log in" },
];

const SiteHeader = () => {
  return (
    <header className="border-b border-neutral-200 bg-neutral-50">
      <div className="page-container flex flex-wrap items-center justify-between gap-4 py-4">
        <Link to="/home" className="rounded-2xl">
          <Logo />
        </Link>
        <nav aria-label="Main">
          <ul className="flex flex-wrap items-center gap-2">
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="block rounded-lg px-3 py-2 text-base font-semibold text-neutral-700 hover:bg-primary-50 hover:text-primary-700"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default SiteHeader;
