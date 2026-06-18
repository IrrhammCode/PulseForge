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
  { key: "musixmatch" as const, name: "Musixmatch", Logo: MusixmatchLogo, tab: "Quick Analyze" },
  { key: "cyanite" as const, name: "Cyanite", Logo: CyaniteLogo, tab: "Quick Analyze" },
  { key: "songstats" as const, name: "Songstats", Logo: SongstatsLogo, tab: "Quick Analyze" },
  { key: "elevenlabs" as const, name: "ElevenLabs", Logo: ElevenLabsLogo, tab: "Write" },
  { key: "lalal" as const, name: "LALAL.AI", Logo: LalalLogo, tab: "Produce" },
  { key: "jambase" as const, name: "JamBase", Logo: JamBaseLogo, tab: "Launch" },
  { key: "n8n" as const, name: "n8n", Logo: N8nLogo, tab: "Launch" },
];

export function IntegrationsPage() {
  const [caps, setCaps] = useState<SystemCapabilities | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCapabilities()
      .then(setCaps)
      .catch(() => setError("Could not load partner status."));
  }, []);

  const activeCount = caps
    ? Object.values(caps.partners).filter(Boolean).length
    : 0;

  return (
    <LandingContainer className="py-10 md:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-light">
        Partner stack
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Integrations</h1>
      <p className="mt-3 max-w-xl text-sm text-muted md:text-base">
        Live status of Musicathon partner APIs. Configure keys in{" "}
        <code className="text-accent-light">.env.local</code> — see{" "}
        <Link href="/partners" className="text-accent-light hover:text-foreground">
          Partners
        </Link>{" "}
        for overview.
      </p>

      {error && <p className="mt-4 text-sm text-warning">{error}</p>}

      {caps && (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface-elevated px-4 py-3">
            <Plug className="h-4 w-4 text-accent-light" />
            <span className="text-sm">
              <span className="font-semibold">{activeCount}/7</span> partners configured · tier{" "}
              <span className="font-semibold capitalize">{caps.tier}</span>
            </span>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {PARTNER_ROWS.map(({ key, name, Logo, tab }) => {
              const on = caps.partners[key];
              return (
                <div
                  key={key}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-surface-elevated p-4"
                >
                  <Logo size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{name}</p>
                    <p className="text-xs text-muted">Studio · {tab}</p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      on
                        ? "bg-success/10 text-success"
                        : "bg-surface text-muted"
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
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </LandingContainer>
  );
}