import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import api, { applyFieldErrors, getError } from "../../lib/api";
import { endOfLocalDayISO, toLocalDate, todayLocal } from "../../lib/recruiter";
import { useCompany } from "../../hooks/useCompany";
import Card from "../../components/Card";
import ConfirmDialog from "../../components/ConfirmDialog";
import { ChipInput } from "../../components/formBits";
import { Alert, Button, Field, TextField, buttonClass } from "../../components/ui";
import { EmptyState, Select, Skeleton, Textarea } from "../../components/bits";

const FIELDS = ["title", "description", "location", "workMode", "employmentType", "minExp", "maxExp", "ctcMin", "ctcMax", "openings", "deadline", "skills"];
const RENAME = { "ctcRange.min": "ctcMin", "ctcRange.max": "ctcMax" };

const num = (max) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || (Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= max), `Enter a number from 0 to ${max}`);

// The server cannot clear these once they are set, so the form says so instead of failing silently
const makeSchema = (job) =>
  z
    .object({
      title: z.string().trim().min(3, "Enter a job title (at least 3 characters)").max(120, "Keep it under 120 characters"),
      description: z.string().trim().min(20, "Describe the role in at least 20 characters").max(8000, "Keep it under 8000 characters"),
      location: z.string().trim().min(2, "Enter a location").max(120, "Keep it under 120 characters"),
      workMode: z.enum(["onsite", "hybrid", "remote"]),
      employmentType: z.enum(["full-time", "part-time", "internship", "contract"]),
      minExp: num(60),
      maxExp: num(60),
      ctcMin: num(1000),
      ctcMax: num(1000),
      openings: z.string().trim().refine((v) => /^\d+$/.test(v) && +v >= 1 && +v <= 1000, "Enter a whole number from 1 to 1000"),
      deadline: z.string(),
      skills: z.array(z.string()).max(20, "Up to 20 skills"),
    })
    .superRefine((v, ctx) => {
      const add = (path, message) => ctx.addIssue({ code: "custom", path: [path], message });

      if (v.maxExp !== "" && Number(v.maxExp) < Number(v.minExp || 0)) add("maxExp", "Maximum can't be lower than the minimum");
      if (v.ctcMin !== "" && v.ctcMax !== "" && Number(v.ctcMax) < Number(v.ctcMin)) add("ctcMax", "Maximum pay can't be lower than the minimum");

      const originalDeadline = job?.deadline ? toLocalDate(job.deadline) : "";
      if (v.deadline && v.deadline !== originalDeadline && v.deadline <= todayLocal()) add("deadline", "Choose a date after today");

      if (job) {
        if (job.maxExp != null && v.maxExp === "") add("maxExp", "Can't be removed once set. Change it instead.");
        if (job.ctcRange?.min != null && v.ctcMin === "") add("ctcMin", "Can't be removed once set. Change it instead.");
        if (job.ctcRange?.max != null && v.ctcMax === "") add("ctcMax", "Can't be removed once set. Change it instead.");
        if (originalDeadline && v.deadline === "") add("deadline", "Can't be removed once set. Change it instead.");
      }
    });

const toFormValues = (job) => ({
  title: job?.title || "",
  description: job?.description || "",
  location: job?.location || "",
  workMode: job?.workMode || "onsite",
  employmentType: job?.employmentType || "full-time",
  minExp: String(job?.minExp ?? 0),
  maxExp: job?.maxExp != null ? String(job.maxExp) : "",
  ctcMin: job?.ctcRange?.min != null ? String(job.ctcRange.min) : "",
  ctcMax: job?.ctcRange?.max != null ? String(job.ctcRange.max) : "",
  openings: String(job?.openings ?? 1),
  deadline: job?.deadline ? toLocalDate(job.deadline) : "",
  skills: job?.skills || [],
});

const toPayload = (v, job) => {
  const body = {
    title: v.title,
    description: v.description,
    location: v.location,
    workMode: v.workMode,
    employmentType: v.employmentType,
    skills: v.skills,
    minExp: v.minExp === "" ? 0 : Number(v.minExp),
    openings: Number(v.openings),
  };
  if (v.maxExp !== "") body.maxExp = Number(v.maxExp);
  if (v.ctcMin !== "" || v.ctcMax !== "") {
    body.ctcRange = {};
    if (v.ctcMin !== "") body.ctcRange.min = Number(v.ctcMin);
    if (v.ctcMax !== "") body.ctcRange.max = Number(v.ctcMax);
  }
  // An unchanged deadline is not sent again
  if (v.deadline && v.deadline !== (job?.deadline ? toLocalDate(job.deadline) : "")) body.deadline = endOfLocalDayISO(v.deadline);
  return body;
};

