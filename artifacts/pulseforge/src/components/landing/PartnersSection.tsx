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
    gradient: "from-orange-500/15 to-yellow-500/5",
    accentColor: "border-orange-500/20 text-orange-400",
  },
  {
    name: "Cyanite",
    role: "Audio Intelligence",
    description: "BPM, energy, mood tags from Spotify audio analysis.",
    Logo: CyaniteLogo,
    tab: "Quick Analyze",
    gradient: "from-cyan-500/15 to-blue-500/5",
    accentColor: "border-cyan-500/20 text-cyan-400",
  },
  {
    name: "Songstats",
    role: "Streaming Analytics",
    description: "Velocity scoring, playlist placements, and TikTok signals.",
    Logo: SongstatsLogo,
    tab: "Quick Analyze",
    gradient: "from-green-500/15 to-emerald-500/5",
    accentColor: "border-green-500/20 text-green-400",
  },
  {
    name: "ElevenLabs",
    role: "AI Voice & Music",
    description: "Full song generation via composition plans, hook voice preview, and AI stem separation in Write.",
    Logo: ElevenLabsLogo,
    tab: "Write",
    gradient: "from-violet-500/15 to-purple-500/5",
    accentColor: "border-violet-500/20 text-violet-400",
  },
  {
    name: "LALAL.AI",
    role: "Stem Separation",
    description: "Production-grade multistem split for vocals, drums, bass, and other.",
    Logo: LalalLogo,
    tab: "Produce",
    gradient: "from-blue-500/15 to-indigo-500/5",
    accentColor: "border-blue-500/20 text-blue-400",
  },
  {
    name: "JamBase",
    role: "Live Music",
    description: "Concert listings and venue routing ideas for your release window.",
    Logo: JamBaseLogo,
    tab: "Launch",
    gradient: "from-rose-500/15 to-pink-500/5",
    accentColor: "border-rose-500/20 text-rose-400",
  },
  {
    name: "n8n",
    role: "Workflow Automation",
    description: "Webhook trigger to Slack, email, CRM, or any connected service on launch.",
    Logo: N8nLogo,
    tab: "Launch",
    gradient: "from-emerald-500/15 to-teal-500/5",
    accentColor: "border-emerald-500/20 text-emerald-400",
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
          <span className="gradient-text">Musicathon partners</span>
        </>
      }
      description="Production API routes with graceful fallbacks when keys are not configured."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-stagger">
        {PARTNERS.map((partner) => (
          <article
            key={partner.name}
            className="group glass-card-hover glow-border relative overflow-hidden rounded-2xl p-5 md:p-6"
          >
            {/* Gradient bg on hover */}
            <div
              className={`absolute inset-0 bg-gradient-to-br ${partner.gradient} opacity-0 transition-opacity duration-500 group-hover:opacity-100`}
            />

            <div className="relative z-10">
              {partner.required && (
                <span className="absolute right-0 top-0 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-light shadow-[0_0_12px_rgba(139,92,246,0.15)]">
                  Required
                </span>
              )}

              <div className="mb-4 flex items-center gap-3">
                <div className="transition-transform duration-300 group-hover:scale-110">
                  <partner.Logo size={36} />
                </div>
                <div>
                  <h3 className="font-bold">{partner.name}</h3>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
                    {partner.role}
                  </p>
                </div>
              </div>

              <p className="text-sm leading-relaxed text-muted">{partner.description}</p>
              <div className="mt-3 flex items-center gap-1.5">
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${partner.accentColor}`}>
                  {partner.tab}
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}