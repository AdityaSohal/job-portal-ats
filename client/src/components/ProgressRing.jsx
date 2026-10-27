export default function ProgressRing({ value, size = 96, stroke = 10 }) {
  const clamped = Math.min(Math.max(value, 0), 100);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`Profile ${clamped}% complete`}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped / 100)}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xl font-extrabold">{clamped}%</span>
    </div>
  );
}