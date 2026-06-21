import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: number;
}

const PARTNER_LOGO_BASE = `${import.meta.env.BASE_URL}partner-logos/`;

function PartnerImg({
  file,
  name,
  className,
  size = 28,
}: LogoProps & { file: string; name: string }) {
  return (
    <img
      src={`${PARTNER_LOGO_BASE}${file}`}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className={cn("shrink-0 rounded-lg object-contain", className)}
      alt={`${name} logo`}
      aria-label={name}
    />
  );
}

export function PulseForgeLogo({ className, size = 32 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <path
        d="M8 22V10l5.5 8.5L19 10v12"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="23.5" cy="19" r="2.5" fill="currentColor" opacity="0.9" />
    </svg>
  );
}

export function MusixmatchLogo({ className, size = 28 }: LogoProps) {
  return (
    <PartnerImg file="musixmatch.png" name="Musixmatch" className={className} size={size} />
  );
}

export function CyaniteLogo({ className, size = 28 }: LogoProps) {
  return (
    <PartnerImg file="cyanite.png" name="Cyanite" className={className} size={size} />
  );
}

export function SongstatsLogo({ className, size = 28 }: LogoProps) {
  return (
    <PartnerImg file="songstats.png" name="Songstats" className={className} size={size} />
  );
}

export function SpotifyLogo({ className, size = 20 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("shrink-0 text-[#1DB954]", className)}
      aria-label="Spotify"
      role="img"
    >
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}

export function HitScoreIcon({ className, size = 28 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <rect width="28" height="28" rx="7" fill="#1E1033" />
      <circle cx="14" cy="14" r="7" stroke="url(#hs-grad)" strokeWidth="2.5" />
      <path d="M14 10v4l3 2" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" />
      <defs>
        <linearGradient id="hs-grad" x1="7" y1="7" x2="21" y2="21">
          <stop stopColor="#C084FC" />
          <stop stopColor="#FBBF24" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function SimulationIcon({ className, size = 28 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <rect width="28" height="28" rx="7" fill="#101828" />
      <path
        d="M6 20L10 14l4 4 3-6 5 8"
        stroke="url(#sim-grad)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="sim-grad" x1="6" y1="20" x2="22" y2="10">
          <stop stopColor="#818CF8" />
          <stop stopColor="#2DD4BF" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function PlaybookIcon({ className, size = 28 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <rect width="28" height="28" rx="7" fill="#1A1420" />
      <rect x="8" y="7" width="12" height="14" rx="2" stroke="#C084FC" strokeWidth="1.8" />
      <path d="M11 11h6M11 14h6M11 17h4" stroke="#FBBF24" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function DashboardIcon({ className, size = 28 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <rect width="28" height="28" rx="7" fill="#12121C" />
      <rect x="7" y="7" width="5" height="5" rx="1" fill="#9333EA" />
      <rect x="14" y="7" width="7" height="5" rx="1" fill="#6366F1" opacity="0.85" />
      <rect x="7" y="14" width="14" height="7" rx="1" fill="#2DD4BF" opacity="0.75" />
    </svg>
  );
}

export function ElevenLabsLogo({ className, size = 28 }: LogoProps) {
  return (
    <PartnerImg file="elevenlabs.png" name="ElevenLabs" className={className} size={size} />
  );
}

export function LalalLogo({ className, size = 28 }: LogoProps) {
  return (
    <PartnerImg file="lalal.png" name="LALAL.AI" className={className} size={size} />
  );
}

export function N8nLogo({ className, size = 28 }: LogoProps) {
  return <PartnerImg file="n8n.png" name="n8n" className={className} size={size} />;
}

export function JamBaseLogo({ className, size = 28 }: LogoProps) {
  return (
    <PartnerImg file="jambase.png" name="JamBase" className={className} size={size} />
  );
}

export function TikTokLogo({ className, size = 20 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("shrink-0", className)}
      aria-label="TikTok"
      role="img"
    >
      <path
        d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"
        fill="white"
      />
    </svg>
  );
}