import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import api, { getError } from "../lib/api";
import { emailRule, otpRule } from "../lib/validation";
import { useCountdown } from "../lib/hooks";
import AuthLayout from "../components/AuthLayout";
import { Alert, Button, OtpField, TextField } from "../components/ui";

const schema = z.object({ email: emailRule, otp: otpRule });

export default function VerifyEmail() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [formError, setFormError] = useState("");
  const [resending, setResending] = useState(false);
  // A code was just sent after registering, so the resend button waits a minute
  const [cooldown, startCooldown] = useCountdown(state?.justSent ? 60 : 0);

  const {
    register,
    control,
    handleSubmit,
    getValues,
    trigger,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: state?.email || "", otp: "" },
  });

  const onSubmit = async (values) => {
    setFormError("");
    try {
      await api.post("/auth/verify-email", values);
      toast.success("Email verified");
      navigate("/login", { replace: true, state: { email: values.email, notice: "Email verified. You can log in now." } });
    } catch (err) {
      const info = getError(err);
      if (info.status === 400) setError("otp", { type: "server", message: info.message });
      else setFormError(info.message);
    }
  };

  const resend = async () => {
    if (!(await trigger("email"))) return;
    setFormError("");
    setResending(true);
    try {
      await api.post("/auth/resend-verification", { email: getValues("email").trim().toLowerCase() });
      toast.success("If this account needs verification, a new code is on its way");
      startCooldown(60);
    } catch (err) {
      setFormError(getError(err).message);
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout
      title="Check your email"
      subtitle="Enter the 6-digit code we sent to verify your account."
      footer={
        <Link to="/login" className="font-bold underline underline-offset-4">
          Back to log in
        </Link>
      }
    >
      <div className="space-y-5">
        {state?.reason === "login" && <Alert tone="info">Your email isn't verified yet. Enter the code we sent you, or request a new one.</Alert>}
        {formError && <Alert>{formError}</Alert>}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <TextField label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
          <Controller
            name="otp"
            control={control}
            render={({ field }) => (
              <OtpField
                ref={field.ref}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={errors.otp?.message}
                autoFocus
              />
            )}
          />
          <Button type="submit" loading={isSubmitting} className="w-full">
            Verify email
          </Button>
        </form>

        <div className="text-center text-sm text-ink/70">
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
      </div>
    </AuthLayout>
  );
}