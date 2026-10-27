import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Users } from "lucide-react";
import toast from "react-hot-toast";
import api, { getError } from "../../lib/api";
import { cap, deadlineInfo, timeAgo } from "../../lib/format";
import { JOB_STATUS_LABEL } from "../../lib/recruiter";
import { useCompany } from "../../hooks/useCompany";
import ConfirmDialog from "../../components/ConfirmDialog";
import { Alert, Button, buttonClass, cx } from "../../components/ui";
import { EmptyState, Pagination, Skeleton } from "../../components/bits";
import { JobStatusBadge } from "../../components/recruiter/bits";

const STATUSES = ["pending", "active", "rejected", "suspended", "closed", "expired"];
const PAGE_SIZE = 10;

const NOTE = {
  pending: "Waiting for an admin to review this job. It isn't visible to candidates yet.",
  suspended: "Hidden from candidates because your company is under review. It returns when the company is approved.",
  expired: "The deadline has passed, so this job is no longer open.",
};

export default function MyJobs() {
  const qc = useQueryClient();
  const company = useCompany();
  const [sp, setSp] = useSearchParams();
  const [dialog, setDialog] = useState(null); // { type: "close" | "delete", job }

  const status = STATUSES.includes(sp.get("status")) ? sp.get("status") : "";
  const page = Math.min(Math.max(parseInt(sp.get("page"), 10) || 1, 1), 100);

  const update = (next) => {
    const params = {};
    if (next.status) params.status = next.status;
    if (next.page > 1) params.page = String(next.page);
    setSp(params);
  };

  const { data, isPending, isError, error, isFetching, refetch } = useQuery({
    queryKey: ["r", "jobs", { status, page }],
    queryFn: async () => (await api.get("/jobs/mine", { params: { ...(status && { status }), page, limit: PAGE_SIZE } })).data,
    placeholderData: keepPreviousData,
  });

  const done = (message) => {
    toast.success(message);
    setDialog(null);
    qc.invalidateQueries({ queryKey: ["r"] });
  };
  const failed = (err) => {
    toast.error(getError(err).message);
    setDialog(null);
    qc.invalidateQueries({ queryKey: ["r"] });
  };

  const close = useMutation({
    mutationFn: async (id) => (await api.patch(`/jobs/${id}/close`)).data,
    onSuccess: () => done("Job closed"),
    onError: failed,
  });
  const remove = useMutation({
    mutationFn: async (id) => (await api.delete(`/jobs/${id}`)).data,
    onSuccess: () => done("Job deleted"),
    onError: failed,
  });

  const approved = company.data?.status === "approved";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight">Your jobs</h1>
        {approved ? (
          <Link to="/recruiter/jobs/new" className={buttonClass("primary")}>
            <Plus size={18} aria-hidden="true" />
            Post a job
          </Link>
        ) : (
          <Button disabled title="Your company must be approved first">
            <Plus size={18} aria-hidden="true" />
            Post a job
          </Button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter by status">
        {["", ...STATUSES].map((s) => (
          <button
            key={s || "all"}
            type="button"
            aria-pressed={status === s}
            onClick={() => update({ status: s, page: 1 })}
            className={cx(
              "shrink-0 rounded-full border-2 border-ink px-3.5 py-1 text-sm font-semibold transition-colors",
              status === s ? "bg-ink text-paper" : "bg-white hover:bg-accent-soft"
            )}
          >
            {s ? JOB_STATUS_LABEL[s] : "All"}
          </button>
        ))}
      </div>

      {isPending ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-36" />
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
          title={status ? "No jobs with this status" : "No jobs yet"}
          text={status ? "Try another status." : approved ? "Post your first job. An admin reviews it before it goes live." : "You can post jobs once your company is approved."}
          action={
            status ? (
              <Button variant="secondary" onClick={() => update({ status: "", page: 1 })}>
                Show all
              </Button>
            ) : (
              approved && (
                <Link to="/recruiter/jobs/new" className={buttonClass("primary")}>
                  Post a job
                </Link>
              )
            )
          }
        />
      ) : (
        <>
          <p className="text-sm font-semibold text-ink/70">
            {data.total} {data.total === 1 ? "job" : "jobs"}
          </p>
          <div className={cx("space-y-4 transition-opacity", isFetching && "opacity-60")}>
            {data.items.map((job) => {
              const deadline = deadlineInfo(job.deadline);
              const editable = ["pending", "active", "rejected"].includes(job.status);
              const closable = ["pending", "active", "suspended"].includes(job.status);
              return (
                <article key={job._id} className="rounded-2xl border-2 border-ink bg-white p-5 shadow-block-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-lg font-bold leading-snug">
                        <Link to={`/recruiter/jobs/${job._id}/applicants`} className="hover:underline">
                          {job.title}
                        </Link>
                      </h2>
                      <p className="mt-0.5 text-sm text-ink/70">
                        {job.location} · {cap(job.workMode)} · {cap(job.employmentType)}
                      </p>
                    </div>
                    <JobStatusBadge status={job.status} />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                    <Link to={`/recruiter/jobs/${job._id}/applicants`} className="inline-flex items-center gap-1.5 font-bold underline underline-offset-4">
                      <Users size={15} aria-hidden="true" />
                      {job.applicantCount} {job.applicantCount === 1 ? "applicant" : "applicants"}
                    </Link>
                    <span className="text-ink/70">
                      {job.hiredCount || 0}/{job.openings} {job.openings === 1 ? "opening" : "openings"} filled
                    </span>
                    <span className="text-ink/70">Posted {timeAgo(job.createdAt)}</span>
                    {deadline && <span className={deadline.urgent ? "font-bold text-danger" : "text-ink/70"}>{deadline.label}</span>}
                  </div>

                  {job.status === "rejected" && (
                    <p className="mt-3 rounded-xl border-2 border-ink bg-danger-soft p-3 text-sm">
                      <span className="block text-xs font-bold uppercase tracking-wide text-ink/60">Rejected by an admin</span>
                      {job.rejectionReason || "No reason was given."} Edit the job to resubmit it for review.
                    </p>
                  )}
                  {NOTE[job.status] && <p className="mt-3 text-sm text-ink/70">{NOTE[job.status]}</p>}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link to={`/recruiter/jobs/${job._id}/applicants`} className={buttonClass("secondary", "sm")}>
                      Applicants
                    </Link>
                    {editable && (
                      <Link to={`/recruiter/jobs/${job._id}/edit`} className={buttonClass("secondary", "sm")}>
                        {job.status === "rejected" ? "Edit and resubmit" : "Edit"}
                      </Link>
                    )}
                    {job.status === "active" && (
                      <Link to={`/jobs/${job._id}`} className={buttonClass("ghost", "sm")}>
                        View public page
                      </Link>
                    )}
                    {closable && (
                      <Button size="sm" variant="ghost" onClick={() => setDialog({ type: "close", job })}>
                        Close
                      </Button>
                    )}
                    {job.applicantCount === 0 && (
                      <Button size="sm" variant="ghost" onClick={() => setDialog({ type: "delete", job })}>
                        Delete
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

      {dialog?.type === "close" && (
        <ConfirmDialog
          title="Close this job?"
          text={`"${dialog.job.title}" stops accepting applications. Applicants stay in your pipeline, but you can't reopen the job.`}
          confirmLabel="Close job"
          loading={close.isPending}
          onConfirm={() => close.mutate(dialog.job._id)}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.type === "delete" && (
        <ConfirmDialog
          title="Delete this job?"
          text={`"${dialog.job.title}" will be removed permanently. This is only possible because nobody has applied yet.`}
          confirmLabel="Delete job"
          loading={remove.isPending}
          onConfirm={() => remove.mutate(dialog.job._id)}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}