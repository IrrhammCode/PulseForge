
import { useCallback, useEffect, useRef, useState } from "react";
import { TrackSearch } from "@/components/search/TrackSearch";
import { EmptyState } from "@/components/analysis/EmptyState";
import { TrackHero } from "@/components/analysis/TrackHero";
import { HitPotentialPanel } from "@/components/analysis/HitPotentialPanel";
import { LyricsAnalysis } from "@/components/analysis/LyricsAnalysis";
import { ListenerSimulation } from "@/components/analysis/ListenerSimulation";
import { EnergyInsights } from "@/components/analysis/EnergyInsights";
import { WhatIfSimulator } from "@/components/analysis/WhatIfSimulator";
import { MarketingRecommendations } from "@/components/analysis/MarketingRecommendations";
import { StreamingInsights } from "@/components/analysis/StreamingInsights";
import { ContextInsights } from "@/components/analysis/ContextInsights";
import { PartnerBadges } from "@/components/analysis/PartnerBadges";
import { SimilarTracksPanel } from "@/components/analysis/SimilarTracksPanel";
import { ExportReport } from "@/components/analysis/ExportReport";
import { StatsStrip } from "@/components/analysis/StatsStrip";
import { AnalysisProgress } from "@/components/ui/Skeleton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { DEFAULT_WHAT_IF } from "@/lib/constants";
import { analyzeTrack, ApiError, fetchCatalogTrack } from "@/lib/api-client";
import type { AppTrack } from "@/lib/musixmatch/client";
import type { SimilarTrackRef, TrackAnalysis, WhatIfParams } from "@/types";
import { CatalogCompareChips } from "@/components/analysis/CatalogCompareChips";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { ImportToStudioButton } from "@/components/analyze/ImportToStudioButton";
import { IntelligenceBanner } from "@/components/layout/IntelligenceBanner";
import { logActivity } from "@/lib/activity";

