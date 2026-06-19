"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Sparkles } from "lucide-react";
import { GENRE_OPTIONS, MOOD_OPTIONS, primaryGenreLabel, primaryMoodLabel } from "@/types/studio";
import type { CreateProjectInput, StudioProject } from "@/types/studio";
import { StyleTagPicker } from "@/components/studio/StyleTagPicker";
import { FillExampleButton } from "@/components/studio/FillExampleButton";
import {
  buildExampleCreateInput,
  STUDIO_EXAMPLE_PRESETS,
} from "@pulseforge/shared/lib/studio/example-presets";

interface NewProjectFormProps {
  onCreate: (input: CreateProjectInput) => StudioProject;
}

function applyPresetToFormState(presetId: string) {
  const preset = STUDIO_EXAMPLE_PRESETS.find((p) => p.id === presetId);
  if (!preset) return null;
  const seed = buildExampleCreateInput(preset);
  return {
    title: seed.title,
    artistName: seed.artistName,
    genreTags: seed.genreTags ?? [GENRE_OPTIONS[1]],
    moodTags: seed.moodTags ?? [MOOD_OPTIONS[0]],
    genreCustom: seed.genreCustom ?? "",
    moodCustom: seed.moodCustom ?? "",
    bpmTarget: seed.bpmTarget != null ? String(seed.bpmTarget) : "",
    preset,
  };
}

export function NewProjectForm({ onCreate }: NewProjectFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("Midnight Drive");
  const [artistName, setArtistName] = useState("Nova Ray");
  const [genreTags, setGenreTags] = useState<string[]>([GENRE_OPTIONS[1]]);
  const [moodTags, setMoodTags] = useState<string[]>([MOOD_OPTIONS[0]]);
  const [genreCustom, setGenreCustom] = useState("");
  const [moodCustom, setMoodCustom] = useState("");
  const [bpmTarget, setBpmTarget] = useState("120");
  const [loadedExampleId, setLoadedExampleId] = useState<string | null>(null);

  const previewSeed = {
    genre: genreTags[0] ?? "Pop",
    mood: moodTags[0] ?? "Energetic",
    genreTags,
    moodTags,
    genreCustom,
    moodCustom,
  };

  const fillFormFromExample = (presetId: string) => {
    const next = applyPresetToFormState(presetId);
    if (!next) return;
    setTitle(next.title);
    setArtistName(next.artistName);
    setGenreTags(next.genreTags);
    setMoodTags(next.moodTags);
    setGenreCustom(next.genreCustom);
    setMoodCustom(next.moodCustom);
    setBpmTarget(next.bpmTarget);
    setLoadedExampleId(presetId);
    if (!open) setOpen(true);
  };

  const createFromExample = (presetId: string) => {
    const preset = STUDIO_EXAMPLE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const project = onCreate(buildExampleCreateInput(preset));
    router.push(`/studio/${project.id}/write`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !artistName.trim()) return;
    if (!genreTags.length || !moodTags.length) return;

    const examplePreset = loadedExampleId
      ? STUDIO_EXAMPLE_PRESETS.find((p) => p.id === loadedExampleId)
      : undefined;
    const exampleSeed = examplePreset ? buildExampleCreateInput(examplePreset) : null;

    const project = onCreate({
      title: title.trim(),
      artistName: artistName.trim(),
      genre: primaryGenreLabel(previewSeed),
      mood: primaryMoodLabel(previewSeed),
      genreTags,
      moodTags,
      genreCustom: genreCustom.trim() || undefined,
      moodCustom: moodCustom.trim() || undefined,
      bpmTarget: bpmTarget ? Number(bpmTarget) : undefined,
      creativeBrief: exampleSeed?.creativeBrief,
      musicArrangement: exampleSeed?.musicArrangement,
      initialLyrics: exampleSeed?.initialLyrics,
    });

    router.push(`/studio/${project.id}/write`);
  };

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setOpen(true)} className="btn-primary">
          <Plus className="h-4 w-4" />
          New Project
        </button>
        <FillExampleButton onFill={createFromExample} compact />
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-border bg-surface-elevated p-5 md:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">New studio project</h2>
          <p className="mt-1 text-sm text-muted">
            Mix genres & moods — or pick a fill example and go straight to Generate Full Song.
          </p>
        </div>
        <FillExampleButton onFill={fillFormFromExample} compact />
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
            Track title
          </span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Midnight Drive"
            required
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent/40"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
            Artist name
          </span>
          <input
            value={artistName}
            onChange={(e) => setArtistName(e.target.value)}
            placeholder="Nova Ray"
            required
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent/40"
          />
        </label>

        <div className="sm:col-span-2">
          <StyleTagPicker
            label="Genre mix"
            hint="pick up to 3"
            options={GENRE_OPTIONS}
            selected={genreTags}
            customValue={genreCustom}
            onCustomChange={setGenreCustom}
            onChange={setGenreTags}
            max={3}
          />
        </div>

        <div className="sm:col-span-2">
          <StyleTagPicker
            label="Mood mix"
            hint="pick up to 3"
            options={MOOD_OPTIONS}
            selected={moodTags}
            customValue={moodCustom}
            onCustomChange={setMoodCustom}
            onChange={setMoodTags}
            max={3}
          />
        </div>

        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
            Target BPM <span className="normal-case text-muted/70">(optional)</span>
          </span>
          <input
            type="number"
            min={60}
            max={200}
            value={bpmTarget}
            onChange={(e) => setBpmTarget(e.target.value)}
            placeholder="120"
            className="w-full max-w-[140px] rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent/40"
          />
        </label>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {STUDIO_EXAMPLE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => createFromExample(preset.id)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-accent/40 bg-accent-muted/40 px-4 py-2.5 text-sm font-semibold text-accent-light transition hover:bg-accent-muted"
            >
              <Sparkles className="h-4 w-4" />
              {preset.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          className="btn-primary"
          disabled={!genreTags.length || !moodTags.length}
        >
          Create & open studio
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
          Cancel
        </button>
        </div>
      </div>
    </form>
  );
}
