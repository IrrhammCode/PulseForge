"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, FolderPlus } from "lucide-react";
import type { AppTrack } from "@/lib/musixmatch/client";
import type { TrackAnalysis } from "@/types";
import { createProjectFromCatalogTrack } from "@/lib/studio/import-from-track";

interface ImportToStudioButtonProps {
  track: AppTrack;
  analysis?: TrackAnalysis;
}

export function ImportToStudioButton({ track, analysis }: ImportToStudioButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleImport = () => {
    setLoading(true);
    try {
      const project = createProjectFromCatalogTrack(track, { analysis });
      router.push(`/studio/${project.id}/write`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleImport}
      disabled={loading}
      className="btn-secondary text-sm"
    >
      <FolderPlus className="h-4 w-4" />
      {loading ? "Creating…" : "Import to Studio"}
      <ArrowRight className="h-3.5 w-3.5" />
    </button>
  );
}