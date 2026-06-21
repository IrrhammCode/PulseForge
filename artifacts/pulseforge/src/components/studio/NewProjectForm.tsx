
import { useState } from "react";
import { useRouter } from "@/lib/navigation-compat";
import { Plus, Sparkles, Loader2 } from "lucide-react";
import { GENRE_OPTIONS, MOOD_OPTIONS, primaryGenreLabel, primaryMoodLabel } from "@/types/studio";
import type { CreateProjectInput, StudioProject } from "@/types/studio";
import { StyleTagPicker } from "@/components/studio/StyleTagPicker";
import { FillExampleButton } from "@/components/studio/FillExampleButton";
import {
  buildExampleCreateInput,
  STUDIO_EXAMPLE_PRESETS,
} from "@pulseforge/shared/lib/studio/example-presets";
import { generateProjectFromPrompt } from "@/lib/api-client";
import { composeLyricsBody } from "@/lib/studio/lyrics";

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
  const [aiGenerated, setAiGenerated] = useState<any>(null);

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
    setAiGenerated(null);
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
      <div className="border-2 border-foreground bg-surface p-5 md:p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">New studio project</h2>
            <p className="mt-1 text-sm text-muted">How do you want to start?</p>
          </div>
          <button type="button" onClick={handleClose} className="text-muted">×</button>
        </div>

        <div className="mt-5 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setCreationMode("prompt")}
            className="flex flex-col items-start gap-1.5 border-2 border-foreground bg-surface p-4 text-left transition hover:bg-foreground hover:text-background"
          >
            <div className="flex items-center gap-2 font-semibold text-sm">
              <Sparkles className="h-4 w-4" /> Create with AI Prompt
            </div>
            <div className="text-xs text-muted">
              Describe your song idea. AI generates full lyrics, brief, and arrangement.
            </div>
          </button>

          <button
            type="button"
            onClick={() => setCreationMode("template")}
            className="flex flex-col items-start gap-1.5 border-2 border-foreground bg-surface p-4 text-left transition hover:bg-foreground hover:text-background"
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
      <div className="border-2 border-foreground bg-surface p-5 md:p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Generate with AI</h2>
            <p className="text-sm text-muted">Describe the song you want. AI will create full lyrics, brief, arrangement etc.</p>
          </div>
          <button 
            type="button" 
            onClick={resetToChoice} 
            disabled={isGeneratingFromPrompt}
            className="text-xs underline disabled:opacity-50"
          >
            Back
          </button>
        </div>

        {isGeneratingFromPrompt ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-foreground mb-4" />
            <p className="text-lg font-medium">Generating project with Groq AI...</p>
            <p className="text-sm text-muted mt-2 max-w-xs">
              AI (Groq) is analyzing the "nuansa" in your prompt and generating a full project:<br />
              - Real lyrics for all sections (intro/verse/chorus...)<br />
              - Creative brief, music arrangement, genre/mood tags, bpm<br />
              Please wait (10-40s)...
            </p>
          </div>
        ) : aiGenerated ? (
          // Review the AI filled content before creating
          <div>
            <h3 className="font-semibold mb-2">AI Generated Preview (full AI filled)</h3>
            <div className="mb-4 space-y-2 text-sm bg-surface p-3 border-2 border-foreground">
              <div><strong>Title:</strong> {aiGenerated.title}</div>
              <div><strong>Artist:</strong> {aiGenerated.artistName}</div>
              <div><strong>Genre/Mood:</strong> {(aiGenerated.genreTags || []).join(", ")} × {(aiGenerated.moodTags || []).join(", ")}</div>
              <div><strong>BPM:</strong> {aiGenerated.bpmTarget || "auto"}</div>
              <div><strong>Provider:</strong> {aiGenerated._provider || "unknown"}</div>
            </div>

            <div className="mb-3">
              <div className="text-xs font-medium uppercase text-muted mb-1">Lyrics (filled by AI — must match your nuansa!)</div>
              <pre className="text-xs bg-background p-2 border-2 border-foreground overflow-auto max-h-40 whitespace-pre-wrap">{composeLyricsBody(aiGenerated.lyrics) || "(empty)"}</pre>
              <div className="text-[10px] text-muted mt-1">If this looks wrong (e.g. New York lyrics for a bayou prompt), click Regenerate.</div>
            </div>

            <div className="mb-3">
              <div className="text-xs font-medium uppercase text-muted mb-1">Creative Brief (filled)</div>
              <div className="text-xs bg-background p-2 border-2 border-foreground">{aiGenerated.creativeBrief?.story || '...'}</div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => {
                  const project = onCreate({
                    title: aiGenerated.title || "Untitled",
                    artistName: aiGenerated.artistName || "AI Generated",
                    genre: primaryGenreLabel({ genreTags: aiGenerated.genreTags || [], moodTags: aiGenerated.moodTags || [] } as any),
                    mood: primaryMoodLabel({ genreTags: aiGenerated.genreTags || [], moodTags: aiGenerated.moodTags || [] } as any),
                    genreTags: aiGenerated.genreTags || [],
                    moodTags: aiGenerated.moodTags || [],
                    bpmTarget: aiGenerated.bpmTarget,
                    creativeBrief: aiGenerated.creativeBrief,
                    musicArrangement: aiGenerated.musicArrangement,
                    initialLyrics: aiGenerated.lyrics,
                  });
                  router.push(`/studio/${project.id}/write`);
                }}
                className="btn-primary"
              >
                Create Project with this AI result
              </button>
              <button type="button" onClick={() => setAiGenerated(null)} className="btn-secondary">
                Regenerate
              </button>
            </div>
            <p className="mt-2 text-xs text-muted">AI has filled everything (real lyrics for all sections + full creativeBrief + musicArrangement + tags + bpm based on your "nuansa"). 
Create → open in Write (lyrics pre-filled, edit if needed) → use Analyze for partner analysis (MXM etc on AI data) → Viral Lab etc.</p>
          </div>
        ) : (
          <>
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="e.g. A melancholic 80s synth pop song about a long distance phone call at night, lonely but hopeful"
              className="w-full min-h-[100px] border-2 border-foreground bg-surface p-3 text-sm outline-none focus:bg-foreground/5"
            />

            {promptError && <p className="mt-2 text-sm text-foreground">{promptError}</p>}

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={async () => {
                  if (!promptText.trim()) return;
                  setIsGeneratingFromPrompt(true);
                  setPromptError(null);
                  try {
                    const generated = await generateProjectFromPrompt(promptText.trim());
                    // small delay to make loading visible
                    await new Promise(r => setTimeout(r, 300));
                    setAiGenerated(generated);
                    setIsGeneratingFromPrompt(false);
                  } catch (e: any) {
                    setPromptError(e?.message || "AI generation failed. Try a different description.");
                    setIsGeneratingFromPrompt(false);
                  }
                }}
                disabled={!promptText.trim()}
                className="btn-primary"
              >
                Generate Project with AI
              </button>
              <button type="button" onClick={resetToChoice} className="btn-secondary">
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // Template mode - show ALL templates
  return (
    <div className="border-2 border-foreground bg-surface p-5 md:p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Choose a Template</h2>
          <p className="text-sm text-muted">All available full templates with lyrics, creative brief and arrangement.</p>
        </div>
        <button type="button" onClick={resetToChoice} className="text-xs underline">Back</button>
      </div>

      <div className="flex flex-col gap-3">
        {STUDIO_EXAMPLE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => createFromExample(preset.id)}
            title={preset.description}
            className="text-left border-2 border-foreground bg-surface p-4 transition hover:bg-foreground hover:text-background"
          >
            <div className="font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> {preset.label}
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
