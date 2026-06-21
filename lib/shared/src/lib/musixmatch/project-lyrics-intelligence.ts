import type { LyricsSections } from "../../types/studio";

export interface ResolvedProjectAnalysis {
  source: "local" | "mxm";
  analysis: any;
}

/**
 * Resolve the analysis used for a project: prefer live Musixmatch analysis when
 * available, otherwise fall back to a neutral local analysis shell so the UI can
 * render without remote enrichment.
 */
export function resolveProjectAnalysis(
  _lyrics: LyricsSections,
  mxmAnalysis: any,
): ResolvedProjectAnalysis {
  if (mxmAnalysis) {
    return { source: "mxm", analysis: mxmAnalysis };
  }

  return {
    source: "local",
    analysis: {
      moods: { main_moods: [] },
      themes: { main_themes: [] },
      meaning: { explanation: "" },
    },
  };
}
