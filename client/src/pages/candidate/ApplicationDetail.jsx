import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, FileText } from "lucide-react";
import toast from "react-hot-toast";
import api, { getError } from "../../lib/api";
import { STAGE_LABEL, formatDate, formatDateTime, timeAgo } from "../../lib/format";
import Card from "../../components/Card";
import CompanyLogo from "../../components/CompanyLogo";
import ConfirmDialog from "../../components/ConfirmDialog";
import InterviewCard from "../../components/InterviewCard";
import StageBadge from "../../components/StageBadge";
import StageTracker from "../../components/StageTracker";
import { Alert, Button, buttonClass } from "../../components/ui";
import { EmptyState, Skeleton } from "../../components/bits";

export default function ApplicationDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(null); // "withdraw" | "accept" | "decline"

  const { data: app, isPending, isError, error, refetch } = useQuery({
    queryKey: ["my-applications", "detail", id],
    queryFn: async () => (await api.get(`/applications/me/${id}`)).data.application,
  });

  // The detail query lives under the same key prefix, so this refreshes it and the lists
  const refresh = () => qc.invalidateQueries({ queryKey: ["my-applications"] });

  const withdraw = useMutation({
    mutationFn: async () => (await api.patch(`/applications/${id}/withdraw`)).data,
    onSuccess: () => {
      toast.success("Application withdrawn");
      setDialog(null);
      refresh();
    },
    onError: (err) => {
      toast.error(getError(err).message);
      setDialog(null);
      refresh();
    },
  });

  const respond = useMutation({
    mutationFn: async (decision) => (await api.patch(`/applications/${id}/respond`, { decision })).data,
    onSuccess: (data, decision) => {
      toast.success(decision === "accept" ? (data.jobFilled ? "Offer accepted. Congratulations!" : "Offer accepted") : "Offer declined");
      setDialog(null);
      refresh();
    },
    onError: (err) => {
      toast.error(getError(err).message); // for example: the position was already filled
      setDialog(null);
      refresh();
    },
  });

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-28" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (isError) {
    const info = getError(error);
    if (info.status === 404 || info.status === 400) {
      return (
        <EmptyState
          title="Application not found"
          text="It may not exist, or it belongs to another account."
          action={
            <Link to="/candidate/applications" className={buttonClass("primary")}>
              Back to applications
            </Link>
          }
        />
      );
    }
    return (
      <div className="space-y-3">
        <Alert>{info.message}</Alert>
        <Button variant="secondary" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const job = app.job;
  const canWithdraw = app.allowedNextStages.includes("withdrawn");
  const hasOffer = app.stage === "offered" && app.allowedNextStages.includes("hired");
  const history = [...app.history].reverse();

  return (
    <div className="space-y-6">
      <Link to="/candidate/applications" className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline">
        <ArrowLeft size={16} aria-hidden="true" />
        All applications
      </Link>

      <header className="flex flex-wrap items-start gap-4 rounded-2xl border-2 border-ink bg-white p-6 shadow-block">
        <CompanyLogo company={job?.company} size={56} />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-extrabold leading-tight tracking-tight">{job?.title || "Job no longer available"}</h1>
          <p className="mt-1 text-[15px] text-ink/70">{[job?.company?.name, job?.location].filter(Boolean).join(" · ")}</p>
          <p className="mt-1 text-sm text-ink/60">Applied {formatDate(app.createdAt)}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StageBadge stage={app.stage} />
          {job?.status === "active" ? (
            <Link to={`/jobs/${app.jobId}`} className="inline-flex items-center gap-1 text-sm font-bold underline underline-offset-4">
              View job post <ExternalLink size={14} aria-hidden="true" />
            </Link>
          ) : (
            <span className="text-xs text-ink/55">This job is no longer open</span>
          )}
        </div>
      </header>

      {hasOffer && (
        <section className="rounded-2xl border-2 border-ink bg-accent-soft p-6 shadow-block">
          <h2 className="text-xl font-extrabold">You have an offer</h2>
          <p className="mt-1 text-[15px]">
            {job?.company?.name ? `${job.company.name} has` : "The company has"} offered you this position. Accepting is final, so take your time.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={() => setDialog("accept")}>Accept offer</Button>
            <Button variant="secondary" onClick={() => setDialog("decline")}>
              Decline offer
            </Button>
          </div>
        </section>
      )}

      <Card title="Progress">
        <StageTracker stage={app.stage} history={app.history} />
      </Card>

      {app.interviews.length > 0 && (
        <Card title="Interviews">
          <div className="space-y-3">
            {app.interviews.map((iv) => (
              <InterviewCard key={iv.id} interview={iv} />
            ))}
          </div>
        </Card>
      )}

      <Card title="History">
        <ol className="space-y-4">
          {history.map((h, i) => (
            <li key={`${h.to}-${h.at}-${i}`} className="border-l-2 border-ink pl-4">
              <p className="font-bold">{STAGE_LABEL[h.to] || h.to}</p>
              <p className="text-xs text-ink/55">{formatDateTime(h.at)}</p>
              {h.feedback && (
                <p className="mt-2 whitespace-pre-line break-words rounded-xl border-2 border-ink bg-paper p-3 text-sm">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink/55">Feedback from the recruiter</span>
                  {h.feedback}
                </p>
              )}
            </li>
          ))}
        </ol>
      </Card>

      <Card title="Your application">
        <dl className="space-y-4 text-[15px]">
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-ink/55">Resume sent</dt>
            <dd className="mt-1 inline-flex items-center gap-2 font-semibold">
              <FileText size={16} aria-hidden="true" />
              {app.resumeName}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-ink/55">Cover note</dt>
            <dd className="mt-1 whitespace-pre-line break-words">{app.coverNote || <span className="text-ink/55">You didn't add a cover note.</span>}</dd>
          </div>
        </dl>
      </Card>

      {canWithdraw && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border-2 border-dashed border-ink/40 p-5">
          <p className="text-sm text-ink/70">Changed your mind? You can withdraw, but you won't be able to apply to this job again.</p>
          <Button variant="secondary" onClick={() => setDialog("withdraw")}>
            Withdraw
          </Button>
        </div>
      )}

      {dialog === "withdraw" && (
        <ConfirmDialog
          title="Withdraw this application?"
          text="The recruiter will no longer see you as an active candidate, and you can't apply to this job again."
          confirmLabel="Withdraw"
          loading={withdraw.isPending}
          onConfirm={() => withdraw.mutate()}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "accept" && (
        <ConfirmDialog
          title="Accept this offer?"
          text="This tells the company you will take the job. You can't undo it here."
          confirmLabel="Accept offer"
          loading={respond.isPending}
          onConfirm={() => respond.mutate("accept")}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "decline" && (
        <ConfirmDialog
          title="Decline this offer?"
          text="This tells the company you won't take the job. You can't undo it here."
          confirmLabel="Decline offer"
          loading={respond.isPending}
          onConfirm={() => respond.mutate("decline")}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}