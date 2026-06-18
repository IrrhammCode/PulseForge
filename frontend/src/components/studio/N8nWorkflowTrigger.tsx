"use client";

import { useState } from "react";
import { Check, Loader2, Workflow } from "lucide-react";
import type { StudioProject } from "@/types/studio";
import type { TrackAnalysis, WhatIfParams } from "@/types";
import { triggerN8nWorkflow, ApiError } from "@/lib/api-client";
import { N8nLogo } from "@/components/icons/BrandLogos";
import { Card, CardHeader } from "@/components/ui/Card";

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
      await triggerN8nWorkflow({
        event: "studio.launch.pack_ready",
        projectId: project.id,
        projectTitle: project.title,
        artistName: project.artistName,
        genre: project.genre,
        mood: project.mood,
        versionLabel,
        hitScore: analysis?.hitPotential.overall,
        targetReleaseDate,
        whatIf,
        partners: analysis?.meta?.partners,
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
            ? "Push release context to your n8n workflow (Slack, email, CRM, etc.)"
            : "Add N8N_WEBHOOK_URL to connect your automation stack"
        }
        action={<N8nLogo size={20} />}
      />

      {enabled ? (
        <div className="space-y-3">
          <p className="text-sm text-muted">
            Sends project metadata, hit score, What-If params, and release date to your webhook.
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
          <code className="text-accent-light">.env.local</code>.
        </p>
      )}
    </Card>
  );
}