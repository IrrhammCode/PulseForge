import type { CreativeGraph } from "@/lib/domain/types";
import { buildVersionSnapshot } from "@/lib/domain/version-snapshot";
import { buildVersionIntelligence } from "@/lib/domain/version-intelligence";
import { detectStaleness, detectViralStaleness } from "@/lib/domain/workflow";
import type { StudioProject } from "@/types/studio";
import { hasLyricsContent } from "@/lib/studio/lyrics";

export function buildCreativeGraph(
  project: StudioProject,
  versionId?: string
): CreativeGraph | null {
  const version = project.versions.find((v) => v.id === (versionId ?? project.activeVersionId));
  if (!version) return null;

  const snapshot = buildVersionSnapshot(project, version.id);
  if (!snapshot) return null;

  const staleness = version.analysisStale
    ? { stale: true, reason: version.analysisStaleReason }
    : detectStaleness(version, project);

  const viralStaleness = detectViralStaleness(version, project);
  const intel = buildVersionIntelligence(project, version.id);

  return {
    snapshot,
    hasLyrics: hasLyricsContent(version.lyrics),
    hasDemo: Boolean(version.audio),
    hasAnalysis: Boolean(version.analysis),
    analysisStale: staleness.stale,
    staleReason: staleness.reason,
    analysis: version.analysis,
    analyzedAt: version.analyzedAt,
    hasViral: Boolean(version.viral),
    viralStale: viralStaleness.stale,
    viralStaleReason: viralStaleness.reason,
    viral: version.viral,
    viralAnalyzedAt: version.viral?.analyzedAt,
    canonicalHitScore: intel?.canonicalHitScore ?? null,
    canonicalProb1M: intel?.canonicalProb1M ?? null,
    canonicalWhatIf: intel?.whatIf,
  };
}