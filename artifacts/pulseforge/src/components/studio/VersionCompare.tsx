
import { useMemo, useState } from "react";
import { ArrowRight, GitCompare, Minus, Plus } from "lucide-react";
import type { StudioProject } from "@/types/studio";
import { diffLyricsSections } from "@/lib/studio/lyrics";
import { HitPotentialPanel } from "@/components/analysis/HitPotentialPanel";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface VersionCompareProps {
  project: StudioProject;
}

function ScoreDelta({ label, a, b }: { label: string; a: number; b: number }) {
  const delta = b - a;
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className="flex items-center gap-2 tabular-nums">
        <span>{a}</span>
        <ArrowRight className="h-3 w-3 text-muted" />
        <span className="font-semibold">{b}</span>
        {delta !== 0 && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
              delta > 0 ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
            )}
          >
            {delta > 0 ? <Plus className="h-2.5 w-2.5" /> : <Minus className="h-2.5 w-2.5" />}
            {delta > 0 ? `+${delta}` : delta}
          </span>
        )}
      </span>
    </div>
  );
}

export function VersionCompare({ project }: VersionCompareProps) {
  const [versionAId, setVersionAId] = useState(project.versions[0]?.id ?? "");
  const [versionBId, setVersionBId] = useState(
    project.versions[1]?.id ?? project.versions[0]?.id ?? ""
  );

  const versionA = project.versions.find((v) => v.id === versionAId);
  const versionB = project.versions.find((v) => v.id === versionBId);

  const sectionDiffs = useMemo(() => {
    if (!versionA || !versionB) return [];
    return diffLyricsSections(versionA.lyrics, versionB.lyrics);
  }, [versionA, versionB]);

  const changedSections = sectionDiffs.filter((d) => d.changed);

  if (project.versions.length < 2) {
    return (
      <Card glow="none">
        <CardHeader
          title="Compare Versions"
          subtitle="Create a second version to see side-by-side scores and lyric diffs"
        />
        <p className="text-sm text-muted">
          Use &ldquo;New version&rdquo; in the header after drafting v1, then return here.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card glow="none">
        <CardHeader
          title="Compare Versions"
          subtitle="Side-by-side hit potential and lyric changes"
          action={<GitCompare className="h-4 w-4 text-accent-light" />}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Version A</label>
            <select
              value={versionAId}
              onChange={(e) => setVersionAId(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-sm outline-none focus:border-accent/40"
            >
              {project.versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Version B</label>
            <select
              value={versionBId}
              onChange={(e) => setVersionBId(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-sm outline-none focus:border-accent/40"
            >
              {project.versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {versionA && versionB && versionAId !== versionBId && (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            {versionA.analysis ? (
              <HitPotentialPanel data={versionA.analysis.hitPotential} />
            ) : (
              <Card glow="none">
                <CardHeader title={versionA.label} subtitle="Not analyzed yet" />
                <p className="text-sm text-muted">Run Analyze on this version first.</p>
              </Card>
            )}
            {versionB.analysis ? (
              <HitPotentialPanel data={versionB.analysis.hitPotential} />
            ) : (
              <Card glow="none">
                <CardHeader title={versionB.label} subtitle="Not analyzed yet" />
                <p className="text-sm text-muted">Run Analyze on this version first.</p>
              </Card>
            )}
          </div>

          {versionA.analysis && versionB.analysis && (
            <Card glow="none">
              <CardHeader title="Score Delta" subtitle={`${versionA.label} → ${versionB.label}`} />
              <div className="space-y-2.5">
                <ScoreDelta
                  label="Overall"
                  a={versionA.analysis.hitPotential.overall}
                  b={versionB.analysis.hitPotential.overall}
                />
                <ScoreDelta
                  label="Hook Strength"
                  a={versionA.analysis.hitPotential.breakdown.hookStrength}
                  b={versionB.analysis.hitPotential.breakdown.hookStrength}
                />
                <ScoreDelta
                  label="Lyric Virality"
                  a={versionA.analysis.hitPotential.breakdown.lyricVirality}
                  b={versionB.analysis.hitPotential.breakdown.lyricVirality}
                />
                <ScoreDelta
                  label="Beat Fit"
                  a={versionA.analysis.hitPotential.breakdown.beatFit}
                  b={versionB.analysis.hitPotential.breakdown.beatFit}
                />
                <ScoreDelta
                  label="Trend Alignment"
                  a={versionA.analysis.hitPotential.breakdown.trendAlignment}
                  b={versionB.analysis.hitPotential.breakdown.trendAlignment}
                />
              </div>
            </Card>
          )}

          {versionA.viral && versionB.viral && (
            <Card glow="none">
              <CardHeader
                title="Viral Readiness Delta"
                subtitle={`${versionA.label} → ${versionB.label}`}
              />
              <div className="space-y-2.5">
                <ScoreDelta
                  label="Viral readiness"
                  a={versionA.viral.readiness.score}
                  b={versionB.viral.readiness.score}
                />
                <ScoreDelta
                  label="Chance 1M"
                  a={versionA.viral.monteCarlo.probabilityToReach}
                  b={versionB.viral.monteCarlo.probabilityToReach}
                />
                <ScoreDelta
                  label="Critical gaps"
                  a={versionA.viral.gaps.filter((g) => g.severity === "critical" || g.severity === "high").length}
                  b={versionB.viral.gaps.filter((g) => g.severity === "critical" || g.severity === "high").length}
                />
              </div>
            </Card>
          )}

          <Card glow="none">
            <CardHeader
              title="Lyric Diff"
              subtitle={
                changedSections.length > 0
                  ? `${changedSections.length} section${changedSections.length > 1 ? "s" : ""} changed`
                  : "No section changes detected"
              }
            />
            <div className="space-y-4">
              {sectionDiffs.map((diff) => (
                <div
                  key={diff.section}
                  className={cn(
                    "rounded-xl border p-4",
                    diff.changed ? "border-accent/30 bg-accent-muted/30" : "border-border bg-surface"
                  )}
                >
                  <h4 className="mb-2 text-sm font-semibold">{diff.label}</h4>
                  {diff.changed ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="mb-1 text-[10px] uppercase tracking-wide text-muted">
                          {versionA.label}
                        </p>
                        <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-muted">
                          {diff.before || "—"}
                        </pre>
                      </div>
                      <div>
                        <p className="mb-1 text-[10px] uppercase tracking-wide text-muted">
                          {versionB.label}
                        </p>
                        <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-foreground">
                          {diff.after || "—"}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-muted">
                      {diff.before || "—"}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {versionAId === versionBId && (
        <p className="text-sm text-muted">Pick two different versions to compare.</p>
      )}
    </div>
  );
}