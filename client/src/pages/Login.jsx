import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import api, { getError } from "../lib/api";
import { emailRule } from "../lib/validation";
import { useAuth } from "../store/auth";
import AuthLayout from "../components/AuthLayout";
import GoogleAuth, { GOOGLE_ENABLED } from "../components/GoogleAuth";
import { Alert, Button, PasswordField, TextField } from "../components/ui";

const schema = z.object({
  email: emailRule,
  password: z.string().min(1, "Enter your password"),
});

export default function Login() {
  const location = useLocation();
  const navigate = useNavigate();
  const setSession = useAuth((s) => s.setSession);
  const [formError, setFormError] = useState("");
  const notice = location.state?.notice;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: location.state?.email || "", password: "" },
  });

  const onSubmit = async (values) => {
    setFormError("");
    try {
      const { data } = await api.post("/auth/login", values);
      setSession(data); // the route guard sends the user to their dashboard
      toast.success(`Welcome back, ${data.user.name.split(" ")[0]}`);
    } catch (err) {
      const info = getError(err);
      if (info.code === "EMAIL_NOT_VERIFIED") {
        navigate("/verify-email", { state: { email: values.email, reason: "login" } });
        return;
      }
      setFormError(info.message);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to continue."
      footer={
        <>
          New here?{" "}
          <Link to="/register" className="font-bold underline underline-offset-4">
            Create an account
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        {notice && <Alert tone="success">{notice}</Alert>}
        {formError && <Alert>{formError}</Alert>}

        <GoogleAuth onError={setFormError} />

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <TextField label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
          <PasswordField label="Password" autoComplete="current-password" error={errors.password?.message} {...register("password")} />
          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-sm font-semibold underline underline-offset-4">
              Forgot password?
            </Link>
          </div>
          <Button type="submit" loading={isSubmitting} className="w-full">
            Log in
          </Button>
        </form>

        {GOOGLE_ENABLED && (
          <p className="text-center text-xs text-ink/55">Google sign-in is for candidates. Recruiters log in with email and password.</p>
        )}
      </div>
    </AuthLayout>
  );
}