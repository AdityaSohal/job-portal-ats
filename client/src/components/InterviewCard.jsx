import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, CalendarClock, ExternalLink, Phone, User, Video } from "lucide-react";
import toast from "react-hot-toast";
import api, { getError } from "../lib/api";
import { INTERVIEW_STATUS_LABEL, formatDateTime, safeUrl } from "../lib/format";
import Modal from "./Modal";
import { Alert, Button } from "./ui";
import { Badge, Textarea } from "./bits";

const MODE = {
  video: { Icon: Video, label: "Video call" },
  phone: { Icon: Phone, label: "Phone call" },
  onsite: { Icon: Building2, label: "On-site" },
};
const TONE = { scheduled: "plain", confirmed: "accent", reschedule_requested: "plain", completed: "ink", cancelled: "danger" };

function RescheduleModal({ interview, onClose, onDone }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const ask = useMutation({
    mutationFn: async () => (await api.patch(`/interviews/${interview.id}/request-reschedule`, { reason: reason.trim() })).data,
    onSuccess: () => {
      toast.success("Request sent to the recruiter");
      onDone();
      onClose();
    },
    onError: (err) => setError(getError(err).message),
  });

  const submit = () => {
    if (reason.trim().length < 5) {
      setError("Please give a reason of at least 5 characters.");
      return;
    }
    setError("");
    ask.mutate();
  };

  return (
    <Modal title="Ask for a different time" subtitle={`Currently ${formatDateTime(interview.scheduledAt)}`} onClose={onClose}>
      <div className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <div>
          <label htmlFor="reschedule-reason" className="mb-1.5 block text-sm font-bold">
            Why do you need a new time?
          </label>
          <Textarea id="reschedule-reason" value={reason} onChange={(e) => setReason(e.target.value.slice(0, 500))} placeholder="For example: I have an exam that day. Any time after 3 pm works." />
          <p className="mt-1 text-right text-xs text-ink/50">{reason.length}/500</p>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={ask.isPending}>
            Send request
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default function InterviewCard({ interview, showJob = false }) {
  const qc = useQueryClient();
  const [asking, setAsking] = useState(false);

  const upcoming = new Date(interview.scheduledAt).getTime() > Date.now();
  const canConfirm = upcoming && interview.status === "scheduled";
  const canAsk = upcoming && ["scheduled", "confirmed"].includes(interview.status);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["interviews"] });
    qc.invalidateQueries({ queryKey: ["my-applications"] });
  };

  const confirm = useMutation({
    mutationFn: async () => (await api.patch(`/interviews/${interview.id}/confirm`)).data,
    onSuccess: () => {
      toast.success("Interview confirmed");
      refresh();
    },
    onError: (err) => {
      toast.error(getError(err).message);
      refresh();
    },
  });

  const { Icon, label } = MODE[interview.mode] || MODE.video;
  const link = safeUrl(interview.meetingLink);

  return (
    <article className="rounded-2xl border-2 border-ink bg-white p-4">
      {showJob && interview.job?.title && (
        <p className="mb-1 text-sm font-bold">
          {interview.job.title}
          {interview.job.company && <span className="font-medium text-ink/65"> · {interview.job.company}</span>}
        </p>
      )}

      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="flex items-center gap-2 text-[15px] font-extrabold">
          <CalendarClock size={18} aria-hidden="true" />
          {formatDateTime(interview.scheduledAt)}
        </p>
        <Badge tone={TONE[interview.status] || "plain"}>{INTERVIEW_STATUS_LABEL[interview.status] || interview.status}</Badge>
      </div>

      <ul className="mt-3 space-y-1.5 text-sm">
        <li className="flex items-center gap-2">
          <Icon size={16} aria-hidden="true" />
          {label} · {interview.durationMinutes} minutes
        </li>
        {interview.location && (
          <li className="flex items-center gap-2">
            <Building2 size={16} aria-hidden="true" />
            {interview.location}
          </li>
        )}
        {interview.interviewerName && (
          <li className="flex items-center gap-2">
            <User size={16} aria-hidden="true" />
            Interviewer: {interview.interviewerName}
          </li>
        )}
        {link && (
          <li>
            <a href={link} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1.5 font-bold underline underline-offset-4">
              Join the meeting
              <ExternalLink size={14} aria-hidden="true" />
            </a>
          </li>
        )}
      </ul>

      {interview.instructions && <p className="mt-3 whitespace-pre-line break-words rounded-xl bg-paper p-3 text-sm">{interview.instructions}</p>}

      {interview.status === "reschedule_requested" && (
        <p className="mt-3 text-sm text-ink/70">You asked for a new time. The recruiter will get back to you.</p>
      )}

      {(canConfirm || canAsk) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {canConfirm && (
            <Button size="sm" onClick={() => confirm.mutate()} loading={confirm.isPending}>
              Confirm this time
            </Button>
          )}
          {canAsk && (
            <Button size="sm" variant="secondary" onClick={() => setAsking(true)}>
              Ask for a different time
            </Button>
          )}
        </div>
      )}

      {asking && <RescheduleModal interview={interview} onClose={() => setAsking(false)} onDone={refresh} />}
    </article>
  );
}