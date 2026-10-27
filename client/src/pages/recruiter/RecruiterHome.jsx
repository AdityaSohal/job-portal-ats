import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import api, { getError } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import { useAuth } from "../../store/auth";
import { useCompany } from "../../hooks/useCompany";
import Card from "../../components/Card";
import { Alert, Button, buttonClass } from "../../components/ui";
import { EmptyState, Select, Skeleton } from "../../components/bits";
import { FunnelBars, JobStatusBadge, Stat } from "../../components/recruiter/bits";
import TimelineChart from "../../components/recruiter/TimelineChart";

export default function RecruiterHome() {
  const user = useAuth((s) => s.user);
  const company = useCompany();
  const [days, setDays] = useState(30);

  const overview = useQuery({
    queryKey: ["r", "overview", days],
    queryFn: async () => (await api.get("/analytics/recruiter/overview", { params: { days } })).data,
  });
  const requests = useQuery({
    queryKey: ["r", "interviews", "attention-home"],
    queryFn: async () => (await api.get("/interviews", { params: { status: "reschedule_requested", limit: 5 } })).data.items,
  });

  const approved = company.data?.status === "approved";
  const o = overview.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight">Hello, {user.name.split(" ")[0]}</h1>
        <div className="flex items-center gap-3">
          <Select aria-label="Time range" value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-auto">
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </Select>
          {approved ? (
            <Link to="/recruiter/jobs/new" className={buttonClass("primary")}>
              <Plus size={18} aria-hidden="true" />
              Post a job
            </Link>
          ) : (
            <Button disabled title="Your company must be approved first">
              <Plus size={18} aria-hidden="true" />
              Post a job
            </Button>
          )}
        </div>
      </div>

      {overview.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : overview.isError ? (
        <div className="space-y-3">
          <Alert>{getError(overview.error).message}</Alert>
          <Button variant="secondary" onClick={() => overview.refetch()}>
            Try again
          </Button>
        </div>
      ) : o.jobs.total === 0 ? (
        <EmptyState
          title="You haven't posted a job yet"
          text={approved ? "Post your first job and an admin will review it before it goes live." : "Once your company is approved, you can post jobs from here."}
          action={
            approved ? (
              <Link to="/recruiter/jobs/new" className={buttonClass("primary")}>
                Post a job
              </Link>
            ) : (
              <Link to="/recruiter/company" className={buttonClass("secondary")}>
                View company details
              </Link>
            )
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Stat label="Live jobs" value={o.jobs.byStatus.active} />
            <Stat label="Pending review" value={o.jobs.byStatus.pending} />
            <Stat label="Applications" value={o.applications.total} />
            <Stat label={`New in ${days} days`} value={o.applications.inRange} />
            <Stat label="Hired" value={o.applications.currentStages.hired} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Hiring funnel">
              {o.applications.total === 0 ? <p className="text-sm text-ink/70">No applications yet.</p> : <FunnelBars funnel={o.applications.funnel} />}
              <p className="mt-4 text-xs text-ink/55">Counts everyone who ever reached each stage, even if they were rejected later.</p>
            </Card>

            <Card title={`Applications per day (last ${days} days)`}>
              <TimelineChart data={o.timeline} />
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Top jobs">
              {o.topJobs.length === 0 ? (
                <p className="text-sm text-ink/70">Jobs with applications appear here.</p>
              ) : (
                <ul className="space-y-3">
                  {o.topJobs.map((j) => (
                    <li key={j.jobId}>
                      <Link
                        to={`/recruiter/jobs/${j.jobId}/applicants`}
                        className="flex items-center justify-between gap-3 rounded-xl border-2 border-ink p-3 hover:bg-accent-soft"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-bold">{j.title || "Deleted job"}</span>
                          <span className="text-xs text-ink/60">
                            {j.applications} {j.applications === 1 ? "applicant" : "applicants"} ·{" "}
                            {j.avgMatchScore == null ? "no match score" : `avg. match ${j.avgMatchScore}%`}
                          </span>
                        </span>
                        {j.status && <JobStatusBadge status={j.status} />}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card
              title="Reschedule requests"
              action={
                <Link to="/recruiter/interviews" className="text-sm font-bold underline underline-offset-4">
                  All interviews
                </Link>
              }
            >
              {requests.isPending ? (
                <Skeleton className="h-24" />
              ) : requests.isError ? (
                <Alert>{getError(requests.error).message}</Alert>
              ) : requests.data.length === 0 ? (
                <p className="text-sm text-ink/70">No candidate is waiting for a new interview time.</p>
              ) : (
                <ul className="space-y-3">
                  {requests.data.map((iv) => (
                    <li key={iv.id}>
                      <Link
                        to={`/recruiter/jobs/${iv.jobId}/applicants?application=${iv.applicationId}`}
                        className="block rounded-xl border-2 border-ink p-3 hover:bg-accent-soft"
                      >
                        <span className="block font-bold">{iv.candidate?.name || "Candidate"}</span>
                        <span className="block text-xs text-ink/60">
                          {iv.job?.title} · {formatDateTime(iv.scheduledAt)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}