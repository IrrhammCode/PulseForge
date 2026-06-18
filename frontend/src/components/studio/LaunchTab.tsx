"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertCircle, Calendar, Rocket } from "lucide-react";
import { useStudioProject } from "@/lib/hooks/useStudioProject";
import { WhatIfSimulator } from "@/components/analysis/WhatIfSimulator";
import { MarketingRecommendations } from "@/components/analysis/MarketingRecommendations";
import { StatsStrip } from "@/components/analysis/StatsStrip";
import { ListenerSimulation } from "@/components/analysis/ListenerSimulation";
import { ReleaseChecklist } from "@/components/studio/ReleaseChecklist";
import { StudioReleasePack } from "@/components/studio/StudioReleasePack";
import { ConcertInsights } from "@/components/studio/ConcertInsights";
import { N8nWorkflowTrigger } from "@/components/studio/N8nWorkflowTrigger";
import { fetchCapabilities } from "@/lib/api-client";
import { analyzeStudioVersion } from "@/lib/api-client";
import { DEFAULT_WHAT_IF } from "@/lib/constants";
import { buildChecklist, readinessPercent } from "@/lib/studio/launch";
import type { WhatIfParams } from "@/types";
import type { LaunchPlan } from "@/types/studio";
import { Card, CardHeader } from "@/components/ui/Card";
import { StudioFocusHint } from "@/components/studio/StudioFocusHint";
import { ViralLabCTA } from "@/components/viral/ViralLabCTA";

