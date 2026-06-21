export interface JamBaseEvent {
  id: string;
  artistName: string;
  venueName: string;
  city: string;
  region?: string;
  country: string;
  date: string;
  url?: string;
  genre?: string;
}

export interface JamBaseSearchResult {
  available: boolean;
  source: "jambase" | "mock";
  events: JamBaseEvent[];
  artistQuery: string;
}

function getApiKey(): string | undefined {
  return process.env.JAMBASE_API_KEY;
}

export function hasJamBaseKey(): boolean {
  return Boolean(getApiKey());
}

function mockEvents(artistName: string, genre?: string): JamBaseEvent[] {
  const base = artistName || "Indie Artist";
  const year = new Date().getFullYear();
  return [
    {
      id: "mock-1",
      artistName: base,
      venueName: "The Echo",
      city: "Los Angeles",
      region: "CA",
      country: "US",
      date: `${year}-08-14`,
      url: "https://www.jambase.com",
      genre,
    },
    {
      id: "mock-2",
      artistName: `${base} (support: Nova Ray)`,
      venueName: "Brooklyn Steel",
      city: "Brooklyn",
      region: "NY",
      country: "US",
      date: `${year}-09-02`,
      genre,
    },
    {
      id: "mock-3",
      artistName: "Similar acts in your genre",
      venueName: "O2 Academy Brixton",
      city: "London",
      country: "UK",
      date: `${year}-10-18`,
      genre,
    },
  ];
}

export async function searchConcerts(
  artistName: string,
  genre?: string
): Promise<JamBaseSearchResult> {
  const query = artistName.trim();
  if (!query) {
    return { available: false, source: "mock", events: [], artistQuery: query };
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      available: false,
      source: "mock",
      events: mockEvents(query, genre),
      artistQuery: query,
    };
  }

  const url = new URL("https://www.jambase.com/jb-api/v1/events");
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("artistName", query);
  url.searchParams.set("perPage", "8");
  url.searchParams.set("page", "1");

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) {
    return {
      available: false,
      source: "mock",
      events: mockEvents(query, genre),
      artistQuery: query,
    };
  }

  const data = (await res.json()) as {
    events?: Array<{
      id?: string | number;
      artist?: { name?: string };
      venue?: { name?: string; city?: string; region?: string; country?: string };
      date?: string;
      url?: string;
    }>;
  };

  const events: JamBaseEvent[] = (data.events ?? []).map((e, i) => ({
    id: String(e.id ?? i),
    artistName: e.artist?.name ?? query,
    venueName: e.venue?.name ?? "Venue TBA",
    city: e.venue?.city ?? "",
    region: e.venue?.region,
    country: e.venue?.country ?? "",
    date: e.date ?? "",
    url: e.url,
    genre,
  }));

  return {
    available: events.length > 0,
    source: "jambase",
    events: events.length > 0 ? events : mockEvents(query, genre),
    artistQuery: query,
  };
}