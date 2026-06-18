import type { AppTrack } from "@/lib/musixmatch/client";
import { MOCK_TRACKS } from "@/lib/mock-data";

export function mockTracksToApp(): AppTrack[] {
  return MOCK_TRACKS.map((t) => ({
    id: t.id,
    commontrackId: t.id,
    title: t.title,
    artist: t.artist,
    album: t.album,
    duration: t.duration,
    coverUrl: undefined,
    isrc: undefined,
    genre: t.genre,
    releaseYear: t.releaseYear,
    rating: 75,
    explicit: false,
    hasRichsync: Number(t.id) % 2 === 0,
    hasAnalysis: true,
    spotifyId: undefined,
  }));
}

export function searchMockTracks(query: string): AppTrack[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return mockTracksToApp().filter(
    (t) =>
      t.title.toLowerCase().includes(q) ||
      t.artist.toLowerCase().includes(q) ||
      (t.album?.toLowerCase().includes(q) ?? false)
  );
}