import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronDown, Download, Search } from "lucide-react";
import toast from "react-hot-toast";
import api, { getError } from "../../lib/api";
import { timeAgo } from "../../lib/format";
import { RSTAGE_LABEL, getBlobError } from "../../lib/recruiter";
import Card from "../../components/Card";
import Drawer from "../../components/Drawer";
import { ChipInput } from "../../components/formBits";
import { Alert, Button, Field, Input, buttonClass, cx } from "../../components/ui";
import { EmptyState, Pagination, Select, Skeleton } from "../../components/bits";
import { Avatar, FunnelBars, MatchBar, RStageBadge } from "../../components/recruiter/bits";
import ApplicantPanel from "../../components/recruiter/ApplicantPanel";

const STAGES = ["applied", "shortlisted", "interview", "offered", "hired", "rejected", "withdrawn", "declined"];
const PAGE_SIZE = 10;

// ---- the URL holds the filters (and the open applicant), so links and the back button work ----
const num = (v, max) => (v !== null && v !== "" && Number.isFinite(Number(v)) && Number(v) >= 0 ? String(Math.min(Number(v), max)) : "");

const readParams = (sp) => {
  const q = (sp.get("q") || "").trim();
  const application = sp.get("application") || "";
  return {
    stage: STAGES.includes(sp.get("stage")) ? sp.get("stage") : "",
    q: q.length >= 2 ? q.slice(0, 100) : "",
    skills: (sp.get("skills") || "")
      .split(",")
      .map((s) => s.trim().toLowerCase().slice(0, 40))
      .filter(Boolean)
      .slice(0, 10),
    exp: num(sp.get("exp"), 60),
    minMatch: num(sp.get("minMatch"), 100) === "" ? "" : String(Math.round(Number(num(sp.get("minMatch"), 100)))),
    sort: sp.get("sort") === "latest" ? "latest" : "match",
    page: Math.min(Math.max(parseInt(sp.get("page"), 10) || 1, 1), 100),
    application: /^[a-f0-9]{24}$/i.test(application) ? application : "",
  };
};

const filterParams = (p) => {
  const out = {};
  if (p.stage) out.stage = p.stage;
  if (p.q) out.q = p.q;
  if (p.skills.length) out.skills = p.skills.join(",");
  if (p.exp !== "") out.exp = p.exp;
  if (p.minMatch !== "") out.minMatch = p.minMatch;
  return out;
};

const buildParams = (p) => {
  const out = filterParams(p);
  if (p.sort !== "match") out.sort = p.sort;
  if (p.page > 1) out.page = String(p.page);
  if (p.application) out.application = p.application;
  return out;
};

const draftOf = (p) => ({ q: p.q, skills: p.skills, exp: p.exp, minMatch: p.minMatch, sort: p.sort });

function FunnelCard({ jobId }) {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["r", "funnel", jobId],
    queryFn: async () => (await api.get(`/analytics/recruiter/jobs/${jobId}/funnel`, { params: { days: 30 } })).data,
  });

  return (
    <Card title="Hiring funnel for this job">
      {isPending ? (
        <Skeleton className="h-32" />
      ) : isError ? (
        <Alert>{getError(error).message}</Alert>
      ) : data.applications.total === 0 ? (
        <p className="text-sm text-ink/70">No applications yet.</p>
      ) : (
        <FunnelBars funnel={data.applications.funnel} />
      )}
    </Card>
  );
}

