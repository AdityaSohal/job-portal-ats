import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { MapPin, Search, SlidersHorizontal, X } from "lucide-react";
import toast from "react-hot-toast";
import api, { getError } from "../lib/api";
import { cap } from "../lib/format";
import JobCard from "../components/JobCard";
import { Alert, Button, Input, cx } from "../components/ui";
import { EmptyState, Pagination, Select, Skeleton } from "../components/bits";

const WORK_MODES = [["onsite", "Onsite"], ["hybrid", "Hybrid"], ["remote", "Remote"]];
const TYPES = [["full-time", "Full-time"], ["part-time", "Part-time"], ["internship", "Internship"], ["contract", "Contract"]];
const MODE_VALUES = WORK_MODES.map(([v]) => v);
const TYPE_VALUES = TYPES.map(([v]) => v);
const PAGE_SIZE = 10;

// ---- the URL is the source of truth: it is read defensively and written back tidily ----
const num = (v, max) => (v !== null && v !== "" && Number.isFinite(Number(v)) && Number(v) >= 0 ? String(Math.min(Number(v), max)) : "");
const csvList = (v, allowed) => (v || "").split(",").map((s) => s.trim()).filter((s) => allowed.includes(s));

const readParams = (sp) => {
  const q = (sp.get("q") || "").trim();
  return {
    q: q.length >= 2 ? q.slice(0, 100) : "",
    location: (sp.get("location") || "").trim().slice(0, 100),
    workMode: csvList(sp.get("workMode"), MODE_VALUES),
    employmentType: csvList(sp.get("employmentType"), TYPE_VALUES),
    exp: num(sp.get("exp"), 60),
    ctc: num(sp.get("ctc"), 1000),
    skills: (sp.get("skills") || "")
      .split(",")
      .map((s) => s.trim().toLowerCase().slice(0, 40))
      .filter(Boolean)
      .slice(0, 10),
    sort: sp.get("sort") === "deadline" ? "deadline" : "latest",
    page: Math.min(Math.max(parseInt(sp.get("page"), 10) || 1, 1), 100),
  };
};

const buildParams = (p) => {
  const out = {};
  if (p.q) out.q = p.q;
  if (p.location) out.location = p.location;
  if (p.workMode.length) out.workMode = p.workMode.join(",");
  if (p.employmentType.length) out.employmentType = p.employmentType.join(",");
  if (p.exp !== "") out.exp = p.exp;
  if (p.ctc !== "") out.ctc = p.ctc;
  if (p.skills.length) out.skills = p.skills.join(",");
  if (p.sort !== "latest") out.sort = p.sort;
  if (p.page > 1) out.page = String(p.page);
  return out;
};

