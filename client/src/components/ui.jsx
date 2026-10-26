import { forwardRef, useId, useState } from "react";
import { CircleAlert, CircleCheck, Eye, EyeOff, Info, LoaderCircle } from "lucide-react";

export const cx = (...parts) => parts.filter(Boolean).join(" ");

// ---------- Buttons: raised blocks that sink when pressed ----------
const BASE =
  "inline-flex items-center justify-center gap-2 rounded-xl border-2 font-semibold " +
  "transition-all duration-100 select-none disabled:pointer-events-none disabled:opacity-60";
const RAISED =
  "border-ink hover:-translate-x-px hover:-translate-y-px " +
  "active:translate-x-[3px] active:translate-y-[3px] active:shadow-none";
const SIZE = { md: "px-4 py-2.5 text-[15px]", sm: "px-3 py-1.5 text-sm" };
const VARIANT = {
  primary: `${RAISED} bg-ink text-paper shadow-[3px_3px_0_0_var(--color-accent)] hover:shadow-[4px_4px_0_0_var(--color-accent)]`,
  secondary: `${RAISED} bg-white text-ink shadow-[3px_3px_0_0_var(--color-ink)] hover:shadow-[4px_4px_0_0_var(--color-ink)]`,
  ghost: "border-transparent bg-transparent text-ink hover:bg-white/70",
};

// For links that should look like buttons
export const buttonClass = (variant = "primary", size = "md", extra) =>
  cx(BASE, SIZE[size], VARIANT[variant], extra);

export function Button({ variant = "primary", size = "md", loading = false, disabled, className, children, type = "button", ...props }) {
  return (
    <button type={type} disabled={disabled || loading} className={buttonClass(variant, size, className)} {...props}>
      {loading && <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

// ---------- Form fields ----------
const INPUT =
  "w-full rounded-xl border-2 border-ink bg-white px-3.5 py-2.5 text-[15px] outline-none transition-shadow " +
  "placeholder:text-ink/35 focus:shadow-[3px_3px_0_0_var(--color-accent)] " +
  "aria-[invalid=true]:border-danger aria-[invalid=true]:focus:shadow-[3px_3px_0_0_var(--color-danger)]";

export const Input = forwardRef(function Input({ className, invalid, ...props }, ref) {
  return <input ref={ref} aria-invalid={invalid || undefined} className={cx(INPUT, className)} {...props} />;
});

export function Field({ label, htmlFor, error, hint, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="mt-1.5 text-sm font-medium text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-sm text-ink/60">{hint}</p>
      ) : null}
    </div>
  );
}

export const TextField = forwardRef(function TextField({ label, error, hint, id, ...props }, ref) {
  const auto = useId();
  const inputId = id || auto;
  return (
    <Field label={label} htmlFor={inputId} error={error} hint={hint}>
      <Input id={inputId} ref={ref} invalid={!!error} aria-describedby={error ? `${inputId}-error` : undefined} {...props} />
    </Field>
  );
});

export const PasswordField = forwardRef(function PasswordField({ label, error, hint, id, ...props }, ref) {
  const auto = useId();
  const inputId = id || auto;
  const [show, setShow] = useState(false);
  return (
    <Field label={label} htmlFor={inputId} error={error} hint={hint}>
      <div className="relative">
        <Input
          id={inputId}
          ref={ref}
          type={show ? "text" : "password"}
          invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className="pr-11"
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-ink/60 hover:text-ink"
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </Field>
  );
});

// Controlled: use it inside react-hook-form's <Controller>. Keeps digits only.
export const OtpField = forwardRef(function OtpField({ label = "6-digit code", value, onChange, ...props }, ref) {
  return (
    <TextField
      ref={ref}
      label={label}
      value={value ?? ""}
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={6}
      placeholder="······"
      className="text-center font-mono text-2xl tracking-[0.45em]"
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
      {...props}
    />
  );
});

// ---------- Feedback ----------
const TONES = {
  error: { cls: "bg-danger-soft", Icon: CircleAlert },
  success: { cls: "bg-accent-soft", Icon: CircleCheck },
  info: { cls: "bg-white", Icon: Info },
};

export function Alert({ tone = "error", children, className }) {
  const { cls, Icon } = TONES[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cx("flex items-start gap-2.5 rounded-xl border-2 border-ink p-3 text-sm font-medium", cls, className)}
    >
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-ink/50">
      <span className="h-0.5 flex-1 bg-line" />
      or
      <span className="h-0.5 flex-1 bg-line" />
    </div>
  );
}

// Two-option switch (for example candidate / recruiter)
export function Segmented({ value, onChange, options, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-1.5 rounded-xl border-2 border-ink bg-white p-1.5 shadow-block-sm">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cx(
              "rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
              active ? "bg-ink text-paper" : "text-ink/70 hover:bg-paper"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}