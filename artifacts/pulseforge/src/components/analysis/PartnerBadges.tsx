import type { AnalysisMeta } from "@/types";

export function PartnerBadges({ meta }: { meta?: AnalysisMeta }) {
  if (!meta?.partners?.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] uppercase tracking-wider text-muted">Data sources</span>
      {meta.partners.map((p) => (
        <span
          key={p}
          className="rounded-full border border-accent/25 bg-accent-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-accent-light"
        >
          {p}
        </span>
      ))}
    </div>
  );
}