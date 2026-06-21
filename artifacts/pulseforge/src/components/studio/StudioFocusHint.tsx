
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "@/lib/navigation-compat";
import { Flame, X } from "lucide-react";
import { Link } from "wouter";

const FOCUS_LABELS: Record<string, string> = {
  chorus: "Chorus / hook",
  verse1: "Verse 1",
  verse2: "Verse 2",
  bridge: "Bridge",
  structure: "Song structure",
  intro: "Intro & hook window",
  upload: "Upload demo audio",
  stems: "Stem separation",
  vocals: "Vocal lane",
  bpm: "BPM & mix",
  outro: "Outro trim",
  tiktok: "TikTok seeding",
  playlists: "Playlist pitches",
  budget: "Launch budget",
  "viral-loop": "Viral share loop",
};

function StudioFocusHintInner() {
  const searchParams = useSearchParams();
  const focus = searchParams.get("focus");
  const fromViral = searchParams.get("from") === "viral";
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!focus || dismissed) return;
    const launchFocuses = ["tiktok", "playlists", "budget", "viral-loop"];
    const targetId = launchFocuses.includes(focus) ? "focus-launch" : `focus-${focus}`;
    const el = document.getElementById(targetId);
    if (el) {
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-accent/50", "ring-offset-2", "ring-offset-background");
        const t = setTimeout(() => {
          el.classList.remove("ring-2", "ring-accent/50", "ring-offset-2", "ring-offset-background");
        }, 2400);
        return () => clearTimeout(t);
      });
    }
  }, [focus, dismissed]);

  if (!focus || dismissed) return null;

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent-muted px-4 py-3">
      <div className="flex items-center gap-2 text-sm">
        <Flame className="h-4 w-4 shrink-0 text-accent-light" />
        <span>
          {fromViral ? "Viral Lab → " : "Focus: "}
          <strong className="text-foreground">
            {FOCUS_LABELS[focus] ?? focus}
          </strong>
        </span>
        {fromViral && (
          <Link href="/viral" className="text-xs text-accent-light hover:underline">
            Back to Viral Lab
          </Link>
        )}
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="rounded-lg p-1 text-muted hover:bg-surface hover:text-foreground"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function StudioFocusHint() {
  return (
    <Suspense fallback={null}>
      <StudioFocusHintInner />
    </Suspense>
  );
}