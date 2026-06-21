import { Music2, Sparkles } from "lucide-react";
import { SectionHead } from "@/components/ui/editorial";

interface ExampleSong {
  title: string;
  tagline: string;
  src: string;
}

const EXAMPLE_SONGS: ExampleSong[] = [
  {
    title: "On My Terms",
    tagline: "Original demo · crafted end-to-end in PulseForge",
    src: `${import.meta.env.BASE_URL}examples/on-my-terms.mp3`,
  },
  {
    title: "Petals on the Calendar",
    tagline: "Original demo · crafted end-to-end in PulseForge",
    src: `${import.meta.env.BASE_URL}examples/petals-on-the-calendar.mp3`,
  },
];

export function ExampleSongsShowcase() {
  return (
    <section className="mt-12">
      <SectionHead
        eyebrow="Showcase"
        title="Made with PulseForge"
      />
      <p className="mb-5 max-w-2xl text-sm text-muted">
        Real demos written, produced, and launched inside PulseForge. Press play to hear
        what the studio can make.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {EXAMPLE_SONGS.map((song) => (
          <div
            key={song.title}
            className="flex flex-col gap-4 border-2 border-foreground p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-accent-light">
                  <Sparkles className="h-3.5 w-3.5" />
                  PulseForge Original
                </div>
                <h3 className="truncate font-display text-2xl uppercase tracking-tight">
                  {song.title}
                </h3>
                <p className="mt-1 text-xs text-muted">{song.tagline}</p>
              </div>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-foreground">
                <Music2 className="h-5 w-5" />
              </span>
            </div>

            <audio controls preload="metadata" className="w-full">
              <source src={song.src} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
          </div>
        ))}
      </div>
    </section>
  );
}
