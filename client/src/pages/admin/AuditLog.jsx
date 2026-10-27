import { useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import api, { getError } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import { ACTION_LABEL, actionLabel, metaPairs } from "../../lib/admin";
import { Alert, Button, Field, cx } from "../../components/ui";
import { EmptyState, Pagination, Select, Skeleton } from "../../components/bits";
import { RoleBadge } from "../../components/admin/bits";

const TARGETS = ["Company", "Job", "User", "Application"];
const PAGE_SIZE = 20;

export default function AuditLog() {
  const [sp, setSp] = useSearchParams();
  const action = Object.hasOwn(ACTION_LABEL, sp.get("action")) ? sp.get("action") : "";
  const targetType = TARGETS.includes(sp.get("targetType")) ? sp.get("targetType") : "";
  const page = Math.min(Math.max(parseInt(sp.get("page"), 10) || 1, 1), 1000);

  const write = (next) => {
    const params = {};
    if (next.action) params.action = next.action;
    if (next.targetType) params.targetType = next.targetType;
    if (next.page > 1) params.page = String(next.page);
    setSp(params);
  };

  const { data, isPending, isError, error, isFetching, refetch } = useQuery({
    queryKey: ["a", "audit", { action, targetType, page }],
    queryFn: async () =>
      (await api.get("/admin/audit-logs", { params: { ...(action && { action }), ...(targetType && { targetType }), page, limit: PAGE_SIZE } })).data,
    placeholderData: keepPreviousData,
    staleTime: 0,
  });

  const filtered = Boolean(action || targetType);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Audit log</h1>
        <p className="mt-1 text-sm text-ink/70">A record of sensitive actions: who did what, and when. Newest first.</p>
      </div>

      <div className="grid gap-4 rounded-2xl border-2 border-ink bg-white p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label="Action" htmlFor="au-action">
          <Select id="au-action" value={action} onChange={(e) => write({ action: e.target.value, targetType, page: 1 })}>
            <option value="">All actions</option>
            {Object.entries(ACTION_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Concerns" htmlFor="au-target">
          <Select id="au-target" value={targetType} onChange={(e) => write({ action, targetType: e.target.value, page: 1 })}>
            <option value="">Anything</option>
            {TARGETS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
        {filtered && (
          <Button variant="ghost" onClick={() => write({ action: "", targetType: "", page: 1 })}>
            Clear
          </Button>
        )}
      </div>

      {isPending ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : isError ? (
        <div className="space-y-3">
          <Alert>{getError(error).message}</Alert>
          <Button variant="secondary" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : data.items.length === 0 ? (
        <EmptyState title="No entries" text={filtered ? "Nothing matches these filters." : "Actions appear here as they happen."} />
      ) : (
        <>
          <p className="text-sm font-semibold text-ink/70">
            {data.total} {data.total === 1 ? "entry" : "entries"}
          </p>
          <ul className={cx("space-y-3 transition-opacity", isFetching && "opacity-60")}>
            {data.items.map((l) => {
              const pairs = metaPairs(l.meta);
              return (
                <li key={l._id} className="rounded-2xl border-2 border-ink bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-bold">{actionLabel(l.action)}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-ink/70">
                        by {l.actorId ? <span className="font-semibold text-ink">{l.actorId.name}</span> : "a deleted account"}
                        {l.actorId?.role && <RoleBadge role={l.actorId.role} />}
                      </p>
                    </div>
                    <p className="text-xs text-ink/55">{formatDateTime(l.createdAt)}</p>
                  </div>
                  <p className="mt-2 text-xs text-ink/60">
                    {l.targetType ? `${l.targetType}${l.targetId ? ` · …${String(l.targetId).slice(-6)}` : ""}` : "No target"}
                    {l.ip ? ` · ${l.ip}` : ""}
                  </p>
                  {pairs.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {pairs.map(([k, v]) => (
                        <li key={k} className="rounded-md border border-ink/30 bg-paper px-2 py-0.5 text-xs">
                          <span className="font-bold">{k}:</span> {v}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
          <Pagination
            page={data.page}
            pages={data.pages}
            onChange={(p) => {
              write({ action, targetType, page: p });
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        </>
      )}
    </div>
  );
}