"use client";

interface StyleTagPickerProps {
  label: string;
  hint?: string;
  options: readonly string[];
  selected: string[];
  customValue: string;
  onCustomChange: (value: string) => void;
  onChange: (tags: string[]) => void;
  max?: number;
}

export function StyleTagPicker({
  label,
  hint,
  options,
  selected,
  customValue,
  onCustomChange,
  onChange,
  max = 3,
}: StyleTagPickerProps) {
  const hasOther = selected.includes("Other");

  const toggle = (tag: string) => {
    if (selected.includes(tag)) {
      onChange(selected.filter((t) => t !== tag));
      return;
    }
    if (selected.length >= max) return;
    onChange([...selected, tag]);
  };

  return (
    <div className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
        {label}
        {hint ? <span className="ml-1 normal-case font-normal text-muted/70">({hint})</span> : null}
      </span>
      <div className="flex flex-wrap gap-2">
        {options.map((tag) => {
          const active = selected.includes(tag);
          const disabled = !active && selected.length >= max;
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggle(tag)}
              disabled={disabled}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                active
                  ? "border-accent bg-accent-muted text-accent-light"
                  : disabled
                    ? "cursor-not-allowed border-border/50 text-muted/40"
                    : "border-border text-muted hover:border-accent/40 hover:text-foreground"
              }`}
            >
              {tag}
            </button>
          );
        })}
      </div>
      {hasOther && (
        <input
          value={customValue}
          onChange={(e) => onCustomChange(e.target.value)}
          placeholder="Describe your style… e.g. Hyperpop, Drill, Neo-soul"
          className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent/40"
        />
      )}
      {selected.length > 0 && (
        <p className="mt-1.5 text-[11px] text-muted">
          Mix: {selected.filter((t) => t !== "Other").join(" × ")}
          {hasOther && customValue.trim() ? ` × ${customValue.trim()}` : ""}
        </p>
      )}
    </div>
  );
}
