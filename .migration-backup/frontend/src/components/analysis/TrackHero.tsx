"use client";

import type { Track } from "@/types";
import { Music2, Disc3 } from "lucide-react";
import Image from "next/image";

interface TrackHeroProps {
  track: Track;
}

export function TrackHero({ track }: TrackHeroProps) {
  const mins = Math.floor(track.duration / 60);
  const secs = track.duration % 60;

  return (
    <div className="flex flex-1 items-center gap-4 rounded-2xl border border-border bg-surface-elevated p-4 md:p-5 animate-slide-up">
      <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-accent md:h-20 md:w-20">
        {track.coverUrl ? (
          <Image
            src={track.coverUrl}
            alt={`${track.title} cover`}
            width={80}
            height={80}
            className="h-full w-full object-cover"
            unoptimized
          />
        ) : (
          <Music2 className="h-8 w-8 text-white md:h-9 md:w-9" />
        )}
        <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-surface-elevated">
          <Disc3 className="h-3 w-3 animate-spin text-accent-light [animation-duration:3s]" />
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <h2 className="truncate text-xl font-bold md:text-2xl">{track.title}</h2>
        <p className="truncate text-muted">{track.artist}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
          {track.album && <span>{track.album}</span>}
          {track.genre && (
            <>
              <span className="text-border">·</span>
              <span className="rounded-full border border-accent/30 bg-accent-muted px-2 py-0.5 text-accent-light">
                {track.genre}
              </span>
            </>
          )}
          {track.duration > 0 && (
            <>
              <span className="text-border">·</span>
              <span>
                {mins}:{secs.toString().padStart(2, "0")}
              </span>
            </>
          )}
          {track.hasRichsync && (
            <>
              <span className="text-border">·</span>
              <span className="text-accent-light">Richsync</span>
            </>
          )}
        </div>
      </div>

      <div className="hidden shrink-0 text-right sm:block">
        <p className="text-[10px] uppercase tracking-wider text-muted">Source</p>
        <p className="text-sm font-medium text-accent-light">Musixmatch</p>
      </div>
    </div>
  );
}