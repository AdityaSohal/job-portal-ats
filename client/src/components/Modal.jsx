import { useEffect, useRef } from "react";
import { X } from "lucide-react";

// Uses the browser's own <dialog>: it traps focus, closes on Escape and dims the page
export default function Modal({ title, subtitle, onClose, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      // React's dev mode mounts twice; ignore close events that arrive while the dialog is open
      onClose={() => {
        if (!ref.current?.open) onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // a click on the dimmed backdrop
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border-2 border-ink bg-white p-0 text-ink shadow-block backdrop:bg-ink/40"
    >
      <div className="max-h-[85vh] overflow-y-auto p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-ink/70">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg border-2 border-ink hover:bg-paper"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}