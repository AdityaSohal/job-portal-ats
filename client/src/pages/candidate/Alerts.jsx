import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import api, { getError } from "../../lib/api";
import { cap, timeAgo } from "../../lib/format";
import Card from "../../components/Card";
import ConfirmDialog from "../../components/ConfirmDialog";
import { CheckList, ChipInput } from "../../components/formBits";
import { Alert, Button, Field, Input, TextField } from "../../components/ui";
import { Badge, EmptyState, Select, Skeleton } from "../../components/bits";

const MAX_ALERTS = 5;
const WORK_MODES = [["onsite", "Onsite"], ["hybrid", "Hybrid"], ["remote", "Remote"]];
const TYPES = [["full-time", "Full-time"], ["part-time", "Part-time"], ["internship", "Internship"], ["contract", "Contract"]];
const EMPTY = { name: "", frequency: "daily", q: "", location: "", workMode: [], employmentType: [], exp: "", ctc: "", skills: [] };

const outOfRange = (v, max) => v !== "" && !(Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= max);

const buildPayload = (f) => {
  const filters = {};
  if (f.q.trim()) filters.q = f.q.trim();
  if (f.location.trim()) filters.location = f.location.trim();
  if (f.workMode.length) filters.workMode = f.workMode;
  if (f.employmentType.length) filters.employmentType = f.employmentType;
  if (f.exp !== "") filters.exp = Number(f.exp);
  if (f.ctc !== "") filters.ctc = Number(f.ctc);
  if (f.skills.length) filters.skills = f.skills;
  return { ...(f.name.trim() && { name: f.name.trim() }), frequency: f.frequency, filters };
};

const validate = (f) => {
  if (f.q.trim().length === 1) return "A keyword needs at least 2 characters.";
  if (outOfRange(f.exp, 60)) return "Experience must be a number from 0 to 60.";
  if (outOfRange(f.ctc, 1000)) return "Pay must be a number from 0 to 1000.";
  if (!Object.keys(buildPayload(f).filters).length) return "Add at least one filter to the alert.";
  return "";
};

const summary = (filters = {}) => {
  const parts = [];
  if (filters.q) parts.push(`“${filters.q}”`);
  if (filters.location) parts.push(filters.location);
  if (filters.workMode?.length) parts.push(filters.workMode.map(cap).join(" or "));
  if (filters.employmentType?.length) parts.push(filters.employmentType.map(cap).join(" or "));
  if (filters.exp != null) parts.push(`${filters.exp} yrs experience`);
  if (filters.ctc != null) parts.push(`₹${filters.ctc}+ LPA`);
  if (filters.skills?.length) parts.push(`Skills: ${filters.skills.join(", ")}`);
  return parts;
};

function AlertForm({ onDone, onCancel }) {
  const qc = useQueryClient();
  const [f, setF] = useState(EMPTY);
  const [error, setError] = useState("");
  const set = (patch) => setF((old) => ({ ...old, ...patch }));

  const create = useMutation({
    mutationFn: async () => (await api.post("/alerts", buildPayload(f))).data,
    onSuccess: () => {
      toast.success("Alert created");
      qc.invalidateQueries({ queryKey: ["alerts"] });
      onDone();
    },
    onError: (err) => {
      const info = getError(err);
      setError(info.fields.length ? info.fields.map((x) => x.message).join(" · ") : info.message);
    },
  });

  const submit = (e) => {
    e.preventDefault();
    const problem = validate(f);
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    create.mutate();
  };

  return (
    <Card title="New job alert">
      <form onSubmit={submit} noValidate className="space-y-5">
        {error && <Alert>{error}</Alert>}

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Name (optional)" placeholder="Remote React jobs" maxLength={80} value={f.name} onChange={(e) => set({ name: e.target.value })} />
          <Field label="How often" htmlFor="alert-frequency">
            <Select id="alert-frequency" value={f.frequency} onChange={(e) => set({ frequency: e.target.value })}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </Select>
          </Field>
          <TextField label="Keyword" placeholder="backend" value={f.q} onChange={(e) => set({ q: e.target.value })} />
          <TextField label="Location" placeholder="Pune" value={f.location} onChange={(e) => set({ location: e.target.value })} />
          <Field label="Your experience (years)" htmlFor="alert-exp" hint="Jobs asking for this much or less.">
            <Input id="alert-exp" type="number" min="0" max="60" step="0.5" value={f.exp} onChange={(e) => set({ exp: e.target.value })} />
          </Field>
          <Field label="Minimum pay (LPA)" htmlFor="alert-ctc" hint="Jobs paying at least this.">
            <Input id="alert-ctc" type="number" min="0" max="1000" step="0.5" value={f.ctc} onChange={(e) => set({ ctc: e.target.value })} />
          </Field>
        </div>

        <CheckList legend="Work mode" options={WORK_MODES} value={f.workMode} onChange={(workMode) => set({ workMode })} />
        <CheckList legend="Job type" options={TYPES} value={f.employmentType} onChange={(employmentType) => set({ employmentType })} />
        <ChipInput id="alert-skills" label="Skills" value={f.skills} onChange={(skills) => set({ skills })} max={10} placeholder="react, node.js" hint="Press Enter to add. Jobs matching any of them are included." />

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" loading={create.isPending}>
            Create alert
          </Button>
        </div>
      </form>
    </Card>
  );
}

