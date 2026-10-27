import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import api, { applyFieldErrors, getError } from "../../lib/api";
import { passwordRule } from "../../lib/validation";
import { useAuth } from "../../store/auth";
import Card from "../../components/Card";
import { Alert, Button, PasswordField } from "../../components/ui";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: passwordRule,
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, { message: "Passwords don't match", path: ["confirm"] })
  .refine((v) => v.newPassword !== v.currentPassword, { message: "Choose a password you haven't used just now", path: ["newPassword"] });

export default function Settings() {
  const user = useAuth((s) => s.user);
  const [formError, setFormError] = useState("");
  const googleOnly = user.authProvider === "google";

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { currentPassword: "", newPassword: "", confirm: "" } });

  const onSubmit = async ({ currentPassword, newPassword }) => {
    setFormError("");
    try {
      await api.patch("/account/password", { currentPassword, newPassword });
      toast.success("Password updated. Other devices were logged out.");
      reset();
    } catch (err) {
      const info = getError(err);
      if (info.fields.length) {
        const unplaced = applyFieldErrors(info, setError, { known: ["currentPassword", "newPassword"] });
        if (unplaced.length) setFormError(unplaced.join(" "));
      } else if (info.status === 400 && /current password/i.test(info.message)) {
        setError("currentPassword", { type: "server", message: info.message });
      } else {
        setFormError(info.message);
      }
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Settings</h1>

      <Card title="Account">
        <dl className="space-y-3 text-[15px]">
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-ink/55">Name</dt>
            <dd className="font-semibold">{user.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-ink/55">Email</dt>
            <dd className="font-semibold">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-ink/55">Sign-in method</dt>
            <dd className="font-semibold">{{ google: "Google", both: "Email and Google", local: "Email and password" }[user.authProvider] || "Email and password"}</dd>
          </div>
        </dl>
      </Card>

      <Card title="Change password">
        {googleOnly ? (
          <Alert tone="info">
            Your account signs in with Google and has no password. To add one, log out, then use "Forgot password" on the login page. After that you can log in either way.
          </Alert>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {formError && <Alert>{formError}</Alert>}
            <PasswordField label="Current password" autoComplete="current-password" error={errors.currentPassword?.message} {...register("currentPassword")} />
            <PasswordField
              label="New password"
              autoComplete="new-password"
              hint="At least 8 characters, with a letter and a number."
              error={errors.newPassword?.message}
              {...register("newPassword")}
            />
            <PasswordField label="Confirm new password" autoComplete="new-password" error={errors.confirm?.message} {...register("confirm")} />
            <Button type="submit" loading={isSubmitting}>
              Update password
            </Button>
            <p className="text-xs text-ink/60">Changing your password logs you out of other devices. This device stays logged in.</p>
          </form>
        )}
      </Card>
    </div>
  );
}