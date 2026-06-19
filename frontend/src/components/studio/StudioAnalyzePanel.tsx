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

interface StudioAnalyzePanelProps {
  project: StudioProject;
  onAnalysisSaved?: (analysis: TrackAnalysis) => void;
}

export function StudioAnalyzePanel({ project, onAnalysisSaved }: StudioAnalyzePanelProps) {
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