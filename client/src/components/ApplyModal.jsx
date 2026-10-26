import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Upload } from "lucide-react";
import toast from "react-hot-toast";
import api, { getError } from "../lib/api";
import { useProfile } from "../hooks/useCandidateData";
import { formatDate, formatSize } from "../lib/format";
import Modal from "./Modal";
import { Alert, Button } from "./ui";
import { Skeleton, Textarea } from "./bits";

const ACCEPT = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
};
const MAX_SIZE = 2 * 1024 * 1024;
const MAX_RESUMES = 3;
const NOTE_MAX = 2000;
const DROP_ERRORS = {
  "file-too-large": "That file is larger than 2 MB.",
  "file-invalid-type": "Only PDF or DOCX files are allowed.",
  "too-many-files": "Upload one file at a time.",
};

export default function ApplyModal({ job, onClose }) {
  const qc = useQueryClient();
  const { data, isPending, isError } = useProfile();
  const resumes = data?.profile?.resumes || [];

  const [picked, setPicked] = useState(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  // The newest resume is chosen by default, until the person picks another one
  const resumeId = resumes.some((r) => r.id === picked) ? picked : resumes.at(-1)?.id;

  const upload = useMutation({
    mutationFn: async (file) => {
      const form = new FormData();
      form.append("resume", file);
      return (await api.post("/profile/resumes", form)).data;
    },
    onSuccess: (res) => {
      qc.setQueryData(["profile"], res); // the reply has the same shape as GET /profile/me
      setPicked(res.profile.resumes.at(-1)?.id ?? null);
      toast.success("Resume uploaded");
    },
    onError: (err) => setError(getError(err).message),
  });

  const apply = useMutation({
    mutationFn: async () =>
      (await api.post("/applications", { jobId: job._id, resumeId, coverNote: note.trim() || undefined })).data,
    onSuccess: () => {
      toast.success("Application sent");
      qc.invalidateQueries({ queryKey: ["my-applications"] });
      onClose();
    },
    onError: (err) => {
      const info = getError(err);
      if (info.status === 409) {
        // already applied (or withdrew earlier): the job page should now show the real state
        qc.invalidateQueries({ queryKey: ["my-applications"] });
        toast.error(info.message);
        onClose();
      } else {
        setError(info.message);
      }
    },
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: ACCEPT,
    maxSize: MAX_SIZE,
    multiple: false,
    disabled: upload.isPending,
    onDropAccepted: (files) => {
      setError("");
      upload.mutate(files[0]);
    },
    onDropRejected: (rejections) => setError(DROP_ERRORS[rejections[0]?.errors?.[0]?.code] || "That file can't be uploaded."),
  });

  const canUpload = resumes.length < MAX_RESUMES;

  return (
    <Modal title="Apply for this job" subtitle={`${job.title} · ${job.company?.name}`} onClose={onClose}>
      <div className="space-y-5">
        {error && <Alert>{error}</Alert>}

        <section>
          <h3 className="mb-2 text-sm font-bold">Choose a resume</h3>

          {isPending && <Skeleton className="h-16" />}
          {isError && <Alert>We couldn't load your resumes. Close this window and try again.</Alert>}

          {!isPending && !isError && resumes.length === 0 && (
            <p className="mb-3 text-sm text-ink/70">You haven't uploaded a resume yet. Add one below to apply.</p>
          )}

          <div className="space-y-2">
            {resumes.map((r) => (
              <label
                key={r.id}
                className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-ink bg-white p-3 has-[:checked]:bg-accent-soft"
              >
                <input type="radio" name="resume" value={r.id} checked={r.id === resumeId} onChange={() => setPicked(r.id)} className="size-4 accent-ink" />
                <FileText size={20} aria-hidden="true" className="shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{r.name}</span>
                  <span className="text-xs text-ink/60">
                    {formatSize(r.size)} · uploaded {formatDate(r.uploadedAt)}
                  </span>
                </span>
              </label>
            ))}
          </div>

          {canUpload ? (
            <div
              {...getRootProps()}
              className={`mt-3 cursor-pointer rounded-xl border-2 border-dashed border-ink p-5 text-center transition-colors ${
                isDragActive ? "bg-accent-soft" : "bg-paper hover:bg-accent-soft/60"
              }`}
            >
              <input {...getInputProps()} />
              <Upload size={22} className="mx-auto mb-1.5" aria-hidden="true" />
              <p className="text-sm font-semibold">{upload.isPending ? "Uploading…" : isDragActive ? "Drop it here" : "Drop a PDF or DOCX here, or click to choose"}</p>
              <p className="mt-0.5 text-xs text-ink/60">Up to 2 MB. Your resume stays private.</p>
            </div>
          ) : (
            <p className="mt-3 text-xs text-ink/60">You have {MAX_RESUMES} resumes, which is the maximum. Remove one from your profile to add another.</p>
          )}
        </section>

        <section>
          <label htmlFor="cover-note" className="mb-1.5 block text-sm font-bold">
            Cover note <span className="font-medium text-ink/60">(optional)</span>
          </label>
          <Textarea
            id="cover-note"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
            placeholder="Tell the recruiter why you're a good fit."
          />
          <p className="mt-1 text-right text-xs text-ink/50">
            {note.length}/{NOTE_MAX}
          </p>
        </section>

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => apply.mutate()} loading={apply.isPending} disabled={!resumeId || upload.isPending}>
            Send application
          </Button>
        </div>
      </div>
    </Modal>
  );
}