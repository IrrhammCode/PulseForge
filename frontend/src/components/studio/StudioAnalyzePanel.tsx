"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, BarChart3, RefreshCw } from "lucide-react";
import type { StudioProject } from "@/types/studio";
import type { TrackAnalysis } from "@/types";
import { analyzeStudioVersion, ApiError } from "@/lib/api-client";
import { composeLyricsBody, hasLyricsContent } from "@/lib/studio/lyrics";
import { HitPotentialPanel } from "@/components/analysis/HitPotentialPanel";
import { LyricsAnalysis } from "@/components/analysis/LyricsAnalysis";
import { ListenerSimulation } from "@/components/analysis/ListenerSimulation";
import { EnergyInsights } from "@/components/analysis/EnergyInsights";
import { MarketingRecommendations } from "@/components/analysis/MarketingRecommendations";
import { StreamingInsights } from "@/components/analysis/StreamingInsights";
import { ContextInsights } from "@/components/analysis/ContextInsights";
import { SimilarTracksPanel } from "@/components/analysis/SimilarTracksPanel";
import { PartnerStackSummary } from "@/components/analysis/PartnerStackSummary";
import { PartnerBadges } from "@/components/analysis/PartnerBadges";
import { AnalysisProgress } from "@/components/ui/Skeleton";
import { Card, CardHeader } from "@/components/ui/Card";
import { StaleAnalysisAlert } from "@/components/studio/StaleAnalysisAlert";
import { StudioStaleViralBanner } from "@/components/studio/StudioStaleViralBanner";
import { buildCreativeGraph } from "@/lib/domain/creative-graph";
import { ViralLabCTA } from "@/components/viral/ViralLabCTA";
import { applyConceptToLyrics, buildAutoFixPatches } from "@pulseforge/shared/lib/studio/song-concept";
import { primaryGenreLabel, primaryMoodLabel } from "@/types/studio";
import { buildCompositionPlan, buildFullSongPrompt } from "@pulseforge/shared/lib/studio/style-prompt";
import { generateFullSong } from "@/lib/api-client";

interface StudioAnalyzePanelProps {
  project: StudioProject;
  onAnalysisSaved?: (analysis: TrackAnalysis) => void;
  onUpdateProject?: (patch: any) => void;
  onSaveLyrics?: (lyrics: any) => void;
  onSaveAudio?: (audio: any) => void;
  onUpdateStems?: (patch: any) => void;
  saveFullSong?: (blob: Blob) => Promise<void>;
  saveFullSongAndOpenProduce?: (blob: Blob) => Promise<void>;
}

