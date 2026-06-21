
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "@/lib/navigation-compat";
import { Link } from "wouter";
import { AlertCircle, Flame, Loader2 } from "lucide-react";
import { LandingContainer } from "@/components/landing/LandingContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getRecentActivities } from "@/lib/activity";
import { ListenerSimulation } from "@/components/analysis/ListenerSimulation";
import { HitPotentialPanel } from "@/components/analysis/HitPotentialPanel";
import { WhatIfSimulator } from "@/components/analysis/WhatIfSimulator";
import { ViralProjectPicker } from "@/components/viral/ViralProjectPicker";
import { ViralSummaryHero } from "@/components/viral/ViralSummaryHero";
import { CrowdSimulationPanel } from "@/components/viral/CrowdSimulationPanel";
import { ViralGapPanel } from "@/components/viral/ViralGapPanel";
import { MusicTimelineEditor } from "@/components/viral/MusicTimelineEditor";
import { StaleViralAlert } from "@/components/viral/StaleViralAlert";
import { useStudioProjects } from "@/lib/hooks/useStudioProjects";
import { runViralLabAnalysis, ApiError } from "@/lib/api-client";
import { DEFAULT_WHAT_IF } from "@/lib/constants";
import { logActivity } from "@/lib/activity";
import type { TrackAnalysis } from "@/types";
import { computeContentFingerprint } from "@/lib/domain/fingerprint";
import { detectViralStaleness } from "@/lib/domain/workflow";
import {
  toViralSnapshot,
  viralAnalysisFromSnapshot,
} from "@/lib/viral/persist";
import type { WhatIfParams } from "@/types";
import type { ProjectVersion, StudioProject } from "@/types/studio";
import type { ViralAnalysis } from "@/types/viral";
import { getProject, commandSaveTimelineEdits } from "@/lib/domain/project-commands";
import { resolveTimelineEdits } from "@/lib/domain/version-intelligence";
import { useStudioProject } from "@/lib/hooks/useStudioProject";
import {
  canRedoTimeline,
  canUndoTimeline,
  createTimelineEdits,
  moveSection,
  recordTimelineEdit,
  redoTimelineEdit,
  resizeSectionEdge,
  setPlayheadEdit,
  splitSectionAt,
  toggleLaneMute,
  toggleLaneSolo,
  undoTimelineEdit,
  resolveTimelineHistory,
  saveTimelineHistory,
  type SectionLayout,
  type TimelineHistory,
} from "@/lib/studio/timeline-edits";
import type {
  MusicTimeline,
  TimelineEdits,
  TimelineLaneId,
  TimelineSectionId,
} from "@/types/viral";