// Editing any of these on a live job sends it back to the admin (openings and deadline are free)
const needsReview = (v, job) => {
  const p = toPayload(v, job);
  if (p.title !== job.title || p.description !== job.description || p.location !== job.location) return true;
  if (p.workMode !== job.workMode || p.employmentType !== job.employmentType) return true;
  if ([...p.skills].sort().join(",") !== [...job.skills].sort().join(",")) return true;
  if (p.minExp !== (job.minExp ?? 0) || (p.maxExp ?? null) !== (job.maxExp ?? null)) return true;
  if ((p.ctcRange?.min ?? null) !== (job.ctcRange?.min ?? null) || (p.ctcRange?.max ?? null) !== (job.ctcRange?.max ?? null)) return true;
  return false;
};

function JobForm({ job }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const editing = Boolean(job);
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(null); // values waiting for the "send back to review" confirmation

  const schema = useMemo(() => makeSchema(job), [job]);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues: toFormValues(job) });

  const skills = watch("skills");

  const save = useMutation({
    mutationFn: async (values) => {
      const payload = toPayload(values, job);
      return editing ? (await api.patch(`/jobs/${job._id}`, payload)).data : (await api.post("/jobs", payload)).data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["r"] });
      if (!editing) toast.success("Job submitted. An admin will review it before it goes live.");
      else if (data.job.status === "pending" && job.status !== "pending") {
        toast.success(job.status === "rejected" ? "Job resubmitted for review." : "Saved. An admin must approve the changes before it is live again.");
      } else toast.success("Job saved");
      navigate("/recruiter/jobs");
    },
    onError: (err) => {
      setPending(null);
      const info = getError(err);
      const unplaced = applyFieldErrors(info, setError, { rename: RENAME, known: FIELDS });
      if (unplaced.length) setFormError(unplaced.join(" "));
      else if (!info.fields.length) setFormError(info.message);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
  });

  const onSubmit = (values) => {
    setFormError("");
    if (editing && job.status === "active" && needsReview(values, job)) setPending(values);
    else save.mutate(values);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit, () => setFormError("Some fields need attention. They are marked in red below."))} noValidate className="space-y-6">
      {formError && <Alert>{formError}</Alert>}

      {editing && job.status === "rejected" && (
        <Alert>
          An admin rejected this job{job.rejectionReason ? `: ${job.rejectionReason}` : "."} Saving your changes sends it for review again.
        </Alert>
      )}
      {editing && job.status === "active" && (
        <Alert tone="info">
          Changing the title, description, location, work mode, job type, skills, experience or pay sends this live job back to an admin, and it stays hidden until approved. Openings and the deadline can be changed freely.
        </Alert>
      )}
      {editing && <p className="text-sm text-ink/60">Once set, the maximum experience, pay range and deadline can be changed but not removed.</p>}

      <Card title="Basics">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <TextField label="Job title" placeholder="Backend Developer" error={errors.title?.message} {...register("title")} />
          </div>
          <TextField label="Location" placeholder="Bengaluru" error={errors.location?.message} {...register("location")} />
          <Field label="Work mode" htmlFor="jf-mode">
            <Select id="jf-mode" {...register("workMode")}>
              <option value="onsite">Onsite</option>
              <option value="hybrid">Hybrid</option>
              <option value="remote">Remote</option>
            </Select>
          </Field>
          <Field label="Job type" htmlFor="jf-type">
            <Select id="jf-type" {...register("employmentType")}>
              <option value="full-time">Full-time</option>
              <option value="part-time">Part-time</option>
              <option value="internship">Internship</option>
              <option value="contract">Contract</option>
            </Select>
          </Field>
          <TextField label="Openings" type="number" min="1" max="1000" inputMode="numeric" error={errors.openings?.message} {...register("openings")} />
        </div>
      </Card>

      <Card title="Description">
        <Field label="About the role" htmlFor="jf-desc" error={errors.description?.message} hint="Plain text only. Line breaks are kept.">
          <Textarea id="jf-desc" className="min-h-48" {...register("description")} />
        </Field>
      </Card>

      <Card title="Requirements">
        <ChipInput
          id="jf-skills"
          label="Skills"
          value={skills}
          onChange={(v) => setValue("skills", v, { shouldDirty: true })}
          max={20}
          placeholder="node.js, express, mongodb"
          hint="Press Enter to add. Candidates are ranked by how many of these they have."
        />
        {errors.skills?.message && <p className="mt-1.5 text-sm font-medium text-danger">{errors.skills.message}</p>}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <TextField label="Minimum experience (years)" type="number" min="0" max="60" step="0.5" inputMode="decimal" error={errors.minExp?.message} {...register("minExp")} />
          <TextField label="Maximum experience (optional)" type="number" min="0" max="60" step="0.5" inputMode="decimal" error={errors.maxExp?.message} {...register("maxExp")} />
        </div>
      </Card>

      <Card title="Pay and deadline">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Minimum pay (LPA, optional)" type="number" min="0" step="0.5" inputMode="decimal" error={errors.ctcMin?.message} {...register("ctcMin")} />
          <TextField label="Maximum pay (LPA, optional)" type="number" min="0" step="0.5" inputMode="decimal" error={errors.ctcMax?.message} {...register("ctcMax")} />
          <TextField
            label="Application deadline (optional)"
            type="date"
            min={todayLocal()}
            hint="The job closes at the end of this day."
            error={errors.deadline?.message}
            {...register("deadline")}
          />
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Link to="/recruiter/jobs" className={buttonClass("ghost")}>
          Cancel
        </Link>
        <Button type="submit" loading={save.isPending && !pending}>
          {editing ? (job.status === "rejected" ? "Save and resubmit" : "Save changes") : "Submit for review"}
        </Button>
      </div>

      {pending && (
        <ConfirmDialog
          title="Send this job back for review?"
          text="Your changes need an admin's approval. Until then the job is hidden from candidates. Existing applicants stay in your pipeline."
          confirmLabel="Save and send for review"
          loading={save.isPending}
          onConfirm={() => save.mutate(pending)}
          onClose={() => setPending(null)}
        />
      )}
    </form>
  );
}

