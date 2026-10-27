import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Search } from "lucide-react";
import api, { getError } from "../../lib/api";
import { useAuth } from "../../store/auth";
import { useProfile } from "../../hooks/useCandidateData";
import ProgressRing from "../../components/ProgressRing";
import Card from "../../components/Card";
import ApplicationRow from "../../components/ApplicationRow";
import InterviewCard from "../../components/InterviewCard";
import { Alert, Button, buttonClass } from "../../components/ui";
import { EmptyState, Skeleton } from "../../components/bits";

const ACTIVE = ["applied", "shortlisted", "interview"];

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border-2 border-ink bg-white p-4 shadow-block-sm">
      <p className="text-3xl font-extrabold">{value}</p>
      <p className="text-sm font-semibold text-ink/65">{label}</p>
    </div>
  );
}

export default function CandidateHome() {
  const user = useAuth((s) => s.user);
  const profile = useProfile();

  const apps = useQuery({
    queryKey: ["my-applications", "dashboard"],
    queryFn: async () => (await api.get("/applications/me", { params: { limit: 50 } })).data,
  });
  const interviews = useQuery({
    queryKey: ["interviews", "upcoming"],
    queryFn: async () => (await api.get("/interviews", { params: { upcoming: "true", limit: 5 } })).data.items,
  });

  const items = apps.data?.items || [];
  const offers = items.filter((a) => a.stage === "offered");
  const active = items.filter((a) => ACTIVE.includes(a.stage)).length;
  const completion = profile.data?.completion;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight">Hello, {user.name.split(" ")[0]}</h1>
        <Link to="/jobs" className={buttonClass("primary")}>
          <Search size={18} aria-hidden="true" />
          Browse jobs
        </Link>
      </div>

      {offers.map((a) => (
        <Alert key={a.id} tone="success">
          You have an offer{a.job?.company?.name ? ` from ${a.job.company.name}` : ""}
          {a.job?.title ? ` for ${a.job.title}` : ""}.{" "}
          <Link to={`/candidate/applications/${a.id}`} className="font-extrabold underline underline-offset-4">
            Respond to it
          </Link>
        </Alert>
      ))}

      <div className="grid gap-4 sm:grid-cols-3">
        {apps.isPending ? (
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)
        ) : (
          <>
            <Stat label="Applications" value={apps.data?.total ?? 0} />
            <Stat label="In progress" value={active} />
            <Stat label="Offers waiting" value={offers.length} />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card
            title="Recent applications"
            action={
              items.length > 0 && (
                <Link to="/candidate/applications" className="inline-flex items-center gap-1 text-sm font-bold underline underline-offset-4">
                  View all <ArrowRight size={14} aria-hidden="true" />
                </Link>
              )
            }
          >
            {apps.isPending ? (
              <div className="space-y-3">
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </div>
            ) : apps.isError ? (
              <div className="space-y-3">
                <Alert>{getError(apps.error).message}</Alert>
                <Button variant="secondary" size="sm" onClick={() => apps.refetch()}>
                  Try again
                </Button>
              </div>
            ) : items.length === 0 ? (
              <EmptyState
                title="No applications yet"
                text="Find a job you like and apply in a few clicks."
                action={
                  <Link to="/jobs" className={buttonClass("primary")}>
                    Browse jobs
                  </Link>
                }
              />
            ) : (
              <div className="space-y-3">
                {items.slice(0, 5).map((a) => (
                  <ApplicationRow key={a.id} app={a} />
                ))}
              </div>
            )}
          </Card>

          <Card title="Upcoming interviews">
            {interviews.isPending ? (
              <Skeleton className="h-32" />
            ) : interviews.isError ? (
              <Alert>{getError(interviews.error).message}</Alert>
            ) : interviews.data.length === 0 ? (
              <p className="text-sm text-ink/70">No interviews scheduled. When a recruiter schedules one, it appears here.</p>
            ) : (
              <div className="space-y-3">
                {interviews.data.map((iv) => (
                  <InterviewCard key={iv.id} interview={iv} showJob />
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card title="Your profile">
          {profile.isPending ? (
            <Skeleton className="h-40" />
          ) : profile.isError ? (
            <Alert>{getError(profile.error).message}</Alert>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <ProgressRing value={completion.score} />
                <p className="text-sm text-ink/70">{completion.score === 100 ? "Your profile is complete." : "A complete profile helps recruiters notice you."}</p>
              </div>
              {completion.missing.length > 0 && (
                <ul className="space-y-1.5 text-sm">
                  {completion.missing.slice(0, 3).map((m) => (
                    <li key={m.key} className="flex justify-between gap-3">
                      <span>{m.label}</span>
                      <span className="shrink-0 font-bold text-accent">+{m.points}</span>
                    </li>
                  ))}
                </ul>
              )}
              <Link to="/candidate/profile" className={`${buttonClass("secondary", "sm")} w-full`}>
                {completion.score === 100 ? "View profile" : "Complete your profile"}
              </Link>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}