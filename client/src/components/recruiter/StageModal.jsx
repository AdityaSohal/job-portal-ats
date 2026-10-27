import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api, { getError } from "../../lib/api";
import { RSTAGE_LABEL, STAGE_ACTIONS } from "../../lib/recruiter";
import Modal from "../Modal";
import { Alert, Button } from "../ui";
import { Textarea } from "../bits";

// Confirms a stage change, with an optional internal note (and feedback for the candidate when rejecting)
export default function StageModal({ applicationId, fromStage, target, candidateName, onClose }) {
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const rescind = target === "rejected" && fromStage === "offered";
  const base = STAGE_ACTIONS[target];
  const copy = rescind
    ? { title: "Withdraw the offer", button: "Withdraw offer", text: "The offer is withdrawn and the candidate is emailed. This can't be undone." }
    : { title: base.title, button: base.label, text: base.text };

  const change = useMutation({
    mutationFn: async () =>
      (
        await api.patch(`/applications/${applicationId}/stage`, {
          stage: target,
          ...(note.trim() && { note: note.trim() }),
          ...(target === "rejected" && feedback.trim() && { feedback: feedback.trim() }),
        })
      ).data,
    onSuccess: () => {
      toast.success(`Moved to ${RSTAGE_LABEL[target]}`);
      qc.invalidateQueries({ queryKey: ["r"] });
      onClose();
    },
    onError: (err) => {
      const info = getError(err);
      if (info.status === 409) {
        // someone else changed it first (or the candidate acted): show the real state
        toast.error(info.message);
        qc.invalidateQueries({ queryKey: ["r"] });
        onClose();
      } else {
        setError(info.message);
      }
    },
  });

  return (
    <Modal title={copy.title} subtitle={candidateName} onClose={onClose}>
      <div className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <p className="text-[15px] text-ink/80">{copy.text}</p>

        {target === "rejected" && (
          <div>
            <label htmlFor="stage-feedback" className="mb-1.5 block text-sm font-bold">
              Feedback for the candidate <span className="font-medium text-ink/60">(optional, they will see it)</span>
            </label>
            <Textarea id="stage-feedback" className="min-h-24" value={feedback} onChange={(e) => setFeedback(e.target.value.slice(0, 1000))} />
            <p className="mt-1 text-right text-xs text-ink/50">{feedback.length}/1000</p>
          </div>
        )}

        <div>
          <label htmlFor="stage-note" className="mb-1.5 block text-sm font-bold">
            Internal note <span className="font-medium text-ink/60">(optional, only your team sees it)</span>
          </label>
          <Textarea id="stage-note" className="min-h-20" value={note} onChange={(e) => setNote(e.target.value.slice(0, 500))} />
          <p className="mt-1 text-right text-xs text-ink/50">{note.length}/500</p>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={change.isPending}>
            Cancel
          </Button>
          <Button onClick={() => change.mutate()} loading={change.isPending}>
            {copy.button}
          </Button>
        </div>
      </div>
    </Modal>
  );
}