import { useState } from "react";
import { getError } from "../../lib/api";
import Modal from "../Modal";
import { Alert, Button, Input } from "../ui";

// For actions that can't be undone: the admin must type a phrase before the button works
export default function TypeToConfirmModal({ title, subtitle, text, phrase, confirmLabel, onSubmit, onClose }) {
  const [typed, setTyped] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const matches = typed.trim().toLowerCase() === phrase.toLowerCase();

  const submit = async (e) => {
    e.preventDefault();
    if (!matches) return;
    setError("");
    setLoading(true);
    try {
      await onSubmit();
    } catch (err) {
      setError(getError(err).message);
      setLoading(false);
    }
  };

  return (
    <Modal title={title} subtitle={subtitle} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <p className="text-[15px] text-ink/80">{text}</p>
        <div>
          <label htmlFor="confirm-phrase" className="mb-1.5 block text-sm font-bold">
            Type <span className="break-all font-mono">{phrase}</span> to confirm
          </label>
          <Input id="confirm-phrase" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} />
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" loading={loading} disabled={!matches}>
            {confirmLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}