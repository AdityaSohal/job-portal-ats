import { Badge } from "../bits";
import { cap } from "../../lib/format";
import { COMPANY_STATUS_LABEL, COMPANY_STATUS_TONE, ROLE_TONE } from "../../lib/admin";

export function CompanyStatusBadge({ status }) {
  return <Badge tone={COMPANY_STATUS_TONE[status] || "plain"}>{COMPANY_STATUS_LABEL[status] || cap(status)}</Badge>;
}

export function RoleBadge({ role }) {
  return <Badge tone={ROLE_TONE[role] || "plain"}>{cap(role)}</Badge>;
}

// items: [{ key?, label, value }]
export function RankBars({ items, empty = "No data yet." }) {
  if (!items.length) return <p className="text-sm text-ink/70">{empty}</p>;
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ol className="space-y-2.5">
      {items.map((i) => (
        <li key={i.key ?? i.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-semibold">{i.label}</span>
            <strong className="tabular-nums">{i.value}</strong>
          </div>
          <div className="h-3 overflow-hidden rounded-md border-2 border-ink bg-white">
            <div className="h-full bg-accent" style={{ width: `${(i.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}