export function LaunchTab() {
  const params = useParams();
  const projectId = params.id as string;
  const { project, ready, saveLaunchPlan } = useStudioProject(projectId);

  const activeVersion = project?.versions.find((v) => v.id === project.activeVersionId);
  const baseAnalysis = activeVersion?.analysis ?? null;

  const [whatIfParams, setWhatIfParams] = useState<WhatIfParams>(
    activeVersion?.launchPlan?.whatIf ?? DEFAULT_WHAT_IF
  );
  const [adjustedAnalysis, setAdjustedAnalysis] = useState(baseAnalysis);
  const [targetDate, setTargetDate] = useState(activeVersion?.launchPlan?.targetReleaseDate ?? "");
  const [notes, setNotes] = useState(activeVersion?.launchPlan?.notes ?? "");
  const [manualChecks, setManualChecks] = useState<Record<string, boolean>>(
    activeVersion?.launchPlan?.manualChecks ?? {}
  );
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [n8nEnabled, setN8nEnabled] = useState(false);

  useEffect(() => {
    fetchCapabilities()
      .then((c) => setN8nEnabled(c.features.n8nWorkflows))
      .catch(() => setN8nEnabled(false));
  }, []);
  const whatIfTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!activeVersion) return;
    setWhatIfParams(activeVersion.launchPlan?.whatIf ?? DEFAULT_WHAT_IF);
    setTargetDate(activeVersion.launchPlan?.targetReleaseDate ?? "");
    setNotes(activeVersion.launchPlan?.notes ?? "");
    setManualChecks(activeVersion.launchPlan?.manualChecks ?? {});
    setAdjustedAnalysis(activeVersion.analysis ?? null);
  }, [activeVersion]);

  const scoreDelta =
    baseAnalysis && adjustedAnalysis
      ? adjustedAnalysis.hitPotential.overall - baseAnalysis.hitPotential.overall
      : 0;

  const versionWithPlan = useMemo(() => {
    if (!activeVersion) return null;
    return {
      ...activeVersion,
      launchPlan: {
        whatIf: whatIfParams,
        targetReleaseDate: targetDate || undefined,
        notes: notes || undefined,
        manualChecks,
      } satisfies LaunchPlan,
    };
  }, [activeVersion, whatIfParams, targetDate, notes, manualChecks]);

  const checklist = versionWithPlan ? buildChecklist(versionWithPlan) : [];
  const readiness = readinessPercent(checklist);

  const persistLaunchPlan = useCallback(
    (plan: LaunchPlan) => {
      if (!activeVersion) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveLaunchPlan(activeVersion.id, plan);
      }, 500);
    },
    [activeVersion, saveLaunchPlan]
  );

  useEffect(() => {
    persistLaunchPlan({
      whatIf: whatIfParams,
      targetReleaseDate: targetDate || undefined,
      notes: notes || undefined,
      manualChecks,
    });
  }, [whatIfParams, targetDate, notes, manualChecks, persistLaunchPlan]);

  useEffect(() => {
    if (!project || !baseAnalysis || !activeVersion) return;

    if (whatIfTimer.current) clearTimeout(whatIfTimer.current);

    whatIfTimer.current = setTimeout(async () => {
      setIsRecalculating(true);
      try {
        const updated = await analyzeStudioVersion(project, {
          versionId: activeVersion.id,
          whatIf: whatIfParams,
          cachedAnalysis: baseAnalysis,
        });
        setAdjustedAnalysis(updated);
      } catch {
        // keep previous
      } finally {
        setIsRecalculating(false);
      }
    }, 350);

    return () => {
      if (whatIfTimer.current) clearTimeout(whatIfTimer.current);
    };
  }, [whatIfParams, project, baseAnalysis, activeVersion]);

  const toggleCheck = (id: string) => {
    setManualChecks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (!ready || !project || !activeVersion) return null;

  if (!baseAnalysis) {
    return (
      <div className="rounded-2xl border border-border bg-surface-elevated p-6 md:p-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-muted">
          <Rocket className="h-5 w-5 text-accent-light" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">Launch</h2>
        <p className="mt-2 max-w-lg text-sm text-muted">
          Run analysis on {activeVersion.label} first to unlock What-If scenarios, marketing
          playbook, and release pack export.
        </p>
        <Link href={`/studio/${project.id}/analyze`} className="btn-primary mt-6">
          Go to Analyze
        </Link>
      </div>
    );
  }

  const displayAnalysis = adjustedAnalysis ?? baseAnalysis;

  return (
    <div className="space-y-6">
      <StudioFocusHint />
      <div>
        <h2 className="text-lg font-semibold">Launch</h2>
        <p className="text-sm text-muted">
          Plan your release for {activeVersion.label} — simulate spend, get playbook, export pack
        </p>
      </div>

      <StatsStrip analysis={displayAnalysis} scoreDelta={scoreDelta} />

      <ViralLabCTA
        projectId={project.id}
        projectTitle={project.title}
        hitScore={displayAnalysis.hitPotential.overall}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div id="focus-launch" className="transition-shadow">
          <WhatIfSimulator
            params={whatIfParams}
            onChange={setWhatIfParams}
            scoreDelta={scoreDelta}
            isRecalculating={isRecalculating}
          />
        </div>
        <div className="lg:col-span-2">
          <MarketingRecommendations recommendations={displayAnalysis.recommendations} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ReleaseChecklist
          items={checklist}
          readiness={readiness}
          onToggle={toggleCheck}
        />

        <div className="space-y-6">
          <Card glow="none">
            <CardHeader
              title="Release Details"
              subtitle="Target date and internal notes"
              action={<Calendar className="h-4 w-4 text-accent-light" />}
            />
            <div className="space-y-4">
              <div>
                <label htmlFor="release-date" className="mb-1.5 block text-xs font-medium text-muted">
                  Target release date
                </label>
                <input
                  id="release-date"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent/40"
                />
              </div>
              <div>
                <label htmlFor="release-notes" className="mb-1.5 block text-xs font-medium text-muted">
                  Release notes
                </label>
                <textarea
                  id="release-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Pitch angles, playlist targets, collaborator notes…"
                  className="w-full resize-y rounded-xl border border-border bg-surface px-3 py-2 text-sm leading-relaxed outline-none placeholder:text-muted/60 focus:border-accent/40"
                />
              </div>
            </div>
          </Card>

          <ListenerSimulation data={displayAnalysis.simulation} />
          <ConcertInsights artistName={project.artistName} genre={project.genre} />
          <N8nWorkflowTrigger
            project={project}
            versionLabel={activeVersion.label}
            analysis={displayAnalysis}
            whatIf={whatIfParams}
            targetReleaseDate={targetDate || undefined}
            enabled={n8nEnabled}
          />
        </div>
      </div>

      {readiness < 50 && (
        <div className="flex items-start gap-2 rounded-xl border border-border bg-surface p-3 text-sm text-muted">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          Complete more checklist items to strengthen your release pack.
        </div>
      )}

      {adjustedAnalysis && (
        <StudioReleasePack
          project={project}
          version={activeVersion}
          baseAnalysis={baseAnalysis}
          adjustedAnalysis={adjustedAnalysis}
          whatIf={whatIfParams}
          launchPlan={{
            whatIf: whatIfParams,
            targetReleaseDate: targetDate || undefined,
            notes: notes || undefined,
            manualChecks,
          }}
          readiness={readiness}
        />
      )}
    </div>
  );
}