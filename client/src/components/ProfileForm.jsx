import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import api, { getError } from "../lib/api";
import { toDateInput } from "../lib/format";
import { useAuth } from "../store/auth";
import Card from "./Card";
import { ChipInput } from "./formBits";
import { Alert, Button, Field, TextField } from "./ui";
import { Select, Textarea } from "./bits";

// ---- validation: the same limits the server enforces ----
const yearRule = z
  .string()
  .trim()
  .refine((v) => v === "" || (/^\d{4}$/.test(v) && +v >= 1950 && +v <= 2100), "Enter a 4-digit year");
const urlRule = z
  .string()
  .trim()
  .refine((v) => v === "" || /^https?:\/\/[^\s.]+\.[^\s]+$/i.test(v), "Use a full link, like https://example.com");
const numberRule = (max) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || (Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= max), `Enter a number from 0 to ${max}`);

const schema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80, "That name is too long"),
  headline: z.string().trim().max(120, "Keep it under 120 characters"),
  summary: z.string().trim().max(2000, "Keep it under 2000 characters"),
  location: z.string().trim().max(100, "That is too long"),
  phone: z.string().trim().refine((v) => v === "" || /^\+?[\d\s\-()]{7,20}$/.test(v), "Enter a valid phone number"),
  experienceYears: numberRule(60),
  expectedCtc: numberRule(1000),
  preferredWorkMode: z.string(),
  skills: z.array(z.string()).max(30, "Up to 30 skills"),
  education: z
    .array(
      z
        .object({
          institution: z.string().trim().min(2, "Enter the institution").max(120, "That is too long"),
          degree: z.string().trim().max(80, "That is too long"),
          fieldOfStudy: z.string().trim().max(80, "That is too long"),
          startYear: yearRule,
          endYear: yearRule,
          grade: z.string().trim().max(20, "That is too long"),
        })
        .refine((e) => e.startYear === "" || e.endYear === "" || +e.endYear >= +e.startYear, {
          message: "End year can't be before the start year",
          path: ["endYear"],
        })
    )
    .max(10, "Up to 10 entries"),
  experience: z
    .array(
      z
        .object({
          company: z.string().trim().min(2, "Enter the company").max(120, "That is too long"),
          title: z.string().trim().min(2, "Enter the job title").max(120, "That is too long"),
          startDate: z.string(),
          endDate: z.string(),
          description: z.string().trim().max(1500, "Keep it under 1500 characters"),
        })
        .refine((x) => !x.startDate || !x.endDate || x.endDate >= x.startDate, {
          message: "End date can't be before the start date",
          path: ["endDate"],
        })
    )
    .max(15, "Up to 15 entries"),
  portfolio: urlRule,
  github: urlRule,
  linkedin: urlRule,
});

const toFormValues = (p, name) => ({
  name,
  headline: p.headline || "",
  summary: p.summary || "",
  location: p.location || "",
  phone: p.phone || "",
  experienceYears: p.experienceYears != null ? String(p.experienceYears) : "0",
  expectedCtc: p.expectedCtc != null ? String(p.expectedCtc) : "",
  preferredWorkMode: p.preferredWorkMode || "",
  skills: p.skills || [],
  education: (p.education || []).map((e) => ({
    institution: e.institution || "",
    degree: e.degree || "",
    fieldOfStudy: e.fieldOfStudy || "",
    startYear: e.startYear ? String(e.startYear) : "",
    endYear: e.endYear ? String(e.endYear) : "",
    grade: e.grade || "",
  })),
  experience: (p.experience || []).map((x) => ({
    company: x.company || "",
    title: x.title || "",
    startDate: toDateInput(x.startDate),
    endDate: toDateInput(x.endDate),
    description: x.description || "",
  })),
  portfolio: p.links?.portfolio || "",
  github: p.links?.github || "",
  linkedin: p.links?.linkedin || "",
});

