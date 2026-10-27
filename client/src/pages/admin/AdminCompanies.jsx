import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import toast from "react-hot-toast";
import api, { getError } from "../../lib/api";
import { safeUrl, timeAgo } from "../../lib/format";
import CompanyLogo from "../../components/CompanyLogo";
import ConfirmDialog from "../../components/ConfirmDialog";
import ReasonModal from "../../components/admin/ReasonModal";
import { CompanyStatusBadge } from "../../components/admin/bits";
import { Alert, Button, cx } from "../../components/ui";
import { EmptyState, Pagination, Skeleton } from "../../components/bits";

const TABS = [
  ["pending", "Pending"],
  ["approved", "Approved"],
  ["rejected", "Rejected"],
  ["all", "All"],
];
const STATUSES = TABS.map(([v]) => v);
const PAGE_SIZE = 10;

const jobsText = (n, verb) => (n ? `. ${n} ${n === 1 ? "job" : "jobs"} ${verb}` : "");

export default function AdminCompanies() {
  const qc = useQueryClient();
  const [sp, setSp] = useSearchParams();
  const [dialog, setDialog] = useState(null); // { type: "approve" | "reject", company }

  const status = STATUSES.includes(sp.get("status")) ? sp.get("status") : "pending";
  const page = Math.min(Math.max(parseInt(sp.get("page"), 10) || 1, 1), 1000);

  const update = (next) => {
    const params = {};
    if (next.status !== "pending") params.status = next.status;
    if (next.page > 1) params.page = String(next.page);
    setSp(params);
  };

  const { data, isPending, isError, error, isFetching, refetch } = useQuery({
    queryKey: ["a", "companies", { status, page }],
    queryFn: async () => (await api.get("/admin/companies", { params: { status, page, limit: PAGE_SIZE } })).data,
    placeholderData: keepPreviousData,
    staleTime: 0,
  });

  // Reviewing the last item on a later page: step back one page
  useEffect(() => {
    if (data && data.items.length === 0 && page > 1) update({ status, page: page - 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, page]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["a"] });

  const approve = useMutation({
    mutationFn: async (id) => (await api.patch(`/admin/companies/${id}/approve`)).data,
    onSuccess: (res) => {
      toast.success(`${res.company.name} approved${jobsText(res.restoredJobs, "live again")}`);
      setDialog(null);
    },
    onError: (err) => {
      toast.error(getError(err).message);
      setDialog(null);
    },
    onSettled: refresh,
  });

  const reject = useMutation({
    mutationFn: async ({ id, reason }) => (await api.patch(`/admin/companies/${id}/reject`, { reason })).data,
    onSettled: refresh,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Companies</h1>
        <p className="mt-1 text-sm text-ink/70">Recruiters can post jobs only after their company is approved.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter by status">
        {TABS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={status === value}
            onClick={() => update({ status: value, page: 1 })}
            className={cx(
              "shrink-0 rounded-full border-2 border-ink px-3.5 py-1 text-sm font-semibold transition-colors",
              status === value ? "bg-ink text-paper" : "bg-white hover:bg-accent-soft"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {isPending ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-44" />
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
          title={status === "pending" ? "No companies are waiting" : "Nothing here"}
          text={status === "pending" ? "New recruiter companies appear here for review." : "No companies have this status."}
        />
      ) : (
        <>
          <p className="text-sm font-semibold text-ink/70">
            {data.total} {data.total === 1 ? "company" : "companies"}
          </p>
          <div className={cx("space-y-4 transition-opacity", isFetching && "opacity-60")}>
            {data.items.map((c) => {
              const owner = c.createdBy;
              const site = safeUrl(c.website);
              return (
                <article key={c._id} className="rounded-2xl border-2 border-ink bg-white p-5 shadow-block-sm">
                  <div className="flex flex-wrap items-start gap-4">
                    <CompanyLogo company={c} size={52} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-bold leading-snug">{c.name}</h2>
                        <CompanyStatusBadge status={c.status} />
                      </div>
                      <p className="mt-0.5 text-sm text-ink/70">
                        {[c.industry, c.size && `${c.size} people`, c.location].filter(Boolean).join(" · ") || "No details provided"}
                      </p>
                      {site && (
                        <a href={site} target="_blank" rel="noopener noreferrer nofollow" className="mt-1 inline-flex items-center gap-1 break-all text-sm font-bold underline underline-offset-4">
                          {site.replace(/^https?:\/\//i, "")}
                          <ExternalLink size={13} aria-hidden="true" />
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-ink/55">Submitted {timeAgo(c.createdAt)}</p>
                  </div>

                  {c.description && <p className="mt-3 whitespace-pre-line break-words text-[15px]">{c.description}</p>}

                  <p className="mt-3 rounded-xl bg-paper p-3 text-sm">
                    <span className="text-xs font-bold uppercase tracking-wide text-ink/55">Registered by </span>
                    {owner ? (
                      <>
                        <span className="font-semibold">{owner.name}</span> ·{" "}
                        <a href={`mailto:${owner.email}`} className="break-all underline underline-offset-4">
                          {owner.email}
                        </a>{" "}
                        · account created {timeAgo(owner.createdAt)}
                      </>
                    ) : (
                      "an account that no longer exists"
                    )}
                  </p>

                  {c.status === "rejected" && (
                    <p className="mt-3 rounded-xl border-2 border-ink bg-danger-soft p-3 text-sm">
                      <span className="block text-xs font-bold uppercase tracking-wide text-ink/60">Rejection reason</span>
                      {c.rejectionReason || "No reason was given."}
                    </p>
                  )}
                  {c.status !== "pending" && c.reviewedAt && <p className="mt-2 text-xs text-ink/55">Reviewed {timeAgo(c.reviewedAt)}</p>}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {c.status !== "approved" && (
                      <Button size="sm" onClick={() => setDialog({ type: "approve", company: c })}>
                        Approve
                      </Button>
                    )}
                    {c.status !== "rejected" && (
                      <Button size="sm" variant="secondary" onClick={() => setDialog({ type: "reject", company: c })}>
                        {c.status === "approved" ? "Reject or revoke" : "Reject"}
                      </Button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          <Pagination
            page={data.page}
            pages={data.pages}
            onChange={(p) => {
              update({ status, page: p });
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        </>
      )}

      {dialog?.type === "approve" && (
        <ConfirmDialog
          title={`Approve ${dialog.company.name}?`}
          text="The recruiter is emailed and can post jobs. Any jobs that were hidden while the company was under review go live again."
          confirmLabel="Approve"
          loading={approve.isPending}
          onConfirm={() => approve.mutate(dialog.company._id)}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog?.type === "reject" && (
        <ReasonModal
          title={dialog.company.status === "approved" ? `Revoke ${dialog.company.name}?` : `Reject ${dialog.company.name}?`}
          text={
            dialog.company.status === "approved"
              ? "This hides all of the company's live jobs until you approve it again. The recruiter is emailed your reason."
              : "The recruiter is emailed your reason and can edit the company to resubmit it."
          }
          label="Reason the recruiter will see"
          hint="At least 5 characters."
          confirmLabel={dialog.company.status === "approved" ? "Revoke approval" : "Reject company"}
          onSubmit={async (reason) => {
            const res = await reject.mutateAsync({ id: dialog.company._id, reason });
            toast.success(`${res.company.name} rejected${jobsText(res.suspendedJobs, "hidden")}`);
            setDialog(null);
          }}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}