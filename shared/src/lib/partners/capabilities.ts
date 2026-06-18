import { hasCyaniteToken } from "@/lib/cyanite/client";
import { hasElevenLabsKey } from "@/lib/elevenlabs/client";
import { hasJamBaseKey } from "@/lib/jambase/client";
import { hasLalalKey } from "@/lib/lalal/client";
import { hasMusixmatchKey } from "@/lib/musixmatch/client";
import { hasN8nWebhook } from "@/lib/n8n/client";
import { hasSongstatsKey } from "@/lib/songstats/client";
import type { IntelligenceTier } from "@/lib/domain/types";

export interface PartnerCapabilities {
  musixmatch: boolean;
  cyanite: boolean;
  songstats: boolean;
  elevenlabs: boolean;
  lalal: boolean;
  n8n: boolean;
  jambase: boolean;
}

export interface SystemCapabilities {
  tier: IntelligenceTier;
  partners: PartnerCapabilities;
  features: {
    quickAnalyze: boolean;
    quickAnalyzeDemo: boolean;
    studioLocal: boolean;
    studioAudioSignals: boolean;
    exportBackup: boolean;
    importFromCatalog: boolean;
    hookVoicePreview: boolean;
    lalalStems: boolean;
    concertIntel: boolean;
    n8nWorkflows: boolean;
  };
  demoMode: boolean;
}

export function getSystemCapabilities(): SystemCapabilities {
  const partners: PartnerCapabilities = {
    musixmatch: hasMusixmatchKey(),
    cyanite: hasCyaniteToken(),
    songstats: hasSongstatsKey(),
    elevenlabs: hasElevenLabsKey(),
    lalal: hasLalalKey(),
    n8n: hasN8nWebhook(),
    jambase: hasJamBaseKey(),
  };

  const anyPartner = Object.values(partners).some(Boolean);
  const fullPartnerStack =
    partners.musixmatch && (partners.cyanite || partners.songstats);

  const tier: IntelligenceTier = fullPartnerStack
    ? "full"
    : anyPartner
      ? "partner"
      : "local";

  return {
    tier,
    partners,
    features: {
      quickAnalyze: partners.musixmatch,
      quickAnalyzeDemo: !partners.musixmatch,
      studioLocal: true,
      studioAudioSignals: true,
      exportBackup: true,
      importFromCatalog: true,
      hookVoicePreview: partners.elevenlabs,
      lalalStems: partners.lalal,
      concertIntel: true,
      n8nWorkflows: partners.n8n,
    },
    demoMode: !partners.musixmatch,
  };
}