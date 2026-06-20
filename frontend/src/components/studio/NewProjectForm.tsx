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
import { generateProjectFromPrompt } from "@pulseforge/shared/lib/studio/ai-rewrite-coach";

interface NewProjectFormProps {
  onCreate: (input: CreateProjectInput) => StudioProject;
}

export function NewProjectForm({ onCreate }: NewProjectFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const [creationMode, setCreationMode] = useState<"choice" | "prompt" | "template">("choice");
  const [promptText, setPromptText] = useState("");
  const [isGeneratingFromPrompt, setIsGeneratingFromPrompt] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);

  const createFromExample = (presetId: string) => {
    const preset = STUDIO_EXAMPLE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const project = onCreate(buildExampleCreateInput(preset));
    router.push(`/studio/${project.id}/write`);
  };

  const resetToChoice = () => {
    setCreationMode("choice");
    setPromptText("");
    setPromptError(null);
    setIsGeneratingFromPrompt(false);
  };

  const handleClose = () => {
    setOpen(false);
    resetToChoice();
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

  // Choice screen
  if (creationMode === "choice") {
    return (
      <div className="rounded-2xl border border-border bg-surface-elevated p-5 md:p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">New studio project</h2>
            <p className="mt-1 text-sm text-muted">How do you want to start?</p>
          </div>
          <button type="button" onClick={handleClose} className="text-muted">✕</button>
        </div>

        <div className="mt-5 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setCreationMode("prompt")}
            className="flex flex-col items-start gap-1.5 rounded-xl border border-accent/40 bg-accent-muted/10 p-4 text-left transition hover:border-accent hover:bg-accent-muted/20"
          >
            <div className="flex items-center gap-2 font-semibold text-sm">
              <Sparkles className="h-4 w-4 text-accent-light" /> Create with AI Prompt
            </div>
            <div className="text-xs text-muted">
              Describe your song idea. AI generates full lyrics, brief, and arrangement.
            </div>
          </button>

          <button
            type="button"
            onClick={() => setCreationMode("template")}
            className="flex flex-col items-start gap-1.5 rounded-xl border border-border bg-surface p-4 text-left transition hover:border-accent hover:bg-accent-muted/10"
          >
            <div className="flex items-center gap-2 font-semibold text-sm">
              Browse Templates
            </div>
            <div className="text-xs text-muted">
              Pick from available example templates (full lyrics + brief + arrangement).
            </div>
          </button>
        </div>

        <div className="mt-4 text-right">
          <button type="button" onClick={handleClose} className="btn-secondary text-sm">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Prompt mode
  if (creationMode === "prompt") {
    return (
      <div className="rounded-2xl border border-border bg-surface-elevated p-5 md:p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Generate with AI</h2>
            <p className="text-sm text-muted">Describe the song you want. AI will create full lyrics, brief, arrangement etc.</p>
          </div>
          <button type="button" onClick={resetToChoice} className="text-xs underline">Back</button>
        </div>

        <textarea
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          placeholder="e.g. A melancholic 80s synth pop song about a long distance phone call at night, lonely but hopeful"
          className="w-full min-h-[100px] rounded-xl border border-border bg-surface p-3 text-sm outline-none focus:border-accent/40"
        />

        {promptError && <p className="mt-2 text-sm text-warning">{promptError}</p>}

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={async () => {
              if (!promptText.trim()) return;
              setIsGeneratingFromPrompt(true);
              setPromptError(null);
              try {
                const generated = await generateProjectFromPrompt(promptText.trim());
                const project = onCreate({
                  title: generated.title,
                  artistName: generated.artistName,
                  genre: primaryGenreLabel({ genreTags: generated.genreTags, moodTags: generated.moodTags } as any),
                  mood: primaryMoodLabel({ genreTags: generated.genreTags, moodTags: generated.moodTags } as any),
                  genreTags: generated.genreTags,
                  moodTags: generated.moodTags,
                  bpmTarget: generated.bpmTarget,
                  creativeBrief: generated.creativeBrief,
                  musicArrangement: generated.musicArrangement,
                  initialLyrics: generated.lyrics,
                });
                router.push(`/studio/${project.id}/write`);
              } catch (e: any) {
                setPromptError(e?.message || "AI generation failed. Try a different description.");
              } finally {
                setIsGeneratingFromPrompt(false);
              }
            }}
            disabled={!promptText.trim() || isGeneratingFromPrompt}
            className="btn-primary"
          >
            {isGeneratingFromPrompt ? "Generating with AI..." : "Generate Project with AI"}
          </button>
          <button type="button" onClick={resetToChoice} className="btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Template mode - show ALL templates
  return (
    <div className="rounded-2xl border border-border bg-surface-elevated p-5 md:p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Choose a Template</h2>
          <p className="text-sm text-muted">All available full templates with lyrics, creative brief and arrangement.</p>
        </div>
        <button type="button" onClick={resetToChoice} className="text-xs underline">Back</button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {STUDIO_EXAMPLE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => createFromExample(preset.id)}
            title={preset.description}
            className="text-left rounded-xl border border-accent/30 bg-accent-muted/10 p-4 hover:border-accent hover:bg-accent-muted/20 transition"
          >
            <div className="font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent-light" /> {preset.label}
            </div>
            <div className="mt-1 text-sm text-muted line-clamp-2">{preset.description}</div>
          </button>
        ))}
      </div>

      <div className="mt-4">
        <button type="button" onClick={handleClose} className="btn-secondary text-sm">Cancel</button>
      </div>
    </div>
  );
}
