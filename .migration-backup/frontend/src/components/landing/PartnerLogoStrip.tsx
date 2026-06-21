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
      <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-muted">
        Integrated partners
      </p>
      <div className="flex flex-wrap gap-2">
        {PARTNERS.map(({ name, Logo, tag }) => (
          <div
            key={name}
            className="glass-card-hover flex items-center gap-2.5 rounded-xl px-3 py-2.5"
          >
            <Logo size={22} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{name}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted">{tag}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}