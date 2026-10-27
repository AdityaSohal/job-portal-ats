import { useEffect, useRef } from "react";
import { X } from "lucide-react";

// A side panel built on the browser's own <dialog>: it traps focus and closes on Escape
export default function Drawer({ title, onClose, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={() => {
        if (!ref.current?.open) onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // a click on the dimmed backdrop
      }}
      className="m-0 ml-auto h-full max-h-full w-full max-w-xl overflow-hidden border-l-2 border-ink bg-paper p-0 text-ink backdrop:bg-ink/40"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-4 border-b-2 border-ink bg-white px-5 py-3">
          <h2 className="truncate text-lg font-extrabold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg border-2 border-ink hover:bg-paper"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </dialog>
  );
}