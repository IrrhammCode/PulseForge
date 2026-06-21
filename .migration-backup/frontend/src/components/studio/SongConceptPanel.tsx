"use client";

import { Sparkles } from "lucide-react";
import {
  applyConceptToLyrics,
  CONCEPT_FIELD_HINTS,
  LIVING_SONG_PRINCIPLES,
} from "@pulseforge/shared/lib/studio/song-concept";
import { GENRE_OPTIONS, MOOD_OPTIONS, primaryGenreLabel, primaryMoodLabel } from "@/types/studio";
import type { LyricsSections, SongCreativeBrief, StudioProject } from "@/types/studio";
import { StyleTagPicker } from "@/components/studio/StyleTagPicker";
import { FillExampleButton } from "@/components/studio/FillExampleButton";

interface SongConceptPanelProps {
  project: StudioProject;
  lyrics: LyricsSections;
  onBriefChange: (brief: SongCreativeBrief) => void;
  onStyleChange: (patch: {
    genreTags: string[];
    moodTags: string[];
    genreCustom?: string;
    moodCustom?: string;
  }) => void;
  onApplyLyrics: (lyrics: LyricsSections) => void;
  onFillExample?: (presetId: string) => void;
}

export function SongConceptPanel({
  project,
  lyrics,
  onBriefChange,
  onStyleChange,
  onApplyLyrics,
  onFillExample,
}: SongConceptPanelProps) {
  const brief = project.creativeBrief ?? {};

  const setBriefField = (key: keyof SongCreativeBrief, value: string) => {
    onBriefChange({ ...brief, [key]: value });
  };

  const handleApplyConcept = () => {
    const next = applyConceptToLyrics(project, lyrics);
    onApplyLyrics(next);
  };

  return (
    <div className="rounded-2xl border border-accent/20 bg-accent-muted/20 p-4">
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent-light" />
        <div>
          <h3 className="text-sm font-semibold">Make it feel alive</h3>
          <p className="mt-0.5 text-xs text-muted">
            Generic AI songs lack a scene, arc, and vocal character. Fill this brief — it steers
            lyrics starters and ElevenLabs production.
          </p>
        </div>
      </div>

      <p className="mt-3 text-[11px] text-accent-light">
        Style mix: {primaryGenreLabel(project)} · {primaryMoodLabel(project)}
      </p>

      {onFillExample && (
        <div className="mt-3">
          <FillExampleButton onFill={onFillExample} />
          <p className="mt-1.5 text-[10px] text-muted">
            Loads example — lyrics, brief, vocal & arrangement. Then Generate Full Song.
          </p>
        </div>
      )}

      <div className="mt-4 space-y-4 border-t border-border/50 pt-4">
        <StyleTagPicker
          label="Genre mix"
          options={GENRE_OPTIONS}
          selected={project.genreTags ?? [project.genre]}
          customValue={project.genreCustom ?? ""}
          onCustomChange={(genreCustom) =>
            onStyleChange({
              genreTags: project.genreTags ?? [project.genre],
              moodTags: project.moodTags ?? [project.mood],
              genreCustom,
              moodCustom: project.moodCustom,
            })
          }
          onChange={(genreTags) =>
            onStyleChange({
              genreTags,
              moodTags: project.moodTags ?? [project.mood],
              genreCustom: project.genreCustom,
              moodCustom: project.moodCustom,
            })
          }
        />
        <StyleTagPicker
          label="Mood mix"
          options={MOOD_OPTIONS}
          selected={project.moodTags ?? [project.mood]}
          customValue={project.moodCustom ?? ""}
          onCustomChange={(moodCustom) =>
            onStyleChange({
              genreTags: project.genreTags ?? [project.genre],
              moodTags: project.moodTags ?? [project.mood],
              genreCustom: project.genreCustom,
              moodCustom,
            })
          }
          onChange={(moodTags) =>
            onStyleChange({
              genreTags: project.genreTags ?? [project.genre],
              moodTags,
              genreCustom: project.genreCustom,
              moodCustom: project.moodCustom,
            })
          }
        />
      </div>

      <div className="mt-4 space-y-3">
        {CONCEPT_FIELD_HINTS.map(({ key, label, placeholder, tip }) => (
          <label key={key} className="block">
            <span className="mb-1 block text-[11px] font-medium text-muted">{label}</span>
            <textarea
              value={brief[key] ?? ""}
              onChange={(e) => setBriefField(key, e.target.value)}
              placeholder={placeholder}
              rows={2}
              className="w-full resize-none rounded-xl border border-border bg-surface px-3 py-2 text-xs outline-none focus:border-accent/40"
            />
            <span className="mt-0.5 block text-[10px] text-muted/80">{tip}</span>
          </label>
        ))}
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-[11px] font-medium text-muted hover:text-foreground">
          Principles for non-generic songs
        </summary>
        <ul className="mt-2 space-y-1 text-[10px] text-muted">
          {LIVING_SONG_PRINCIPLES.map((p) => (
            <li key={p}>· {p}</li>
          ))}
        </ul>
      </details>

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={handleApplyConcept}
          className="rounded-xl border border-accent/30 bg-surface px-3 py-2 text-xs font-medium text-accent-light transition hover:bg-accent-muted"
        >
          Fill empty sections from concept
        </button>
        <p className="text-[10px] text-muted">
          Won&apos;t overwrite lyrics you already wrote — only fills blanks using your brief + style
          mix.
        </p>
      </div>
    </div>
  );
}
