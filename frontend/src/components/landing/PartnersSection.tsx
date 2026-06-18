import { SectionShell } from "@/components/landing/SectionShell";
import {
  CyaniteLogo,
  ElevenLabsLogo,
  JamBaseLogo,
  LalalLogo,
  MusixmatchLogo,
  N8nLogo,
  SongstatsLogo,
} from "@/components/icons/BrandLogos";

const PARTNERS = [
  {
    name: "Musixmatch",
    role: "Lyrics & Analysis",
    description:
      "Track search, synced lyrics, and official lyrics analysis — required Musicathon API.",
    Logo: MusixmatchLogo,
    required: true,
    tab: "Quick Analyze",
  },
  {
    name: "Cyanite",
    role: "Audio Intelligence",
    description: "BPM, energy, mood tags from Spotify audio analysis.",
    Logo: CyaniteLogo,
    tab: "Quick Analyze",
  },
  {
    name: "Songstats",
    role: "Streaming Analytics",
    description: "Velocity scoring, playlist placements, and TikTok signals.",
    Logo: SongstatsLogo,
    tab: "Quick Analyze",
  },
  {
    name: "ElevenLabs",
    role: "AI Voice",
    description: "Hook voice preview — hear your chorus with lifelike AI speech in Write.",
    Logo: ElevenLabsLogo,
    tab: "Write",
  },
  {
    name: "LALAL.AI",
    role: "Stem Separation",
    description: "Production-grade multistem split for vocals, drums, bass, and other.",
    Logo: LalalLogo,
    tab: "Produce",
  },
  {
    name: "JamBase",
    role: "Live Music",
    description: "Concert listings and venue routing ideas for your release window.",
    Logo: JamBaseLogo,
    tab: "Launch",
  },
  {
    name: "n8n",
    role: "Workflow Automation",
    description: "Webhook trigger to Slack, email, CRM, or any connected service on launch.",
    Logo: N8nLogo,
    tab: "Launch",
  },
];

export function PartnersSection() {
  return (
    <SectionShell
      id="partners"
      eyebrow="Integrations"
      title={
        <>
          Wired to{" "}
          <span className="text-accent">Musicathon partners</span>
        </>
      }
      description="Production API routes with graceful fallbacks when keys are not configured."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PARTNERS.map((partner) => (
          <article
            key={partner.name}
            className="relative rounded-2xl border border-border bg-surface-elevated p-5 md:p-6"
          >
            {partner.required && (
              <span className="absolute right-4 top-4 rounded-full border border-accent/30 bg-accent-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-light">
                Required
              </span>
            )}

            <div className="mb-4 flex items-center gap-3">
              <partner.Logo size={36} />
              <div>
                <h3 className="font-bold">{partner.name}</h3>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
                  {partner.role}
                </p>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-muted">{partner.description}</p>
            <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-accent-light">
              Studio tab · {partner.tab}
            </p>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}