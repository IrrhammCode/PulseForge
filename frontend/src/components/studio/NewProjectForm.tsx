"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { GENRE_OPTIONS, MOOD_OPTIONS } from "@/types/studio";
import type { CreateProjectInput } from "@/types/studio";

interface NewProjectFormProps {
  onCreate: (input: CreateProjectInput) => { id: string };
}

export function NewProjectForm({ onCreate }: NewProjectFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("Midnight Drive");
  const [artistName, setArtistName] = useState("Nova Ray");
  const [genre, setGenre] = useState<string>(GENRE_OPTIONS[1]); // Indie Pop
  const [mood, setMood] = useState<string>(MOOD_OPTIONS[0]); // Energetic
  const [bpmTarget, setBpmTarget] = useState("120");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !artistName.trim()) return;

    const project = onCreate({
      title: title.trim(),
      artistName: artistName.trim(),
      genre,
      mood,
      bpmTarget: bpmTarget ? Number(bpmTarget) : undefined,
    });

    router.push(`/studio/${project.id}/write`);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-primary"
      >
        <Plus className="h-4 w-4" />
        New Project
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-border bg-surface-elevated p-5 md:p-6"
    >
      <h2 className="text-lg font-semibold">New studio project</h2>
      <p className="mt-1 text-sm text-muted">
        Set up your track — lyrics, production, and launch intel in one place.
      </p>

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

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
            Genre
          </span>
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent/40"
          >
            {GENRE_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
            Mood
          </span>
          <select
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent/40"
          >
            {MOOD_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

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

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="submit" className="btn-primary">
          Create & open studio
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn-secondary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}