import { useState } from "react";
import { X } from "lucide-react";
import { Input } from "./ui";

export function CheckList({ legend, options, value, onChange }) {
  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-bold">{legend}</legend>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {options.map(([v, label]) => (
          <label key={v} className="flex cursor-pointer items-center gap-2 text-[15px]">
            <input type="checkbox" checked={value.includes(v)} onChange={() => toggle(v)} className="size-4 accent-ink" />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// A text box that turns what you type into removable chips (Enter or comma adds one)
export function ChipInput({ label, id, value, onChange, max = 30, placeholder, hint }) {
  const [text, setText] = useState("");

  const add = (raw) => {
    const items = raw.split(",").map((s) => s.trim().toLowerCase().slice(0, 40)).filter(Boolean);
    if (!items.length) return;
    onChange([...new Set([...value, ...items])].slice(0, max));
    setText("");
  };

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      <Input
        id={id}
        value={text}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => add(text)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault(); // Enter must not submit the surrounding form
            add(text);
          } else if (e.key === "Backspace" && !text && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
      />
      <p className="mt-1.5 text-xs text-ink/60">
        {hint || "Press Enter to add."} {value.length}/{max}
      </p>
      {value.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {value.map((s) => (
            <li key={s} className="inline-flex items-center gap-1 rounded-md border-2 border-ink bg-accent-soft py-0.5 pl-2 pr-1 text-xs font-semibold">
              {s}
              <button type="button" onClick={() => onChange(value.filter((x) => x !== s))} aria-label={`Remove ${s}`} className="rounded p-0.5 hover:bg-white">
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}