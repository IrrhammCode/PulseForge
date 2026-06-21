
import { useState } from "react";
import { ChevronDown, Mic2, Music2, SlidersHorizontal } from "lucide-react";
import {
  EMPTY_MUSIC_ARRANGEMENT,
  INSTRUMENT_OPTIONS,
  PARTNER_SONG_PIPELINE,
} from "@pulseforge/shared/lib/studio/music-arrangement";
import {
  VOCAL_DELIVERY_OPTIONS,
  VOICE_TYPE_OPTIONS,
} from "@pulseforge/shared/lib/studio/vocal-direction";
import type { MusicArrangement, SectionMusicDirection, VocalDirection } from "@/types/studio";
import { cn } from "@/lib/utils";

type ArrangementSectionKey = keyof NonNullable<MusicArrangement["sections"]>;

const SECTION_ROWS: { key: ArrangementSectionKey; label: string; hint: string }[] = [
  { key: "intro", label: "Intro", hint: "Bed before vocals — build, riff, or ambient open" },
  { key: "verse1", label: "Verse 1", hint: "Sparse backing, room for storytelling vocal" },
  { key: "chorus", label: "Chorus", hint: "Full band lift — hook energy" },
  { key: "verse2", label: "Verse 2", hint: "Added layers vs verse 1" },
  { key: "bridge", label: "Bridge", hint: "Contrast — breakdown or texture shift" },
  { key: "outro", label: "Outro", hint: "Fade, sting, or instrumental landing" },
];

interface MusicArrangementPanelProps {
  arrangement?: MusicArrangement;
  onChange: (arrangement: MusicArrangement) => void;
}

function mergeArrangement(arr?: MusicArrangement): MusicArrangement {
  return {
    ...EMPTY_MUSIC_ARRANGEMENT,
    ...arr,
    instruments: arr?.instruments ?? [],
    negativeGlobal: arr?.negativeGlobal ?? [...EMPTY_MUSIC_ARRANGEMENT.negativeGlobal!],
    vocal: { ...EMPTY_MUSIC_ARRANGEMENT.vocal, ...arr?.vocal },
    sections: { ...arr?.sections },
  };
}

