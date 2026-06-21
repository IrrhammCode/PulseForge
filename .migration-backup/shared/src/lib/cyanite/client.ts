const CYANITE_URL = "https://api.cyanite.ai/graphql";

export interface CyaniteAnalysis {
  available: boolean;
  status: "finished" | "processing" | "unavailable" | "error";
  bpm?: number;
  key?: string;
  valence?: number;
  arousal?: number;
  energyLevel?: string;
  energyDynamics?: string;
  moodTags: string[];
  genreTags: string[];
  movementTags: string[];
  instrumentTags: string[];
  caption?: string;
  segmentEnergy: number[];
}

function getToken(): string | undefined {
  return process.env.CYANITE_ACCESS_TOKEN;
}

export function hasCyaniteToken(): boolean {
  return Boolean(getToken());
}

async function cyaniteGraphql<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const token = getToken();
  if (!token) throw new Error("CYANITE_ACCESS_TOKEN is not configured");

  const res = await fetch(CYANITE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 600 },
  });

  if (!res.ok) throw new Error(`Cyanite HTTP ${res.status}`);

  const json = (await res.json()) as {
    data?: T;
    errors?: Array<{ message: string }>;
  };

  if (json.errors?.length) {
    throw new Error(json.errors[0].message);
  }

  return json.data as T;
}

const SPOTIFY_ANALYSIS_QUERY = `
  query SpotifyTrackAnalysis($id: ID!) {
    spotifyTrack(id: $id) {
      __typename
      ... on SpotifyTrack {
        id
        title
        audioAnalysisV6 {
          __typename
          ... on AudioAnalysisV6Finished {
            result {
              bpmRangeAdjusted
              valence
              arousal
              energyLevel
              energyDynamics
              moodTags
              genreTags
              movementTags
              instrumentTags
              transformerCaption
              keyPrediction { value }
              segments {
                arousal
              }
            }
          }
        }
      }
      ... on SpotifyTrackError {
        message
      }
    }
  }
`;

const ENQUEUE_MUTATION = `
  mutation EnqueueSpotifyTrack($id: ID!) {
    spotifyTrackEnqueue(input: { spotifyTrackId: $id }) {
      __typename
      ... on SpotifyTrackEnqueueSuccess {
        enqueuedSpotifyTrack { id }
      }
    }
  }
`;

interface SpotifyAnalysisResponse {
  spotifyTrack: {
    __typename: string;
    message?: string;
    audioAnalysisV6?: {
      __typename: string;
      result?: {
        bpmRangeAdjusted?: number;
        valence?: number;
        arousal?: number;
        energyLevel?: string;
        energyDynamics?: string;
        moodTags?: string[];
        genreTags?: string[];
        movementTags?: string[];
        instrumentTags?: string[];
        transformerCaption?: string;
        keyPrediction?: { value?: string };
        segments?: { arousal?: number[] };
      };
    };
  };
}

function mapCyaniteResult(
  result: NonNullable<SpotifyAnalysisResponse["spotifyTrack"]["audioAnalysisV6"]>["result"]
): CyaniteAnalysis {
  const arousalSegments = result?.segments?.arousal ?? [];
  const segmentEnergy =
    arousalSegments.length > 0
      ? arousalSegments.map((v) => Math.min(1, Math.max(0, (v + 1) / 2)))
      : [];

  return {
    available: true,
    status: "finished",
    bpm: result?.bpmRangeAdjusted,
    key: result?.keyPrediction?.value,
    valence: result?.valence,
    arousal: result?.arousal,
    energyLevel: result?.energyLevel,
    energyDynamics: result?.energyDynamics,
    moodTags: result?.moodTags ?? [],
    genreTags: result?.genreTags ?? [],
    movementTags: result?.movementTags ?? [],
    instrumentTags: result?.instrumentTags ?? [],
    caption: result?.transformerCaption,
    segmentEnergy,
  };
}

export async function analyzeSpotifyTrack(spotifyId: string): Promise<CyaniteAnalysis> {
  if (!hasCyaniteToken()) {
    return { available: false, status: "unavailable", moodTags: [], genreTags: [], movementTags: [], instrumentTags: [], segmentEnergy: [] };
  }

  try {
    const data = await cyaniteGraphql<SpotifyAnalysisResponse>(SPOTIFY_ANALYSIS_QUERY, {
      id: spotifyId,
    });

    const track = data.spotifyTrack;
    if (track.__typename === "SpotifyTrackError") {
      return {
        available: false,
        status: "error",
        moodTags: [],
        genreTags: [],
        movementTags: [],
        instrumentTags: [],
        segmentEnergy: [],
      };
    }

    const analysis = track.audioAnalysisV6;
    if (!analysis) {
      return { available: false, status: "unavailable", moodTags: [], genreTags: [], movementTags: [], instrumentTags: [], segmentEnergy: [] };
    }

    if (analysis.__typename === "AudioAnalysisV6Finished" && analysis.result) {
      return mapCyaniteResult(analysis.result);
    }

    // Enqueue for processing if not yet analyzed
    if (
      analysis.__typename === "AudioAnalysisV6NotStarted" ||
      analysis.__typename === "AudioAnalysisV6Processing" ||
      analysis.__typename === "AudioAnalysisV6Enqueued"
    ) {
      await cyaniteGraphql(ENQUEUE_MUTATION, { id: spotifyId });
      return {
        available: false,
        status: "processing",
        moodTags: [],
        genreTags: [],
        movementTags: [],
        instrumentTags: [],
        segmentEnergy: [],
      };
    }

    return { available: false, status: "unavailable", moodTags: [], genreTags: [], movementTags: [], instrumentTags: [], segmentEnergy: [] };
  } catch {
    return { available: false, status: "error", moodTags: [], genreTags: [], movementTags: [], instrumentTags: [], segmentEnergy: [] };
  }
}