export function StudioAnalyzePanel({ 
  project, onAnalysisSaved, onUpdateProject, onSaveLyrics, onSaveAudio, onUpdateStems, 
  saveFullSong, saveFullSongAndOpenProduce 
}: StudioAnalyzePanelProps) {
  const activeVersion = project.versions.find((v) => v.id === project.activeVersionId);
  const [analysis, setAnalysis] = useState<TrackAnalysis | null>(
    activeVersion?.analysis ?? null
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAnalysis(activeVersion?.analysis ?? null);
    setError(null);
  }, [activeVersion?.id, activeVersion?.analysis]);

  const hasLyrics = activeVersion ? hasLyricsContent(activeVersion.lyrics) : false;
  const analyzedAt = activeVersion?.analyzedAt;
  const graph = buildCreativeGraph(project, activeVersion?.id);
  const demoBpm = graph?.snapshot.audio?.estimatedBpm;

  const runAnalysis = useCallback(async () => {
    if (!activeVersion) return;

    setIsAnalyzing(true);
    setError(null);
    setProgressStep(0);

    const stepInterval = setInterval(() => {
      setProgressStep((s) => Math.min(s + 1, 3));
    }, 400);

    try {
      const lyricsBody = composeLyricsBody(activeVersion.lyrics);
      const result = await analyzeStudioVersion(project, {
        versionId: activeVersion.id,
        lyricsBody,
      });
      setAnalysis(result);
      onAnalysisSaved?.(result);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Analysis failed";
      setError(msg);
    } finally {
      clearInterval(stepInterval);
      setIsAnalyzing(false);
      setProgressStep(3);
    }
  }, [activeVersion, project, onAnalysisSaved]);

  const handleAutoFixAndGenerate = useCallback(async () => {
    if (!activeVersion || !analysis) return;

    // Use helper for patches
    const patches = buildAutoFixPatches(analysis.meta?.mxmCoach, project, analysis);

    // Apply fixes
    if (onUpdateProject) onUpdateProject(patches);
    if (onSaveLyrics && activeVersion.lyrics) {
      const p = { ...project, ...patches };
      onSaveLyrics(applyConceptToLyrics(p as any, activeVersion.lyrics));
    }
    if (onAnalysisSaved) onAnalysisSaved({ ...analysis, meta: { ...analysis.meta, mxmCoach: analysis.meta?.mxmCoach || {} } });

    // Langsung generate
    try {
      const lyricsForGen = activeVersion.lyrics;
      const fullLyrics = composeLyricsBody(lyricsForGen);
      const coach = analysis.meta?.mxmCoach || {};
      const compPlan = buildCompositionPlan(lyricsForGen, { ...project, ...patches }, coach);
      const prompt = buildFullSongPrompt({ ...project, ...patches }, fullLyrics, coach);

      const blob = await generateFullSong(prompt, { modelId: "music_v2", compositionPlan: compPlan });

      if (saveFullSong) await saveFullSong(blob);
      else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${project.title || "song"}.mp3`;
        a.click();
        URL.revokeObjectURL(url);
      }
      if (onUpdateStems) onUpdateStems({ stemSource: "musixmatch" });
      alert("✅ Auto Fix + Generate done!");
    } catch (e: any) {
      alert("Fix done, generate failed: " + (e.message || e));
    }
  }, [analysis, activeVersion, project, onUpdateProject, onSaveLyrics, onAnalysisSaved, saveFullSong, onUpdateStems]);

  return (
    <div className="space-y-6">
      <StudioStaleViralBanner projectId={project.id} />
      <Card glow="none">
        <CardHeader
          title="Studio Analyze"
          subtitle={
            activeVersion
              ? `Score ${activeVersion.label} from lyrics${demoBpm ? ` + demo (~${demoBpm} BPM)` : ""} — local-first studio intel`
              : "Select a version to analyze"
          }
          action={
            <PartnerBadges meta={analysis?.meta} />
          }
        />

        {graph?.analysisStale && hasLyrics && (
          <div className="mb-4">
            <StaleAnalysisAlert
              reason={graph.staleReason}
              onReanalyze={runAnalysis}
              isAnalyzing={isAnalyzing}
            />
          </div>
        )}

        {!hasLyrics ? (
          <div className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">
            <p>Write lyrics in the Write tab first, then come back to analyze.</p>
            <Link
              href={`/studio/${project.id}/write`}
              className="mt-3 inline-flex text-accent-light hover:text-foreground"
            >
              Go to Write →
            </Link>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={runAnalysis}
              disabled={isAnalyzing}
              className="btn-primary"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Analyzing…
                </>
              ) : (
                <>
                  <BarChart3 className="h-4 w-4" />
                  {analysis ? "Re-analyze" : "Analyze version"}
                </>
              )}
            </button>
            {analysis && !isAnalyzing && (
              <>
                <button
                  type="button"
                  onClick={handleAutoFixAndGenerate}
                  className="btn-primary bg-green-600 hover:bg-green-700"
                  title="Auto Fix + Generate"
                >
                  🚀 Auto Fix + Generate
                </button>
                {saveFullSongAndOpenProduce && (
                  <button
                    type="button"
                    onClick={handleAutoFixAndGenerateAndOpen}
                    className="btn-primary bg-purple-600 hover:bg-purple-700"
                  >
                    Auto Fix + Generate + Open Produce
                  </button>
                )}
              </>
            )}
            {analyzedAt && (
              <span className="text-xs text-muted">
                Last run {new Date(analyzedAt).toLocaleString()}
              </span>
            )}
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {isAnalyzing && (
          <div className="mt-4">
            <AnalysisProgress step={progressStep} />
          </div>
        )}
      </Card>

      {analysis && !isAnalyzing && (
        <div className="space-y-6">
          <PartnerStackSummary meta={analysis.meta} streaming={analysis.streaming} />
          <ViralLabCTA
            projectId={project.id}
            projectTitle={project.title}
            hitScore={analysis.hitPotential.overall}
          />
          <div className="grid gap-6 lg:grid-cols-2">
            <HitPotentialPanel data={analysis.hitPotential} />
            <LyricsAnalysis data={analysis.lyrics} meta={analysis.meta} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <ListenerSimulation data={analysis.simulation} />
            <EnergyInsights data={analysis.energy} />
          </div>
          {(analysis.catalogBenchmark?.similarTracks?.length ?? 0) > 0 && (
            <SimilarTracksPanel benchmark={analysis.catalogBenchmark} />
          )}
          {(analysis.streaming || analysis.seasonalContext || analysis.releaseHistory) && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">
                Streaming & context
              </h3>
              <div className="grid gap-6 lg:grid-cols-2">
                <ContextInsights
                  seasonal={analysis.seasonalContext}
                  releaseHistory={analysis.releaseHistory}
                />
                {analysis.streaming ? (
                  <StreamingInsights
                    data={analysis.streaming}
                    artistMomentum={analysis.artistMomentum}
                    velocityHistory={analysis.velocityHistory}
                  />
                ) : null}
              </div>
            </div>
          )}
          <MarketingRecommendations recommendations={analysis.recommendations} />
        </div>
      )}
    </div>
  );
}