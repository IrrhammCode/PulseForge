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
  { name: "Musixmatch", Logo: MusixmatchLogo, tag: "Lyrics" },
  { name: "Cyanite", Logo: CyaniteLogo, tag: "Audio AI" },
  { name: "Songstats", Logo: SongstatsLogo, tag: "Streaming" },
  { name: "ElevenLabs", Logo: ElevenLabsLogo, tag: "Voice AI" },
  { name: "LALAL.AI", Logo: LalalLogo, tag: "Stems" },
  { name: "JamBase", Logo: JamBaseLogo, tag: "Live" },
  { name: "n8n", Logo: N8nLogo, tag: "Automation" },
];

export function PartnerLogoStrip() {
  return (
    <div>
      <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
        Integrated partners
      </p>
      <div className="flex flex-wrap gap-2">
        {PARTNERS.map(({ name, Logo }) => (
          <div
            key={name}
            className="group flex items-center gap-2 rounded-full border border-border bg-surface-elevated/40 py-1.5 pl-1.5 pr-3.5 transition-colors duration-200 hover:border-accent/50"
          >
            <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-white">
              <Logo size={18} />
            </span>
            <span className="text-xs font-semibold text-foreground">{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