export default function Alerts() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["alerts"],
    queryFn: async () => (await api.get("/alerts")).data.items,
  });

  const toggle = useMutation({
    mutationFn: async ({ id, isActive }) => (await api.patch(`/alerts/${id}`, { isActive })).data,
    onSuccess: (_, { isActive }) => toast.success(isActive ? "Alert resumed" : "Alert paused"),
    onError: (err) => toast.error(getError(err).message),
    onSettled: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });

  const remove = useMutation({
    mutationFn: async (id) => (await api.delete(`/alerts/${id}`)).data,
    onSuccess: () => toast.success("Alert deleted"),
    onError: (err) => {
      const info = getError(err);
      if (info.status !== 404) toast.error(info.message);
    },
    onSettled: () => {
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ["alerts"] });
    },
  });

  const atLimit = (data?.length || 0) >= MAX_ALERTS;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Job alerts</h1>
          <p className="mt-1 text-sm text-ink/70">We email you when new jobs matching a search go live.</p>
        </div>
        {!creating && (
          <Button onClick={() => setCreating(true)} disabled={atLimit || isPending}>
            <Plus size={18} aria-hidden="true" />
            New alert
          </Button>
        )}
      </div>

      {atLimit && !creating && <Alert tone="info">You have {MAX_ALERTS} alerts, which is the maximum. Delete one to add another.</Alert>}

      {creating && <AlertForm onDone={() => setCreating(false)} onCancel={() => setCreating(false)} />}

      {isPending ? (
        <Skeleton className="h-28" />
      ) : isError ? (
        <div className="space-y-3">
          <Alert>{getError(error).message}</Alert>
          <Button variant="secondary" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : data.length === 0 ? (
        !creating && <EmptyState title="No alerts yet" text="Create one and we'll email you when matching jobs are posted." />
      ) : (
        <div className="space-y-3">
          {data.map((a) => (
            <article key={a._id} className="rounded-2xl border-2 border-ink bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="flex items-center gap-2 text-lg font-bold">
                    {a.isActive ? <Bell size={18} aria-hidden="true" /> : <BellOff size={18} className="text-ink/50" aria-hidden="true" />}
                    {a.name}
                  </h2>
                  <p className="mt-0.5 text-xs text-ink/60">{a.lastSentAt ? `Last email ${timeAgo(a.lastSentAt)}` : "No email sent yet"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={a.isActive ? "accent" : "plain"}>{a.isActive ? cap(a.frequency) : "Paused"}</Badge>
                  <Button size="sm" variant="secondary" onClick={() => toggle.mutate({ id: a._id, isActive: !a.isActive })} disabled={toggle.isPending}>
                    {a.isActive ? "Pause" : "Resume"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setDeleting(a)}
                    aria-label={`Delete ${a.name}`}
                    className="flex size-9 items-center justify-center rounded-lg border-2 border-ink hover:bg-danger-soft"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {summary(a.filters).map((part) => (
                  <li key={part} className="rounded-md border border-ink/30 bg-paper px-2 py-0.5 text-xs font-medium">
                    {part}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete this alert?"
          text={`You will stop getting emails for "${deleting.name}".`}
          confirmLabel="Delete alert"
          loading={remove.isPending}
          onConfirm={() => remove.mutate(deleting._id)}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}