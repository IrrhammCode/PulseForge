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
  },
  {
    Logo: ({ size }: { size?: number }) => (
      <Flame className="text-orange-400" style={{ width: size, height: size }} />
    ),
    title: "Viral Lab",
    description:
      "Simulate 1M listeners, surface critical gaps across lyrics/production/distribution, and edit a music timeline like an NLE — persisted per version.",
    badge: "Viral Lab",
  },
  {
    Logo: HitScoreIcon,
    title: "Hit Potential Score",
    description:
      "A single 0–100 score built from beat fit, lyric virality, trend alignment, and hook strength.",
    badge: "PulseForge",
  },
  {
    Logo: SimulationIcon,
    title: "1M Listener Simulation",
    description:
      "Project 16 weeks of growth with confidence bands and the probability of reaching one million plays.",
    badge: "Simulation",
  },
  {
    Logo: CyaniteLogo,
    title: "Audio Energy Profile",
    description:
      "BPM, danceability, valence, and mood tags from Cyanite — with smart fallbacks for pre-release tracks.",
    badge: "Cyanite",
  },
  {
    Logo: SongstatsLogo,
    title: "Streaming Signals",
    description:
      "Velocity score, playlist reach, and cross-platform breakdown via Songstats for released music.",
    badge: "Songstats",
    extra: <SpotifyLogo size={16} />,
  },
  {
    Logo: PlaybookIcon,
    title: "Launch Playbook",
    description:
      "What-If scenarios for budget, playlists, TikTok seeds, and release day — plus ranked marketing actions.",
    badge: "Strategy",
    extra: <TikTokLogo size={16} className="rounded bg-black p-0.5" />,
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
          <span className="text-accent">and launch</span>
        </>
      }
      description="One studio workflow from first lyric to release-ready intelligence."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <article
            key={feature.title}
            className="flex h-full flex-col rounded-2xl border border-border bg-surface-elevated p-5"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface">
                <feature.Logo size={22} />
              </div>
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
                {feature.badge}
              </span>
            </div>
            <h3 className="text-base font-semibold">{feature.title}</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
              {feature.description}
            </p>
            {feature.extra && (
              <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
                <span className="text-[10px] uppercase tracking-wider text-muted">Connected</span>
                {feature.extra}
              </div>
            )}
          </article>
        ))}
      </div>
    </SectionShell>
  );
}