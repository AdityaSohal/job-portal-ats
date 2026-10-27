import Modal from "./Modal";
import { Button } from "./ui";

export default function ConfirmDialog({ title, text, confirmLabel = "Confirm", loading = false, onConfirm, onClose }) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-[15px] text-ink/80">{text}</p>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}