import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, CalendarClock, Check, Clock, ExternalLink, GraduationCap,
  IndianRupee, Laptop, MapPin, Briefcase, Users,
} from "lucide-react";
import api, { getError } from "../lib/api";
import { useAuth } from "../store/auth";
import { useMyApplications, useProfile } from "../hooks/useCandidateData";
import { STAGE_LABEL, cap, deadlineInfo, formatCtc, formatExp, safeUrl, skillMatch, timeAgo } from "../lib/format";
import CompanyLogo from "../components/CompanyLogo";
import SaveButton from "../components/SaveButton";
import ApplyModal from "../components/ApplyModal";
import { Alert, Button, buttonClass } from "../components/ui";
import { Badge, EmptyState, Skeleton } from "../components/bits";

function Fact({ Icon, label, children }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border-2 border-ink bg-paper">
        <Icon size={16} aria-hidden="true" />
      </span>
      <div>
        <dt className="text-xs font-bold uppercase tracking-wide text-ink/55">{label}</dt>
        <dd className="text-[15px] font-semibold">{children}</dd>
      </div>
    </div>
  );
}

function MatchBar({ score }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-sm">
        <span className="font-bold">Your skill match</span>
        <span className="font-extrabold">{score}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full border-2 border-ink bg-white" role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full bg-accent" style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function ApplyCard({ job }) {
  const location = useLocation();
  const status = useAuth((s) => s.status);
  const role = useAuth((s) => s.user?.role);
  const [open, setOpen] = useState(false);

  const profile = useProfile();
  const apps = useMyApplications();
  const mine = apps.data?.find((a) => a.jobId === job._id);
  const mySkills = profile.data?.profile?.skills;
  const match = role === "candidate" && mySkills ? skillMatch(mySkills, job.skills) : null;

  let body;
  if (status === "loading" || (role === "candidate" && apps.isPending)) {
    body = <Skeleton className="h-12" />;
  } else if (status === "guest") {
    body = (
      <>
        <p className="text-sm text-ink/70">Log in as a candidate to apply or save this job.</p>
        <Link to="/login" state={{ from: location }} className={`${buttonClass("primary")} w-full`}>
          Log in to apply
        </Link>
        <Link to="/register" className={`${buttonClass("secondary")} w-full`}>
          Create an account
        </Link>
      </>
    );
  } else if (role !== "candidate") {
    body = <Alert tone="info">Only candidate accounts can apply for jobs.</Alert>;
  } else if (mine) {
    body = (
      <div className="space-y-2">
        <Badge tone="accent">
          <Check size={14} aria-hidden="true" />
          {STAGE_LABEL[mine.stage] || cap(mine.stage)}
        </Badge>
        <p className="text-sm text-ink/70">You applied {timeAgo(mine.createdAt)}.</p>
      </div>
    );
  } else {
    body = (
      <Button className="w-full" onClick={() => setOpen(true)}>
        Apply now
      </Button>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border-2 border-ink bg-white p-5 shadow-block">
      {match && (
        match.score !== null ? (
          <MatchBar score={match.score} />
        ) : null
      )}
      {role === "candidate" && mySkills && mySkills.length === 0 && job.skills.length > 0 && (
        <p className="text-sm text-ink/70">Add skills to your profile to see how well you match this job.</p>
      )}
      {body}
      {open && <ApplyModal job={job} onClose={() => setOpen(false)} />}
    </div>
  );
}

function NotAvailable() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <EmptyState
        title="This job isn't available"
        text="It may have been filled, closed or taken down."
        action={
          <Link to="/jobs" className={buttonClass("primary")}>
            Browse other jobs
          </Link>
        }
      />
    </div>
  );
}

