"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, FileText, Layers } from "lucide-react";
import type { LyricsSections } from "@/types/studio";
import { EMPTY_LYRICS } from "@/types/studio";
import { composeLyricsBody, hasLyricsContent, wordCount } from "@/lib/studio/lyrics";
import { cn } from "@/lib/utils";

const SECTIONS: { key: keyof Omit<LyricsSections, "raw">; label: string; hint: string }[] = [
  { key: "intro", label: "Intro", hint: "Set the vibe — ad-libs, hums, or a one-line tease before verse 1" },
  { key: "verse1", label: "Verse 1", hint: "Set the scene — keep lines conversational" },
  { key: "chorus", label: "Chorus", hint: "Your hook lives here — short & repeatable" },
  { key: "verse2", label: "Verse 2", hint: "Deepen the story or flip the perspective" },
  { key: "bridge", label: "Bridge", hint: "Contrast before the final chorus" },
  { key: "outro", label: "Outro", hint: "Land the emotion — fade, repeat hook fragment, or ad-lib out" },
];

interface LyricsEditorProps {
  lyrics: LyricsSections;
  onChange: (lyrics: LyricsSections) => void;
  disabled?: boolean;
}

export function LyricsEditor({ lyrics, onChange, disabled }: LyricsEditorProps) {
  const [mode, setMode] = useState<"sections" | "raw">(lyrics.raw.trim() ? "raw" : "sections");
  const [saved, setSaved] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const body = composeLyricsBody(lyrics);
  const count = wordCount(body);

  const scheduleSaveIndicator = useCallback(() => {
    setSaved(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setSaved(true), 600);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const updateSection = (key: keyof Omit<LyricsSections, "raw">, value: string) => {
    onChange({ ...lyrics, [key]: value, raw: "" });
    scheduleSaveIndicator();
  };

  const updateRaw = (value: string) => {
    onChange({ ...EMPTY_LYRICS, raw: value });
    scheduleSaveIndicator();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMode("sections")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition",
              mode === "sections"
                ? "border-accent/40 bg-accent-muted text-accent-light"
                : "border-border text-muted hover:text-foreground"
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            Sections
          </button>
          <button
            type="button"
            onClick={() => setMode("raw")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition",
              mode === "raw"
                ? "border-accent/40 bg-accent-muted text-accent-light"
                : "border-border text-muted hover:text-foreground"
            )}
          >
            <FileText className="h-3.5 w-3.5" />
            Raw
          </button>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted">
          <span>{count} words</span>
          {saved && hasLyricsContent(lyrics) && (
            <span className="inline-flex items-center gap-1 text-success">
              <Check className="h-3 w-3" />
              Saved
            </span>
          )}
        </div>
      </div>

      {mode === "sections" ? (
        <div className="space-y-4">
          {SECTIONS.map(({ key, label, hint }) => (
            <div
              key={key}
              id={`focus-${key}`}
              className="rounded-xl border border-border bg-surface-elevated p-4 transition-shadow"
            >
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <label htmlFor={`lyrics-${key}`} className="text-sm font-semibold">
                  {label}
                </label>
                <span className="text-[10px] text-muted">{hint}</span>
              </div>
              <textarea
                id={`lyrics-${key}`}
                value={lyrics[key]}
                onChange={(e) => updateSection(key, e.target.value)}
                disabled={disabled}
                rows={key === "chorus" ? 5 : key === "intro" || key === "outro" ? 3 : 4}
                placeholder={`Write ${label.toLowerCase()}…`}
                className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2.5 text-sm leading-relaxed outline-none transition placeholder:text-muted/60 focus:border-accent/40 disabled:opacity-50"
              />
            </div>
          ))}
        </div>
      ) : (
        <textarea
          value={lyrics.raw}
          onChange={(e) => updateRaw(e.target.value)}
          disabled={disabled}
          rows={18}
          placeholder="[Intro]&#10;Yeah, yeah…&#10;&#10;[Verse 1]&#10;Your lines here…&#10;&#10;[Chorus]&#10;Hook line…&#10;&#10;[Outro]&#10;Fade on the hook…"
          className="w-full resize-y rounded-xl border border-border bg-surface-elevated px-4 py-3 font-mono text-sm leading-relaxed outline-none transition placeholder:text-muted/60 focus:border-accent/40 disabled:opacity-50"
        />
      )}
    </div>
  );
}