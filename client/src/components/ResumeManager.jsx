import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, Pencil, Trash2, Upload } from "lucide-react";
import toast from "react-hot-toast";
import api, { getError } from "../lib/api";
import { formatDate, formatSize } from "../lib/format";
import ConfirmDialog from "./ConfirmDialog";
import { Alert, Button, Input } from "./ui";

const ACCEPT = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
};
const MAX_SIZE = 2 * 1024 * 1024;
const MAX_RESUMES = 3;
const DROP_ERRORS = {
  "file-too-large": "That file is larger than 2 MB.",
  "file-invalid-type": "Only PDF or DOCX files are allowed.",
  "too-many-files": "Upload one file at a time.",
};

export default function ResumeManager({ resumes }) {
  const qc = useQueryClient();
  const [error, setError] = useState("");
  const [renaming, setRenaming] = useState(null); // { id, name }
  const [deleting, setDeleting] = useState(null); // resume
  const [downloading, setDownloading] = useState(null); // resume id

  // Every profile reply has the same shape as GET /profile/me
  const sync = (res) => qc.setQueryData(["profile"], res);

  const upload = useMutation({
    mutationFn: async (file) => {
      const form = new FormData();
      form.append("resume", file);
      return (await api.post("/profile/resumes", form)).data;
    },
    onSuccess: (res) => {
      sync(res);
      toast.success("Resume uploaded");
    },
    onError: (err) => setError(getError(err).message),
  });

  const rename = useMutation({
    mutationFn: async ({ id, name }) => (await api.patch(`/profile/resumes/${id}`, { name })).data,
    onSuccess: (res) => {
      sync(res);
      setRenaming(null);
      toast.success("Resume renamed");
    },
    onError: (err) => setError(getError(err).message),
  });

  const remove = useMutation({
    mutationFn: async (id) => (await api.delete(`/profile/resumes/${id}`)).data,
    onSuccess: (res) => {
      sync(res);
      setDeleting(null);
      toast.success("Resume deleted");
    },
    onError: (err) => {
      setDeleting(null);
      setError(getError(err).message);
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  const download = async (id) => {
    setError("");
    setDownloading(id);
    try {
      const { data } = await api.get(`/profile/resumes/${id}/download`);
      const a = document.createElement("a");
      a.href = data.url; // a signed link that stops working after 5 minutes
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      setError(getError(err).message);
    } finally {
      setDownloading(null);
    }
  };

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

  const submitRename = (e) => {
    e.preventDefault();
    const name = renaming.name.trim();
    if (!name) {
      setError("Enter a name for the resume.");
      return;
    }
    setError("");
    rename.mutate({ id: renaming.id, name });
  };

  return (
    <div className="space-y-3">
      {error && <Alert>{error}</Alert>}

      {resumes.length === 0 && <p className="text-sm text-ink/70">No resumes yet. Upload one to start applying.</p>}

      <ul className="space-y-2">
        {resumes.map((r) => (
          <li key={r.id} className="rounded-xl border-2 border-ink p-3">
            {renaming?.id === r.id ? (
              <form onSubmit={submitRename} className="space-y-2">
                <Input aria-label="Resume name" value={renaming.name} maxLength={80} autoFocus onChange={(e) => setRenaming({ id: r.id, name: e.target.value })} />
                <div className="flex gap-2">
                  <Button type="submit" size="sm" loading={rename.isPending}>
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setRenaming(null)}>
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex items-center gap-3">
                <FileText size={20} className="shrink-0" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{r.name}</p>
                  <p className="text-xs text-ink/60">
                    {formatSize(r.size)} · {formatDate(r.uploadedAt)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button type="button" onClick={() => download(r.id)} disabled={downloading === r.id} aria-label={`Download ${r.name}`} className="flex size-8 items-center justify-center rounded-lg border-2 border-ink hover:bg-accent-soft disabled:opacity-50">
                    <Download size={15} />
                  </button>
                  <button type="button" onClick={() => setRenaming({ id: r.id, name: r.name })} aria-label={`Rename ${r.name}`} className="flex size-8 items-center justify-center rounded-lg border-2 border-ink hover:bg-accent-soft">
                    <Pencil size={15} />
                  </button>
                  <button type="button" onClick={() => setDeleting(r)} aria-label={`Delete ${r.name}`} className="flex size-8 items-center justify-center rounded-lg border-2 border-ink hover:bg-danger-soft">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {resumes.length < MAX_RESUMES ? (
        <div
          {...getRootProps()}
          className={`cursor-pointer rounded-xl border-2 border-dashed border-ink p-5 text-center transition-colors ${isDragActive ? "bg-accent-soft" : "bg-paper hover:bg-accent-soft/60"}`}
        >
          <input {...getInputProps()} />
          <Upload size={22} className="mx-auto mb-1.5" aria-hidden="true" />
          <p className="text-sm font-semibold">{upload.isPending ? "Uploading…" : isDragActive ? "Drop it here" : "Drop a PDF or DOCX, or click to choose"}</p>
          <p className="mt-0.5 text-xs text-ink/60">Up to 2 MB. Your resume stays private.</p>
        </div>
      ) : (
        <p className="text-xs text-ink/60">You have {MAX_RESUMES} resumes, which is the maximum. Delete one to add another.</p>
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete this resume?"
          text={`"${deleting.name}" will be removed from your profile. Applications that already used it keep their copy.`}
          confirmLabel="Delete resume"
          loading={remove.isPending}
          onConfirm={() => remove.mutate(deleting.id)}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}