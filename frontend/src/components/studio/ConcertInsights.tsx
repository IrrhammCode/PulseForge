"use client";

import { useEffect, useState } from "react";
import { Calendar, ExternalLink, MapPin } from "lucide-react";
import { fetchConcertIntel, type JamBaseEvent } from "@/lib/api-client";
import { JamBaseLogo } from "@/components/icons/BrandLogos";
import { Card, CardHeader } from "@/components/ui/Card";

interface ConcertInsightsProps {
  artistName: string;
  genre?: string;
}

export function ConcertInsights({ artistName, genre }: ConcertInsightsProps) {
  const [events, setEvents] = useState<JamBaseEvent[]>([]);
  const [source, setSource] = useState<string>("mock");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchConcertIntel(artistName, genre)
      .then((res) => {
        if (cancelled) return;
        setEvents(res.events);
        setSource(res.source);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [artistName, genre]);

  return (
    <Card glow="none">
      <CardHeader
        title="Live Music Intel"
        subtitle={
          source === "jambase"
            ? "JamBase — nearby shows & routing ideas for your release window"
            : "JamBase demo data — add JAMBASE_API_KEY for live listings"
        }
        action={<JamBaseLogo size={20} />}
      />

      {loading ? (
        <p className="text-sm text-muted">Searching concert listings…</p>
      ) : events.length === 0 ? (
        <p className="text-sm text-muted">No upcoming shows found for this artist.</p>
      ) : (
        <ul className="space-y-3">
          {events.slice(0, 5).map((event) => (
            <li
              key={event.id}
              className="rounded-xl border border-border bg-surface p-3 text-sm"
            >
              <p className="font-semibold">{event.artistName}</p>
              <p className="mt-1 flex items-center gap-1.5 text-muted">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {event.venueName}
                {event.city ? ` · ${event.city}` : ""}
                {event.region ? `, ${event.region}` : ""}
              </p>
              {event.date && (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                  <Calendar className="h-3 w-3" />
                  {event.date}
                </p>
              )}
              {event.url && (
                <a
                  href={event.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-accent-light hover:text-foreground"
                >
                  View on JamBase
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}