import { NavLink, Outlet } from "react-router-dom";
import { useQueues } from "../../hooks/useQueues";
import SiteHeader from "../SiteHeader";
import { cx } from "../ui";

const TABS = [
  { to: "/admin", label: "Overview", end: true },
  { to: "/admin/companies", label: "Companies", queue: "companies" },
  { to: "/admin/jobs", label: "Jobs", queue: "jobs" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/audit", label: "Audit log" },
];

export default function AdminLayout() {
  const { data: queues } = useQueues();

  return (
    <div className="grid-paper min-h-screen">
      <SiteHeader />
      <div className="border-b-2 border-ink bg-white/80">
        <nav aria-label="Admin" className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-5 py-2.5">
          {TABS.map((t) => {
            const count = t.queue ? queues?.[t.queue] || 0 : 0;
            return (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  cx(
                    "inline-flex shrink-0 items-center rounded-lg border-2 px-3.5 py-1.5 text-sm font-semibold transition-colors",
                    isActive ? "border-ink bg-ink text-paper" : "border-transparent hover:border-ink hover:bg-white"
                  )
                }
              >
                {t.label}
                {count > 0 && (
                  <span
                    aria-label={`${count} waiting`}
                    className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full border-2 border-ink bg-accent-soft px-1.5 text-[11px] font-bold text-ink"
                  >
                    {count}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>
      <main className="mx-auto max-w-6xl px-5 py-8">
        <Outlet />
      </main>
    </div>
  );
}