import { NavLink, Outlet } from "react-router-dom";
import SiteHeader from "./SiteHeader";
import { cx } from "./ui";

const TABS = [
  { to: "/candidate", label: "Overview", end: true },
  { to: "/candidate/applications", label: "Applications" },
  { to: "/candidate/saved", label: "Saved jobs" },
  { to: "/candidate/profile", label: "Profile" },
  { to: "/candidate/alerts", label: "Job alerts" },
  { to: "/candidate/settings", label: "Settings" },
];

export default function CandidateLayout() {
  return (
    <div className="grid-paper min-h-screen">
      <SiteHeader />
      <div className="border-b-2 border-ink bg-white/80">
        <nav aria-label="Candidate" className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-5 py-2.5">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                cx(
                  "shrink-0 rounded-lg border-2 px-3.5 py-1.5 text-sm font-semibold transition-colors",
                  isActive ? "border-ink bg-ink text-paper" : "border-transparent hover:border-ink hover:bg-white"
                )
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <main className="mx-auto max-w-6xl px-5 py-8">
        <Outlet />
      </main>
    </div>
  );
}