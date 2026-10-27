import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import toast from "react-hot-toast";
import api, { getError } from "../../lib/api";
import { cap, deadlineInfo, formatCtc, formatExp } from "../../lib/format";
import CompanyLogo from "../../components/CompanyLogo";
import { Alert, Button, buttonClass, cx } from "../../components/ui";
import { Badge, EmptyState, Pagination, Skeleton } from "../../components/bits";

const REASON = { closed: "Closed", expired: "Expired", unavailable: "No longer available" };

export default function SavedJobs() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isPending, isError, error, isFetching, refetch } = useQuery({
    queryKey: ["saved-jobs", "list", page],
    queryFn: async () => (await api.get("/saved-jobs", { params: { page, limit: 10 } })).data,
    placeholderData: keepPreviousData,
    staleTime: 0, // always fresh when you open the page
  });

  // Removing the last job on a later page: step back one page
  useEffect(() => {
    if (data && data.items.length === 0 && page > 1) setPage(page - 1);
  }, [data, page]);

  const remove = useMutation({
    mutationFn: async (jobId) => (await api.delete(`/saved-jobs/${jobId}`)).data,
    onSuccess: () => toast.success("Removed from saved jobs"),
    onError: (err) => {
      const info = getError(err);
      if (info.status !== 404) toast.error(info.message); // already gone is fine
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["saved-jobs"] });
      qc.invalidateQueries({ queryKey: ["saved-ids"] });
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Saved jobs</h1>

      {isPending ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24" />
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
          title="No saved jobs"
          text="Tap the heart on a job to keep it here for later."
          action={
            <Link to="/jobs" className={buttonClass("primary")}>
              Browse jobs
            </Link>
          }
        />
      ) : (
        <>
          <p className="text-sm font-semibold text-ink/70">
            {data.total} saved {data.total === 1 ? "job" : "jobs"}
          </p>
          <div className={cx("space-y-3 transition-opacity", isFetching && "opacity-60")}>
            {data.items.map(({ job, available, unavailableReason }) => {
              const ctc = formatCtc(job.ctcRange);
              const deadline = deadlineInfo(job.deadline);
              return (
                <article key={job.id} className={cx("flex items-center gap-4 rounded-2xl border-2 border-ink bg-white p-4", !available && "opacity-80")}>
                  <CompanyLogo company={job.company} size={44} />
                  <div className="min-w-0 flex-1">
                    {available ? (
                      <Link to={`/jobs/${job.id}`} className="block truncate font-bold hover:underline">
                        {job.title}
                      </Link>
                    ) : (
                      <p className="truncate font-bold">{job.title}</p>
                    )}
                    <p className="truncate text-sm text-ink/70">{[job.company?.name, job.location].filter(Boolean).join(" · ")}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      {available ? (
                        <>
                          <Badge tone="accent">{cap(job.workMode)}</Badge>
                          <span className="text-xs font-medium">{formatExp(job.minExp)}</span>
                          {ctc && <span className="text-xs font-medium">{ctc}</span>}
                          {deadline?.urgent && <span className="text-xs font-bold text-danger">{deadline.label}</span>}
                        </>
                      ) : (
                        <Badge tone="danger">{REASON[unavailableReason] || "No longer available"}</Badge>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove.mutate(job.id)}
                    disabled={remove.isPending && remove.variables === job.id}
                    aria-label={`Remove ${job.title} from saved jobs`}
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-accent-soft transition-colors hover:bg-white disabled:opacity-50"
                  >
                    <Heart size={18} className="fill-ink" aria-hidden="true" />
                  </button>
                </article>
              );
            })}
          </div>
          <Pagination page={data.page} pages={data.pages} onChange={setPage} />
        </>
      )}
    </div>
  );
}