import { Link } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "../store/auth";
import { Logo } from "./Logo";
import { Button } from "./ui";

export default function AppShell({ children }) {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);

  return (
    <div className="grid-paper min-h-screen">
      <header className="border-b-2 border-ink bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Link to="/" aria-label="Home">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border-2 border-ink bg-accent-soft px-3 py-1 text-xs font-bold uppercase tracking-wide sm:inline">
              {user?.role}
            </span>
            <span className="hidden text-sm font-semibold sm:inline">{user?.name}</span>
            <Button variant="secondary" size="sm" onClick={logout}>
              <LogOut size={16} aria-hidden="true" />
              Log out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-10">{children}</main>
    </div>
  );
}