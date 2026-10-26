import { Heart } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";
import { useSavedJobs } from "../hooks/useSavedJobs";
import { cx } from "./ui";

export default function SaveButton({ jobId, className }) {
  const navigate = useNavigate();
  const location = useLocation();
  const status = useAuth((s) => s.status);
  const role = useAuth((s) => s.user?.role);
  const { isSaved, toggle } = useSavedJobs();

  if (role && role !== "candidate") return null; // recruiters and admins don't save jobs

  const saved = isSaved(jobId);

  const onClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (status !== "authed") {
      navigate("/login", { state: { from: location } }); // after logging in they come back here
      return;
    }
    toggle(jobId);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved jobs" : "Save job"}
      className={cx(
        "flex size-10 items-center justify-center rounded-xl border-2 border-ink bg-white transition-all",
        "hover:-translate-x-px hover:-translate-y-px hover:shadow-block-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
        saved && "bg-accent-soft",
        className
      )}
    >
      <Heart size={18} className={saved ? "fill-ink" : ""} aria-hidden="true" />
    </button>
  );
}