// ---- small form pieces ----
function CheckGroup({ legend, options, value, onChange }) {
  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-bold">{legend}</legend>
      <div className="space-y-1.5">
        {options.map(([v, label]) => (
          <label key={v} className="flex cursor-pointer items-center gap-2.5 text-[15px]">
            <input type="checkbox" checked={value.includes(v)} onChange={() => toggle(v)} className="size-4 accent-ink" />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function SkillsInput({ value, onChange }) {
  const [text, setText] = useState("");

  const add = (raw) => {
    const items = raw.split(",").map((s) => s.trim().toLowerCase().slice(0, 40)).filter(Boolean);
    if (!items.length) return;
    onChange([...new Set([...value, ...items])].slice(0, 10));
    setText("");
  };

  return (
    <div>
      <label htmlFor="skills-input" className="mb-2 block text-sm font-bold">
        Skills
      </label>
      <Input
        id="skills-input"
        value={text}
        placeholder="react, node.js"
        onChange={(e) => setText(e.target.value)}
        onBlur={() => add(text)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add(text);
          } else if (e.key === "Backspace" && !text && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
      />
      <p className="mt-1.5 text-xs text-ink/60">Press Enter to add. Jobs matching any of them are shown.</p>
      {value.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {value.map((s) => (
            <li key={s} className="inline-flex items-center gap-1 rounded-md border-2 border-ink bg-accent-soft py-0.5 pl-2 pr-1 text-xs font-semibold">
              {s}
              <button type="button" onClick={() => onChange(value.filter((x) => x !== s))} aria-label={`Remove ${s}`} className="rounded p-0.5 hover:bg-white">
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl border-2 border-ink/30 bg-white p-5">
          <div className="flex gap-4">
            <Skeleton className="size-12" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </div>
          <Skeleton className="mt-4 h-5 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export default function Jobs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const key = searchParams.toString();
  const applied = useMemo(() => readParams(new URLSearchParams(key)), [key]);

  // The form edits a draft; the URL changes only when the person searches
  const [draft, setDraft] = useState(applied);
  const [filtersOpen, setFiltersOpen] = useState(false);
  useEffect(() => setDraft(applied), [applied]);

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  const commit = (next) => {
    const q = next.q.trim();
    if (q.length === 1) {
      toast.error("Search needs at least 2 characters");
      return;
    }
    setSearchParams(
      buildParams({
        ...next,
        q,
        location: next.location.trim(),
        exp: num(next.exp, 60),
        ctc: num(next.ctc, 1000),
        page: 1,
      })
    );
    setFiltersOpen(false);
  };

  const goToPage = (page) => {
    setSearchParams(buildParams({ ...applied, page }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const apiParams = { ...buildParams(applied), limit: PAGE_SIZE };
  const { data, isPending, isError, error, isFetching, refetch } = useQuery({
    queryKey: ["jobs", apiParams],
    queryFn: async () => (await api.get("/jobs", { params: apiParams })).data,
    placeholderData: keepPreviousData,
  });

  const clearAll = () => commit({ ...applied, q: "", location: "", workMode: [], employmentType: [], exp: "", ctc: "", skills: [], sort: "latest" });

  // Chips for what is currently applied, each removable
  const chips = [];
  if (applied.q) chips.push({ id: "q", label: `“${applied.q}”`, clear: { q: "" } });
  if (applied.location) chips.push({ id: "loc", label: applied.location, clear: { location: "" } });
  applied.workMode.forEach((v) => chips.push({ id: `m-${v}`, label: cap(v), clear: { workMode: applied.workMode.filter((x) => x !== v) } }));
  applied.employmentType.forEach((v) => chips.push({ id: `t-${v}`, label: cap(v), clear: { employmentType: applied.employmentType.filter((x) => x !== v) } }));
  if (applied.exp !== "") chips.push({ id: "exp", label: `${applied.exp} yrs experience`, clear: { exp: "" } });
  if (applied.ctc !== "") chips.push({ id: "ctc", label: `₹${applied.ctc}+ LPA`, clear: { ctc: "" } });
  applied.skills.forEach((s) => chips.push({ id: `s-${s}`, label: s, clear: { skills: applied.skills.filter((x) => x !== s) } }));

  const onSearch = (e) => {
    e.preventDefault();
    commit(draft);
  };

  return (
    <>
      <div className="grid-paper border-b-2 border-ink">
        <div className="mx-auto max-w-6xl px-5 py-8">
          <h1 className="text-3xl font-extrabold tracking-tight">Find your next role</h1>
          <form onSubmit={onSearch} className="mt-5 grid gap-3 sm:grid-cols-[1fr_240px_auto]">
            <div className="relative">
              <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/50" aria-hidden="true" />
              <Input className="pl-10" aria-label="Job title or keyword" placeholder="Job title or keyword" value={draft.q} onChange={(e) => set({ q: e.target.value })} />
            </div>
            <div className="relative">
              <MapPin size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/50" aria-hidden="true" />
              <Input className="pl-10" aria-label="Location" placeholder="Location" value={draft.location} onChange={(e) => set({ location: e.target.value })} />
            </div>
            <Button type="submit">Search</Button>
          </form>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 py-8">
        <Button variant="secondary" size="sm" className="mb-5 lg:hidden" onClick={() => setFiltersOpen((o) => !o)} aria-expanded={filtersOpen}>
          <SlidersHorizontal size={16} aria-hidden="true" />
          {filtersOpen ? "Hide filters" : "Filters"}
        </Button>

        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          <aside className={cx("lg:block", filtersOpen ? "block" : "hidden")} aria-label="Filters">
            <form onSubmit={onSearch} className="space-y-6 rounded-2xl border-2 border-ink bg-white p-5 shadow-block-sm lg:sticky lg:top-24">
              <CheckGroup legend="Work mode" options={WORK_MODES} value={draft.workMode} onChange={(workMode) => set({ workMode })} />
              <CheckGroup legend="Job type" options={TYPES} value={draft.employmentType} onChange={(employmentType) => set({ employmentType })} />

              <div>
                <label htmlFor="f-exp" className="mb-2 block text-sm font-bold">
                  Your experience (years)
                </label>
                <Input id="f-exp" type="number" min="0" max="60" step="0.5" inputMode="decimal" placeholder="e.g. 2" value={draft.exp} onChange={(e) => set({ exp: e.target.value })} />
                <p className="mt-1.5 text-xs text-ink/60">Shows jobs that ask for this much or less.</p>
              </div>

              <div>
                <label htmlFor="f-ctc" className="mb-2 block text-sm font-bold">
                  Minimum pay (LPA)
                </label>
                <Input id="f-ctc" type="number" min="0" max="1000" step="0.5" inputMode="decimal" placeholder="e.g. 8" value={draft.ctc} onChange={(e) => set({ ctc: e.target.value })} />
                <p className="mt-1.5 text-xs text-ink/60">Shows jobs that pay at least this.</p>
              </div>

              <SkillsInput value={draft.skills} onChange={(skills) => set({ skills })} />

              <div>
                <label htmlFor="f-sort" className="mb-2 block text-sm font-bold">
                  Sort by
                </label>
                <Select id="f-sort" value={draft.q.trim().length >= 2 ? "latest" : draft.sort} disabled={draft.q.trim().length >= 2} onChange={(e) => set({ sort: e.target.value })}>
                  <option value="latest">Newest</option>
                  <option value="deadline">Closing soon</option>
                </Select>
                {draft.q.trim().length >= 2 && <p className="mt-1.5 text-xs text-ink/60">Keyword searches are sorted by relevance.</p>}
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  Apply filters
                </Button>
                <Button variant="ghost" onClick={clearAll}>
                  Clear
                </Button>
              </div>
            </form>
          </aside>

          <section aria-live="polite">
            {chips.length > 0 && (
              <ul className="mb-4 flex flex-wrap gap-2">
                {chips.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => commit({ ...applied, ...c.clear })}
                      className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-white py-1 pl-3 pr-2 text-sm font-semibold hover:bg-accent-soft"
                    >
                      {c.label}
                      <X size={14} aria-label="Remove filter" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {isPending ? (
              <ResultsSkeleton />
            ) : isError ? (
              <div className="space-y-4">
                <Alert>{getError(error).message}</Alert>
                <Button variant="secondary" onClick={() => refetch()}>
                  Try again
                </Button>
              </div>
            ) : data.items.length === 0 ? (
              <EmptyState
                title="No jobs match"
                text="Try removing a filter or searching with fewer words."
                action={
                  chips.length > 0 && (
                    <Button variant="secondary" onClick={clearAll}>
                      Clear all filters
                    </Button>
                  )
                }
              />
            ) : (
              <>
                <p className="mb-4 text-sm font-semibold text-ink/70">
                  {data.total} {data.total === 1 ? "job" : "jobs"} found
                </p>
                <div className={cx("space-y-4 transition-opacity", isFetching && "opacity-60")}>
                  {data.items.map((job) => (
                    <JobCard key={job._id} job={job} />
                  ))}
                </div>
                <Pagination page={data.page} pages={data.pages} onChange={goToPage} />
              </>
            )}
          </section>
        </div>
      </div>
    </>
  );
}