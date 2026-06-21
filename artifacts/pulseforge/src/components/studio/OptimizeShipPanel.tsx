import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import {
  AlertCircle,
  ArrowRight,
  Check,
  Loader2,
  PenLine,
  Rocket,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { StudioProject } from "@/types/studio";
import type { TrackAnalysis } from "@/types";
import { analyzeStudioVersion, ApiError, coachFixLyrics } from "@/lib/api-client";
import { composeLyricsBody } from "@/lib/studio/lyrics";
import { applyConceptToLyrics, buildAutoFixPatches } from "@pulseforge/shared/lib/studio/song-concept";
import type { LyricsSections } from "@/types/studio";
import {
  commandSaveAnalysis,
  commandSaveLyrics,
  commandUpdateProject,
} from "@/lib/domain/project-commands";

type StepStatus = "pending" | "running" | "done" | "error";

interface PipelineStep {
  key: string;
  label: string;
  status: StepStatus;
  detail?: string;
}

const BASE_STEPS: PipelineStep[] = [
  { key: "analyze", label: "Analyze baseline", status: "pending" },
  { key: "coach", label: "Partner coach fix", status: "pending" },
  { key: "sandbox", label: "Sandbox 2 candidates", status: "pending" },
  { key: "review", label: "Score gate review", status: "pending" },
  { key: "commit", label: "Commit best fix", status: "pending" },
];

interface OptimizeResult {
  beforeOverall: number;
  afterOverall: number;
  beforeHook: number;
  afterHook: number;
  gatePass: boolean;
  winner: "full" | "conservative";
}

interface OptimizeShipPanelProps {
  project: StudioProject;
  onClose: () => void;
  onChanged?: () => void;
}

function scoreOf(a: TrackAnalysis) {
  return {
    overall: a.hitPotential?.overall ?? 0,
    hook: a.hitPotential?.breakdown?.hookStrength ?? 0,
  };
}

export function OptimizeShipPanel({ project, onClose, onChanged }: OptimizeShipPanelProps) {
  const activeVersion =
    project.versions.find((v) => v.id === project.activeVersionId) ?? project.versions[0];
  const hasLyrics = !!(
    activeVersion &&
    (activeVersion.lyrics.chorus?.trim() || activeVersion.lyrics.raw?.trim())
  );

  const [steps, setSteps] = useState<PipelineStep[]>(BASE_STEPS);
  const [phase, setPhase] = useState<"idle" | "running" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OptimizeResult | null>(null);
  const runningRef = useRef(false);

  const setStep = useCallback((key: string, status: StepStatus, detail?: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.key === key ? { ...s, status, detail: detail ?? s.detail } : s))
    );
  }, []);

  const run = useCallback(
    async (aggressive: boolean) => {
      if (runningRef.current || !activeVersion || !hasLyrics) return;
      runningRef.current = true;
      setPhase("running");
      setError(null);
      setResult(null);
      setSteps(BASE_STEPS.map((s) => ({ ...s, status: "pending", detail: undefined })));

      try {
        // 1. Analyze baseline — ALWAYS a fresh server-side run from the
        // current lyrics. Reusing a cached analysis made before/after
        // inconsistent (the cache could already include a prior optimize
        // gain, or be computed with different partner/trend state than the
        // re-analyzed candidates), which produced a misleading +0/+0.
        setStep("analyze", "running");
        const baselineLyricsBody = composeLyricsBody(activeVersion.lyrics);
        const baseline: TrackAnalysis = await analyzeStudioVersion(project, {
          versionId: activeVersion.id,
          lyricsBody: baselineLyricsBody,
        });
        setStep("analyze", "done", "Fresh analysis run");
        const before = scoreOf(baseline);

        // 2. Partner coach fix — server-side runIntelligentOptimize
        // (local → partner → ai). Integrates Musixmatch / Cyanite / Songstats
        // signals and an optional AI lyric rewrite. Falls back to the local
        // deterministic engine if the endpoint is unavailable.
        setStep("coach", "running");
        let patches: {
          moodTags?: string[];
          bpmTarget?: number;
          creativeBrief: Record<string, unknown>;
          musicArrangement: Record<string, unknown>;
        };
        let fullLyrics: LyricsSections;
        try {
          const coach = await coachFixLyrics(project, baseline, {
            versionId: activeVersion.id,
            lyrics: activeVersion.lyrics,
          });
          patches = coach.patches;
          fullLyrics = coach.lyrics;
          const tierLabel =
            coach.tier === "ai"
              ? `AI rewrite (${coach.aiBackend})`
              : coach.tier === "partner"
                ? "Partner signals"
                : "Local engine";
          const partners = [
            coach.intelligence.musixmatch && "Musixmatch",
            coach.intelligence.cyanite && "Cyanite",
            coach.intelligence.songstats && "Songstats",
          ]
            .filter(Boolean)
            .join(" · ");
          setStep("coach", "done", partners ? `${tierLabel} · ${partners}` : tierLabel);
        } catch {
          // Graceful degradation: deterministic local engine.
          patches = buildAutoFixPatches(baseline.meta?.mxmCoach, project, baseline);
          fullLyrics = applyConceptToLyrics(
            { ...project, ...patches } as StudioProject,
            activeVersion.lyrics
          );
          setStep("coach", "done", "Local engine (partners offline)");
        }

        // 3. Sandbox 2 candidates (re-analyze without saving). Both candidates
        // are evaluated under the SAME coach patch context (bpmTarget / mood /
        // arrangement) so non-lyric gains are measured too:
        //   - conservative = patched project + original lyrics
        //   - full         = patched project + rewritten lyrics
        // `before` stays the fresh UNPATCHED baseline, so the reported delta
        // captures the full optimize effect (patches + rewrite). The trend feed
        // is cached/deterministic within a run, so baseline vs. candidates is a
        // clean comparison with no drift.
        setStep("sandbox", "running");
        const patchedProject = { ...project, ...patches } as StudioProject;
        const conservativeLyrics = activeVersion.lyrics;

        const analyzeCandidate = (lyrics: LyricsSections) =>
          analyzeStudioVersion(
            {
              ...patchedProject,
              versions: project.versions.map((v) =>
                v.id === activeVersion.id ? { ...v, lyrics } : v
              ),
            } as StudioProject,
            { versionId: activeVersion.id, lyricsBody: composeLyricsBody(lyrics) }
          );

        // Promise.allSettled (not Promise.all) so a failing candidate fetch
        // never leaves a sibling promise rejection unhandled — an unhandled
        // rejection would be caught by ChunkLoadRecovery and reload the page.
        const settled = await Promise.allSettled([
          analyzeCandidate(fullLyrics),
          analyzeCandidate(conservativeLyrics),
        ]);
        const firstRejected = settled.find(
          (r): r is PromiseRejectedResult => r.status === "rejected"
        );
        if (firstRejected) throw firstRejected.reason;
        const fullAnalysis = (settled[0] as PromiseFulfilledResult<TrackAnalysis>).value;
        const conservativeAnalysis = (settled[1] as PromiseFulfilledResult<TrackAnalysis>).value;
        setStep("sandbox", "done", "2 candidates re-analyzed");

        // 4. Score gate review — pick best by overall, tiebreak hook.
        // Aggressive retry tie-breaks toward the full lyric rewrite.
        setStep("review", "running");
        const fullScore = scoreOf(fullAnalysis);
        const consScore = scoreOf(conservativeAnalysis);
        const fullBetter = aggressive
          ? fullScore.overall >= consScore.overall
          : fullScore.overall > consScore.overall ||
            (fullScore.overall === consScore.overall && fullScore.hook >= consScore.hook);

        const winner: "full" | "conservative" = fullBetter ? "full" : "conservative";
        const bestAnalysis = winner === "full" ? fullAnalysis : conservativeAnalysis;
        const bestLyrics = winner === "full" ? fullLyrics : conservativeLyrics;
        const after = scoreOf(bestAnalysis);

        const dOverall = after.overall - before.overall;
        const dHook = after.hook - before.hook;
        const meaningfulGain = dOverall >= 3 || dHook >= 5;
        const hookCrash = dHook < -5;
        const gatePass = meaningfulGain && !hookCrash;
        setStep(
          "review",
          "done",
          `Hit ${dOverall >= 0 ? "+" : ""}${dOverall} · Hook ${dHook >= 0 ? "+" : ""}${dHook}`
        );

        // 5. Commit best fix to project (always persisted, even if gate fails)
        setStep("commit", "running");
        // Validate the analysis shape BEFORE writing anything. A malformed
        // analysis (missing hitPotential.breakdown) would crash the dashboard
        // render on the next refresh; failing fast here keeps state consistent.
        if (!bestAnalysis?.hitPotential?.breakdown) {
          throw new Error("Optimize produced an invalid analysis — nothing was changed");
        }
        const commitPatch: Record<string, unknown> = {
          creativeBrief: patches.creativeBrief,
          musicArrangement: patches.musicArrangement,
        };
        if (patches.moodTags) commitPatch.moodTags = patches.moodTags;
        if (patches.bpmTarget) commitPatch.bpmTarget = patches.bpmTarget;
        const savedProject = commandUpdateProject(project.id, commitPatch as never);
        const savedLyrics = commandSaveLyrics(project.id, activeVersion.id, bestLyrics);
        const savedAnalysis = commandSaveAnalysis(project.id, activeVersion.id, bestAnalysis);
        if (!savedProject || !savedLyrics || !savedAnalysis) {
          throw new Error("Could not save optimized fixes to the project");
        }
        setStep("commit", "done", gatePass ? "Saved — ready to ship" : "Fixes saved to project");

        setResult({
          beforeOverall: before.overall,
          afterOverall: after.overall,
          beforeHook: before.hook,
          afterHook: after.hook,
          gatePass,
          winner,
        });
        setPhase("done");
        onChanged?.();
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : "Optimize pipeline failed";
        setError(msg);
        setSteps((prev) =>
          prev.map((s) => (s.status === "running" ? { ...s, status: "error" } : s))
        );
        setPhase("error");
      } finally {
        runningRef.current = false;
      }
    },
    [activeVersion, hasLyrics, project, setStep, onChanged]
  );

  useEffect(() => {
    if (hasLyrics) void run(false).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const running = phase === "running";

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="flex w-full flex-col overflow-hidden border-2 border-foreground bg-background">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-foreground px-5 py-4">
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            <h2 className="font-display text-xl uppercase leading-none tracking-tight">
              Optimize &amp; Ship
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={running}
            className="border-2 border-foreground p-1.5 transition hover:bg-foreground hover:text-background disabled:opacity-40"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5">
          <p className="text-sm text-muted">
            {project.title} <span className="text-border">·</span> {project.artistName}
          </p>

          {!hasLyrics ? (
            <div className="mt-4 flex items-start gap-2 border-2 border-foreground bg-surface p-3 text-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              Add chorus lyrics in Write first, then run Optimize &amp; Ship.
            </div>
          ) : (
            <>
              {/* Steps */}
              <ol className="mt-5 space-y-2.5">
                {steps.map((step, idx) => (
                  <li key={step.key} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border-2 border-foreground">
                      {step.status === "running" ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : step.status === "done" ? (
                        <Check className="h-3 w-3" />
                      ) : step.status === "error" ? (
                        <AlertCircle className="h-3 w-3" />
                      ) : (
                        <span className="text-[10px] font-semibold tabular-nums text-muted">
                          {idx + 1}
                        </span>
                      )}
                    </span>
                    <div className="flex-1">
                      <p
                        className={`text-sm font-medium ${
                          step.status === "pending" ? "text-muted" : "text-foreground"
                        }`}
                      >
                        {step.label}
                      </p>
                      {step.detail && (
                        <p className="text-[11px] text-muted">{step.detail}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>

              {error && (
                <div className="mt-4 flex items-start gap-2 border-2 border-warning/40 bg-warning/10 p-3 text-sm text-warning">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Result */}
              {result && phase === "done" && (
                <div className="mt-5 border-2 border-foreground bg-surface">
                  <div className="border-b-2 border-foreground px-4 py-2">
                    <span
                      className={`text-[11px] font-semibold uppercase tracking-wider ${
                        result.gatePass ? "text-foreground" : "text-muted"
                      }`}
                    >
                      {result.gatePass
                        ? "Optimized — ready to ship"
                        : "Fixes saved to project"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 divide-x-2 divide-foreground">
                    <div className="px-4 py-3">
                      <p className="landing-eyebrow text-muted">Hit Score</p>
                      <p className="mt-1 font-display text-3xl leading-none tabular-nums">
                        {result.afterOverall}
                        <span className="ml-2 text-sm text-muted">
                          {result.afterOverall - result.beforeOverall >= 0 ? "+" : ""}
                          {result.afterOverall - result.beforeOverall}
                        </span>
                      </p>
                      <p className="mt-1 text-[11px] text-muted">was {result.beforeOverall}</p>
                    </div>
                    <div className="px-4 py-3">
                      <p className="landing-eyebrow text-muted">Hook Strength</p>
                      <p className="mt-1 font-display text-3xl leading-none tabular-nums">
                        {result.afterHook}
                        <span className="ml-2 text-sm text-muted">
                          {result.afterHook - result.beforeHook >= 0 ? "+" : ""}
                          {result.afterHook - result.beforeHook}
                        </span>
                      </p>
                      <p className="mt-1 text-[11px] text-muted">was {result.beforeHook}</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer actions */}
        {hasLyrics && (
          <div className="flex flex-wrap items-center gap-2 border-t-2 border-foreground px-5 py-4">
            {running && (
              <span className="flex items-center gap-2 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                Optimizing… please wait
              </span>
            )}

            {phase === "error" && (
              <button type="button" onClick={() => run(false)} className="btn-primary text-xs">
                Try again
              </button>
            )}

            {phase === "done" && (
              <>
                <Link
                  href={`/studio/${project.id}/write`}
                  className="btn-secondary text-xs"
                >
                  <PenLine className="h-3.5 w-3.5" />
                  View lyrics
                </Link>
                {result?.gatePass ? (
                  <Link
                    href={`/studio/${project.id}/produce`}
                    className="btn-primary text-xs"
                  >
                    Focus Editor
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => run(true)}
                    className="btn-primary text-xs"
                    title="Re-run more aggressively with a fresh analysis"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    Try again (aggressive)
                  </button>
                )}
                <Link
                  href={`/studio/${project.id}/launch`}
                  className="btn-secondary text-xs"
                >
                  <Rocket className="h-3.5 w-3.5" />
                  Launch
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