export default function AnalyzePage() {
  const [selectedTrack, setSelectedTrack] = useState<AppTrack | null>(null);
  const [baseAnalysis, setBaseAnalysis] = useState<TrackAnalysis | null>(null);
  const [analysis, setAnalysis] = useState<TrackAnalysis | null>(null);
  const [whatIfParams, setWhatIfParams] = useState<WhatIfParams>(DEFAULT_WHAT_IF);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [anchorAnalysis, setAnchorAnalysis] = useState<TrackAnalysis | null>(null);
  const [comparingId, setComparingId] = useState<string | null>(null);
  const whatIfTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);

  const scoreDelta =
    baseAnalysis && analysis
      ? analysis.hitPotential.overall - baseAnalysis.hitPotential.overall
      : 0;

  const runFullAnalysis = useCallback(async (track: AppTrack, whatIf?: WhatIfParams) => {
    setIsAnalyzing(true);
    setError(null);
    setProgressStep(0);

    const stepInterval = setInterval(() => {
      setProgressStep((s) => Math.min(s + 1, 3));
    }, 500);

    try {
      const result = await analyzeTrack(track, { whatIf });
      setBaseAnalysis(result);
      setAnalysis(result);
      return result;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Analysis failed";
      setError(msg);
      const apiErr = err instanceof ApiError ? err : null;
      setHint(apiErr ? apiErr.hint ?? null : null);
      if (msg.includes("Invalid Musixmatch") && !apiErr?.hint) {
        setHint("Check backend/.env has correct MUSIXMATCH_API_KEY or MXM_KEY (no extra spaces/quotes). Restart backend fully. Check startup log for key length and 'Musixmatch key debug' lines.");
      }
      setAnalysis(null);
      setBaseAnalysis(null);
      return null;
    } finally {
      clearInterval(stepInterval);
      setIsAnalyzing(false);
      setProgressStep(3);
    }
  }, []);

  const handleSelectTrack = useCallback(
    async (track: AppTrack) => {
      setSelectedTrack(track);
      setAnchorAnalysis(null);
      setComparingId(null);
      setWhatIfParams(DEFAULT_WHAT_IF);
      const result = await runFullAnalysis(track, DEFAULT_WHAT_IF);
      if (result) {
        setAnchorAnalysis(result);

        // Persist last QA analysis snapshot for seamless handoff to Viral Lab (full data, not just title/artist)
        try {
          const slim = {
            track: result.track,
            hitPotential: result.hitPotential,
            lyrics: result.lyrics,
            energy: result.energy,
            simulation: result.simulation,
            recommendations: result.recommendations?.slice(0, 3),
            meta: result.meta,
          };
          localStorage.setItem("pulseforge_last_qa_analysis", JSON.stringify(slim));
        } catch {}

        logActivity("analyze_complete", {
          title: `${result.track.title} — ${result.track.artist}`,
          score: result.hitPotential.overall,
          link: "/analyze",
        });

        requestAnimationFrame(() => {
          dashboardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    },
    [runFullAnalysis]
  );

  const handleCompareSimilar = useCallback(
    async (similar: SimilarTrackRef) => {
      setComparingId(similar.id);
      setError(null);
      try {
        const track = await fetchCatalogTrack(similar.id);
        setSelectedTrack(track);
        setWhatIfParams(DEFAULT_WHAT_IF);
        const result = await runFullAnalysis(track, DEFAULT_WHAT_IF);
        if (result) {
          requestAnimationFrame(() => {
            dashboardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          });
        }
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : "Compare failed";
        setError(msg);
      } finally {
        setComparingId(null);
      }
    },
    [runFullAnalysis]
  );

  useEffect(() => {
    if (!selectedTrack || !baseAnalysis || isAnalyzing) return;

    if (whatIfTimer.current) clearTimeout(whatIfTimer.current);

    whatIfTimer.current = setTimeout(async () => {
      setIsRecalculating(true);
      try {
        const updated = await analyzeTrack(selectedTrack, {
          whatIf: whatIfParams,
          cachedAnalysis: baseAnalysis,
        });
        setAnalysis(updated);
      } catch {
        // Keep previous analysis on what-if failure
      } finally {
        setIsRecalculating(false);
      }
    }, 350);

    return () => {
      if (whatIfTimer.current) clearTimeout(whatIfTimer.current);
    };
  }, [whatIfParams, selectedTrack, baseAnalysis, isAnalyzing]);

  return (
    <div className="relative z-10 space-y-8">
      <IntelligenceBanner className="mb-6 lg:hidden" />

      <section>
        <div className="mb-6 animate-fade-in">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            Analyze before you <span className="text-accent">release</span>
          </h2>
          <p className="mt-2 max-w-xl text-sm text-muted md:text-base">
            Search your track via Musixmatch, get hit potential scoring, simulate 1M listener
            growth, and unlock a marketing playbook.
          </p>
          <p className="mt-1 text-xs text-muted">12,480 tracks analyzed this week • Trusted by indie artists for Musicathon 2026</p>
        </div>
        <TrackSearch
          onSelect={handleSelectTrack}
          selectedTrack={selectedTrack}
          isLoading={isAnalyzing}
        />
      </section>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/5 p-4 animate-fade-in">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <div>
            <p className="text-sm text-danger">{error}</p>
            {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
          </div>
        </div>
      )}

      {isAnalyzing && (
        <AnalysisProgress
          step={progressStep}
          hasAnalysis={selectedTrack?.hasAnalysis}
          hasRichsync={selectedTrack?.hasRichsync}
        />
      )}

      {!selectedTrack && !isAnalyzing && <EmptyState />}

      {analysis && !isAnalyzing && (
        <div ref={dashboardRef} className="scroll-mt-24 space-y-8 animate-stagger">
          {/* Hasil Analisis - Quick Preview (High Priority) - strengthened with bars and more value */}
          <div className="rounded-2xl border-2 border-accent/50 bg-gradient-to-br from-accent/10 to-transparent p-6 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Hasil Analisis</h3>
                <p className="text-xs text-muted">Mini preview • full details below</p>
              </div>
              <div className="text-[10px] uppercase tracking-wider text-accent-light">Live from Musixmatch</div>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex-1">
                <p className="text-xs uppercase tracking-[0.15em] text-accent-light font-semibold">Quick Preview</p>
                <div className="mt-1 flex items-baseline gap-3">
                  <span className="text-5xl font-bold tabular-nums">{analysis.hitPotential.overall}</span>
                  <span className="text-xl text-muted">Hit Potential</span>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-28">Hook Strength</span>
                    <div className="flex-1 h-2 bg-border rounded">
                      <div className="h-2 bg-accent rounded" style={{width: `${analysis.lyrics.hookStrength}%`}}></div>
                    </div>
                    <span className="font-medium w-8 text-right text-accent-light">{analysis.lyrics.hookStrength}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-28">Energy</span>
                    <div className="flex-1 h-2 bg-border rounded">
                      <div className="h-2 bg-accent rounded" style={{width: `${Math.round(analysis.energy.energy * 100)}%`}}></div>
                    </div>
                    <span className="font-medium w-8 text-right text-accent-light">{Math.round(analysis.energy.energy * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-28">Danceability</span>
                    <div className="flex-1 h-2 bg-border rounded">
                      <div className="h-2 bg-accent rounded" style={{width: `${Math.round(analysis.energy.danceability * 100)}%`}}></div>
                    </div>
                    <span className="font-medium w-8 text-right text-accent-light">{Math.round(analysis.energy.danceability * 100)}%</span>
                  </div>
                  {analysis.simulation.probabilityToReach && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="w-28">1M Chance</span>
                      <div className="flex-1 h-2 bg-border rounded">
                        <div className="h-2 bg-accent rounded" style={{width: `${analysis.simulation.probabilityToReach}%`}}></div>
                      </div>
                      <span className="font-medium w-8 text-right text-accent-light">{analysis.simulation.probabilityToReach}%</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 lg:items-center">
                {selectedTrack && (
                  <ImportToStudioButton track={selectedTrack} analysis={analysis} />
                )}
                <Link
                  href={`/viral?demo=true&from=qa&title=${encodeURIComponent(analysis.track.title)}&artist=${encodeURIComponent(analysis.track.artist)}`}
                  className="inline-flex items-center justify-center rounded-xl border border-accent/40 bg-accent-muted px-4 py-2 text-sm font-semibold text-accent-light transition hover:bg-accent-muted/80"
                >
                  Run Full Viral Simulation on This Track →
                </Link>
                <ExportReport analysis={analysis} />
              </div>
            </div>

            {analysis.recommendations?.length > 0 && (
              <p className="mt-3 text-sm text-muted line-clamp-2">
                💡 {analysis.recommendations[0].description}
              </p>
            )}
          </div>

          <section className="space-y-4">
            <SectionHeader title="Overview" subtitle="Track identity & quick metrics" />
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <TrackHero track={analysis.track} />
                <div className="flex flex-col gap-2 sm:items-end">
                  <ExportReport analysis={analysis} />
                </div>
              </div>
              {anchorAnalysis &&
                selectedTrack &&
                anchorAnalysis.track.id !== analysis.track.id && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-accent/25 bg-accent-muted px-4 py-3 text-sm">
                    <span className="text-muted">
                      Comparing to anchor{" "}
                      <span className="font-medium text-foreground">
                        {anchorAnalysis.track.title}
                      </span>
                      {anchorAnalysis.lyrics.hookStrength != null &&
                        analysis.lyrics.hookStrength != null && (
                          <span className="ml-2 tabular-nums text-accent-light">
                            Δ hook{" "}
                            {analysis.lyrics.hookStrength - anchorAnalysis.lyrics.hookStrength >= 0
                              ? "+"
                              : ""}
                            {analysis.lyrics.hookStrength - anchorAnalysis.lyrics.hookStrength}
                          </span>
                        )}
                    </span>
                    <button
                      type="button"
                      className="text-xs font-medium text-accent-light hover:text-foreground"
                      onClick={() => {
                        if (!anchorAnalysis) return;
                        const track = {
                          ...anchorAnalysis.track,
                          id: anchorAnalysis.track.id,
                          title: anchorAnalysis.track.title,
                          artist: anchorAnalysis.track.artist,
                          duration: anchorAnalysis.track.duration,
                          hasAnalysis: anchorAnalysis.meta?.hasAnalysis,
                          hasRichsync: anchorAnalysis.meta?.hasRichsync,
                        } as AppTrack;
                        setSelectedTrack(track);
                        setAnalysis(anchorAnalysis);
                        setBaseAnalysis(anchorAnalysis);
                      }}
                    >
                      Back to anchor
                    </button>
                  </div>
                )}
              <PartnerBadges meta={analysis.meta} />
              <StatsStrip analysis={analysis} scoreDelta={scoreDelta} />
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeader title="Scoring & Growth" subtitle="Hit potential and listener projection" />
            <div className="grid gap-6 lg:grid-cols-2">
              <HitPotentialPanel data={analysis.hitPotential} />
              <ListenerSimulation
                data={analysis.simulation}
                catalogBenchmark={analysis.catalogBenchmark}
              />
            </div>
            {analysis.catalogBenchmark?.similarTracks.length ? (
              <>
                <CatalogCompareChips
                  benchmark={analysis.catalogBenchmark}
                  anchor={anchorAnalysis}
                  comparingId={comparingId}
                  isLoading={isAnalyzing}
                  onCompare={handleCompareSimilar}
                />
                <SimilarTracksPanel benchmark={analysis.catalogBenchmark} />
              </>
            ) : null}
          </section>

          <section className="space-y-4">
            <SectionHeader title="Creative Intelligence" subtitle="Lyrics structure and audio energy" />
            <div className="grid gap-6 lg:grid-cols-2">
              <LyricsAnalysis
                data={analysis.lyrics}
                meta={analysis.meta}
                trendFeed={analysis.trendFeed}
              />
              <EnergyInsights data={analysis.energy} />
            </div>
          </section>

          {(analysis.streaming || analysis.seasonalContext || analysis.releaseHistory) && (
            <section className="space-y-4">
              <SectionHeader title="Streaming & Context" subtitle="Performance signals, seasonality, and artist history" />
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
            </section>
          )}

          <section className="space-y-4">
            <SectionHeader title="Launch Strategy" subtitle="Simulate scenarios and get marketing actions" />
            <div className="grid gap-6 lg:grid-cols-3">
              <WhatIfSimulator
                params={whatIfParams}
                onChange={setWhatIfParams}
                scoreDelta={scoreDelta}
                isRecalculating={isRecalculating}
              />
              <div className="lg:col-span-2">
                <MarketingRecommendations recommendations={analysis.recommendations} />
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}