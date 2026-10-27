import { Link, NavLink, Outlet } from "react-router-dom";
import { useCompany } from "../../hooks/useCompany";
import SiteHeader from "../SiteHeader";
import { Alert, cx } from "../ui";

const TABS = [
  { to: "/recruiter", label: "Overview", end: true },
  { to: "/recruiter/jobs", label: "Jobs" },
  { to: "/recruiter/interviews", label: "Interviews" },
  { to: "/recruiter/company", label: "Company" },
];

function CompanyBanner({ company }) {
  if (!company || company.status === "approved") return null;

  if (company.status === "rejected") {
    return (
      <Alert className="mb-6">
        <strong>{company.name}</strong> was not approved
        {company.rejectionReason ? `: ${company.rejectionReason}` : "."} Your jobs are hidden.{" "}
        <Link to="/recruiter/company" className="font-extrabold underline underline-offset-4">
          Update your company details
        </Link>{" "}
        to resubmit it.
      </Alert>
    );
  }
  return (
    <Alert tone="info" className="mb-6">
      <strong>{company.name}</strong> is waiting for admin approval. You can post jobs once it is approved.
    </Alert>
  );
}

export default function RecruiterLayout() {
  const { data: company } = useCompany();

  return (
    <div className="grid-paper min-h-screen">
      <SiteHeader />
      <div className="border-b-2 border-ink bg-white/80">
        <nav aria-label="Recruiter" className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-5 py-2.5">
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
        <CompanyBanner company={company} />
        <Outlet />
      </main>
    </div>
  );
}