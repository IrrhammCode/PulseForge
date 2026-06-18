import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: number;
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
      <rect width="32" height="32" rx="9" fill="#8B5CF6" />
      <path
        d="M8 22V10l5.5 8.5L19 10v12"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="23.5" cy="19" r="2.5" fill="white" opacity="0.9" />
    </svg>
  );
}

export function MusixmatchLogo({ className, size = 28 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      className={cn("shrink-0", className)}
      aria-label="Musixmatch"
      role="img"
    >
      <rect width="28" height="28" rx="7" fill="#FF5E3A" />
      <path
        d="M8.5 19.5V8.5h2.4l3.6 6.2 3.6-6.2h2.4v11h-2.3v-6.8l-3.2 5.5h-1.4l-3.2-5.5v6.8H8.5z"
        fill="white"
      />
    </svg>
  );
}

export function CyaniteLogo({ className, size = 28 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      className={cn("shrink-0", className)}
      aria-label="Cyanite"
      role="img"
    >
      <rect width="28" height="28" rx="7" fill="#0E1B2A" />
      <path
        d="M14 5l7.5 13H6.5L14 5z"
        fill="url(#cy-grad)"
      />
      <path d="M10 20h8l-1.5 3H11.5L10 20z" fill="#22D3EE" opacity="0.85" />
      <defs>
        <linearGradient id="cy-grad" x1="14" y1="5" x2="14" y2="18">
          <stop stopColor="#22D3EE" />
          <stop stopColor="#0891B2" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function SongstatsLogo({ className, size = 28 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      className={cn("shrink-0", className)}
      aria-label="Songstats"
      role="img"
    >
      <rect width="28" height="28" rx="7" fill="#1D4ED8" />
      <rect x="7" y="15" width="2.5" height="6" rx="1" fill="white" opacity="0.9" />
      <rect x="11" y="11" width="2.5" height="10" rx="1" fill="white" />
      <rect x="15" y="8" width="2.5" height="13" rx="1" fill="white" />
      <rect x="19" y="13" width="2.5" height="8" rx="1" fill="#93C5FD" />
    </svg>
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
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      className={cn("shrink-0", className)}
      aria-label="ElevenLabs"
      role="img"
    >
      <rect width="28" height="28" rx="7" fill="#0B0B0F" />
      <rect x="8" y="8" width="3" height="12" rx="1.5" fill="#F5F5F5" />
      <rect x="12.5" y="6" width="3" height="16" rx="1.5" fill="#A78BFA" />
      <rect x="17" y="9" width="3" height="10" rx="1.5" fill="#F5F5F5" />
    </svg>
  );
}

export function LalalLogo({ className, size = 28 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      className={cn("shrink-0", className)}
      aria-label="LALAL.AI"
      role="img"
    >
      <rect width="28" height="28" rx="7" fill="#111827" />
      <circle cx="10" cy="14" r="4" fill="#F97316" />
      <circle cx="18" cy="14" r="4" fill="#38BDF8" />
      <path d="M14 10v8" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function N8nLogo({ className, size = 28 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      className={cn("shrink-0", className)}
      aria-label="n8n"
      role="img"
    >
      <rect width="28" height="28" rx="7" fill="#EA4B71" />
      <circle cx="8" cy="14" r="2.5" fill="white" />
      <circle cx="20" cy="8" r="2.5" fill="white" />
      <circle cx="20" cy="20" r="2.5" fill="white" />
      <path d="M10.5 13l7-4M10.5 15l7 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function JamBaseLogo({ className, size = 28 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      className={cn("shrink-0", className)}
      aria-label="JamBase"
      role="img"
    >
      <rect width="28" height="28" rx="7" fill="#14532D" />
      <path
        d="M8 18V10l4 3.5L16 10v8M18 18V10l2 8"
        stroke="#86EFAC"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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