import { useAuth } from "../store/auth";
import AppShell from "../components/AppShell";
import { Alert } from "../components/ui";

const COPY = {
  candidate: {
    title: "Candidate dashboard",
    next: ["Job search with filters", "Profile and resume upload", "Application tracker, interviews and offers", "Saved jobs and alerts"],
  },
  recruiter: {
    title: "Recruiter dashboard",
    next: ["Company profile and job posting", "Applicants table with match scores", "Stage changes, notes and interviews", "Funnel analytics"],
  },
  admin: {
    title: "Admin dashboard",
    next: ["Company and job approvals", "User management", "Platform analytics", "Audit log"],
  },
};

function CompanyStatus({ company }) {
  if (!company) return null;
  if (company.status === "approved") return <Alert tone="success">{company.name} is approved. You can post jobs.</Alert>;
  if (company.status === "rejected") {
    return (
      <Alert>
        {company.name} was not approved{company.rejectionReason ? `: ${company.rejectionReason}` : "."} Update your company details to resubmit it.
      </Alert>
    );
  }
  return <Alert tone="info">{company.name} is waiting for admin approval. You can post jobs once it is approved.</Alert>;
}

export default function Dashboard() {
  const user = useAuth((s) => s.user);
  const company = useAuth((s) => s.company);
  const copy = COPY[user.role];

  return (
    <AppShell>
      <div className="relative max-w-2xl">
        <div aria-hidden="true" className="absolute inset-0 translate-x-3 translate-y-3 rounded-2xl border-2 border-ink bg-accent-soft" />
        <section className="relative space-y-5 rounded-2xl border-2 border-ink bg-white p-6 sm:p-8">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">{copy.title}</h1>
            <p className="mt-1.5 text-ink/70">
              Signed in as <strong>{user.name}</strong> ({user.email})
            </p>
          </div>

          {user.role === "recruiter" && <CompanyStatus company={company} />}

          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink/60">Coming next</h2>
            <ul className="mt-2 space-y-1.5 text-[15px]">
              {copy.next.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden="true">□</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </AppShell>
  );
}