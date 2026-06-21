
import { useState } from "react";
import { Search, Loader2, Music2, AlertCircle, Sparkles } from "lucide-react";
import type { Track } from "@/types";
import { searchTracks, ApiError } from "@/lib/api-client";
import type { AppTrack } from "@/lib/musixmatch/client";
import { sortByMxmIntelligence } from "@pulseforge/shared/lib/musixmatch/intelligence-score";
import { MxmIntelligenceBadges } from "@/components/search/MxmIntelligenceBadges";
import { cn } from "@/lib/utils";

const EXAMPLE_SEARCHES = [
  { label: "Blinding Lights", query: "Blinding Lights The Weeknd" },
  { label: "Flowers", query: "Flowers Miley Cyrus" },
  { label: "As It Was", query: "As It Was Harry Styles" },
  { label: "Levitating", query: "Levitating Dua Lipa" },
];

interface TrackSearchProps {
  onSelect: (track: AppTrack) => void;
  selectedTrack?: Track | null;
  isLoading?: boolean;
  onExampleSearch?: (query: string) => void;
}

export function TrackSearch({ onSelect, selectedTrack, isLoading }: TrackSearchProps) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<AppTrack[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const runSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return [];

    setIsSearching(true);
    setHasSearched(true);
    setError(null);
    setHint(null);

    try {
      const tracks = sortByMxmIntelligence(await searchTracks(searchQuery.trim()));
      setResults(tracks);
      if (tracks.length === 0) {
        setError("No tracks with lyrics found. Try a different search.");
      }
      return tracks;
    } catch (err) {
      setResults([]);
      if (err instanceof ApiError) {
        setError(err.message);
        setHint(err.hint ?? null);
      } else {
        setError("Search failed. Please try again.");
      }
      return [];
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await runSearch(query);
  };

  const handleExample = async (exampleQuery: string) => {
    setQuery(exampleQuery);
    const tracks = await runSearch(exampleQuery);
    // Make TRY more powerful: auto-analyze the first (richest) result for instant demo
    if (tracks && tracks.length > 0 && onSelect) {
      onSelect(tracks[0]);
    }
  };

  const busy = isSearching || isLoading;

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search track or artist — powered by Musixmatch"
          className="w-full rounded-xl border border-border bg-surface-elevated/90 py-3.5 pl-12 pr-28 text-sm text-foreground shadow-inner shadow-black/10 placeholder:text-muted/60 outline-none transition focus:border-purple/50 focus:ring-2 focus:ring-purple/20"
        />
        <button
          type="submit"
          disabled={busy || !query.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-light disabled:opacity-40"
        >
          {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
        </button>
      </form>

      <div>
        <div className="mb-2 flex items-center gap-2">
          <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted">
            <Sparkles className="h-3 w-3" />
            Popular right now — click to search &amp; analyze
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_SEARCHES.map((ex) => (
            <button
              key={ex.label}
              type="button"
              onClick={() => handleExample(ex.query)}
              disabled={busy}
              className="rounded-lg border border-accent/30 bg-accent-muted/10 px-4 py-1.5 text-sm font-medium text-accent-light transition hover:bg-accent-muted hover:text-white disabled:opacity-50"
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/5 p-4 animate-fade-in">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <div>
            <p className="text-sm text-danger">{error}</p>
            {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
          </div>
        </div>
      )}

      {hasSearched && results.length > 0 && (
        <div className="space-y-3 animate-fade-in">
          <div>
            <h3 className="text-lg font-semibold">Hasil Pencarian</h3>
            <p className="text-xs text-muted">
              {results.length} result{results.length !== 1 ? "s" : ""} · richest Musixmatch data first
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((track) => (
              <div
                key={track.id}
                className={cn(
                  "group flex items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200",
                  selectedTrack?.id === track.id
                    ? "border-accent/40 bg-accent-muted"
                    : "border-border bg-surface-elevated hover:border-accent/25 hover:bg-surface",
                  isLoading && "pointer-events-none opacity-60"
                )}
              >
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-accent-muted ring-1 ring-border transition group-hover:ring-accent/30">
                  {track.coverUrl ? (
                    <img
                      src={track.coverUrl}
                      alt=""
                      width={48}
                      height={48}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Music2 className="h-5 w-5 text-accent-light" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{track.title}</p>
                  <p className="truncate text-sm text-muted">{track.artist}</p>
                  {track.genre && (
                    <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted/70">
                      {track.genre}
                    </p>
                  )}
                  <MxmIntelligenceBadges track={track} compact />
                </div>
                <button
                  type="button"
                  onClick={() => onSelect(track)}
                  disabled={isLoading}
                  className="ml-2 shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-light disabled:opacity-40"
                >
                  Analyze
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}