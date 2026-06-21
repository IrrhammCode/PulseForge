
import { useRef } from "react";
import { Pause, Play } from "lucide-react";
import type { DemoAudioMeta } from "@/types/studio";
import { useDemoPlayer } from "@/lib/hooks/useDemoPlayer";
import { formatDuration } from "@/lib/studio/audio-analysis";
import { cn } from "@/lib/utils";

interface WaveformWorkspaceProps {
  audio: DemoAudioMeta;
  src: string | null;
}

export function WaveformWorkspace({ audio, src }: WaveformWorkspaceProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const { playing, currentTime, toggle, seek, progress } = useDemoPlayer({
    src,
    duration: audio.durationSec,
  });

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = canvasRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    seek(ratio);
  };

  return (
    <div className="rounded-2xl border border-border bg-surface-elevated p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{audio.fileName}</p>
          <p className="text-xs text-muted">
            {formatDuration(audio.durationSec)}
            {audio.estimatedBpm ? ` · ~${audio.estimatedBpm} BPM` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={!src}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white transition hover:bg-accent-light disabled:opacity-40"
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
        </button>
      </div>

      <div
        ref={canvasRef}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        tabIndex={0}
        onClick={handleWaveformClick}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") seek(Math.min(1, progress + 0.02));
          if (e.key === "ArrowLeft") seek(Math.max(0, progress - 0.02));
        }}
        className="relative flex h-24 cursor-pointer items-end gap-[2px] rounded-xl border border-border bg-surface p-3"
      >
        {audio.waveform.map((amp, i) => {
          const barProgress = i / audio.waveform.length;
          const played = barProgress <= progress;
          return (
            <div
              key={i}
              className={cn(
                "flex-1 rounded-sm transition-colors",
                played ? "bg-accent" : "bg-accent/25"
              )}
              style={{ height: `${Math.max(6, amp * 100)}%` }}
            />
          );
        })}
        <div
          className="pointer-events-none absolute bottom-0 top-0 w-0.5 bg-white/80"
          style={{ left: `${progress * 100}%` }}
        />
      </div>

      <div className="mt-2 flex justify-between text-[10px] tabular-nums text-muted">
        <span>{formatDuration(currentTime)}</span>
        <span>{formatDuration(audio.durationSec)}</span>
      </div>
    </div>
  );
}