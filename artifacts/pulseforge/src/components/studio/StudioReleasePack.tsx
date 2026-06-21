
import { useState } from "react";
import { Download, FileText, Rocket } from "lucide-react";
import type { TrackAnalysis, WhatIfParams } from "@/types";
import type { LaunchPlan, ProjectVersion, StudioProject } from "@/types/studio";
import { formatReleaseTiming } from "@/lib/studio/launch";
import { formatDuration } from "@/lib/studio/audio-analysis";
import { formatNumber } from "@/lib/utils";
import { Card, CardHeader } from "@/components/ui/Card";

interface StudioReleasePackProps {
  project: StudioProject;
  version: ProjectVersion;
  baseAnalysis: TrackAnalysis;
  adjustedAnalysis: TrackAnalysis;
  whatIf: WhatIfParams;
  launchPlan: LaunchPlan;
  readiness: number;
}

export function StudioReleasePack({
  project,
  version,
  baseAnalysis,
  adjustedAnalysis,
  whatIf,
  launchPlan,
  readiness,
}: StudioReleasePackProps) {
  const [exporting, setExporting] = useState(false);

  const handleDownloadPdf = async () => {
    setExporting(true);
    try {
      const jspdfPkg = "jspdf";
      const { jsPDF } = await import(/* @vite-ignore */ jspdfPkg);
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const margin = 48;
      let y = margin;

      const line = (text: string, size = 11, bold = false) => {
        doc.setFontSize(size);
        doc.setFont("helvetica", bold ? "bold" : "normal");
        const lines = doc.splitTextToSize(text, 500);
        doc.text(lines, margin, y);
        y += lines.length * (size + 4);
        if (y > 760) {
          doc.addPage();
          y = margin;
        }
      };

      line("PulseForge — Studio Release Pack", 18, true);
      y += 8;
      line(`${project.title} by ${project.artistName}`, 14, true);
      line(`Version: ${version.label} · ${project.genre} · ${project.mood}`, 10);
      if (project.bpmTarget) line(`Target BPM: ${project.bpmTarget}`, 10);
      if (launchPlan.targetReleaseDate) {
        line(`Target release: ${new Date(launchPlan.targetReleaseDate).toLocaleDateString()}`, 10);
      }
      line(`Launch readiness: ${readiness}%`, 10);
      y += 12;

      line("HIT POTENTIAL", 12, true);
      line(
        `Base score: ${baseAnalysis.hitPotential.overall}/100 → Launch scenario: ${adjustedAnalysis.hitPotential.overall}/100 (${adjustedAnalysis.hitPotential.verdict})`,
        10
      );
      line(`1M listener probability: ${adjustedAnalysis.simulation.probabilityToReach}%`, 10);
      line(`Median weeks to 1M: ${adjustedAnalysis.simulation.medianWeeks}`, 10);
      y += 10;

      line("WHAT-IF SCENARIO", 12, true);
      line(`Marketing budget: $${whatIf.marketingBudget}`, 10);
      line(`Playlist pitches: ${whatIf.playlistPitchCount}`, 10);
      line(`TikTok seed posts: ${whatIf.tiktokSeedPosts}`, 10);
      line(`Release timing: ${formatReleaseTiming(whatIf.releaseTiming)}`, 10);
      y += 10;

      if (version.viral) {
        const viral = version.viral;
        const criticalGaps = viral.gaps.filter(
          (g) => g.severity === "critical" || g.severity === "high"
        );
        line("VIRAL LAB", 12, true);
        line(
          `Readiness: ${viral.readiness.score}/100 — ${viral.readiness.headline}`,
          10
        );
        line(`Verdict: ${viral.readiness.verdict}`, 10);
        line(
          `1M probability (viral sim): ${viral.monteCarlo.probabilityToReach}%`,
          10
        );
        line(
          `Crowd: ${viral.crowd.scaled.fullListeners.toLocaleString()} full listeners · K=${viral.crowd.aggregates.viralCoefficient}`,
          10
        );
        line(`Critical/high gaps: ${criticalGaps.length}`, 10);
        criticalGaps.slice(0, 4).forEach((gap, i) => {
          line(`${i + 1}. [${gap.severity.toUpperCase()}] ${gap.title}`, 9, true);
          line(gap.description, 9);
        });
        y += 10;
      }

      line("LYRICS & HOOK", 12, true);
      line(`Hook: "${adjustedAnalysis.lyrics.hookLine}"`, 10);
      line(`Hook strength: ${adjustedAnalysis.lyrics.hookStrength} · Sentiment: ${adjustedAnalysis.lyrics.sentiment}`, 10);
      y += 10;

      if (version.audio) {
        line("DEMO AUDIO", 12, true);
        line(`File: ${version.audio.fileName} · ${formatDuration(version.audio.durationSec)}`, 10);
        if (version.audio.estimatedBpm) line(`Estimated BPM: ${version.audio.estimatedBpm}`, 10);
        line(`Stems: ${version.audio.stemsReady ? "Separated" : "Not separated"}`, 10);
        y += 10;
      }

      line("ENERGY PROFILE", 12, true);
      line(
        `BPM: ${adjustedAnalysis.energy.bpm} · Energy: ${Math.round(adjustedAnalysis.energy.energy * 100)}% · Danceability: ${Math.round(adjustedAnalysis.energy.danceability * 100)}%`,
        10
      );
      y += 10;

      line("MARKETING PLAYBOOK", 12, true);
      adjustedAnalysis.recommendations.slice(0, 6).forEach((rec, i) => {
        line(`${i + 1}. [${rec.priority.toUpperCase()}] ${rec.title}`, 10, true);
        line(rec.description, 9);
        y += 4;
      });

      if (launchPlan.notes?.trim()) {
        y += 6;
        line("RELEASE NOTES", 12, true);
        line(launchPlan.notes, 10);
      }

      y += 16;
      line("Generated by PulseForge Studio · Musicathon 2026", 8);
      line(`Projected peak plays: ${formatNumber(adjustedAnalysis.simulation.projectedPeak)}`, 8);

      const slug = project.title.replace(/\s+/g, "-").toLowerCase();
      doc.save(`pulseforge-release-${slug}-${version.label}.pdf`);
    } catch {
      alert("PDF export is unavailable in this environment. Use the JSON export instead.");
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadJson = () => {
    const pack = {
      project: {
        title: project.title,
        artist: project.artistName,
        genre: project.genre,
        mood: project.mood,
        bpmTarget: project.bpmTarget,
      },
      version: version.label,
      readiness,
      targetReleaseDate: launchPlan.targetReleaseDate,
      whatIf,
      scores: {
        base: baseAnalysis.hitPotential.overall,
        launch: adjustedAnalysis.hitPotential.overall,
        probability1M: adjustedAnalysis.simulation.probabilityToReach,
        projectedPeak: adjustedAnalysis.simulation.projectedPeak,
      },
      hook: adjustedAnalysis.lyrics.hookLine,
      recommendations: adjustedAnalysis.recommendations,
      notes: launchPlan.notes,
      viral: version.viral
        ? {
            readiness: version.viral.readiness,
            gaps: version.viral.gaps,
            monteCarlo: version.viral.monteCarlo,
            crowd: version.viral.crowd,
          }
        : undefined,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pulseforge-release-${project.title.replace(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card glow="none">
      <CardHeader
        title="Release Pack"
        subtitle="Export your launch scenario for collaborators or distributors"
        action={<Rocket className="h-5 w-5 text-accent-light" />}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handleDownloadPdf()}
          disabled={exporting}
          className="btn-primary !px-4 !py-2 text-sm"
        >
          <Download className="h-4 w-4" />
          {exporting ? "Generating…" : "Download PDF"}
        </button>
        <button
          type="button"
          onClick={handleDownloadJson}
          className="btn-secondary !px-4 !py-2 text-sm"
        >
          <FileText className="h-4 w-4" />
          Export JSON
        </button>
      </div>
    </Card>
  );
}