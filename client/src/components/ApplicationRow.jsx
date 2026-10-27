import { Link } from "react-router-dom";
import { timeAgo } from "../lib/format";
import CompanyLogo from "./CompanyLogo";
import StageBadge from "./StageBadge";

export default function ApplicationRow({ app }) {
  const job = app.job;
  return (
    <Link
      to={`/candidate/applications/${app.id}`}
      className="flex items-center gap-4 rounded-2xl border-2 border-ink bg-white p-4 shadow-block-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-block"
    >
      <CompanyLogo company={job?.company} size={44} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold">{job?.title || "Job no longer available"}</p>
        <p className="truncate text-sm text-ink/70">{[job?.company?.name, job?.location].filter(Boolean).join(" · ")}</p>
        <p className="mt-0.5 text-xs text-ink/55">Applied {timeAgo(app.createdAt)}</p>
      </div>
      <div className="shrink-0">
        <StageBadge stage={app.stage} />
      </div>
    </Link>
  );
}