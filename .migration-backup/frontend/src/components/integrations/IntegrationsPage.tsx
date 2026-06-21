"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Plug, X } from "lucide-react";
import { fetchCapabilities } from "@/lib/api-client";
import type { SystemCapabilities } from "@/lib/partners/capabilities";
import {
  CyaniteLogo,
  ElevenLabsLogo,
  JamBaseLogo,
  LalalLogo,
  MusixmatchLogo,
  N8nLogo,
  SongstatsLogo,
} from "@/components/icons/BrandLogos";
import { LandingContainer } from "@/components/landing/LandingContainer";

const PARTNER_ROWS = [
  {
    key: "musixmatch" as const,
    name: "Musixmatch",
    Logo: MusixmatchLogo,
    tabs: "Analyze · Write · Viral",
    unlocks: "Catalog search, lyrics, moods/themes, richsync timing, similar tracks benchmark",
  },
  {
    key: "cyanite" as const,
    name: "Cyanite",
    Logo: CyaniteLogo,
    tabs: "Analyze · Studio",
    unlocks: "Spotify audio AI — BPM, valence, segment energy, mood/genre/instrument tags",
  },
  {
    key: "songstats" as const,
    name: "Songstats",
    Logo: SongstatsLogo,
    tabs: "Analyze · Launch · Viral",
    unlocks: "Cross-platform streams, TikTok/Shazam, velocity history, artist momentum",
  },
  {
    key: "elevenlabs" as const,
    name: "ElevenLabs",
    Logo: ElevenLabsLogo,
    tabs: "Write · Produce",
    unlocks: "Full song generation (Music API), hook TTS, voice clone, music stem separation",
  },
  {
    key: "lalal" as const,
    name: "LALAL.AI",
    Logo: LalalLogo,
    tabs: "Produce",
    unlocks: "Production-grade multistem separation (vocals, drums, bass, other)",
  },
  {
    key: "jambase" as const,
    name: "JamBase",
    Logo: JamBaseLogo,
    tabs: "Launch",
    unlocks: "Live concert listings for release-window routing (demo data without key)",
  },
  {
    key: "n8n" as const,
    name: "n8n",
    Logo: N8nLogo,
    tabs: "Launch",
    unlocks: "Webhook automation — hit score, Songstats velocity, Cyanite status, JamBase show count",
  },
];

const FEATURE_LABELS: Record<string, string> = {
  quickAnalyze: "Quick Analyze (catalog)",
  quickAnalyzeDemo: "Quick Analyze demo mode",
  studioLocal: "Studio local scoring",
  studioAudioSignals: "Waveform / BPM signals",
  exportBackup: "Export & backup",
  importFromCatalog: "Import from Musixmatch catalog",
  hookVoicePreview: "Hook voice preview (TTS)",
  elevenMusic: "ElevenLabs full song generation",
  elevenStems: "ElevenLabs music stem separation",
  lalalStems: "LALAL.AI stem separation",
  richsyncTimeline: "Richsync timeline markers",
  streamingIntel: "Songstats streaming intel",
  concertIntel: "Concert intel (JamBase)",
  concertIntelLive: "JamBase live API",
  n8nWorkflows: "n8n release webhooks",
  trendIntel: "Trend keyword scoring",
};

export function IntegrationsPage() {
  const [caps, setCaps] = useState<SystemCapabilities | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCapabilities()
      .then(setCaps)
      .catch(() => setError("Could not load partner status."));
  }, []);

  const activeCount = caps ? Object.values(caps.partners).filter(Boolean).length : 0;

  return (
    <LandingContainer className="py-10 md:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-light">
        Partner stack
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Integrations</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted md:text-base">
        Musicathon partner APIs power PulseForge end-to-end. Configure keys in{" "}
        <code className="text-accent-light">backend/.env</code> (see{" "}
        <code className="text-accent-light">backend/.env.example</code>). Optional:{" "}
        <code className="text-accent-light">TREND_FEED_URL</code> for live trend keywords,{" "}
        <code className="text-accent-light">MXM_KEY</code> as alias for Musixmatch.
      </p>

      {error && <p className="mt-4 text-sm text-warning">{error}</p>}

      {caps && (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface-elevated px-4 py-3">
            <Plug className="h-4 w-4 text-accent-light" />
            <span className="text-sm">
              <span className="font-semibold">{activeCount}/7</span> partners configured · tier{" "}
              <span className="font-semibold capitalize">{caps.tier}</span>
              {caps.demoMode ? " · Musixmatch demo mode" : ""}
            </span>
          </div>

          <div className="mt-8 grid gap-3">
            {PARTNER_ROWS.map(({ key, name, Logo, tabs, unlocks }) => {
              const on = caps.partners[key];
              return (
                <div
                  key={key}
                  className="flex items-start gap-3 rounded-2xl border border-border bg-surface-elevated p-4"
                >
                  <Logo size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{name}</p>
                      <span className="text-[10px] text-muted">{tabs}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted">{unlocks}</p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      on ? "bg-success/10 text-success" : "bg-surface text-muted"
                    }`}
                  >
                    {on ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    {on ? "Active" : "Missing key"}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-8 rounded-2xl border border-border bg-surface-elevated p-5">
            <h2 className="font-semibold">Studio features</h2>
            <ul className="mt-3 grid gap-2 text-sm text-muted sm:grid-cols-2">
              {Object.entries(caps.features).map(([key, enabled]) => (
                <li key={key} className="flex items-center gap-2">
                  {enabled ? (
                    <Check className="h-3.5 w-3.5 text-success" />
                  ) : (
                    <X className="h-3.5 w-3.5 text-muted" />
                  )}
                  <span className={enabled ? "text-foreground" : ""}>
                    {FEATURE_LABELS[key] ?? key.replace(/([A-Z])/g, " $1").trim()}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-6 text-xs text-muted">
            <Link href="/partners" className="text-accent-light hover:text-foreground">
              Partners overview
            </Link>
            {" · "}
            <Link href="/analyze" className="text-accent-light hover:text-foreground">
              Quick Analyze
            </Link>
            {" · "}
            <Link href="/studio" className="text-accent-light hover:text-foreground">
              Studio
            </Link>
          </p>
        </>
      )}
    </LandingContainer>
  );
}
