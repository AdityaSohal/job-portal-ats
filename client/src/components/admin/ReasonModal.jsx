import { useState } from "react";
import { getError } from "../../lib/api";
import Modal from "../Modal";
import { Alert, Button } from "../ui";
import { Textarea } from "../bits";

// Asks for a written reason. onSubmit(reason) must return a promise: if it fails, the message shows here.
export default function ReasonModal({
  title,
  subtitle,
  text,
  label = "Reason",
  hint,
  confirmLabel,
  required = true,
  onSubmit,
  onClose,
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const value = reason.trim();
    if (required && value.length < 5) {
      setError("Please write at least 5 characters.");
      return;
    }
    if (value && value.length < 5) {
      setError("A reason needs at least 5 characters, or leave it empty.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await onSubmit(value);
    } catch (err) {
      setError(getError(err).message);
      setLoading(false);
    }
  };

  return (
    <Modal title={title} subtitle={subtitle} onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-4">
        {error && <Alert>{error}</Alert>}
        {text && <p className="text-[15px] text-ink/80">{text}</p>}
        <div>
          <label htmlFor="reason-text" className="mb-1.5 block text-sm font-bold">
            {label}
            {!required && <span className="font-medium text-ink/60"> (optional)</span>}
          </label>
          <Textarea id="reason-text" className="min-h-28" value={reason} onChange={(e) => setReason(e.target.value.slice(0, 500))} />
          <p className="mt-1 flex justify-between text-xs text-ink/55">
            <span>{hint}</span>
            <span>{reason.length}/500</span>
          </p>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}