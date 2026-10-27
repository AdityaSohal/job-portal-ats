import { Badge } from "../bits";
import { JOB_STATUS_LABEL, JOB_STATUS_TONE, RSTAGE_LABEL, RSTAGE_TONE } from "../../lib/recruiter";

export function RStageBadge({ stage }) {
  return <Badge tone={RSTAGE_TONE[stage] || "plain"}>{RSTAGE_LABEL[stage] || stage}</Badge>;
}

export function JobStatusBadge({ status }) {
  return <Badge tone={JOB_STATUS_TONE[status] || "plain"}>{JOB_STATUS_LABEL[status] || status}</Badge>;
}

// score is null when the job lists no skills: "not applicable"
export function MatchBar({ score }) {
  if (score == null) return <span className="text-xs font-semibold text-ink/50">n/a</span>;
  return (
    <div className="flex items-center gap-2" title={`${score}% of the required skills`}>
      <div className="h-2.5 w-16 overflow-hidden rounded-full border-2 border-ink bg-white">
        <div className="h-full bg-accent" style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-extrabold tabular-nums">{score}%</span>
    </div>
  );
}

export function Avatar({ name = "?", size = 40 }) {
  return (
    <span
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-full border-2 border-ink bg-accent-soft font-extrabold"
      aria-hidden="true"
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

export function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border-2 border-ink bg-white p-4 shadow-block-sm">
      <p className="text-3xl font-extrabold tabular-nums">{value}</p>
      <p className="text-sm font-semibold text-ink/65">{label}</p>
    </div>
  );
}

const FUNNEL_LABEL = { applied: "Applied", shortlisted: "Shortlisted", interview: "Interview", offered: "Offered" };

// How many applicants ever reached each stage, drawn as flat bars
export function FunnelBars({ funnel }) {
  const max = Math.max(...funnel.map((f) => f.count), 1);
  return (
    <ol className="space-y-3">
      {funnel.map((f) => (
        <li key={f.stage}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="font-bold">{FUNNEL_LABEL[f.stage] || f.stage}</span>
            <span>
              <strong className="tabular-nums">{f.count}</strong>
              {f.fromPrevious != null && <span className="text-ink/60"> · {f.fromPrevious}% of previous stage</span>}
            </span>
          </div>
          <div className="h-6 overflow-hidden rounded-lg border-2 border-ink bg-white">
            <div className="h-full bg-accent" style={{ width: `${(f.count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}