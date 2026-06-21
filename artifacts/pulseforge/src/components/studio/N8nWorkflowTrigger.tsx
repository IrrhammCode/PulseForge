
import { useState } from "react";
import { Check, Loader2, Workflow } from "lucide-react";
import type { StudioProject } from "@/types/studio";
import type { TrackAnalysis, WhatIfParams } from "@/types";
import { triggerN8nWorkflow, fetchConcertIntel, ApiError } from "@/lib/api-client";
import { N8nLogo } from "@/components/icons/BrandLogos";
import { Card, CardHeader } from "@/components/ui/Card";
import { primaryGenreLabel, primaryMoodLabel } from "@/types/studio";

interface N8nWorkflowTriggerProps {
  project: StudioProject;
  versionLabel: string;
  analysis?: TrackAnalysis;
  whatIf?: WhatIfParams;
  targetReleaseDate?: string;
  enabled?: boolean;
}

export function N8nWorkflowTrigger({
  project,
  versionLabel,
  analysis,
  whatIf,
  targetReleaseDate,
  enabled = true,
}: N8nWorkflowTriggerProps) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTrigger = async () => {
    setLoading(true);
    setError(null);
    try {
      let nearbyShows: number | undefined;
      try {
        const concerts = await fetchConcertIntel(project.artistName, project.genre);
        nearbyShows = concerts.events.length;
      } catch {
        nearbyShows = undefined;
      }

      const platformHighlights: Record<string, string> = {};
      for (const p of analysis?.streaming?.platforms ?? []) {
        if (p.streams) platformHighlights[p.platform] = `${p.streams} streams`;
        else if (p.shazams) platformHighlights[p.platform] = `${p.shazams} shazams`;
        else if (p.tiktokCreates) platformHighlights[p.platform] = `${p.tiktokCreates} TikTok creates`;
      }

      await triggerN8nWorkflow({
        event: "studio.launch.pack_ready",
        projectId: project.id,
        projectTitle: project.title,
        artistName: project.artistName,
        genre: primaryGenreLabel(project),
        mood: primaryMoodLabel(project),
        versionLabel,
        hitScore: analysis?.hitPotential.overall,
        hookStrength: analysis?.lyrics.hookStrength,
        targetReleaseDate,
        whatIf,
        partners: analysis?.meta?.partners,
        songstatsVelocity: analysis?.streaming?.velocityScore,
        cyaniteStatus: analysis?.energy.source,
        platformHighlights: Object.keys(platformHighlights).length ? platformHighlights : undefined,
        nearbyShows,
        timestamp: new Date().toISOString(),
      });
      setSent(true);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Workflow trigger failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card glow="none">
      <CardHeader
        title="n8n Automation"
        subtitle={
          enabled
            ? "Push full partner context — hit score, Songstats velocity, Cyanite status, JamBase shows"
            : "Add N8N_WEBHOOK_URL to connect your automation stack"
        }
        action={<N8nLogo size={20} />}
      />

      {enabled ? (
        <div className="space-y-3">
          <p className="text-sm text-muted">
            Sends project metadata, streaming highlights, concert count, hit score, and What-If params
            to your n8n workflow (Slack, email, CRM, distro bots).
          </p>
          <button
            type="button"
            onClick={() => void handleTrigger()}
            disabled={loading || sent}
            className="btn-secondary text-sm"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : sent ? (
              <>
                <Check className="h-4 w-4 text-success" />
                Sent to n8n
              </>
            ) : (
              <>
                <Workflow className="h-4 w-4" />
                Trigger workflow
              </>
            )}
          </button>
          {error && <p className="text-xs text-warning">{error}</p>}
        </div>
      ) : (
        <p className="text-sm text-muted">
          Create a Webhook node in n8n, copy the production URL, and set{" "}
          <code className="text-accent-light">N8N_WEBHOOK_URL</code> in{" "}
          <code className="text-accent-light">backend/.env</code>.
        </p>
      )}
    </Card>
  );
}