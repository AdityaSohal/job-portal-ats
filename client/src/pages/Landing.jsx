import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Briefcase, MapPin, Search, ShieldCheck } from "lucide-react";
import { useAuth } from "../store/auth";
import { homeFor } from "../lib/roles";
import SiteHeader from "../components/SiteHeader";
import IsoScene from "../components/IsoScene";
import { Button, Input, buttonClass } from "../components/ui";

const FEATURES = [
  { Icon: Search, title: "For candidates", text: "Build a profile, apply in one click, and follow every application from applied to hired." },
  { Icon: Briefcase, title: "For recruiters", text: "Post jobs, rank applicants by skill match, and move them through a clear pipeline." },
  { Icon: ShieldCheck, title: "Reviewed and private", text: "Companies and jobs are approved by an admin, and resumes are never public." },
];

export default function Landing() {
  const navigate = useNavigate();
  const status = useAuth((s) => s.status);
  const user = useAuth((s) => s.user);
  const [q, setQ] = useState("");
  const [place, setPlace] = useState("");

  const search = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim().length >= 2) params.set("q", q.trim());
    if (place.trim()) params.set("location", place.trim());
    const qs = params.toString();
    navigate(qs ? `/jobs?${qs}` : "/jobs");
  };

  return (
    <div className="grid-paper min-h-screen">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-5 pb-16">
        <section className="grid items-center gap-8 py-10 lg:grid-cols-2 lg:py-16">
          <div>
            <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              Hiring, laid out <span className="text-accent">flat</span>.
            </h1>
            <p className="mt-5 max-w-md text-lg text-ink/70">
              A job portal and applicant tracker that keeps every step visible, from the first application to the signed offer.
            </p>

            <form onSubmit={search} className="mt-8 grid max-w-xl gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <div className="relative">
                <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/50" aria-hidden="true" />
                <Input className="pl-10" aria-label="Job title or skill" placeholder="Job title or skill" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <div className="relative">
                <MapPin size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/50" aria-hidden="true" />
                <Input className="pl-10" aria-label="Location" placeholder="Location" value={place} onChange={(e) => setPlace(e.target.value)} />
              </div>
              <Button type="submit">Search</Button>
            </form>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/jobs" className={buttonClass("secondary", "sm")}>
                Browse all jobs
              </Link>
              {status === "authed" ? (
                <Link to={homeFor(user.role)} className={buttonClass("ghost", "sm")}>
                  Open dashboard
                </Link>
              ) : (
                <Link to="/register" className={buttonClass("ghost", "sm")}>
                  Create an account
                </Link>
              )}
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