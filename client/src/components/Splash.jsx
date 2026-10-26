import { CubeMark } from "./Logo";

export default function Splash() {
  return (
    <div className="grid-paper grid min-h-screen place-items-center">
      <div className="flex animate-pulse flex-col items-center gap-4">
        <CubeMark size={48} />
        <p className="text-sm font-medium text-ink/60">Loading…</p>
      </div>
    </div>
  );
}