const toPayload = (v) => ({
  name: v.name,
  headline: v.headline,
  summary: v.summary,
  location: v.location,
  phone: v.phone,
  experienceYears: v.experienceYears === "" ? 0 : Number(v.experienceYears),
  expectedCtc: v.expectedCtc === "" ? null : Number(v.expectedCtc),
  preferredWorkMode: v.preferredWorkMode,
  skills: v.skills,
  education: v.education.map((e) => ({
    institution: e.institution,
    degree: e.degree,
    fieldOfStudy: e.fieldOfStudy,
    ...(e.startYear && { startYear: Number(e.startYear) }),
    ...(e.endYear && { endYear: Number(e.endYear) }),
    grade: e.grade,
  })),
  experience: v.experience.map((x) => ({
    company: x.company,
    title: x.title,
    ...(x.startDate && { startDate: x.startDate }),
    ...(x.endDate && { endDate: x.endDate }),
    description: x.description,
  })),
  links: { portfolio: v.portfolio, github: v.github, linkedin: v.linkedin },
});

const EMPTY_EDU = { institution: "", degree: "", fieldOfStudy: "", startYear: "", endYear: "", grade: "" };
const EMPTY_EXP = { company: "", title: "", startDate: "", endDate: "", description: "" };

export default function ProfileForm({ profile }) {
  const qc = useQueryClient();
  const user = useAuth((s) => s.user);
  const [formError, setFormError] = useState("");

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: toFormValues(profile, user.name) });

  const education = useFieldArray({ control, name: "education" });
  const experience = useFieldArray({ control, name: "experience" });
  const skills = watch("skills");

  const onSubmit = async (values) => {
    setFormError("");
    try {
      const { data } = await api.put("/profile/me", toPayload(values));
      qc.setQueryData(["profile"], data);
      reset(toFormValues(data.profile, values.name)); // shows the server's version, for example normalized skills
      useAuth.setState((s) => ({ user: s.user ? { ...s.user, name: values.name } : s.user }));
      toast.success("Profile saved");
    } catch (err) {
      const info = getError(err);
      setFormError(info.fields.length ? info.fields.map((f) => f.message).join(" · ") : info.message);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const onInvalid = () => setFormError("Some fields need attention. They are marked in red below.");

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate className="space-y-6">
      {formError && <Alert>{formError}</Alert>}

      <Card title="Basics">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Full name" autoComplete="name" error={errors.name?.message} {...register("name")} />
          <TextField label="Headline" placeholder="MERN stack developer" error={errors.headline?.message} {...register("headline")} />
          <TextField label="Location" autoComplete="address-level2" error={errors.location?.message} {...register("location")} />
          <TextField label="Phone" type="tel" autoComplete="tel" placeholder="+91 98765 43210" error={errors.phone?.message} {...register("phone")} />
          <TextField label="Experience (years)" type="number" min="0" max="60" step="0.5" inputMode="decimal" error={errors.experienceYears?.message} {...register("experienceYears")} />
          <TextField label="Expected pay (LPA)" type="number" min="0" max="1000" step="0.5" inputMode="decimal" error={errors.expectedCtc?.message} {...register("expectedCtc")} />
          <Field label="Preferred work mode" htmlFor="pwm">
            <Select id="pwm" {...register("preferredWorkMode")}>
              <option value="">No preference</option>
              <option value="onsite">Onsite</option>
              <option value="hybrid">Hybrid</option>
              <option value="remote">Remote</option>
            </Select>
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Summary" htmlFor="summary" error={errors.summary?.message} hint="A few sentences about you. At least 30 characters counts towards your completion score.">
            <Textarea id="summary" {...register("summary")} />
          </Field>
        </div>
      </Card>

      <Card title="Skills">
        <ChipInput
          id="skills"
          label="Your skills"
          value={skills}
          onChange={(v) => setValue("skills", v, { shouldDirty: true })}
          max={30}
          placeholder="react, node.js, mongodb"
          hint="Press Enter to add. Common spellings like NodeJS are matched for you."
        />
        {errors.skills?.message && <p className="mt-1.5 text-sm font-medium text-danger">{errors.skills.message}</p>}
      </Card>

      <Card
        title="Education"
        action={
          <Button type="button" size="sm" variant="secondary" onClick={() => education.append(EMPTY_EDU)} disabled={education.fields.length >= 10}>
            <Plus size={16} aria-hidden="true" />
            Add
          </Button>
        }
      >
        {education.fields.length === 0 && <p className="text-sm text-ink/70">Add your degree or course.</p>}
        <div className="space-y-4">
          {education.fields.map((field, i) => {
            const e = errors.education?.[i];
            return (
              <fieldset key={field.id} className="rounded-xl border-2 border-dashed border-ink/40 p-4">
                <legend className="sr-only">Education {i + 1}</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField label="Institution" error={e?.institution?.message} {...register(`education.${i}.institution`)} />
                  <TextField label="Degree" placeholder="B.Tech" error={e?.degree?.message} {...register(`education.${i}.degree`)} />
                  <TextField label="Field of study" error={e?.fieldOfStudy?.message} {...register(`education.${i}.fieldOfStudy`)} />
                  <TextField label="Grade" placeholder="8.5 CGPA" error={e?.grade?.message} {...register(`education.${i}.grade`)} />
                  <TextField label="Start year" inputMode="numeric" maxLength={4} error={e?.startYear?.message} {...register(`education.${i}.startYear`)} />
                  <TextField label="End year" inputMode="numeric" maxLength={4} error={e?.endYear?.message} {...register(`education.${i}.endYear`)} />
                </div>
                <Button type="button" size="sm" variant="ghost" className="mt-3" onClick={() => education.remove(i)}>
                  <Trash2 size={15} aria-hidden="true" />
                  Remove
                </Button>
              </fieldset>
            );
          })}
        </div>
      </Card>

      <Card
        title="Experience"
        action={
          <Button type="button" size="sm" variant="secondary" onClick={() => experience.append(EMPTY_EXP)} disabled={experience.fields.length >= 15}>
            <Plus size={16} aria-hidden="true" />
            Add
          </Button>
        }
      >
        {experience.fields.length === 0 && <p className="text-sm text-ink/70">Add internships and jobs. Leave the end date empty for your current role.</p>}
        <div className="space-y-4">
          {experience.fields.map((field, i) => {
            const x = errors.experience?.[i];
            return (
              <fieldset key={field.id} className="rounded-xl border-2 border-dashed border-ink/40 p-4">
                <legend className="sr-only">Experience {i + 1}</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField label="Company" error={x?.company?.message} {...register(`experience.${i}.company`)} />
                  <TextField label="Job title" error={x?.title?.message} {...register(`experience.${i}.title`)} />
                  <TextField label="Start date" type="date" error={x?.startDate?.message} {...register(`experience.${i}.startDate`)} />
                  <TextField label="End date" type="date" error={x?.endDate?.message} {...register(`experience.${i}.endDate`)} />
                </div>
                <div className="mt-4">
                  <Field label="What you did" htmlFor={`exp-desc-${i}`} error={x?.description?.message}>
                    <Textarea id={`exp-desc-${i}`} className="min-h-20" {...register(`experience.${i}.description`)} />
                  </Field>
                </div>
                <Button type="button" size="sm" variant="ghost" className="mt-3" onClick={() => experience.remove(i)}>
                  <Trash2 size={15} aria-hidden="true" />
                  Remove
                </Button>
              </fieldset>
            );
          })}
        </div>
      </Card>

      <Card title="Links">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Portfolio" placeholder="https://" error={errors.portfolio?.message} {...register("portfolio")} />
          <TextField label="GitHub" placeholder="https://github.com/you" error={errors.github?.message} {...register("github")} />
          <TextField label="LinkedIn" placeholder="https://linkedin.com/in/you" error={errors.linkedin?.message} {...register("linkedin")} />
        </div>
      </Card>

      <div className="sticky bottom-4 z-20 flex items-center justify-between gap-3 rounded-2xl border-2 border-ink bg-white p-3 shadow-block-sm">
        <p className="text-sm font-medium text-ink/70">{isDirty ? "You have unsaved changes." : "All changes saved."}</p>
        <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
          Save profile
        </Button>
      </div>
    </form>
  );
}