
import { Link } from "wouter";
import { ChevronDown, FolderOpen } from "lucide-react";
import type { StudioProject } from "@/types/studio";
import { cn } from "@/lib/utils";

interface ViralProjectPickerProps {
  projects: StudioProject[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading?: boolean;
  hasQASnapshot?: boolean;
}

export function ViralProjectPicker({
  projects,
  selectedId,
  onSelect,
  loading,
  hasQASnapshot,
}: ViralProjectPickerProps) {
  // Always show rich options, even if no projects (standalone support)
  const hasProjects = projects.length > 0;

  if (!hasProjects) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-dashed border-border bg-surface-elevated p-6 text-center">
          <FolderOpen className="mx-auto h-8 w-8 text-muted" />
          <p className="mt-2 text-sm font-medium">No Studio projects yet</p>
          <p className="mt-1 text-xs text-muted">
            You can still try Viral Lab with a demo track or import from Quick Analyze.
          </p>
        </div>

        {/* Rich entry points - High priority fix */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/studio"
            className="rounded-2xl border border-border bg-surface-elevated p-4 hover:border-accent/30 transition"
          >
            <div className="font-semibold">Create new project</div>
            <p className="text-xs text-muted mt-1">Build in Studio → then run Viral Lab</p>
          </Link>

          <button
            onClick={() => {
              onSelect("demo-blinding-lights");
            }}
            className="rounded-2xl border border-accent/30 bg-accent-muted/10 p-4 text-left hover:bg-accent-muted/20 transition"
            disabled={loading}
          >
            <div className="font-semibold flex items-center gap-1">
              Try Demo Track <span className="text-[10px] bg-accent-muted px-1.5 rounded">Recommended</span>
            </div>
            <p className="text-xs text-muted mt-1">Blinding Lights – The Weeknd (instant 1M sim)</p>
          </button>

          <button
            onClick={() => {
              if (hasQASnapshot) {
                onSelect("from-quick-analyze");
              } else {
                // fall back to analyze page
                window.location.href = "/analyze";
              }
            }}
            className="rounded-2xl border border-accent/40 bg-accent-muted/10 p-4 text-left hover:bg-accent-muted/30 transition text-left"
            disabled={loading}
          >
            <div className="font-semibold flex items-center gap-1">
              Use last Quick Analyze result
              {hasQASnapshot && <span className="text-[10px] bg-accent-muted px-1.5 rounded">Full handoff</span>}
            </div>
            <p className="text-xs text-muted mt-1">Seamless — uses your exact scores, hook, energy &amp; 1M projection</p>
          </button>

          <Link
            href="/analyze"
            className="rounded-2xl border border-border bg-surface-elevated p-4 hover:border-accent/30 transition"
          >
            <div className="font-semibold">Import from Musixmatch</div>
            <p className="text-xs text-muted mt-1">Search catalog → analyze → bring to Viral Lab</p>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label htmlFor="viral-project" className="text-xs font-semibold uppercase tracking-wider text-muted">
        Project
      </label>
      <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
        <select
          id="viral-project"
          value={selectedId ?? ""}
          onChange={(e) => onSelect(e.target.value)}
          disabled={loading}
          className={cn(
            "w-full appearance-none rounded-xl border border-border bg-surface-elevated py-2.5 pl-3 pr-9 text-sm outline-none transition",
            "focus:border-accent/40 disabled:opacity-50"
          )}
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title} — {p.artistName}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      </div>
      {selectedId && (
        <Link
          href={`/studio/${selectedId}/write`}
          className="text-xs font-medium text-accent-light hover:text-foreground"
        >
          Open Studio →
        </Link>
      )}
      <button
        onClick={() => onSelect("demo-blinding-lights")}
        disabled={loading}
        className="text-xs font-medium text-accent-light hover:text-foreground underline"
      >
        or Try Blinding Lights demo (standalone)
      </button>
      {hasQASnapshot && (
        <button
          onClick={() => onSelect("from-quick-analyze")}
          disabled={loading}
          className="text-xs font-medium text-accent-light hover:text-foreground underline"
        >
          or Use your last Quick Analyze result (full data handoff)
        </button>
      )}
    </div>
  );
}