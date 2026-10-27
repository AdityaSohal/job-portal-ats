import { Check } from "lucide-react";
import { STAGE_LABEL, formatDate } from "../lib/format";
import { cx } from "./ui";

const PATH = ["applied", "shortlisted", "interview", "offered", "hired"];
const ENDED = {
  rejected: "This application was not selected.",
  withdrawn: "You withdrew this application.",
  declined: "You declined the offer.",
};

export default function StageTracker({ stage, history = [] }) {
  const reachedAt = new Map(history.map((h) => [h.to, h.at]));

  return (
    <div>
      <ol className="grid grid-cols-5">
        {PATH.map((step, i) => {
          const done = reachedAt.has(step);
          const current = stage === step;
          return (
            <li key={step} className="flex flex-col items-center text-center">
              <div className="relative flex w-full items-center justify-center">
                {i > 0 && (
                  <span aria-hidden="true" className={cx("absolute right-1/2 top-1/2 h-0.5 w-full -translate-y-1/2", done ? "bg-ink" : "bg-line")} />
                )}
                <span
                  className={cx(
                    "relative z-10 flex size-8 items-center justify-center rounded-full border-2 border-ink text-xs font-bold",
                    current ? "bg-accent text-white" : done ? "bg-ink text-paper" : "bg-white text-ink/40"
                  )}
                >
                  {done && !current ? <Check size={16} aria-hidden="true" /> : i + 1}
                </span>
              </div>
              <span className={cx("mt-2 text-[11px] font-semibold leading-tight sm:text-xs", done ? "text-ink" : "text-ink/50")}>
                {STAGE_LABEL[step]}
              </span>
              {done && <span className="hidden text-[11px] text-ink/50 sm:block">{formatDate(reachedAt.get(step))}</span>}
            </li>
          );
        })}
      </ol>
      {ENDED[stage] && <p className="mt-4 rounded-xl border-2 border-ink bg-danger-soft px-3 py-2 text-sm font-semibold">{ENDED[stage]}</p>}
    </div>
  );
}