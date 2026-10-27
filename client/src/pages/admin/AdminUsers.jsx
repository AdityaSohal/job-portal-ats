import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import toast from "react-hot-toast";
import api, { getError } from "../../lib/api";
import { formatDate, timeAgo } from "../../lib/format";
import Drawer from "../../components/Drawer";
import UserPanel from "../../components/admin/UserPanel";
import { CompanyStatusBadge, RoleBadge } from "../../components/admin/bits";
import { Avatar } from "../../components/recruiter/bits";
import { Alert, Button, Field, Input, cx } from "../../components/ui";
import { Badge, EmptyState, Pagination, Select, Skeleton } from "../../components/bits";

const ROLES = ["candidate", "recruiter", "admin"];
const PAGE_SIZE = 10;

// The URL holds the filters (and the open user), so links and the back button work
const readParams = (sp) => {
  const q = (sp.get("q") || "").trim();
  const user = sp.get("user") || "";
  return {
    role: ROLES.includes(sp.get("role")) ? sp.get("role") : "",
    status: ["active", "blocked"].includes(sp.get("status")) ? sp.get("status") : "",
    q: q.length >= 2 ? q.slice(0, 100) : "",
    page: Math.min(Math.max(parseInt(sp.get("page"), 10) || 1, 1), 1000),
    user: /^[a-f0-9]{24}$/i.test(user) ? user : "",
  };
};

const filterParams = (p) => ({
  ...(p.role && { role: p.role }),
  ...(p.status && { status: p.status }),
  ...(p.q && { q: p.q }),
});

const buildParams = (p) => ({
  ...filterParams(p),
  ...(p.page > 1 && { page: String(p.page) }),
  ...(p.user && { user: p.user }),
});

export default function AdminUsers() {
  const [sp, setSp] = useSearchParams();
  const key = sp.toString();
  const applied = useMemo(() => readParams(new URLSearchParams(key)), [key]);

  const [qDraft, setQDraft] = useState(applied.q);
  useEffect(() => setQDraft(applied.q), [applied.q]);

  const write = (next) => setSp(buildParams(next));

  const search = (e) => {
    e.preventDefault();
    const q = qDraft.trim();
    if (q.length === 1) {
      toast.error("Search needs at least 2 characters");
      return;
    }
    write({ ...applied, q, page: 1 });
  };

  const { data, isPending, isError, error, isFetching, refetch } = useQuery({
    queryKey: ["a", "users", filterParams(applied), applied.page],
    queryFn: async () => (await api.get("/admin/users", { params: { ...filterParams(applied), page: applied.page, limit: PAGE_SIZE } })).data,
    placeholderData: keepPreviousData,
    staleTime: 0,
  });

  // After deleting the last user on a later page: step back one page
  useEffect(() => {
    if (data && data.items.length === 0 && applied.page > 1) write({ ...applied, page: applied.page - 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const filtered = Boolean(applied.role || applied.status || applied.q);
  const clear = () => write({ ...applied, role: "", status: "", q: "", page: 1 });
  const closePanel = () => write({ ...applied, user: "" });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Users</h1>

      <form onSubmit={search} className="grid gap-4 rounded-2xl border-2 border-ink bg-white p-5 md:grid-cols-[1fr_160px_160px_auto] md:items-end">
        <Field label="Name or email" htmlFor="u-q">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/50" aria-hidden="true" />
            <Input id="u-q" className="pl-10" placeholder="Search users" value={qDraft} onChange={(e) => setQDraft(e.target.value)} />
          </div>
        </Field>
        <Field label="Role" htmlFor="u-role">
          <Select id="u-role" value={applied.role} onChange={(e) => write({ ...applied, role: e.target.value, page: 1 })}>
            <option value="">All roles</option>
            <option value="candidate">Candidates</option>
            <option value="recruiter">Recruiters</option>
            <option value="admin">Admins</option>
          </Select>
        </Field>
        <Field label="Status" htmlFor="u-status">
          <Select id="u-status" value={applied.status} onChange={(e) => write({ ...applied, status: e.target.value, page: 1 })}>
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
          </Select>
        </Field>
        <div className="flex gap-2">
          <Button type="submit">Search</Button>
          {filtered && (
            <Button variant="ghost" onClick={clear}>
              Clear
            </Button>
          )}
        </div>
      </form>

      {isPending ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20" />
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
        <EmptyState
          title="No users match"
          text="Try a different search or filter."
          action={
            filtered && (
              <Button variant="secondary" onClick={clear}>
                Clear filters
              </Button>
            )
          }
        />
      ) : (
        <>
          <p className="text-sm font-semibold text-ink/70">
            {data.total} {data.total === 1 ? "user" : "users"}
            {filtered ? " match your filters" : ""}
          </p>
          <ul className={cx("space-y-3 transition-opacity", isFetching && "opacity-60")}>
            {data.items.map((u) => (
              <li key={u._id}>
                <button
                  type="button"
                  onClick={() => write({ ...applied, user: u._id })}
                  className={cx(
                    "grid w-full items-center gap-3 rounded-2xl border-2 border-ink p-4 text-left shadow-block-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-block",
                    "md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.2fr)]",
                    u._id === applied.user ? "bg-accent-soft" : "bg-white"
                  )}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <Avatar name={u.name} />
                    <span className="min-w-0">
                      <span className="block truncate font-bold">{u.name}</span>
                      <span className="block truncate text-sm text-ink/65">{u.email}</span>
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-1.5">
                    <RoleBadge role={u.role} />
                    {u.isBlocked && <Badge tone="danger">Blocked</Badge>}
                    {!u.emailVerified && <Badge>Unverified</Badge>}
                  </span>
                  <span className="text-sm text-ink/70">
                    {u.role === "recruiter" && u.companyId && (
                      <span className="mb-0.5 flex items-center gap-2">
                        <span className="truncate font-semibold text-ink">{u.companyId.name}</span>
                        <CompanyStatusBadge status={u.companyId.status} />
                      </span>
                    )}
                    <span className="block">Joined {formatDate(u.createdAt)}</span>
                    <span className="block text-xs">{u.lastLoginAt ? `Last login ${timeAgo(u.lastLoginAt)}` : "Never logged in"}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <Pagination
            page={data.page}
            pages={data.pages}
            onChange={(p) => {
              write({ ...applied, page: p });
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        </>
      )}

      {applied.user && (
        <Drawer title="User" onClose={closePanel}>
          <UserPanel id={applied.user} onDeleted={closePanel} />
        </Drawer>
      )}
    </div>
  );
}