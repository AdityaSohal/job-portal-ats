import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail } from "lucide-react";
import toast from "react-hot-toast";
import api, { getError } from "../../lib/api";
import { formatDate, formatDateTime, timeAgo } from "../../lib/format";
import { PROVIDER_LABEL } from "../../lib/admin";
import { JOB_STATUS_LABEL, RSTAGE_LABEL } from "../../lib/recruiter";
import Card from "../Card";
import ConfirmDialog from "../ConfirmDialog";
import { Alert, Button } from "../ui";
import { Badge, Skeleton } from "../bits";
import { Avatar } from "../recruiter/bits";
import { CompanyStatusBadge, RoleBadge } from "./bits";
import ReasonModal from "./ReasonModal";
import TypeToConfirmModal from "./TypeToConfirmModal";

function Fact({ label, children }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-ink/55">{label}</dt>
      <dd className="mt-0.5 text-[15px] font-semibold">{children}</dd>
    </div>
  );
}

const breakdown = (counts = {}, labels) =>
  Object.entries(counts)
    .filter(([, n]) => n > 0)
    .map(([key, n]) => `${labels[key] || key}: ${n}`)
    .join(" · ") || "None";

export default function UserPanel({ id, onDeleted }) {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(null); // "block" | "unblock" | "delete"

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["a", "user", id],
    queryFn: async () => (await api.get(`/admin/users/${id}`)).data,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["a"] });

  const block = useMutation({
    // an empty object is always sent, so the server always has a body to read
    mutationFn: async (reason) => (await api.patch(`/admin/users/${id}/block`, reason ? { reason } : {})).data,
    onSettled: refresh,
  });
  const unblock = useMutation({
    mutationFn: async () => (await api.patch(`/admin/users/${id}/unblock`)).data,
    onSuccess: () => {
      toast.success("User unblocked");
      setDialog(null);
    },
    onError: (err) => {
      toast.error(getError(err).message);
      setDialog(null);
    },
    onSettled: refresh,
  });
  const remove = useMutation({
    mutationFn: async () => (await api.delete(`/admin/users/${id}`)).data,
    onSettled: refresh,
  });

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (isError) {
    const info = getError(error);
    return (
      <div className="space-y-3">
        <Alert>{info.status === 404 || info.status === 400 ? "This user wasn't found. They may have been deleted." : info.message}</Alert>
        {info.status !== 404 && info.status !== 400 && (
          <Button variant="secondary" onClick={() => refetch()}>
            Try again
          </Button>
        )}
      </div>
    );
  }

  const { user, activity } = data;
  const isAdmin = user.role === "admin";
  const isRecruiter = user.role === "recruiter";

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4">
        <Avatar name={user.name} size={56} />
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-extrabold leading-tight">{user.name}</h3>
          <p className="mt-1 flex items-center gap-2 text-sm">
            <Mail size={14} aria-hidden="true" />
            <a href={`mailto:${user.email}`} className="break-all font-semibold underline underline-offset-4">
              {user.email}
            </a>
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <RoleBadge role={user.role} />
          {user.isBlocked && <Badge tone="danger">Blocked</Badge>}
        </div>
      </div>

      {user.isBlocked && (
        <Alert>
          This account is blocked{user.blockedAt ? ` since ${formatDate(user.blockedAt)}` : ""}.{user.blockedReason ? ` Reason: ${user.blockedReason}` : ""}
        </Alert>
      )}

      <Card title="Account">
        <dl className="grid gap-4 sm:grid-cols-2">
          <Fact label="Sign-in method">{PROVIDER_LABEL[user.authProvider] || user.authProvider}</Fact>
          <Fact label="Email">{user.emailVerified ? "Verified" : "Not verified"}</Fact>
          <Fact label="Joined">{formatDate(user.createdAt)}</Fact>
          <Fact label="Last login">{user.lastLoginAt ? `${timeAgo(user.lastLoginAt)} (${formatDateTime(user.lastLoginAt)})` : "Never"}</Fact>
        </dl>
      </Card>

      {user.role === "candidate" && (
        <Card title="Activity">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Fact label="Profile completion">{activity.profileCompletion}%</Fact>
            <Fact label="Resumes uploaded">{activity.resumes}</Fact>
            <Fact label="Skills listed">{activity.skills}</Fact>
            <Fact label="Saved jobs">{activity.savedJobs}</Fact>
            <div className="sm:col-span-2">
              <Fact label={`Applications (${activity.applicationsTotal})`}>{breakdown(activity.applications, RSTAGE_LABEL)}</Fact>
            </div>
          </dl>
        </Card>
      )}

      {isRecruiter && (
        <Card title="Company and activity">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Fact label="Company">
              {user.companyId ? (
                <span className="inline-flex flex-wrap items-center gap-2">
                  {user.companyId.name}
                  <CompanyStatusBadge status={user.companyId.status} />
                </span>
              ) : (
                "None"
              )}
            </Fact>
            <Fact label="Applications received">{activity.applicationsReceived}</Fact>
            <div className="sm:col-span-2">
              <Fact label={`Jobs posted (${activity.jobsTotal})`}>{breakdown(activity.jobs, JOB_STATUS_LABEL)}</Fact>
            </div>
          </dl>
        </Card>
      )}

      <Card title="Actions">
        {isAdmin ? (
          <p className="text-sm text-ink/70">Admin accounts can't be blocked or deleted from here.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {user.isBlocked ? (
                <Button variant="secondary" onClick={() => setDialog("unblock")}>
                  Unblock
                </Button>
              ) : (
                <Button variant="secondary" onClick={() => setDialog("block")}>
                  Block account
                </Button>
              )}
              <Button variant="ghost" onClick={() => setDialog("delete")}>
                Delete account
              </Button>
            </div>
            <p className="text-xs text-ink/55">
              Blocking logs the person out at once and stops them from logging in
              {isRecruiter ? ", and closes all of their open jobs" : ""}. Deleting can't be undone.
            </p>
          </div>
        )}
      </Card>

      {dialog === "block" && (
        <ReasonModal
          title="Block this account?"
          subtitle={user.email}
          text={isRecruiter ? "They can't log in, and all of their pending, live and hidden jobs are closed immediately." : "They can't log in, and any session they have stops working immediately."}
          label="Reason"
          hint="Saved with the account and in the audit log."
          required={false}
          confirmLabel="Block account"
          onSubmit={async (reason) => {
            const res = await block.mutateAsync(reason);
            toast.success(res.closedJobs ? `Account blocked. ${res.closedJobs} ${res.closedJobs === 1 ? "job was" : "jobs were"} closed.` : "Account blocked");
            setDialog(null);
          }}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog === "unblock" && (
        <ConfirmDialog
          title="Unblock this account?"
          text={isRecruiter ? "They can log in again. Their closed jobs are not reopened; they need to post again." : "They can log in again."}
          confirmLabel="Unblock"
          loading={unblock.isPending}
          onConfirm={() => unblock.mutate()}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog === "delete" && (
        <TypeToConfirmModal
          title="Delete this account?"
          subtitle={user.name}
          text={
            isRecruiter
              ? "This permanently deletes the account, its company and all of its jobs. If any job has applications, the server refuses and you should block the account instead."
              : "This permanently deletes the account, profile, applications, saved jobs, job alerts and uploaded resume files."
          }
          phrase={user.email}
          confirmLabel="Delete account"
          onSubmit={async () => {
            const res = await remove.mutateAsync();
            const r = res.removed || {};
            const detail = isRecruiter ? `${r.jobs ?? 0} jobs removed` : `${r.applications ?? 0} applications and ${r.files ?? 0} files removed`;
            toast.success(`Account deleted. ${detail}.`);
            setDialog(null);
            onDeleted();
          }}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}