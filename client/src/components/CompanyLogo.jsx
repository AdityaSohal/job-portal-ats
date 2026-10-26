import { useState } from "react";
import { safeUrl } from "../lib/format";

export default function CompanyLogo({ company, size = 48 }) {
  const [broken, setBroken] = useState(false);
  const src = safeUrl(company?.logoUrl);
  const initial = (company?.name || "?").trim().charAt(0).toUpperCase();

  return (
    <span
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-ink bg-accent-soft font-extrabold"
    >
      {src && !broken ? (
        <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} className="size-full bg-white object-contain" />
      ) : (
        initial
      )}
    </span>
  );
}