export default function JobEditor() {
  const { id } = useParams();
  const company = useCompany();
  const jobQuery = useQuery({
    queryKey: ["r", "job", id],
    queryFn: async () => (await api.get(`/jobs/mine/${id}`)).data.job,
    enabled: Boolean(id),
  });

  const back = (
    <Link to="/recruiter/jobs" className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline">
      <ArrowLeft size={16} aria-hidden="true" />
      All jobs
    </Link>
  );

  let content;
  if (company.isPending || (id && jobQuery.isPending)) {
    content = (
      <div className="space-y-4">
        <Skeleton className="h-40" />
        <Skeleton className="h-56" />
      </div>
    );
  } else if (company.isError) {
    content = (
      <div className="space-y-3">
        <Alert>{getError(company.error).message}</Alert>
        <Button variant="secondary" onClick={() => company.refetch()}>
          Try again
        </Button>
      </div>
    );
  } else if (id && jobQuery.isError) {
    const info = getError(jobQuery.error);
    content =
      info.status === 404 || info.status === 400 ? (
        <EmptyState title="Job not found" text="It may not exist, or it belongs to another account." />
      ) : (
        <div className="space-y-3">
          <Alert>{info.message}</Alert>
          <Button variant="secondary" onClick={() => jobQuery.refetch()}>
            Try again
          </Button>
        </div>
      );
  } else if (company.data.status !== "approved") {
    content = (
      <Alert tone="info">
        Your company must be approved by an admin before you can post or edit jobs.{" "}
        <Link to="/recruiter/company" className="font-extrabold underline underline-offset-4">
          View company status
        </Link>
      </Alert>
    );
  } else if (jobQuery.data && ["closed", "expired", "suspended"].includes(jobQuery.data.status)) {
    content = <Alert tone="info">A {jobQuery.data.status} job can't be edited.</Alert>;
  } else {
    content = <JobForm job={jobQuery.data} />;
  }

  return (
    <div className="max-w-3xl space-y-6">
      {back}
      <h1 className="text-3xl font-extrabold tracking-tight">{id ? "Edit job" : "Post a job"}</h1>
      {content}
    </div>
  );
}