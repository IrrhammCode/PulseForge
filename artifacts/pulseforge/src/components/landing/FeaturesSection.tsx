import { SectionShell } from "@/components/landing/SectionShell";
import { Flame } from "lucide-react";
import {
  CyaniteLogo,
  HitScoreIcon,
  MusixmatchLogo,
  PlaybookIcon,
  SimulationIcon,
  SongstatsLogo,
  SpotifyLogo,
  TikTokLogo,
} from "@/components/icons/BrandLogos";

const FEATURES = [
  {
    Logo: MusixmatchLogo,
    title: "Lyrics Intelligence",
    description:
      "Extract hooks, measure repetition, and map song structure using Musixmatch lyrics and analysis APIs.",
    badge: "Musixmatch",
    gradient: "from-orange-500/20 to-yellow-500/10",
    iconBg: "bg-orange-500/10 border-orange-500/20",
  },
  {
    Logo: ({ size }: { size?: number }) => (
      <Flame className="text-orange-400" style={{ width: size, height: size }} />
    ),
    title: "Viral Lab",
    description:
      "Simulate 1M listeners, surface critical gaps across lyrics/production/distribution, and edit a music timeline like an NLE — persisted per version.",
    badge: "Viral Lab",
    gradient: "from-red-500/20 to-orange-500/10",
    iconBg: "bg-red-500/10 border-red-500/20",
  },
  {
    Logo: HitScoreIcon,
    title: "Hit Potential Score",
    description:
      "A single 0–100 score built from beat fit, lyric virality, trend alignment, and hook strength.",
    badge: "PulseForge",
    gradient: "from-purple-500/20 to-violet-500/10",
    iconBg: "bg-purple-500/10 border-purple-500/20",
  },
  {
    Logo: SimulationIcon,
    title: "1M Listener Simulation",
    description:
      "Project 16 weeks of growth with confidence bands and the probability of reaching one million plays.",
    badge: "Simulation",
    gradient: "from-blue-500/20 to-cyan-500/10",
    iconBg: "bg-blue-500/10 border-blue-500/20",
  },
  {
    Logo: CyaniteLogo,
    title: "Audio Energy Profile",
    description:
      "BPM, danceability, valence, and mood tags from Cyanite — with smart fallbacks for pre-release tracks.",
    badge: "Cyanite",
    gradient: "from-cyan-500/20 to-teal-500/10",
    iconBg: "bg-cyan-500/10 border-cyan-500/20",
  },
  {
    Logo: SongstatsLogo,
    title: "Streaming Signals",
    description:
      "Velocity score, playlist reach, and cross-platform breakdown via Songstats for released music.",
    badge: "Songstats",
    extra: <SpotifyLogo size={16} />,
    gradient: "from-emerald-500/20 to-green-500/10",
    iconBg: "bg-emerald-500/10 border-emerald-500/20",
  },
  {
    Logo: PlaybookIcon,
    title: "Launch Playbook",
    description:
      "What-If scenarios for budget, playlists, TikTok seeds, and release day — plus ranked marketing actions.",
    badge: "Strategy",
    extra: <TikTokLogo size={16} className="rounded bg-black p-0.5" />,
    gradient: "from-pink-500/20 to-rose-500/10",
    iconBg: "bg-pink-500/10 border-pink-500/20",
  },
];

export function FeaturesSection() {
  return (
    <SectionShell
      id="features"
      eyebrow="Platform"
      title={
        <>
          Create, craft, analyze,{" "}
          <span className="gradient-text">and launch</span>
        </>
      }
      description="One studio workflow from first lyric to release-ready intelligence."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-stagger">
        {FEATURES.map((feature) => (
          <article
            key={feature.title}
            className="group glass-card-hover glow-border relative flex h-full flex-col overflow-hidden rounded-2xl p-5"
          >
            {/* Subtle gradient bg on hover */}
            <div
              className="absolute inset-0 bg-accent/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />

            <div className="relative z-10">
              <div className="mb-4 flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${feature.iconBg} transition-transform duration-300 group-hover:scale-110`}
                >
                  <feature.Logo size={22} />
                </div>
                <span className="rounded-full border border-border/60 bg-surface/50 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted backdrop-blur-sm">
                  {feature.badge}
                </span>
              </div>
              <h3 className="text-base font-semibold text-foreground">{feature.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
                {feature.description}
              </p>
              {feature.extra && (
                <div className="mt-4 flex items-center gap-2 border-t border-border/40 pt-3">
                  <span className="text-[10px] uppercase tracking-wider text-muted">Connected</span>
                  {feature.extra}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}