export default function Applicants() {
  const { id } = useParams();
  const [sp, setSp] = useSearchParams();
  const key = sp.toString();
  const applied = useMemo(() => readParams(new URLSearchParams(key)), [key]);

  // The form edits a draft; the URL changes only when the person applies the filters
  const [draft, setDraft] = useState(draftOf(applied));
  const [showFunnel, setShowFunnel] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Reset the draft only when the filters change, not when an applicant is opened
  const filterKey = JSON.stringify([applied.q, applied.skills, applied.exp, applied.minMatch, applied.sort]);
  useEffect(() => {
    setDraft(draftOf(applied));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  const write = (next) => setSp(buildParams(next));
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  const apply = (e) => {
    e?.preventDefault();
    const q = draft.q.trim();
    if (q.length === 1) {
      toast.error("Search needs at least 2 characters");
      return;
    }
    write({ ...applied, q, skills: draft.skills, exp: num(draft.exp, 60), minMatch: num(draft.minMatch, 100), sort: draft.sort, page: 1 });
  };

  const clearFilters = () => write({ ...applied, stage: "", q: "", skills: [], exp: "", minMatch: "", sort: "match", page: 1 });

  const { data, isPending, isError, error, isFetching, refetch } = useQuery({
    queryKey: ["r", "applicants", id, buildParams({ ...applied, application: "" })],
    queryFn: async () =>
      (await api.get(`/jobs/${id}/applicants`, { params: { ...filterParams(applied), sort: applied.sort, page: applied.page, limit: PAGE_SIZE } })).data,
    placeholderData: keepPreviousData,
  });

  const exportCsv = async () => {
    setExporting(true);
    try {
      const res = await api.get(`/jobs/${id}/applicants/export`, { params: filterParams(applied), responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `applicants-${id}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      toast.error(await getBlobError(err));
    } finally {
      setExporting(false);
    }
  };

  const filtered = Boolean(applied.q || applied.skills.length || applied.exp !== "" || applied.minMatch !== "" || applied.stage);

  if (isError && [400, 404].includes(getError(error).status)) {
    return (
      <EmptyState
        title="Job not found"
        text="It may not exist, or it belongs to another account."
        action={
          <Link to="/recruiter/jobs" className={buttonClass("primary")}>
            Back to jobs
          </Link>
        }
      />
    );
  }

  const stageCounts = data?.stageCounts || {};
  const totalAll = Object.values(stageCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <Link to="/recruiter/jobs" className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline">
        <ArrowLeft size={16} aria-hidden="true" />
        All jobs
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{data?.job?.title || "Applicants"}</h1>
          <p className="mt-1 text-sm text-ink/70">{data ? `${totalAll} ${totalAll === 1 ? "applicant" : "applicants"} in total` : "Loading…"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowFunnel((s) => !s)} aria-expanded={showFunnel}>
            <ChevronDown size={16} className={cx("transition-transform", showFunnel && "rotate-180")} aria-hidden="true" />
            Funnel
          </Button>
          <Button variant="secondary" size="sm" onClick={exportCsv} loading={exporting} disabled={!data || data.total === 0}>
            <Download size={16} aria-hidden="true" />
            Export CSV
          </Button>
        </div>
      </div>

      {showFunnel && <FunnelCard jobId={id} />}

      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter by stage">
        {["", ...STAGES].map((s) => {
          const count = s ? stageCounts[s] || 0 : totalAll;
          return (
            <button
              key={s || "all"}
              type="button"
              aria-pressed={applied.stage === s}
              onClick={() => write({ ...applied, stage: s, page: 1 })}
              className={cx(
                "shrink-0 rounded-full border-2 border-ink px-3.5 py-1 text-sm font-semibold transition-colors",
                applied.stage === s ? "bg-ink text-paper" : "bg-white hover:bg-accent-soft"
              )}
            >
              {s ? RSTAGE_LABEL[s] : "All"} <span className="tabular-nums opacity-70">{data ? count : ""}</span>
            </button>
          );
        })}
      </div>

      <form onSubmit={apply} className="space-y-4 rounded-2xl border-2 border-ink bg-white p-5">
        <div className="grid gap-4 md:grid-cols-[1fr_130px_130px_150px]">
          <Field label="Name or email" htmlFor="ap-q">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/50" aria-hidden="true" />
              <Input id="ap-q" className="pl-10" placeholder="Search applicants" value={draft.q} onChange={(e) => set({ q: e.target.value })} />
            </div>
          </Field>
          <Field label="Min. experience" htmlFor="ap-exp">
            <Input id="ap-exp" type="number" min="0" max="60" step="0.5" placeholder="years" value={draft.exp} onChange={(e) => set({ exp: e.target.value })} />
          </Field>
          <Field label="Min. match %" htmlFor="ap-match">
            <Input id="ap-match" type="number" min="0" max="100" step="5" placeholder="0–100" value={draft.minMatch} onChange={(e) => set({ minMatch: e.target.value })} />
          </Field>
          <Field label="Sort by" htmlFor="ap-sort">
            <Select id="ap-sort" value={draft.sort} onChange={(e) => set({ sort: e.target.value })}>
              <option value="match">Best match</option>
              <option value="latest">Newest</option>
            </Select>
          </Field>
        </div>
        <ChipInput id="ap-skills" label="Has all of these skills" value={draft.skills} onChange={(skills) => set({ skills })} max={10} placeholder="node.js, mongodb" hint="Press Enter to add." />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm">
            Apply filters
          </Button>
          {filtered && (
            <Button size="sm" variant="ghost" onClick={clearFilters}>
              Clear all
            </Button>
          )}
        </div>
      </form>

      {isPending ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : isError ? (
        <div className="space-y-3">
          <Alert>{getError(error).message}</Alert>
          <Button variant="secondary" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : data.items.length === 0 ? (
        <EmptyState
          title={filtered ? "No applicants match" : "No applicants yet"}
          text={filtered ? "Try removing a filter." : "Applicants appear here as soon as candidates apply."}
          action={
            filtered && (
              <Button variant="secondary" onClick={clearFilters}>
                Clear all filters
              </Button>
            )
          }
        />
      ) : (
        <>
          <p className="text-sm font-semibold text-ink/70">
            {data.total} {data.total === 1 ? "applicant" : "applicants"}
            {filtered ? " match your filters" : ""}
          </p>
          <ul className={cx("space-y-3 transition-opacity", isFetching && "opacity-60")}>
            {data.items.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => write({ ...applied, application: a.id })}
                  className={cx(
                    "grid w-full items-center gap-3 rounded-2xl border-2 border-ink p-4 text-left shadow-block-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-block",
                    "md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]",
                    a.id === applied.application ? "bg-accent-soft" : "bg-white"
                  )}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <Avatar name={a.candidate.name} />
                    <span className="min-w-0">
                      <span className="block truncate font-bold">{a.candidate.name}</span>
                      <span className="block truncate text-sm text-ink/65">{a.candidate.headline || a.candidate.email}</span>
                    </span>
                  </span>
                  <span className="text-sm">
                    <span className="block font-semibold">{a.candidate.experienceYears ?? 0} yrs</span>
                    <span className="block truncate text-ink/60">{a.candidate.location || "No location"}</span>
                  </span>
                  <span>
                    <MatchBar score={a.matchScore} />
                  </span>
                  <span className="flex items-center justify-between gap-2 md:flex-col md:items-start">
                    <RStageBadge stage={a.stage} />
                    <span className="text-xs text-ink/55">Applied {timeAgo(a.appliedAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <Pagination
            page={data.page}
            pages={data.pages}
            onChange={(p) => {
              write({ ...applied, page: p });
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        </>
      )}

      {applied.application && (
        <Drawer title="Applicant" onClose={() => write({ ...applied, application: "" })}>
          <ApplicantPanel id={applied.application} />
        </Drawer>
      )}
    </div>
  );
}