export function MusicArrangementPanel({ arrangement, onChange }: MusicArrangementPanelProps) {
  const data = mergeArrangement(arrangement);
  const [openSection, setOpenSection] = useState<ArrangementSectionKey | null>("intro");
  const [showPipeline, setShowPipeline] = useState(false);

  const patch = (next: MusicArrangement) => onChange(mergeArrangement(next));

  const setVocal = (vocalPatch: Partial<VocalDirection>) => {
    patch({ ...data, vocal: { ...data.vocal, ...vocalPatch } });
  };

  const toggleInstrument = (inst: string) => {
    const set = new Set(data.instruments);
    if (set.has(inst)) set.delete(inst);
    else set.add(inst);
    patch({ ...data, instruments: [...set] });
  };

  const setSection = (key: ArrangementSectionKey, dir: SectionMusicDirection) => {
    patch({
      ...data,
      sections: { ...data.sections, [key]: { ...data.sections?.[key], ...dir } },
    });
  };

  return (
    <div className="mt-6 space-y-4 border-t border-border pt-6">
      <div className="flex items-start gap-2">
        <Music2 className="mt-0.5 h-4 w-4 shrink-0 text-accent-light" />
        <div>
          <h3 className="text-sm font-semibold">Music & arrangement</h3>
          <p className="mt-0.5 text-xs text-muted">
            Nada, iringan, dan intro/outro masuk ke ElevenLabs{" "}
            <code className="text-[10px]">composition_plan</code> saat Generate Full Song.
          </p>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-muted">Instruments</p>
        <div className="flex flex-wrap gap-1.5">
          {INSTRUMENT_OPTIONS.map((inst) => {
            const on = data.instruments?.includes(inst);
            return (
              <button
                key={inst}
                type="button"
                onClick={() => toggleInstrument(inst)}
                className={cn(
                  "rounded-lg border px-2.5 py-1 text-[11px] font-medium transition",
                  on
                    ? "border-accent/50 bg-accent-muted text-accent-light"
                    : "border-border text-muted hover:border-accent/30 hover:text-foreground"
                )}
              >
                {inst}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-accent/20 bg-accent-muted/10 p-3">
        <div className="mb-3 flex items-center gap-2">
          <Mic2 className="h-4 w-4 text-accent-light" />
          <div>
            <p className="text-xs font-semibold">Vocal character</p>
            <p className="text-[10px] text-muted">
              Steers ElevenLabs singing — per-section delivery, anti-AI negatives, ad-libs
            </p>
          </div>
        </div>

        <div className="mb-3">
          <p className="mb-1.5 text-[11px] font-medium text-muted">Voice</p>
          <div className="flex flex-wrap gap-1.5">
            {VOICE_TYPE_OPTIONS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setVocal({ voiceType: id })}
                className={cn(
                  "rounded-lg border px-2.5 py-1 text-[11px] font-medium transition",
                  data.vocal?.voiceType === id
                    ? "border-accent/50 bg-accent-muted text-accent-light"
                    : "border-border text-muted hover:border-accent/30"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <p className="mb-1.5 text-[11px] font-medium text-muted">Delivery</p>
          <div className="flex flex-wrap gap-1.5">
            {VOCAL_DELIVERY_OPTIONS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setVocal({ delivery: id })}
                className={cn(
                  "rounded-lg border px-2.5 py-1 text-[11px] font-medium transition",
                  data.vocal?.delivery === id
                    ? "border-accent/50 bg-accent-muted text-accent-light"
                    : "border-border text-muted hover:border-accent/30"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <label className="mb-2 flex items-center gap-2 text-[11px]">
          <input
            type="checkbox"
            checked={data.vocal?.adLibs !== false}
            onChange={(e) => setVocal({ adLibs: e.target.checked })}
          />
          Phonetic ad-libs (mmm, yeah, oh) — makes vocals feel more human
        </label>

        <input
          type="text"
          value={data.vocal?.customCharacter ?? ""}
          onChange={(e) => setVocal({ customCharacter: e.target.value })}
          placeholder="Extra vocal notes e.g. breathy alto, slight rasp on chorus only"
          className="mb-2 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs"
        />

        {data.vocal?.preferredVoiceHint && (
          <p className="mb-2 text-[10px] text-accent-light">
            From Hook Preview: {data.vocal.preferredVoiceHint}
          </p>
        )}

        <input
          type="text"
          value={data.vocal?.avoid ?? ""}
          onChange={(e) => setVocal({ avoid: e.target.value })}
          placeholder="Avoid vocally: robotic, nursery rhyme, over-autotuned"
          className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs">
          <span className="font-medium text-muted">Global backing / iringan</span>
          <input
            type="text"
            value={data.accompaniment ?? ""}
            onChange={(e) => patch({ ...data, accompaniment: e.target.value })}
            placeholder="e.g. muted piano + vinyl crackle"
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-xs">
          <span className="font-medium text-muted">Harmony / pad</span>
          <input
            type="text"
            value={data.harmony ?? ""}
            onChange={(e) => patch({ ...data, harmony: e.target.value })}
            placeholder="e.g. warm stacked harmonies on chorus"
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-xs">
          <span className="font-medium text-muted">Key (optional)</span>
          <input
            type="text"
            value={data.musicalKey ?? ""}
            onChange={(e) => patch({ ...data, musicalKey: e.target.value })}
            placeholder="e.g. A minor"
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-xs">
          <span className="font-medium text-muted">Stem engine (post-generate)</span>
          <select
            value={data.stemEngine ?? "auto"}
            onChange={(e) =>
              patch({ ...data, stemEngine: e.target.value as MusicArrangement["stemEngine"] })
            }
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          >
            <option value="auto">Auto (prefer Musixmatch stems)</option>
            <option value="musixmatch">Musixmatch Pro stems</option>
            <option value="eleven">ElevenLabs Music stems</option>
            <option value="lalal">LALAL.AI multistem</option>
          </select>
        </label>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted">Per-section backing</p>
        {SECTION_ROWS.map(({ key, label, hint }) => {
          const dir = data.sections?.[key] ?? {};
          const open = openSection === key;
          return (
            <div key={key} className="rounded-xl border border-border bg-surface/50">
              <button
                type="button"
                onClick={() => setOpenSection(open ? null : key)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-medium"
              >
                <span>
                  {label}
                  {(dir.backing || dir.instrumental) && (
                    <span className="ml-2 text-accent-light">· configured</span>
                  )}
                </span>
                <ChevronDown className={cn("h-3.5 w-3.5 transition", open && "rotate-180")} />
              </button>
              {open && (
                <div className="space-y-2 border-t border-border/60 px-3 py-3">
                  <p className="text-[10px] text-muted">{hint}</p>
                  <label className="flex items-center gap-2 text-[11px]">
                    <input
                      type="checkbox"
                      checked={Boolean(dir.instrumental)}
                      onChange={(e) => setSection(key, { instrumental: e.target.checked })}
                    />
                    Instrumental bed (no lead vocal — good for intro/outro)
                  </label>
                  <input
                    type="text"
                    value={dir.backing ?? ""}
                    onChange={(e) => setSection(key, { backing: e.target.value })}
                    placeholder="Backing bed"
                    className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs"
                  />
                  <input
                    type="text"
                    value={dir.melody ?? ""}
                    onChange={(e) => setSection(key, { melody: e.target.value })}
                    placeholder="Lead melody instrument"
                    className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs"
                  />
                  <input
                    type="text"
                    value={dir.inlineCues ?? ""}
                    onChange={(e) => setSection(key, { inlineCues: e.target.value })}
                    placeholder="Inline cue e.g. guitar riff, 808 drop"
                    className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs"
                  />
                  <input
                    type="text"
                    value={dir.avoid ?? ""}
                    onChange={(e) => setSection(key, { avoid: e.target.value })}
                    placeholder="Avoid (comma-separated)"
                    className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setShowPipeline((v) => !v)}
        className="inline-flex items-center gap-1.5 text-[11px] text-muted hover:text-foreground"
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Partner pipeline
        <ChevronDown className={cn("h-3.5 w-3.5 transition", showPipeline && "rotate-180")} />
      </button>
      {showPipeline && (
        <ul className="space-y-1.5 rounded-xl border border-border/60 bg-surface/40 p-3 text-[11px] text-muted">
          {PARTNER_SONG_PIPELINE.map((row) => (
            <li key={row.partner}>
              <span className="font-medium text-foreground">{row.partner}</span>
              {" — "}
              {row.role}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
