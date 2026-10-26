import { Link, NavLink, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "../store/auth";
import { homeFor } from "../lib/roles";
import { Logo } from "./Logo";
import { Button, buttonClass, cx } from "./ui";

const navClass = ({ isActive }) =>
  cx("rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors", isActive ? "bg-accent-soft" : "hover:bg-paper");

export default function SiteHeader() {
  const navigate = useNavigate();
  const status = useAuth((s) => s.status);
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);

  const onLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-30 border-b-2 border-ink bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3">
        <div className="flex items-center gap-3 sm:gap-5">
          <Link to="/" aria-label="Home">
            <Logo />
          </Link>
          <nav aria-label="Main">
            <NavLink to="/jobs" className={navClass}>
              Jobs
            </NavLink>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {status === "authed" && (
            <>
              <span className="hidden rounded-full border-2 border-ink bg-accent-soft px-3 py-1 text-xs font-bold uppercase tracking-wide md:inline">
                {user.role}
              </span>
              <Link to={homeFor(user.role)} className={buttonClass("secondary", "sm")}>
                Dashboard
              </Link>
              <Button variant="ghost" size="sm" onClick={onLogout} aria-label="Log out">
                <LogOut size={16} aria-hidden="true" />
                <span className="hidden sm:inline">Log out</span>
              </Button>
            </>
          )}
          {status === "guest" && (
            <>
              <Link to="/login" className={buttonClass("ghost", "sm")}>
                Log in
              </Link>
              <Link to="/register" className={buttonClass("primary", "sm")}>
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}