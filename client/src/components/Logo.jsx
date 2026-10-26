export function CubeMark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" stroke="#1b1b1b" strokeWidth="1.8" strokeLinejoin="round">
      <polygon points="16,3 28,10 16,17 4,10" fill="#ffffff" />
      <polygon points="4,10 16,17 16,30 4,23" fill="#1b1b1b" />
      <polygon points="28,10 16,17 16,30 28,23" fill="#0f766e" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <CubeMark />
      <span className="text-lg font-extrabold tracking-tight">JobPortal</span>
    </span>
  );
}