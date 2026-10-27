import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api, { getError } from "../../lib/api";
import { toLocalDateTime } from "../../lib/recruiter";
import Modal from "../Modal";
import { Alert, Button, Field, Input } from "../ui";
import { Select, Textarea } from "../bits";

const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
const YEAR = 365 * 86_400_000;

const initial = (iv) => ({
  scheduledAt: iv ? toLocalDateTime(iv.scheduledAt) : "",
  mode: iv?.mode || "video",
  durationMinutes: String(iv?.durationMinutes ?? 60),
  meetingLink: iv?.meetingLink || "",
  location: iv?.location || "",
  interviewerName: iv?.interviewerName || "",
  instructions: iv?.instructions || "",
});

const validate = (f, original) => {
  if (!f.scheduledAt) return "Choose a date and time.";
  const when = new Date(f.scheduledAt).getTime();
  if (Number.isNaN(when)) return "Choose a valid date and time.";

  // The time rules only apply when the time is new or changed
  const timeChanged = !original || f.scheduledAt !== original.scheduledAt;
  if (timeChanged && when <= Date.now()) return "The interview time must be in the future.";
  if (timeChanged && when > Date.now() + YEAR) return "The interview must be within the next year.";

  const minutes = Number(f.durationMinutes);
  if (!Number.isInteger(minutes) || minutes < 15 || minutes > 480) return "Duration must be a whole number of minutes from 15 to 480.";

  const link = f.meetingLink.trim();
  if (f.mode === "video" && !link) return "Add a meeting link for a video interview.";
  if (link && !/^https:\/\/[^\s]+\.[^\s]+$/i.test(link)) return "The meeting link must start with https://";
  if (f.mode === "onsite" && !f.location.trim()) return "Add a location for an on-site interview.";
  return "";
};

// Schedules a new interview, or edits one (pass the interview to edit it)
export default function InterviewModal({ applicationId, interview, candidateName, onClose }) {
  const qc = useQueryClient();
  const editing = Boolean(interview);
  const original = initial(interview);
  const [f, setF] = useState(original);
  const [error, setError] = useState("");
  const set = (patch) => setF((old) => ({ ...old, ...patch }));

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        mode: f.mode,
        durationMinutes: Number(f.durationMinutes),
        meetingLink: f.meetingLink.trim(),
        location: f.location.trim(),
        interviewerName: f.interviewerName.trim(),
        instructions: f.instructions.trim(),
      };
      // An unchanged time is not sent again: it would be treated as a new time
      if (!editing || f.scheduledAt !== original.scheduledAt) body.scheduledAt = new Date(f.scheduledAt).toISOString();

      return editing
        ? (await api.patch(`/interviews/${interview.id}`, body)).data
        : (await api.post(`/applications/${applicationId}/interviews`, body)).data;
    },
    onSuccess: () => {
      toast.success(editing ? "Interview updated. The candidate was emailed." : "Interview scheduled. The candidate was emailed.");
      qc.invalidateQueries({ queryKey: ["r"] });
      onClose();
    },
    onError: (err) => {
      const info = getError(err);
      setError(info.fields.length ? info.fields.map((x) => x.message).join(" · ") : info.message);
    },
  });

  const submit = (e) => {
    e.preventDefault();
    const problem = validate(f, editing ? original : null);
    if (problem) {
      setError(problem);
      return;
    }
    if (editing && JSON.stringify(f) === JSON.stringify(original)) {
      setError("You haven't changed anything.");
      return;
    }
    setError("");
    save.mutate();
  };

  return (
    <Modal title={editing ? "Edit interview" : "Schedule an interview"} subtitle={candidateName} onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-4">
        {error && <Alert>{error}</Alert>}

        <Field label="Date and time" htmlFor="iv-when" hint={`Your time zone: ${TZ}`}>
          <Input id="iv-when" type="datetime-local" value={f.scheduledAt} onChange={(e) => set({ scheduledAt: e.target.value })} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type" htmlFor="iv-mode">
            <Select id="iv-mode" value={f.mode} onChange={(e) => set({ mode: e.target.value })}>
              <option value="video">Video call</option>
              <option value="phone">Phone call</option>
              <option value="onsite">On-site</option>
            </Select>
          </Field>
          <Field label="Duration (minutes)" htmlFor="iv-duration">
            <Input id="iv-duration" type="number" min="15" max="480" step="5" value={f.durationMinutes} onChange={(e) => set({ durationMinutes: e.target.value })} />
          </Field>
        </div>

        <Field label={f.mode === "video" ? "Meeting link" : "Meeting link (optional)"} htmlFor="iv-link">
          <Input id="iv-link" placeholder="https://meet.example.com/abc" value={f.meetingLink} onChange={(e) => set({ meetingLink: e.target.value })} />
        </Field>

        <Field label={f.mode === "onsite" ? "Location" : "Location (optional)"} htmlFor="iv-location">
          <Input id="iv-location" maxLength={200} value={f.location} onChange={(e) => set({ location: e.target.value })} />
        </Field>

        <Field label="Interviewer (optional)" htmlFor="iv-who">
          <Input id="iv-who" maxLength={80} value={f.interviewerName} onChange={(e) => set({ interviewerName: e.target.value })} />
        </Field>

        <Field label="Instructions for the candidate (optional)" htmlFor="iv-notes">
          <Textarea id="iv-notes" className="min-h-20" value={f.instructions} onChange={(e) => set({ instructions: e.target.value.slice(0, 1000) })} />
        </Field>

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending}>
            {editing ? "Save changes" : "Schedule interview"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}