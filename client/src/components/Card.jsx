import { cx } from "./ui";

export default function Card({ title, action, children, className }) {
  return (
    <section className={cx("rounded-2xl border-2 border-ink bg-white p-5 sm:p-6", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-lg font-extrabold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}