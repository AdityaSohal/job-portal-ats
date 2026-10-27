import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api, { getError } from "../../lib/api";
import { RSTAGE_LABEL } from "../../lib/recruiter";
import Card from "../../components/Card";
import { Alert, Button, cx } from "../../components/ui";
import { Select, Skeleton } from "../../components/bits";
import { FunnelBars, Stat } from "../../components/recruiter/bits";
import { RankBars } from "../../components/admin/bits";
import TrendChart from "../../components/admin/TrendChart";

const TRENDS = [
  ["applications", "Applications"],
  ["signups", "Sign-ups"],
  ["jobsPosted", "Jobs posted"],
];

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export default function AdminHome() {
  const [days, setDays] = useState(30);
  const [trend, setTrend] = useState("applications");

  const { data: o, isPending, isError, error, refetch } = useQuery({
    queryKey: ["a", "overview", days],
    queryFn: async () => (await api.get("/admin/analytics/overview", { params: { days } })).data,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight">Platform overview</h1>
        <Select aria-label="Time range" value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-auto">
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </Select>
      </div>

      {isPending ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      ) : isError ? (
        <div className="space-y-3">
          <Alert>{getError(error).message}</Alert>
          <Button variant="secondary" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <>
          {o.queues.pendingCompanies > 0 && (
            <Alert tone="info">
              {plural(o.queues.pendingCompanies, "company is", "companies are")} waiting for review.{" "}
              <Link to="/admin/companies" className="font-extrabold underline underline-offset-4">
                Review companies
              </Link>
            </Alert>
          )}
          {o.queues.pendingJobs > 0 && (
            <Alert tone="info">
              {plural(o.queues.pendingJobs, "job is", "jobs are")} waiting for review.{" "}
              <Link to="/admin/jobs" className="font-extrabold underline underline-offset-4">
                Review jobs
              </Link>
            </Alert>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Users" value={o.users.total} />
            <Stat label="Candidates" value={o.users.byRole.candidate} />
            <Stat label="Recruiters" value={o.users.byRole.recruiter} />
            <Stat label="Live jobs" value={o.jobs.liveNow} />
            <Stat label="Applications" value={o.applications.total} />
            <Stat label={`New in ${days} days`} value={o.applications.inRange} />
            <Stat label="Hired" value={o.applications.currentStages.hired} />
            <Stat label="Blocked users" value={o.users.blocked} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Hiring funnel">
              {o.applications.total === 0 ? <p className="text-sm text-ink/70">No applications yet.</p> : <FunnelBars funnel={o.applications.funnel} />}
              <p className="mt-4 text-xs text-ink/55">Counts everyone who ever reached each stage, across all jobs.</p>
            </Card>

            <Card title="Trends">
              <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Choose a trend">
                {TRENDS.map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={trend === key}
                    onClick={() => setTrend(key)}
                    className={cx(
                      "rounded-full border-2 border-ink px-3 py-1 text-sm font-semibold transition-colors",
                      trend === key ? "bg-ink text-paper" : "bg-white hover:bg-accent-soft"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <TrendChart data={o.timelines[trend]} name={TRENDS.find(([k]) => k === trend)[1]} />
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Skills in demand">
              <RankBars items={o.skills.inDemand.map((s) => ({ label: s.skill, value: s.count }))} empty="No live jobs list skills yet." />
              <p className="mt-4 text-xs text-ink/55">How many live jobs ask for each skill.</p>
            </Card>
            <Card title="Skills candidates have">
              <RankBars items={o.skills.available.map((s) => ({ label: s.skill, value: s.count }))} empty="No candidate has added skills yet." />
              <p className="mt-4 text-xs text-ink/55">How many candidate profiles list each skill.</p>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Top companies by applications">
              <RankBars
                items={o.topCompanies.map((c) => ({ key: c.companyId, label: c.name || "Deleted company", value: c.applications }))}
                empty="No applications yet."
              />
            </Card>
            <Card title="Where applications are now">
              <RankBars
                items={Object.entries(o.applications.currentStages).map(([stage, value]) => ({ key: stage, label: RSTAGE_LABEL[stage] || stage, value }))}
              />
            </Card>
          </div>
        </>
      )}
    </div>
  );
}