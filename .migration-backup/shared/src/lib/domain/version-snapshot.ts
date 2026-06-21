import type { IntelligenceTier, TrackSource, VersionSnapshot } from "@/lib/domain/types";
import { audioToSignals, versionFromProject } from "@/lib/domain/types";
import { computeContentFingerprint } from "@/lib/domain/fingerprint";
import type { StudioProject } from "@/types/studio";
import { composeLyricsBody, hasLyricsContent } from "@/lib/studio/lyrics";
import { getSystemCapabilities } from "@/lib/partners/capabilities";
import { computeStemBalanceScore } from "@/lib/studio/stem-balance";

export function resolveIntelligenceTier(
  hasPartners: boolean,
  hasDemo: boolean,
  hasCatalogIntel = false
): IntelligenceTier {
  if (hasPartners && hasCatalogIntel) return "full";
  if (hasPartners || hasDemo || hasCatalogIntel) return "partner";
  return "local";
}

export function buildVersionSnapshot(
  project: StudioProject,
  versionId?: string,
  source: TrackSource = "studio_draft"
): VersionSnapshot | null {
  const version = versionFromProject(project, versionId);
  if (!version) return null;

  const lyricsBody = composeLyricsBody(version.lyrics);
  const hasDemo = Boolean(version.audio);
  const caps = getSystemCapabilities();
  const hasCatalogIntel = Boolean(
    version.catalogMeta?.spotifyId ||
      version.catalogMeta?.hasRichsync ||
      version.importedFromTrackId
  );
  const hasPartners =
    caps.partners.musixmatch ||
    caps.partners.cyanite ||
    caps.partners.songstats;

  const audioSignals = version.audio
    ? {
        ...audioToSignals(version.audio),
        stemBalance: version.audio.stemsReady
          ? computeStemBalanceScore(version.audio.stems)
          : undefined,
      }
    : audioToSignals(version.audio);

  return {
    projectId: project.id,
    versionId: version.id,
    versionLabel: version.label,
    source,
    title: project.title,
    artistName: project.artistName,
    genre: project.genre,
    mood: project.mood,
    bpmTarget: project.bpmTarget,
    lyrics: version.lyrics,
    lyricsBody,
    audio: audioSignals,
    derivedFromVersionId: version.derivedFromVersionId,
    contentFingerprint: computeContentFingerprint(version.lyrics, version.audio, project),
    intelligenceTier: resolveIntelligenceTier(hasPartners, hasDemo, hasCatalogIntel),
  };
}

export function snapshotHasAnalyzableContent(snapshot: VersionSnapshot): boolean {
  const words = snapshot.lyricsBody.split(/\s+/).filter((w) => w.length > 0).length;
  return words >= 5 || hasLyricsContent(snapshot.lyrics);
}