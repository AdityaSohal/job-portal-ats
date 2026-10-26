import { forwardRef } from "react";
import { ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import { cx } from "./ui";

const FIELD =
  "w-full rounded-xl border-2 border-ink bg-white px-3.5 py-2.5 text-[15px] outline-none transition-shadow " +
  "placeholder:text-ink/35 focus:shadow-[3px_3px_0_0_var(--color-accent)] disabled:opacity-60";

export const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cx(FIELD, "min-h-28 resize-y", className)} {...props} />;
});

export const Select = forwardRef(function Select({ className, ...props }, ref) {
  return <select ref={ref} className={cx(FIELD, "pr-8", className)} {...props} />;
});

const TONES = { plain: "bg-white", accent: "bg-accent-soft", ink: "bg-ink text-paper", danger: "bg-danger-soft" };

export function Badge({ children, tone = "plain", className }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full border-2 border-ink px-2.5 py-0.5 text-xs font-bold", TONES[tone], className)}>
      {children}
    </span>
  );
}

export function Skeleton({ className }) {
  return <div aria-hidden="true" className={cx("animate-pulse rounded-lg bg-line/70", className)} />;
}

export function EmptyState({ title, text, action }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-ink/40 bg-white/60 px-6 py-12 text-center">
      <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl border-2 border-ink bg-accent-soft">
        <SearchX size={22} aria-hidden="true" />
      </span>
      <h3 className="text-lg font-bold">{title}</h3>
      {text && <p className="mx-auto mt-1 max-w-sm text-[15px] text-ink/70">{text}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

// First, last and the pages around the current one, with gaps shown as "…"
const pageItems = (current, total) => {
  const set = new Set([1, total, current - 1, current, current + 1].filter((p) => p >= 1 && p <= total));
  const sorted = [...set].sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i && p - sorted[i - 1] > 1) out.push(`gap-${p}`);
    out.push(p);
  });
  return out;
};

const pageBtn =
  "flex size-10 items-center justify-center rounded-xl border-2 border-ink bg-white text-sm font-bold transition-colors " +
  "hover:bg-accent-soft disabled:pointer-events-none disabled:opacity-40";

export function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-8 flex flex-wrap items-center justify-center gap-2">
      <button type="button" className={pageBtn} disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
        <ChevronLeft size={18} />
      </button>
      {pageItems(page, pages).map((item) =>
        typeof item === "string" ? (
          <span key={item} className="px-1 text-ink/50" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            aria-current={item === page ? "page" : undefined}
            className={cx(pageBtn, item === page && "bg-ink text-paper hover:bg-ink")}
          >
            {item}
          </button>
        )
      )}
      <button type="button" className={pageBtn} disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Next page">
        <ChevronRight size={18} />
      </button>
    </nav>
  );
}