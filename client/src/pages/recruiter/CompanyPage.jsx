import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api, { applyFieldErrors, getError } from "../../lib/api";
import { useCompany } from "../../hooks/useCompany";
import Card from "../../components/Card";
import CompanyLogo from "../../components/CompanyLogo";
import ConfirmDialog from "../../components/ConfirmDialog";
import { Alert, Button, Field, TextField } from "../../components/ui";
import { Badge, Select, Skeleton, Textarea } from "../../components/bits";

const FIELDS = ["name", "website", "industry", "size", "location", "description", "logoUrl"];
const REVIEWED = ["name", "website", "description"]; // changing these re-opens the admin review
const SIZES = ["1-10", "11-50", "51-200", "201-1000", "1000+"];

const schema = z.object({
  name: z.string().trim().min(2, "Enter your company name").max(120, "That name is too long"),
  website: z.string().trim().refine((v) => v === "" || /^https?:\/\/[^\s.]+\.[^\s]+$/i.test(v), "Use a full link, like https://example.com"),
  industry: z.string().trim().max(80, "That is too long"),
  size: z.string(),
  location: z.string().trim().max(120, "That is too long"),
  description: z.string().trim().max(2000, "Keep it under 2000 characters"),
  logoUrl: z.string().trim().refine((v) => v === "" || (/^https:\/\/[^\s]+$/i.test(v) && v.length <= 500), "Use a full https link to an image (up to 500 characters)"),
});

const originalOf = (c) => Object.fromEntries(FIELDS.map((k) => [k, c[k] || ""]));

const STATUS = {
  approved: { tone: "accent", label: "Approved", text: "Your company is approved. You can post jobs." },
  pending: { tone: "plain", label: "Under review", text: "An admin is reviewing your company. You can post jobs once it is approved." },
  rejected: { tone: "danger", label: "Not approved", text: "Your company was not approved. Update the details below to resubmit it." },
};

function CompanyForm({ company }) {
  const qc = useQueryClient();
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(null); // { body } waiting for the re-review confirmation
  const original = originalOf(company);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues: original });

  const save = useMutation({
    mutationFn: async (body) => (await api.patch("/companies/me", body)).data,
    onSuccess: (data) => {
      setPending(null);
      qc.setQueryData(["r", "company"], data.company);
      qc.invalidateQueries({ queryKey: ["r"] });
      reset(originalOf(data.company));
      if (data.reReview) {
        toast.success(`Saved. Your company is back in review${data.suspendedJobs ? ` and ${data.suspendedJobs} live ${data.suspendedJobs === 1 ? "job is" : "jobs are"} hidden until approved` : ""}.`, { duration: 6000 });
      } else if (company.status === "rejected") {
        toast.success("Company resubmitted for review.");
      } else {
        toast.success("Company saved");
      }
    },
    onError: (err) => {
      setPending(null);
      const info = getError(err);
      const unplaced = applyFieldErrors(info, setError, { known: FIELDS });
      if (unplaced.length) setFormError(unplaced.join(" "));
      else if (!info.fields.length) setFormError(info.message);
    },
  });

  const onSubmit = (values) => {
    setFormError("");
    // Only changed fields are sent, so untouched fields can never trigger a new review
    const changed = FIELDS.filter((k) => values[k] !== original[k]);
    if (changed.length === 0) {
      toast("Nothing to save. You haven't changed anything.");
      return;
    }
    const body = Object.fromEntries(changed.map((k) => [k, values[k]]));
    const reReview = company.status === "approved" && changed.some((k) => REVIEWED.includes(k));
    if (reReview) setPending({ body });
    else save.mutate(body);
  };

  const logo = watch("logoUrl");
  const nameValue = watch("name");

  return (
    <form onSubmit={handleSubmit(onSubmit, () => setFormError("Some fields need attention. They are marked in red below."))} noValidate className="space-y-6">
      {formError && <Alert>{formError}</Alert>}
      {company.status === "approved" && (
        <Alert tone="info">Changing the company name, website or description sends your company back to an admin. Your live jobs are hidden until it is approved again.</Alert>
      )}
      {company.status === "rejected" && <Alert>Saving your changes resubmits your company for review.</Alert>}

      <Card title="Details">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Company name" autoComplete="organization" error={errors.name?.message} {...register("name")} />
          <TextField label="Website" placeholder="https://example.com" error={errors.website?.message} {...register("website")} />
          <TextField label="Industry" error={errors.industry?.message} {...register("industry")} />
          <Field label="Company size" htmlFor="co-size">
            <Select id="co-size" {...register("size")}>
              {!company.size && <option value="">Not specified</option>}
              {SIZES.map((s) => (
                <option key={s} value={s}>
                  {s} people
                </option>
              ))}
            </Select>
          </Field>
          <TextField label="Location" error={errors.location?.message} {...register("location")} />
        </div>
        <div className="mt-4">
          <Field label="About the company" htmlFor="co-desc" error={errors.description?.message} hint="Shown on every job you post.">
            <Textarea id="co-desc" className="min-h-32" {...register("description")} />
          </Field>
        </div>
      </Card>

      <Card title="Logo">
        <div className="flex items-start gap-4">
          <CompanyLogo company={{ name: nameValue, logoUrl: logo }} size={64} />
          <div className="flex-1">
            <TextField label="Logo link" placeholder="https://example.com/logo.png" hint="Paste an https link to an image. Uploading a logo file is coming later." error={errors.logoUrl?.message} {...register("logoUrl")} />
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" loading={save.isPending && !pending}>
          Save company
        </Button>
      </div>

      {pending && (
        <ConfirmDialog
          title="Send your company back for review?"
          text="Your live jobs are hidden from candidates until an admin approves the changes. Applicants already in your pipeline are not affected."
          confirmLabel="Save and send for review"
          loading={save.isPending}
          onConfirm={() => save.mutate(pending.body)}
          onClose={() => setPending(null)}
        />
      )}
    </form>
  );
}

export default function CompanyPage() {
  const { data: company, isPending, isError, error, refetch } = useCompany();

  if (isPending) {
    return (
      <div className="max-w-3xl space-y-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-3xl space-y-3">
        <Alert>{getError(error).message}</Alert>
        <Button variant="secondary" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const status = STATUS[company.status] || STATUS.pending;

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Your company</h1>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[15px]">{status.text}</p>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
        {company.status === "rejected" && company.rejectionReason && (
          <p className="mt-3 rounded-xl border-2 border-ink bg-danger-soft p-3 text-sm">
            <span className="block text-xs font-bold uppercase tracking-wide text-ink/60">Reason from the admin</span>
            {company.rejectionReason}
          </p>
        )}
      </Card>

      {/* Keyed by the saved values, so the form shows the server's version after every save */}
      <CompanyForm key={JSON.stringify(originalOf(company))} company={company} />
    </div>
  );
}