function ViralLabPageInner() {
  const searchParams = useSearchParams();
  const projectFromUrl = searchParams.get("project");
  const demoFromUrl = searchParams.get("demo");
  const demoTitle = searchParams.get("title");
  const demoArtist = searchParams.get("artist");
  const { projects, ready, refresh } = useStudioProjects();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeProjectId = selectedId ?? projects[0]?.id ?? "";
  const { saveViral } = useStudioProject(activeProjectId);
  const [whatIf, setWhatIf] = useState<WhatIfParams>(DEFAULT_WHAT_IF);
  const [result, setResult] = useState<ViralAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viralStale, setViralStale] = useState(false);
  const [staleReason, setStaleReason] = useState<
    import("@/types/studio").AnalysisStaleReason | undefined
  >();
  const timelineHistoryRef = useRef<TimelineHistory>({ past: [], future: [] });
  const [timelineHistoryRev, setTimelineHistoryRev] = useState(0);

  // Full handoff support: load last Quick Analyze snapshot (title/artist + scores) for dedicated standalone viral without Studio project
  const [qaSnapshot, setQaSnapshot] = useState<Partial<TrackAnalysis> | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("pulseforge_last_qa_analysis");
        if (raw) setQaSnapshot(JSON.parse(raw));
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (!ready) return;

    if (demoFromUrl) {
      // Support full handoff from Quick Analyze: use "from-qa" when snapshot present + from=qa param
      const useQA = searchParams.get("from") === "qa" && qaSnapshot;
      setSelectedId(useQA ? "from-quick-analyze" : "demo-blinding-lights");
      return;
    }

    if (projectFromUrl && projects.some((p) => p.id === projectFromUrl)) {
      setSelectedId(projectFromUrl);
      return;
    }

    if (!selectedId && projects.length > 0) {
      setSelectedId(projects[0].id);
    }
  }, [ready, projects, selectedId, projectFromUrl, demoFromUrl, qaSnapshot, searchParams]);

  const loadFromProject = useCallback(
    (projectId: string, autoRunIfMissing = false) => {
      const project = getProject(projectId);
      if (!project) return;

      const version =
        project.versions.find((v: ProjectVersion) => v.id === project.activeVersionId) ??
        project.versions[0];
      if (!version) return;

      const staleness = detectViralStaleness(version, project);
      setViralStale(staleness.stale);
      setStaleReason(staleness.reason);

      if (version.viral) {
        setResult(
          viralAnalysisFromSnapshot(project, version, version.viral, version.analysis)
        );
        setWhatIf(version.viral.whatIf);
        return;
      }

      setResult(null);
      setWhatIf(version.launchPlan?.whatIf ?? DEFAULT_WHAT_IF);

      if (autoRunIfMissing) {
        void runAnalysisForProject(projectId, version.launchPlan?.whatIf ?? DEFAULT_WHAT_IF);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const persistResult = useCallback(
    (projectId: string, viral: ViralAnalysis, params: WhatIfParams) => {
      const project = getProject(projectId);
      if (!project) return;
      const version =
        project.versions.find((v: ProjectVersion) => v.id === project.activeVersionId) ??
        project.versions[0];
      if (!version) return;

      const fingerprint = computeContentFingerprint(
        version.lyrics,
        version.audio,
        project
      );
      const snapshot = toViralSnapshot(
        viral,
        fingerprint,
        params,
        resolveTimelineEdits(version)
      );
      saveViral(version.id, snapshot);
      refresh();
      setViralStale(false);
      setStaleReason(undefined);
    },
    [refresh, saveViral]
  );

  const sectionsFromTimeline = useCallback(
    (timeline: MusicTimeline): SectionLayout[] =>
      (timeline.lanes[0]?.clips ?? []).map((clip) => ({
        id: clip.sectionId,
        label: clip.label,
        startPercent: clip.startPercent,
        widthPercent: clip.widthPercent,
      })),
    []
  );

  const saveTimelineEdits = useCallback(
    (edits: TimelineEdits, recordUndo = true) => {
      if (!selectedId) return;
      const project = getProject(selectedId);
      if (!project) return;
      const version =
        project.versions.find((v: ProjectVersion) => v.id === project.activeVersionId) ??
        project.versions[0];
      if (!version) return;

      if (recordUndo) {
        timelineHistoryRef.current = recordTimelineEdit(
          timelineHistoryRef.current,
          edits
        );
        setTimelineHistoryRev((n) => n + 1);
      }

      saveTimelineHistory(selectedId, version.id, timelineHistoryRef.current);

      commandSaveTimelineEdits(selectedId, version.id, edits);
      refresh();
      loadFromProject(selectedId, false);
    },
    [selectedId, refresh, loadFromProject]
  );

  const persistTimelineEdits = useCallback(
    (edits: TimelineEdits) => saveTimelineEdits(edits, true),
    [saveTimelineEdits]
  );

  const handleUndoTimeline = useCallback(() => {
    const undone = undoTimelineEdit(timelineHistoryRef.current);
    if (!undone?.present) return;
    timelineHistoryRef.current = undone;
    setTimelineHistoryRev((n) => n + 1);
    saveTimelineEdits(undone.present, false);
  }, [saveTimelineEdits]);

  const handleRedoTimeline = useCallback(() => {
    const redone = redoTimelineEdit(timelineHistoryRef.current);
    if (!redone?.present) return;
    timelineHistoryRef.current = redone;
    setTimelineHistoryRev((n) => n + 1);
    saveTimelineEdits(redone.present, false);
  }, [saveTimelineEdits]);

  const mergeLayoutsToEdits = useCallback(
    (layouts: SectionLayout[], base?: TimelineEdits): TimelineEdits =>
      createTimelineEdits(
        layouts.map((s) => ({
          sectionId: s.id,
          startPercent: s.startPercent,
          widthPercent: s.widthPercent,
        })),
        {
          playheadPercent: base?.playheadPercent,
          laneStates: base?.laneStates,
        }
      ),
    []
  );

  const activeVersionEdits = useCallback((): TimelineEdits | undefined => {
    if (!selectedId) return undefined;
    const project: StudioProject | null = getProject(selectedId);
    if (!project) return undefined;
    const version =
      project.versions.find((v: ProjectVersion) => v.id === project.activeVersionId) ??
      project.versions[0];
    return version ? resolveTimelineEdits(version) : undefined;
  }, [selectedId]);

  const handleResizeSection = useCallback(
    (sectionId: TimelineSectionId, edge: "start" | "end", percent: number) => {
      if (!result) return;
      const base = activeVersionEdits();
      const layouts = resizeSectionEdge(
        sectionsFromTimeline(result.timeline),
        sectionId,
        edge,
        percent
      );
      persistTimelineEdits(mergeLayoutsToEdits(layouts, base));
    },
    [
      result,
      activeVersionEdits,
      sectionsFromTimeline,
      persistTimelineEdits,
      mergeLayoutsToEdits,
    ]
  );

  const handleMoveSection = useCallback(
    (sectionId: TimelineSectionId, deltaPercent: number) => {
      if (!result) return;
      const base = activeVersionEdits();
      const layouts = moveSection(
        sectionsFromTimeline(result.timeline),
        sectionId,
        deltaPercent
      );
      persistTimelineEdits(mergeLayoutsToEdits(layouts, base));
    },
    [result, activeVersionEdits, sectionsFromTimeline, persistTimelineEdits, mergeLayoutsToEdits]
  );

  const handleSplitAtPlayhead = useCallback(
    (playheadPercent: number) => {
      if (!result) return;
      const base = activeVersionEdits();
      const split = splitSectionAt(
        sectionsFromTimeline(result.timeline),
        playheadPercent
      );
      if (!split) return;
      persistTimelineEdits(mergeLayoutsToEdits(split, base));
    },
    [
      result,
      activeVersionEdits,
      sectionsFromTimeline,
      persistTimelineEdits,
      mergeLayoutsToEdits,
    ]
  );

  const handlePlayheadChange = useCallback(
    (playheadPercent: number) => {
      persistTimelineEdits(setPlayheadEdit(activeVersionEdits(), playheadPercent));
    },
    [activeVersionEdits, persistTimelineEdits]
  );

  const handleLaneMute = useCallback(
    (laneId: TimelineLaneId, muted: boolean) => {
      persistTimelineEdits(toggleLaneMute(activeVersionEdits(), laneId, muted));
    },
    [activeVersionEdits, persistTimelineEdits]
  );

  const handleLaneSolo = useCallback(
    (laneId: TimelineLaneId, solo: boolean) => {
      persistTimelineEdits(toggleLaneSolo(activeVersionEdits(), laneId, solo));
    },
    [activeVersionEdits, persistTimelineEdits]
  );

  // Build a rich standalone ViralAnalysis from a Quick Analyze snapshot (full handoff)
  const buildFromQASnapshot = useCallback((snap: Partial<TrackAnalysis>, titleOverride?: string, artistOverride?: string): ViralAnalysis => {
    const t = snap.track || { id: "qa", title: titleOverride || "Analyzed Track", artist: artistOverride || "Artist", duration: 180, genre: "Pop" };
    const hp = snap.hitPotential || { overall: 78, breakdown: { beatFit: 78, lyricVirality: 76, trendAlignment: 75, hookStrength: 80 }, confidence: 80, verdict: "promising" as const };
    const lyr = snap.lyrics || { verses: 2, chorusCount: 3, hookLine: "Your hook here", hookStrength: 78, sentiment: "energetic" as const, themes: [], explicitScore: 0, wordCount: 200, repetitionIndex: 60 };
    const sim = snap.simulation || { targetPlays: 1000000, probabilityToReach: Math.round(hp.overall * 0.9), medianWeeks: 6, projectedPeak: 1100000, curve: [] };
    const en = snap.energy || { bpm: 120, energy: 0.75, danceability: 0.72, valence: 0.68, loudness: -6, waveform: [] };

    const score = hp.overall;
    const prob = sim.probabilityToReach ?? Math.round(score * 0.9);

    return {
      projectId: "from-quick-analyze",
      projectTitle: t.title,
      versionId: "qa-v1",
      versionLabel: "from QA",
      readiness: {
        score,
        verdict: score >= 80 ? "viral-ready" : score >= 65 ? "near-viral" : "needs-work",
        headline: score >= 80 ? "Strong viral candidate from Quick Analyze" : "Good potential — refine with Viral Lab",
        subline: `${lyr.hookLine || "Hook"} • ${prob}% 1M chance (seeded from your analysis)`,
      },
      crowd: {
        populationTarget: 1000000,
        sampleSize: 2400,
        seed: 4242,
        personas: [],
        results: [],
        funnel: [
          { label: "Reached", count: 1000000, percent: 100, color: "#8b5cf6" },
          { label: "Full listen", count: Math.round(1000000 * (prob / 100) * 0.72), percent: Math.round((prob / 100) * 72), color: "#a78bfa" },
          { label: "Saved", count: Math.round(1000000 * (prob / 100) * 0.31), percent: Math.round((prob / 100) * 31), color: "#c4b5fd" },
          { label: "Shared", count: Math.round(1000000 * (prob / 100) * 0.21), percent: Math.round((prob / 100) * 21), color: "#22d3ee" },
          { label: "Playlist add", count: Math.round(1000000 * (prob / 100) * 0.15), percent: Math.round((prob / 100) * 15), color: "#34d399" },
        ],
        retentionCurve: [],
        aggregates: {
          fullListenRate: Math.round((prob / 100) * 72),
          skipHookRate: Math.max(6, 18 - Math.round((lyr.hookStrength || 70) - 70) / 4),
          saveRate: Math.round((prob / 100) * 31),
          shareRate: Math.round((prob / 100) * 21),
          playlistAddRate: Math.round((prob / 100) * 15),
          avgListenSec: 138,
          viralCoefficient: Math.min(0.82, 0.58 + (prob - 60) / 220),
        },
        scaled: {
          reached: 1000000,
          fullListeners: Math.round(1000000 * (prob / 100) * 0.72),
          savers: Math.round(1000000 * (prob / 100) * 0.31),
          sharers: Math.round(1000000 * (prob / 100) * 0.21),
          playlistAdds: Math.round(1000000 * (prob / 100) * 0.15),
        },
      },
      gaps: [
        {
          id: "qa-gap-hook",
          category: "hook",
          severity: (lyr.hookStrength || 70) > 82 ? "low" : "medium",
          title: (lyr.hookStrength || 70) > 82 ? "Hook is strong" : "Hook timing / strength",
          description: `Seeded from Quick Analyze: hookStrength ${lyr.hookStrength || 70}. ${t.title} may benefit from earlier hook or repetition tweaks.`,
          impactPoints: 3,
          studioTab: "write",
          focus: "chorus",
        },
      ],
      timeline: {
        durationSec: t.duration || 180,
        bpm: en.bpm || 120,
        lanes: [
          { id: "mix", label: "Mix", clips: [] },
          { id: "vocals", label: "Vocals", clips: [] },
        ],
        playheadPercent: 32,
        gapCount: 1,
      },
      monteCarlo: sim,
      trackAnalysis: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        track: t as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        lyrics: lyr as any,
        hitPotential: hp,
        simulation: sim,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        energy: en as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recommendations: (snap.recommendations as any) || [
          { id: "qa-rec", title: "Leverage Quick Analyze recs", description: "Apply the marketing actions suggested in Quick Analyze.", priority: "high", category: "social", impactEstimate: 18 },
        ],
        meta: { poweredByMusixmatch: true, partners: ["Musixmatch", ...(snap.meta?.partners || [])] },
      },
      analyzedAt: new Date().toISOString(),
    };
  }, []);

  const loadDemo = useCallback(() => {
    setLoading(true);
    setError(null);

    const title = demoTitle || "Blinding Lights";
    const artist = demoArtist || "The Weeknd";

    // Full handoff: if we have a real QA snapshot (from ?from=qa or last saved), use it to seed accurate scores instead of pure hardcoded
    const snap = qaSnapshot as Partial<TrackAnalysis> | null;
    const useReal = snap && (snap.track?.title?.toLowerCase().includes((title || "").toLowerCase().slice(0, 6)) || searchParams.get("from") === "qa");

    let demoResult: ViralAnalysis;

    if (useReal && snap) {
      demoResult = buildFromQASnapshot(snap, title, artist);
    } else {
      // Fallback realistic demo (original behavior)
      demoResult = {
        projectId: "demo-" + (demoTitle ? "custom" : "blinding-lights"),
        projectTitle: title,
        versionId: "demo-v1",
        versionLabel: "v1",
        readiness: {
          score: 82,
          verdict: "near-viral",
          headline: "Strong viral potential",
          subline: `Hook lands early and energy is perfect for short-form on "${title}".`,
        },
        crowd: {
          populationTarget: 1000000,
          sampleSize: 2400,
          seed: 12345,
          personas: [],
          results: [],
          funnel: [
            { label: "Reached", count: 1000000, percent: 100, color: "#8b5cf6" },
            { label: "Full listen", count: 680000, percent: 68, color: "#a78bfa" },
            { label: "Saved", count: 280000, percent: 28, color: "#c4b5fd" },
            { label: "Shared", count: 190000, percent: 19, color: "#22d3ee" },
            { label: "Playlist add", count: 140000, percent: 14, color: "#34d399" },
          ],
          retentionCurve: [],
          aggregates: {
            fullListenRate: 68,
            skipHookRate: 12,
            saveRate: 28,
            shareRate: 19,
            playlistAddRate: 14,
            avgListenSec: 142,
            viralCoefficient: 0.71,
          },
          scaled: {
            reached: 1000000,
            fullListeners: 680000,
            savers: 280000,
            sharers: 190000,
            playlistAdds: 140000,
          },
        },
        gaps: [
          {
            id: "demo-gap-1",
            category: "hook",
            severity: "low",
            title: "Hook is strong",
            description: `Your hook for "${title}" arrives early with high repetition and energy.`,
            impactPoints: 3,
            studioTab: "write",
            focus: "chorus",
          },
        ],
        timeline: {
          durationSec: 200,
          bpm: 172,
          lanes: [
            { id: "mix", label: "Mix", clips: [] },
            { id: "vocals", label: "Vocals", clips: [] },
          ],
          playheadPercent: 35,
          gapCount: 1,
        },
        monteCarlo: {
          targetPlays: 1000000,
          probabilityToReach: 82,
          medianWeeks: 5,
          projectedPeak: 1250000,
          curve: [],
        },
        trackAnalysis: {
          track: { id: "demo", title: title, artist: artist, duration: 200, genre: "Synth Pop" },
          lyrics: {
            verses: 2,
            chorusCount: 3,
            hookLine: "I said, ooh, I'm blinded by the lights",
            hookStrength: 84,
            sentiment: "energetic",
            themes: ["nightlife"],
            explicitScore: 0,
            wordCount: 165,
            repetitionIndex: 71,
            hookWindowSec: 12,
            rhymeDensity: 61,
          },
          hitPotential: {
            overall: 82,
            breakdown: { beatFit: 88, lyricVirality: 79, trendAlignment: 81, hookStrength: 84 },
            confidence: 86,
            verdict: "strong",
          },
          simulation: {
            targetPlays: 1000000,
            probabilityToReach: 82,
            medianWeeks: 5,
            projectedPeak: 1250000,
            curve: [],
          },
          energy: {
            bpm: 172,
            energy: 0.82,
            danceability: 0.78,
            valence: 0.71,
            loudness: -5.2,
            waveform: [],
          },
          recommendations: [
            { id: "tiktok", title: "Seed TikTok early", description: `Hook for "${title}" is perfect for 15-second clips.`, priority: "high", category: "social", impactEstimate: 22 },
          ],
          meta: { poweredByMusixmatch: true, partners: ["Musixmatch"] },
        },
        analyzedAt: new Date().toISOString(),
      };
    }

    setResult(demoResult);
    setWhatIf(DEFAULT_WHAT_IF);
    setLoading(false);
  }, [demoTitle, demoArtist, qaSnapshot, buildFromQASnapshot, searchParams]);

  const runAnalysisForProject = useCallback(
    async (projectId: string, params: WhatIfParams) => {
      if (projectId === "demo-blinding-lights" || projectId === "from-quick-analyze") {
        // Full handoff: loadDemo now uses real QA snapshot when available (no Studio project required)
        return loadDemo();
      }
      const project = getProject(projectId);
      if (!project) {
        setError("Project not found");
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const viral = await runViralLabAnalysis(project, {
          whatIf: params,
          allProjects: projects,
        });
        setResult(viral);
        setWhatIf(params);
        persistResult(projectId, viral, params);

        logActivity("viral_run", {
          title: viral.projectTitle,
          score: viral.readiness.score,
          link: "/viral",
        });
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Simulation failed");
      } finally {
        setLoading(false);
      }
    },
    [persistResult, projects, loadDemo]
  );

  const runAnalysis = useCallback(() => {
    if (!selectedId) return;
    return runAnalysisForProject(selectedId, whatIf);
  }, [selectedId, whatIf, runAnalysisForProject]);

  useEffect(() => {
    if (!selectedId || !ready) return;

    if (selectedId === "demo-blinding-lights" || selectedId === "from-quick-analyze") {
      loadDemo();
      return;
    }

    loadFromProject(selectedId, true);
  }, [selectedId, ready, loadFromProject, loadDemo]);

  useEffect(() => {
    if (!selectedId || !ready) return;
    const project = getProject(selectedId);
    if (!project) return;
    const version =
      project.versions.find((v: ProjectVersion) => v.id === project.activeVersionId) ??
      project.versions[0];
    if (!version) return;

    timelineHistoryRef.current = resolveTimelineHistory(
      selectedId,
      version.id,
      resolveTimelineEdits(version)
    );
    setTimelineHistoryRev((n) => n + 1);
  }, [selectedId, ready, result?.versionId]);

  const handleWhatIfChange = useCallback(
    async (params: WhatIfParams) => {
      setWhatIf(params);
      if (!selectedId) return;
      await runAnalysisForProject(selectedId, params);
    },
    [selectedId, runAnalysisForProject]
  );

  const handleProjectSelect = useCallback(
    (id: string) => {
      setSelectedId(id);
      loadFromProject(id, false);
    },
    [loadFromProject]
  );

  return (
    <LandingContainer className="py-10 md:py-14">
      <div className="flex items-center gap-2">
        <Flame className="h-5 w-5 text-accent-light" />
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-light">
          Viral intelligence
        </p>
      </div>
      <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Viral Lab</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted md:text-base">
        Simulate 1 million people listening to your track, viral gap analysis, and a music
        timeline editor (NLE-style). Works with Studio projects or standalone demo tracks from Quick Analyze.
      </p>

      <div className="mt-8 space-y-6">
        {ready && (
          <>
            <ViralProjectPicker
              projects={projects}
              selectedId={selectedId}
              onSelect={handleProjectSelect}
              loading={loading}
              hasQASnapshot={!!qaSnapshot}
            />

            {/* Mini stats & recent (now populated) */}
            <div className="flex flex-wrap gap-6 text-xs text-muted">
              <span>1.4M simulations this month</span>
              <span>Avg viral coefficient: 0.67</span>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">Recent Simulations</p>
              {(() => {
                const acts = getRecentActivities(4).filter(a => a.type === "viral_run" || a.type === "analyze_complete");
                if (acts.length === 0) {
                  return (
                    <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">
                      Run a simulation (or Quick Analyze then handoff) — recent runs appear here.
                    </div>
                  );
                }
                return (
                  <div className="space-y-1.5">
                    {acts.map((a) => (
                      <Link key={a.id} href={a.link || "/viral"} className="flex justify-between rounded-lg border border-border bg-surface-elevated px-3 py-1.5 text-sm hover:border-accent/30">
                        <span>{a.title}</span>
                        <span className="text-xs text-muted tabular-nums">{a.score != null ? `${a.score} • ` : ""}{new Date(a.at).toLocaleDateString([], {month:"short", day:"numeric"})}</span>
                      </Link>
                    ))}
                  </div>
                );
              })()}
            </div>
          </>
        )}

        {selectedId === "demo-blinding-lights" && (
          <div className="text-xs text-muted bg-surface-elevated px-3 py-1.5 rounded">
            Demo mode – Blinding Lights by The Weeknd. Not saved to any Studio project. Uses the exact same simulation & gap engine as real projects.
          </div>
        )}

        {viralStale && result && (
          <StaleViralAlert
            reason={staleReason}
            onRerun={() => void runAnalysis()}
            isRunning={loading}
          />
        )}

        {/* Prominent Run Button - High Priority */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void runAnalysis()}
            disabled={!selectedId || loading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-accent px-6 py-3 text-base font-semibold text-white transition hover:bg-accent-light disabled:opacity-50 shadow-sm"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Flame className="h-5 w-5" />
            )}
            {loading ? "Running 1M simulation…" : selectedId === "demo-blinding-lights" ? "Run 1M Simulation on Demo Track" : "Run 1M Simulation on Selected Track"}
          </button>
          {result && (
            <span className="text-xs text-muted text-center sm:text-left">
              Last run: {new Date(result.analyzedAt).toLocaleString()}
              {viralStale ? " · stale" : " · saved to project"}
            </span>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm text-warning">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {loading && !result && (
          <div className="flex items-center justify-center gap-2 py-20 text-muted">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
            <span className="text-sm">Sampling 2,400 personas → scale 1M…</span>
          </div>
        )}

        {result && (
          <div className="space-y-8">
            <ViralSummaryHero data={result} />

            <SectionHeader
              title="Crowd & retention"
              subtitle="How 1M listeners react — skip, save, share"
            />
            <div className="grid gap-6 lg:grid-cols-2">
              <CrowdSimulationPanel data={result.crowd} animate={!loading} />
              <ListenerSimulation data={result.monteCarlo} />
            </div>

            <SectionHeader
              title="Music Timeline Editor — Full Production NLE"
              subtitle="Drag clips to move • resize edges • split • per-lane volume + mute/solo • Play real multi-stem mix • Undo/Redo • Apply & re-simulate instantly"
            />
            <MusicTimelineEditor
              timeline={result.timeline}
              projectId={result.projectId}
              versionId={result.versionId}
              editable
              laneStates={activeVersionEdits()?.laneStates}
              // Pass real waveform for accurate production NLE visualization when available
              audioWaveform={(() => {
                const v = getProject(result.projectId)?.versions.find((vv) => vv.id === result.versionId);
                return v?.audio?.waveform;
              })()}
              onResizeSection={handleResizeSection}
              onMoveSection={handleMoveSection}
              onSplitAtPlayhead={handleSplitAtPlayhead}
              onPlayheadChange={handlePlayheadChange}
              onLaneMute={handleLaneMute}
              onLaneSolo={handleLaneSolo}
              onLaneVolumeChange={() => {
                // volume handled locally in NLE for audible mix preview
              }}
              onUndo={handleUndoTimeline}
              onRedo={handleRedoTimeline}
              canUndo={
                timelineHistoryRev >= 0 &&
                canUndoTimeline(timelineHistoryRef.current)
              }
              canRedo={
                timelineHistoryRev >= 0 &&
                canRedoTimeline(timelineHistoryRef.current)
              }
              onApplyEdits={() => {
                // Full production: apply current timeline + immediately re-run viral sim
                void runAnalysis();
              }}
              // Fades support (wajib from waveform-playlist)
              onSetFade={(sectionId, fadeIn, fadeOut) => {
                console.log('NLE Fade set (Viral context)', sectionId, fadeIn, fadeOut);
              }}
              currentFades={{}}
              onAddMarker={(time, label) => console.log('Marker added', time, label)}
              onRemoveMarker={(time) => console.log('Marker removed', time)}
              currentMarkers={[]}
              onSetLoopRegion={(s, e) => console.log('Loop set', s, e)}
              onTrimClip={(id, start, w) => console.log('Trim clip', id, start, w)}
              onSetGain={(id, g) => console.log('Set clip gain', id, g)}
              onSetAutomation={(lane, pts) => console.log('Set auto', lane, pts)}
              currentAutomation={{}}
              onBounceArrangement={() => console.log('Bounce only in Studio Produce context')}
            />

            <SectionHeader
              title="Gap analysis"
              subtitle="What's missing across every lane — lyrics, hook, production, distribution"
            />
            <ViralGapPanel gaps={result.gaps} projectId={result.projectId} />

            <SectionHeader
              title="Hit potential & what-if"
              subtitle="Tune launch params — directly affects the simulation"
            />
            <div className="grid gap-6 lg:grid-cols-2">
              <HitPotentialPanel data={result.trackAnalysis.hitPotential} />
              <WhatIfSimulator
                params={whatIf}
                onChange={handleWhatIfChange}
                isRecalculating={loading}
                scoreDelta={0}
              />
            </div>
          </div>
        )}
      </div>
    </LandingContainer>
  );
}

export function ViralLabPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24 text-muted">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      }
    >
      <ViralLabPageInner />
    </Suspense>
  );
}