export default function JobDetail() {
  const { id } = useParams();
  const location = useLocation();
  const role = useAuth((s) => s.user?.role);
  const profile = useProfile();

  const { data: job, isPending, isError, error, refetch } = useQuery({
    queryKey: ["job", id],
    queryFn: async () => (await api.get(`/jobs/${id}`)).data.job,
  });

  if (isPending) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-5 py-8">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-28" />
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <Skeleton className="h-96" />
          <Skeleton className="h-60" />
        </div>
      </div>
    );
  }

  if (isError) {
    const info = getError(error);
    if (info.status === 404 || info.status === 400) return <NotAvailable />;
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-5 py-16">
        <Alert>{info.message}</Alert>
        <Button variant="secondary" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const company = job.company;
  const website = safeUrl(company?.website);
  const ctc = formatCtc(job.ctcRange);
  const deadline = deadlineInfo(job.deadline);
  const matched = new Set(role === "candidate" ? skillMatch(profile.data?.profile?.skills, job.skills).matched : []);

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <Link to={`/jobs${location.state?.search || ""}`} className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold hover:underline">
        <ArrowLeft size={16} aria-hidden="true" />
        All jobs
      </Link>

      <header className="relative rounded-2xl border-2 border-ink bg-white p-6 shadow-block">
        <div className="flex flex-wrap items-start gap-4">
          <CompanyLogo company={company} size={64} />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">{job.title}</h1>
            <p className="mt-1 text-[15px] text-ink/70">
              <span className="font-semibold text-ink">{company?.name}</span> · {job.location}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone="accent">{cap(job.workMode)}</Badge>
              <Badge>{cap(job.employmentType)}</Badge>
              {deadline && <Badge tone={deadline.urgent ? "danger" : "plain"}>{deadline.label}</Badge>}
            </div>
          </div>
          <SaveButton jobId={job._id} />
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="rounded-2xl border-2 border-ink bg-white p-6">
            <h2 className="text-lg font-extrabold">About the role</h2>
            {/* Plain text only: line breaks are kept, nothing is ever rendered as HTML */}
            <p className="mt-3 whitespace-pre-line break-words text-[15px] leading-relaxed text-ink/90">{job.description}</p>
          </section>

          {job.skills.length > 0 && (
            <section className="rounded-2xl border-2 border-ink bg-white p-6">
              <h2 className="text-lg font-extrabold">Skills</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {job.skills.map((s) => (
                  <li
                    key={s}
                    className={`inline-flex items-center gap-1.5 rounded-lg border-2 border-ink px-2.5 py-1 text-sm font-semibold ${
                      matched.has(s) ? "bg-accent-soft" : "bg-white"
                    }`}
                  >
                    {matched.has(s) && <Check size={14} aria-label="You have this skill" />}
                    {s}
                  </li>
                ))}
              </ul>
              {matched.size > 0 && <p className="mt-3 text-xs text-ink/60">Highlighted skills are on your profile.</p>}
            </section>
          )}

          <section className="rounded-2xl border-2 border-ink bg-white p-6">
            <h2 className="text-lg font-extrabold">About {company?.name}</h2>
            <p className="mt-1 text-sm text-ink/60">{[company?.industry, company?.size && `${company.size} people`, company?.location].filter(Boolean).join(" · ")}</p>
            {company?.description && <p className="mt-3 whitespace-pre-line break-words text-[15px] leading-relaxed text-ink/90">{company.description}</p>}
            {website && (
              <a href={website} target="_blank" rel="noopener noreferrer nofollow" className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold underline underline-offset-4">
                Company website
                <ExternalLink size={14} aria-hidden="true" />
              </a>
            )}
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <ApplyCard job={job} />

          <dl className="space-y-4 rounded-2xl border-2 border-ink bg-white p-5">
            <Fact Icon={MapPin} label="Location">{job.location}</Fact>
            <Fact Icon={Laptop} label="Work mode">{cap(job.workMode)}</Fact>
            <Fact Icon={Briefcase} label="Job type">{cap(job.employmentType)}</Fact>
            <Fact Icon={GraduationCap} label="Experience">{formatExp(job.minExp, job.maxExp)}</Fact>
            {ctc && <Fact Icon={IndianRupee} label="Pay">{ctc}</Fact>}
            <Fact Icon={Users} label="Openings">{job.openings}</Fact>
            {deadline && <Fact Icon={CalendarClock} label="Deadline">{deadline.label}</Fact>}
            <Fact Icon={Clock} label="Posted">{timeAgo(job.createdAt)}</Fact>
          </dl>
        </aside>
      </div>
    </div>
  );
}