import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import api, { applyFieldErrors, compact, getError } from "../lib/api";
import { emailRule, passwordRule } from "../lib/validation";
import AuthLayout from "../components/AuthLayout";
import GoogleAuth from "../components/GoogleAuth";
import { Alert, Button, PasswordField, Segmented, TextField } from "../components/ui";

const schema = z
  .object({
    role: z.enum(["candidate", "recruiter"]),
    name: z.string().trim().min(2, "Enter your full name").max(80, "That name is too long"),
    email: emailRule,
    password: passwordRule,
    companyName: z.string().trim().max(120, "That name is too long"),
    companyWebsite: z.string().trim().max(200, "That link is too long"),
    companyIndustry: z.string().trim().max(80, "That is too long"),
    companyLocation: z.string().trim().max(120, "That is too long"),
  })
  .superRefine((v, ctx) => {
    if (v.role !== "recruiter") return;
    if (v.companyName.length < 2) {
      ctx.addIssue({ code: "custom", path: ["companyName"], message: "Enter your company name" });
    }
    if (v.companyWebsite && !/^https?:\/\/[^\s.]+\.[^\s]+$/i.test(v.companyWebsite)) {
      ctx.addIssue({ code: "custom", path: ["companyWebsite"], message: "Use a full link, like https://example.com" });
    }
  });

const ROLE_OPTIONS = [
  { value: "candidate", label: "I'm looking for a job" },
  { value: "recruiter", label: "I'm hiring" },
];

const FIELDS = ["name", "email", "password", "companyName", "companyWebsite", "companyIndustry", "companyLocation"];
const RENAME = {
  "company.name": "companyName",
  "company.website": "companyWebsite",
  "company.industry": "companyIndustry",
  "company.location": "companyLocation",
};

export default function Register() {
  const navigate = useNavigate();
  const [formError, setFormError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      role: "candidate",
      name: "",
      email: "",
      password: "",
      companyName: "",
      companyWebsite: "",
      companyIndustry: "",
      companyLocation: "",
    },
  });

  const role = watch("role");

  const onSubmit = async (v) => {
    setFormError("");
    const body = { name: v.name, email: v.email, password: v.password, role: v.role };
    if (v.role === "recruiter") {
      body.company = compact({
        name: v.companyName,
        website: v.companyWebsite,
        industry: v.companyIndustry,
        location: v.companyLocation,
      });
    }

    try {
      await api.post("/auth/register", body);
      toast.success("Check your inbox for a verification code");
      navigate("/verify-email", { state: { email: v.email, justSent: true } });
    } catch (err) {
      const info = getError(err);
      const unplaced = applyFieldErrors(info, setError, { rename: RENAME, known: FIELDS });
      if (unplaced.length) setFormError(unplaced.join(" "));
      else if (!info.fields.length) setFormError(info.message);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join as a candidate or as a recruiter."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-bold underline underline-offset-4">
            Log in
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        <Segmented label="I am a" value={role} onChange={(v) => setValue("role", v)} options={ROLE_OPTIONS} />

        {formError && <Alert>{formError}</Alert>}

        {role === "candidate" ? (
          <GoogleAuth onError={setFormError} text="signup_with" />
        ) : (
          <Alert tone="info">Recruiters sign up with email so their company can be reviewed by an admin before posting jobs.</Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <TextField label="Full name" autoComplete="name" error={errors.name?.message} {...register("name")} />
          <TextField label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
          <PasswordField
            label="Password"
            autoComplete="new-password"
            hint="At least 8 characters, with a letter and a number."
            error={errors.password?.message}
            {...register("password")}
          />

          {role === "recruiter" && (
            <fieldset className="space-y-4 rounded-xl border-2 border-dashed border-ink/40 p-4">
              <legend className="px-2 text-sm font-bold">Your company</legend>
              <TextField label="Company name" autoComplete="organization" error={errors.companyName?.message} {...register("companyName")} />
              <TextField
                label="Website (optional)"
                placeholder="https://example.com"
                autoComplete="url"
                error={errors.companyWebsite?.message}
                {...register("companyWebsite")}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Industry (optional)" error={errors.companyIndustry?.message} {...register("companyIndustry")} />
                <TextField label="Location (optional)" error={errors.companyLocation?.message} {...register("companyLocation")} />
              </div>
            </fieldset>
          )}

          <Button type="submit" loading={isSubmitting} className="w-full">
            Create account
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
}