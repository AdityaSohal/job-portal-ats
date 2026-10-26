import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import IsoScene from "./IsoScene";

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="grid-paper hidden flex-col justify-between overflow-hidden border-r-2 border-ink p-10 lg:flex">
        <Link to="/" aria-label="Home">
          <Logo />
        </Link>
        <IsoScene className="mx-auto my-8" />
        <div>
          <p className="text-4xl font-extrabold leading-tight tracking-tight">Apply. Track. Hire.</p>
          <p className="mt-3 max-w-sm text-ink/70">One clear path from the first application to the signed offer.</p>
        </div>
      </aside>

      <main className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 inline-block lg:hidden" aria-label="Home">
            <Logo />
          </Link>

          {/* Two sheets peeking out from under the card give it depth */}
          <div className="relative">
            <div aria-hidden="true" className="absolute inset-0 translate-x-3 translate-y-3 rounded-2xl border-2 border-ink bg-accent-soft" />
            <div aria-hidden="true" className="absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-2xl border-2 border-ink bg-line" />
            <section className="relative rounded-2xl border-2 border-ink bg-white p-6 sm:p-8">
              <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
              {subtitle && <p className="mt-1.5 text-[15px] text-ink/70">{subtitle}</p>}
              <div className="mt-6">{children}</div>
            </section>
          </div>

          {footer && <p className="mt-10 text-center text-sm text-ink/70">{footer}</p>}
        </div>
      </main>
    </div>
  );
}