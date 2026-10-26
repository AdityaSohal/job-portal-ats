import { Link, useLocation } from "react-router-dom";
import { Clock, GraduationCap, IndianRupee, MapPin } from "lucide-react";
import { cap, deadlineInfo, formatCtc, formatExp, timeAgo } from "../lib/format";
import CompanyLogo from "./CompanyLogo";
import SaveButton from "./SaveButton";
import { Badge } from "./bits";

export default function JobCard({ job }) {
  const location = useLocation();
  const ctc = formatCtc(job.ctcRange);
  const deadline = deadlineInfo(job.deadline);
  const shown = job.skills.slice(0, 4);
  const extra = job.skills.length - shown.length;

  return (
    <article className="relative rounded-2xl border-2 border-ink bg-white p-5 shadow-block-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-block">
      <div className="flex gap-4">
        <CompanyLogo company={job.company} />

        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold leading-snug">
            {/* The ::after layer stretches this link over the whole card; the save button sits above it */}
            <Link to={`/jobs/${job._id}`} state={{ search: location.search }} className="after:absolute after:inset-0 after:rounded-2xl hover:underline">
              {job.title}
            </Link>
          </h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-ink/70">
            <span className="font-semibold text-ink">{job.company?.name}</span>
            <span className="inline-flex items-center gap-1">
              <MapPin size={14} aria-hidden="true" />
              {job.location}
            </span>
          </p>
        </div>

        <SaveButton jobId={job._id} className="relative z-10 shrink-0" />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge tone="accent">{cap(job.workMode)}</Badge>
        <Badge>{cap(job.employmentType)}</Badge>
        <span className="inline-flex items-center gap-1 text-sm font-medium">
          <GraduationCap size={15} aria-hidden="true" />
          {formatExp(job.minExp, job.maxExp)}
        </span>
        {ctc && (
          <span className="inline-flex items-center gap-1 text-sm font-medium">
            <IndianRupee size={15} aria-hidden="true" />
            {ctc.replace("₹", "")}
          </span>
        )}
      </div>

      {job.skills.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Skills">
          {shown.map((s) => (
            <li key={s} className="rounded-md border border-ink/30 bg-paper px-2 py-0.5 text-xs font-medium">
              {s}
            </li>
          ))}
          {extra > 0 && <li className="px-1 py-0.5 text-xs font-semibold text-ink/60">+{extra} more</li>}
        </ul>
      )}

      <p className="mt-4 flex items-center gap-3 text-xs text-ink/60">
        <span className="inline-flex items-center gap-1">
          <Clock size={13} aria-hidden="true" />
          Posted {timeAgo(job.createdAt)}
        </span>
        {deadline && <span className={deadline.urgent ? "font-bold text-danger" : ""}>{deadline.label}</span>}
      </p>
    </article>
  );
}