import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, CalendarClock, ExternalLink, Phone, User, Video } from "lucide-react";
import toast from "react-hot-toast";
import api, { getError } from "../../lib/api";
import { formatDateTime, safeUrl } from "../../lib/format";
import { INTERVIEW_LABEL, INTERVIEW_TONE, OPEN_INTERVIEW } from "../../lib/recruiter";
import ConfirmDialog from "../ConfirmDialog";
import { Button } from "../ui";
import { Badge } from "../bits";
import InterviewModal from "./InterviewModal";

const MODE = {
  video: { Icon: Video, label: "Video call" },
  phone: { Icon: Phone, label: "Phone call" },
  onsite: { Icon: Building2, label: "On-site" },
};

// headline: optional heading (the candidate and job, on the Interviews page)
// link: optional { to, label } that opens the applicant
export default function RInterviewCard({ interview, headline, link }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const open = OPEN_INTERVIEW.includes(interview.status);
  const past = new Date(interview.scheduledAt).getTime() <= Date.now();
  const refresh = () => qc.invalidateQueries({ queryKey: ["r"] });

  const cancel = useMutation({
    mutationFn: async () => (await api.patch(`/interviews/${interview.id}/cancel`)).data,
    onSuccess: () => {
      toast.success("Interview cancelled. The candidate was emailed.");
      setCancelling(false);
      refresh();
    },
    onError: (err) => {
      toast.error(getError(err).message);
      setCancelling(false);
      refresh();
    },
  });

  const complete = useMutation({
    mutationFn: async () => (await api.patch(`/interviews/${interview.id}/complete`)).data,
    onSuccess: () => {
      toast.success("Marked as completed");
      refresh();
    },
    onError: (err) => {
      toast.error(getError(err).message);
      refresh();
    },
  });

  const { Icon, label } = MODE[interview.mode] || MODE.video;
  const meeting = safeUrl(interview.meetingLink);

  return (
    <article className="rounded-2xl border-2 border-ink bg-white p-4">
      {headline && <div className="mb-2">{headline}</div>}

      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="flex items-center gap-2 text-[15px] font-extrabold">
          <CalendarClock size={18} aria-hidden="true" />
          {formatDateTime(interview.scheduledAt)}
        </p>
        <Badge tone={INTERVIEW_TONE[interview.status] || "plain"}>{INTERVIEW_LABEL[interview.status] || interview.status}</Badge>
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
        {meeting && (
          <li>
            <a href={meeting} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1.5 font-bold underline underline-offset-4">
              Meeting link
              <ExternalLink size={14} aria-hidden="true" />
            </a>
          </li>
        )}
      </ul>

      {interview.instructions && <p className="mt-3 whitespace-pre-line break-words rounded-xl bg-paper p-3 text-sm">{interview.instructions}</p>}

      {interview.status === "reschedule_requested" && (
        <p className="mt-3 rounded-xl border-2 border-ink bg-danger-soft p-3 text-sm">
          <span className="block text-xs font-bold uppercase tracking-wide text-ink/60">The candidate asked for a new time</span>
          {interview.rescheduleReason || "No reason given."} <span className="block pt-1 text-ink/70">Edit the interview to propose a new time.</span>
        </p>
      )}

      {(open || link) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {open && (
            <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
              {interview.status === "reschedule_requested" ? "Propose a new time" : "Edit"}
            </Button>
          )}
          {open && past && (
            <Button size="sm" onClick={() => complete.mutate()} loading={complete.isPending}>
              Mark as completed
            </Button>
          )}
          {open && (
            <Button size="sm" variant="ghost" onClick={() => setCancelling(true)}>
              Cancel interview
            </Button>
          )}
          {link && (
            <Link to={link.to} className="inline-flex items-center rounded-xl px-3 py-1.5 text-sm font-bold underline underline-offset-4">
              {link.label}
            </Link>
          )}
        </div>
      )}

      {editing && <InterviewModal interview={interview} onClose={() => setEditing(false)} />}
      {cancelling && (
        <ConfirmDialog
          title="Cancel this interview?"
          text="The candidate is emailed that the interview is cancelled. You can schedule a new one afterwards."
          confirmLabel="Cancel interview"
          loading={cancel.isPending}
          onConfirm={() => cancel.mutate()}
          onClose={() => setCancelling(false)}
        />
      )}
    </article>
  );
}