import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import api, { applyFieldErrors, getError } from "../lib/api";
import { emailRule, otpRule, passwordRule } from "../lib/validation";
import { useCountdown } from "../lib/hooks";
import AuthLayout from "../components/AuthLayout";
import { Alert, Button, OtpField, PasswordField, TextField } from "../components/ui";

const requestSchema = z.object({ email: emailRule });

const resetSchema = z
  .object({ otp: otpRule, newPassword: passwordRule, confirm: z.string() })
  .refine((v) => v.newPassword === v.confirm, { message: "Passwords don't match", path: ["confirm"] });

const backToLogin = (
  <Link to="/login" className="font-bold underline underline-offset-4">
    Back to log in
  </Link>
);

// Step 1: ask for a code
function RequestStep({ onSent }) {
  const [formError, setFormError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(requestSchema), defaultValues: { email: "" } });

  const onSubmit = async ({ email }) => {
    setFormError("");
    try {
      await api.post("/auth/forgot-password", { email });
      onSent(email);
    } catch (err) {
      setFormError(getError(err).message);
    }
  };

  return (
    <AuthLayout title="Forgot your password?" subtitle="Enter your email and we'll send you a 6-digit code." footer={backToLogin}>
      <div className="space-y-5">
        {formError && <Alert>{formError}</Alert>}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <TextField label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
          <Button type="submit" loading={isSubmitting} className="w-full">
            Send code
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
}

// Step 2: enter the code and choose a new password
function ResetStep({ email, onBack }) {
  const navigate = useNavigate();
  const [formError, setFormError] = useState("");
  const [resending, setResending] = useState(false);
  const [cooldown, startCooldown] = useCountdown(60);

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(resetSchema), defaultValues: { otp: "", newPassword: "", confirm: "" } });

  const onSubmit = async ({ otp, newPassword }) => {
    setFormError("");
    try {
      await api.post("/auth/reset-password", { email, otp, newPassword });
      toast.success("Password updated");
      navigate("/login", { replace: true, state: { email, notice: "Password updated. Log in with your new password." } });
    } catch (err) {
      const info = getError(err);
      if (info.fields.length) {
        const unplaced = applyFieldErrors(info, setError, { known: ["otp", "newPassword"] });
        if (unplaced.length) setFormError(unplaced.join(" "));
      } else if (info.status === 400) {
        setError("otp", { type: "server", message: info.message });
      } else {
        setFormError(info.message);
      }
    }
  };

  const resend = async () => {
    setFormError("");
    setResending(true);
    try {
      await api.post("/auth/forgot-password", { email });
      toast.success("If an account exists, a new code is on its way");
      startCooldown(60);
    } catch (err) {
      setFormError(getError(err).message);
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout title="Set a new password" subtitle={`If an account exists for ${email}, a 6-digit code is on its way.`} footer={backToLogin}>
      <div className="space-y-5">
        {formError && <Alert>{formError}</Alert>}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <Controller
            name="otp"
            control={control}
            render={({ field }) => (
              <OtpField ref={field.ref} value={field.value} onChange={field.onChange} onBlur={field.onBlur} error={errors.otp?.message} autoFocus />
            )}
          />
          <PasswordField
            label="New password"
            autoComplete="new-password"
            hint="At least 8 characters, with a letter and a number."
            error={errors.newPassword?.message}
            {...register("newPassword")}
          />
          <PasswordField label="Confirm new password" autoComplete="new-password" error={errors.confirm?.message} {...register("confirm")} />
          <Button type="submit" loading={isSubmitting} className="w-full">
            Update password
          </Button>
        </form>

        <div className="space-y-1 text-center text-sm text-ink/70">
          <div>
            Didn't get a code?{" "}
            <button
              type="button"
              onClick={resend}
              disabled={cooldown > 0 || resending}
              className="font-bold underline underline-offset-4 disabled:cursor-not-allowed disabled:no-underline disabled:opacity-60"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : resending ? "Sending…" : "Send a new code"}
            </button>
          </div>
          <button type="button" onClick={onBack} className="font-semibold underline underline-offset-4">
            Use a different email
          </button>
        </div>
      </div>
    </AuthLayout>
  );
}

export default function ForgotPassword() {
  const [email, setEmail] = useState(null);
  return email ? <ResetStep email={email} onBack={() => setEmail(null)} /> : <RequestStep onSent={setEmail} />;
}