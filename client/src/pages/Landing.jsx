import { Link } from "react-router-dom";
import { Briefcase, Search, ShieldCheck } from "lucide-react";
import { useAuth } from "../store/auth";
import { homeFor } from "../lib/roles";
import { Logo } from "../components/Logo";
import IsoScene from "../components/IsoScene";
import { buttonClass } from "../components/ui";

const FEATURES = [
  { Icon: Search, title: "For candidates", text: "Build a profile, apply in one click, and follow every application from applied to hired." },
  { Icon: Briefcase, title: "For recruiters", text: "Post jobs, rank applicants by skill match, and move them through a clear pipeline." },
  { Icon: ShieldCheck, title: "Reviewed and private", text: "Companies and jobs are approved by an admin, and resumes are never public." },
];

export default function Landing() {
  const status = useAuth((s) => s.status);
  const user = useAuth((s) => s.user);

  return (
    <div className="grid-paper min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <nav className="flex items-center gap-2">
          {status === "authed" ? (
            <Link to={homeFor(user.role)} className={buttonClass("primary", "sm")}>
              Open dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className={buttonClass("ghost", "sm")}>
                Log in
              </Link>
              <Link to="/register" className={buttonClass("primary", "sm")}>
                Sign up
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-16">
        <section className="grid items-center gap-8 py-10 lg:grid-cols-2 lg:py-16">
          <div>
            <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              Hiring, laid out <span className="text-accent">flat</span>.
            </h1>
            <p className="mt-5 max-w-md text-lg text-ink/70">
              A job portal and applicant tracker that keeps every step visible, from the first application to the signed offer.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className={buttonClass("primary")}>
                Create an account
              </Link>
              <Link to="/login" className={buttonClass("secondary")}>
                Log in
              </Link>
            </div>
          </div>
          <IsoScene className="mx-auto" />
        </section>

        <section className="grid gap-5 md:grid-cols-3">
          {FEATURES.map(({ Icon, title, text }) => (
            <div key={title} className="rounded-2xl border-2 border-ink bg-white p-6 shadow-block">
              <span className="mb-4 flex size-10 items-center justify-center rounded-xl border-2 border-ink bg-accent-soft">
                <Icon size={20} aria-hidden="true" />
              </span>
              <h2 className="text-lg font-bold">{title}</h2>
              <p className="mt-1.5 text-[15px] text-ink/70">{text}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}