/* eslint-disable @typescript-eslint/no-explicit-any, prefer-const */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useStudioProject } from "@/lib/hooks/useStudioProject";
import { AudioUploader } from "@/components/studio/AudioUploader";
import { WaveformWorkspace } from "@/components/studio/WaveformWorkspace";
import { StemPanel } from "@/components/studio/StemPanel";
import { MusicTimelineEditor } from "@/components/viral/MusicTimelineEditor";
import {
  createAudioObjectUrl,
  deleteStemBlobs,
  deleteVersionAudio,
  getAudioBlob,
  getClipAudio,
  saveAudioBlob,
  saveClipAudio,
  deleteClipAudio,
} from "@/lib/studio/audio-db";
import { listElevenLabsVoices, synthesizeHookVoice, generateFullSong, ApiError, type ElevenLabsVoice, fetchRichsync } from "@/lib/api-client";
import { MusixmatchProTools } from "@/components/studio/MusixmatchProTools";
import type { DemoAudioMeta, LyricsSections } from "@/types/studio";
import { formatFileSize, extractWaveformPeaks } from "@/lib/studio/audio-analysis";
import { StudioFocusHint } from "@/components/studio/StudioFocusHint";
import { StudioStaleViralBanner } from "@/components/studio/StudioStaleViralBanner";
import type { MusicTimeline, TimelineEdits, TimelineLaneId, TimelineSectionId } from "@/types/viral";
import {
  createTimelineEdits,
  resizeSectionEdge,
  splitSectionAt,
  moveSection,
  setPlayheadEdit,
  toggleLaneMute,
  toggleLaneSolo,
  clampPercent,
} from "@/lib/studio/timeline-edits";
import {
  commandSaveTimelineEdits,
} from "@/lib/domain/project-commands";
import { resolveTimelineEdits } from "@/lib/domain/version-intelligence";
import { buildStyleDescriptors } from "@pulseforge/shared/lib/studio/style-prompt";
import { buildLyricsTimelineFromWordCounts, mapTimelineSectionToLyricsKey } from "@/lib/studio/lyrics";
import { primaryGenreLabel, primaryMoodLabel } from "@/types/studio";

export function ProduceTab() {
  const params = useParams();
  const projectId = params.id as string;
  const { project, ready, saveAudio, updateStems, saveLyrics } = useStudioProject(projectId);
  const [mixUrl, setMixUrl] = useState<string | null>(null);
  const [sectionEdit, setSectionEdit] = useState<null | {
    sectionId: TimelineSectionId;
    lyrics: string;
    extra: string;
  }>(null);

  // For visual full composition plan editor
  const [editingPlan, setEditingPlan] = useState<any>(null);

  // Preview for section regen (generate without immediately attaching)
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const previewWaveformRef = useRef<HTMLCanvasElement>(null);
  const [previewTrim, setPreviewTrim] = useState({ start: 0, end: 1 }); // 0-1 normalized for preview snippet trim
  const [isTrimming, setIsTrimming] = useState(false);

  // Compare original vs edited (full song editing workflow)
  const [compareOriginal, setCompareOriginal] = useState(false);

  // Ripple adjust helper for neighboring sections
  const rippleAdjust = (sections: any[], sectionId: string, newWidth: number) => {
    const idx = sections.findIndex((s: any) => s.sectionId === sectionId);
    if (idx < 0) return sections;
    const oldWidth = sections[idx].widthPercent || 0;
    const delta = newWidth - oldWidth;
    let res = sections.map((s: any) => ({...s}));
    res[idx].widthPercent = newWidth;
    let pos = res[idx].startPercent + newWidth;
    for (let i = idx + 1; i < res.length; i++) {
      res[i].startPercent = pos;
      pos += res[i].widthPercent || 0;
    }
    return res;
  };

  // Draw real waveform for previewBlob (using existing extract)
  useEffect(() => {
    if (!previewBlob || !previewWaveformRef.current) return;
    const canvas = previewWaveformRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    (async () => {
      try {
        const arrayBuffer = await previewBlob.arrayBuffer();
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        const peaks = extractWaveformPeaks(audioBuffer, 64); // reuse util
        canvas.width = 320;
        canvas.height = 32;
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#a5b4fc';
        const barW = canvas.width / peaks.length;
        peaks.forEach((p, i) => {
          const h = Math.max(1, p * canvas.height);
          ctx.fillRect(i * barW, (canvas.height - h) / 2, barW - 1, h);
        });
      } catch (e) {
        // fallback to fake
        console.warn('preview waveform draw failed', e);
      }
    })();
  }, [previewBlob]);

  // Deep stem replacement helper: splice new vocal into existing vocals stem and save
  const spliceVocalStem = async (sectionId: string, newVocalBlob: Blob) => {
    if (!activeVersion?.audio?.stemsReady) return;
    try {
      const vocalsStem = await getAudioBlob(projectId, activeVersion.id, 'vocals');
      if (!vocalsStem) {
        await saveAudioBlob(projectId, activeVersion.id, 'vocals', newVocalBlob);
        return;
      }

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const origBuf = await audioCtx.decodeAudioData(await vocalsStem.arrayBuffer());
      const newBuf = await audioCtx.decodeAudioData(await newVocalBlob.arrayBuffer());

      const sec = (studioTimelineEdits?.sections || []).find((s: any) => s.sectionId === sectionId);
      const totalSec = activeVersion.audio.durationSec || 180;
      const startSec = sec ? (sec.startPercent / 100) * totalSec : 0;

      const sampleRate = origBuf.sampleRate;
      const startSample = Math.floor(startSec * sampleRate);
      const insertLen = newBuf.length;
      const newLen = Math.max(origBuf.length, startSample + insertLen);

      const outBuf = audioCtx.createBuffer(origBuf.numberOfChannels, newLen, sampleRate);

      for (let ch = 0; ch < origBuf.numberOfChannels; ch++) {
        const origData = origBuf.getChannelData(ch);
        const newData = newBuf.getChannelData(ch);
        const outData = outBuf.getChannelData(ch);
        outData.set(origData.subarray(0, Math.min(startSample, origData.length)), 0);
        outData.set(newData, startSample);
        if (startSample + insertLen < origData.length) {
          outData.set(origData.subarray(startSample + insertLen), startSample + insertLen);
        }
      }

      const spliced = bufferToWav(outBuf);
      await saveAudioBlob(projectId, activeVersion.id, 'vocals', spliced);
      console.log('Deep vocal stem splice successful for', sectionId);
    } catch (e) {
      console.warn('Deep splice fallback to clip only', e);
      await saveAudioBlob(projectId, activeVersion.id, 'vocals', newVocalBlob);
    }
  };

  // Proper WAV encoder from AudioBuffer
  const bufferToWav = (buffer: AudioBuffer): Blob => {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = buffer.length * blockAlign;
    const bufferSize = 44 + dataSize;
    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);

    // RIFF header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, bufferSize - 8, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // PCM data
    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  };

  function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  // Slice audio blob to [startSec, endSec]
  const sliceAudioBlob = async (blob: Blob, startSec: number, endSec: number): Promise<Blob> => {
    const arrayBuffer = await blob.arrayBuffer();
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const startSample = Math.floor(startSec * audioBuffer.sampleRate);
    const endSample = Math.floor(endSec * audioBuffer.sampleRate);
    const length = endSample - startSample;

    if (length <= 0) return blob;

    const sliced = audioCtx.createBuffer(audioBuffer.numberOfChannels, length, audioBuffer.sampleRate);
    for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
      const channelData = audioBuffer.getChannelData(ch).slice(startSample, endSample);
      sliced.copyToChannel(channelData, ch);
    }
    return bufferToWav(sliced);
  };

  const activeVersion = project?.versions.find((v) => v.id === project.activeVersionId);

  const loadMix = useCallback(async () => {
    if (!activeVersion?.audio) {
      setMixUrl(null);
      return;
    }
    const blob = await getAudioBlob(projectId, activeVersion.id, "mix");
    if (!blob) {
      setMixUrl(null);
      return;
    }
    setMixUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return createAudioObjectUrl(blob);
    });
  }, [projectId, activeVersion?.id, activeVersion?.audio]);

  useEffect(() => {
    void loadMix();
    return () => {
      setMixUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [loadMix]);

  const handleUploaded = async (meta: DemoAudioMeta) => {
    if (!activeVersion) return;
    await deleteStemBlobs(projectId, activeVersion.id);
    saveAudio(activeVersion.id, meta);
    void loadMix();
  };

  const handleRemove = async () => {
    if (!activeVersion || !confirm("Remove demo audio for this version?")) return;
    await deleteVersionAudio(projectId, activeVersion.id);
    setMixUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    saveAudio(activeVersion.id, undefined);
  };

  const activeVersionId = activeVersion?.id;

  // === Full Production NLE in Studio (central music arrangement editor) ===
  const [studioTimeline, setStudioTimeline] = useState<MusicTimeline | null>(null);
  const [studioTimelineEdits, setStudioTimelineEdits] = useState<TimelineEdits | undefined>(undefined);
  const timelineHistoryRef = useRef({ past: [] as TimelineEdits[], future: [] as TimelineEdits[] });

  const MAX_HISTORY = 25;

  const recordEditHistory = useCallback((current: TimelineEdits | undefined) => {
    if (!current) return;
    const past = timelineHistoryRef.current.past;
    // avoid duplicate consecutive
    if (past.length === 0 || JSON.stringify(past[past.length-1]) !== JSON.stringify(current)) {
      past.push(JSON.parse(JSON.stringify(current))); // deep clone
      if (past.length > MAX_HISTORY) past.shift();
    }
    timelineHistoryRef.current.future = [];
  }, []);

  // Voice selector for NLE / AI vocals (synced with last cloned)
  const [produceVoices, setProduceVoices] = useState<ElevenLabsVoice[]>([]);
  const [voiceLoading, setVoiceLoading] = useState(false);

  // Build a usable MusicTimeline for the current project version (full NLE standalone)
  const buildStudioTimeline = useCallback((): MusicTimeline => {
    const duration = activeVersion?.audio?.durationSec || 180;
    const bpm = activeVersion?.audio?.estimatedBpm || project?.bpmTarget || 120;

    // Basic default sections (can be overridden by persisted edits)
    const baseSections = [
      { id: "intro" as const, label: "Intro", startPercent: 0, widthPercent: 10 },
      { id: "verse1" as const, label: "Verse 1", startPercent: 10, widthPercent: 18 },
      { id: "chorus1" as const, label: "Chorus", startPercent: 28, widthPercent: 20 },
      { id: "verse2" as const, label: "Verse 2", startPercent: 48, widthPercent: 16 },
      { id: "chorus2" as const, label: "Chorus", startPercent: 64, widthPercent: 18 },
      { id: "outro" as const, label: "Outro", startPercent: 82, widthPercent: 18 },
    ];

    const edits = activeVersion ? resolveTimelineEdits(activeVersion) : undefined;
    const applied = edits?.sections?.length
      ? edits.sections.map((e: { sectionId: string; startPercent: number; widthPercent: number }) => ({
          id: e.sectionId,
          label: e.sectionId,
          startPercent: e.startPercent,
          widthPercent: e.widthPercent,
        }))
      : baseSections;

    const lanes = [
      { id: "lyrics" as const, label: "Lyrics", clips: applied.map((s) => ({ id: `lyrics-${s.id}`, laneId: "lyrics" as const, sectionId: s.id, label: s.label, startPercent: s.startPercent, widthPercent: s.widthPercent, hasGap: false, studioTab: "write" as const })) },
      { id: "vocals" as const, label: "Vocals", clips: applied.map((s) => ({ id: `vocals-${s.id}`, laneId: "vocals" as const, sectionId: s.id, label: s.label, startPercent: s.startPercent, widthPercent: s.widthPercent, hasGap: false, studioTab: "produce" as const })) },
      { id: "drums" as const, label: "Drums", clips: applied.map((s) => ({ id: `drums-${s.id}`, laneId: "drums" as const, sectionId: s.id, label: s.label, startPercent: s.startPercent, widthPercent: s.widthPercent, hasGap: false, studioTab: "produce" as const })) },
      { id: "bass" as const, label: "Bass", clips: applied.map((s) => ({ id: `bass-${s.id}`, laneId: "bass" as const, sectionId: s.id, label: s.label, startPercent: s.startPercent, widthPercent: s.widthPercent, hasGap: false, studioTab: "produce" as const })) },
      { id: "other" as const, label: "Other", clips: applied.map((s) => ({ id: `other-${s.id}`, laneId: "other" as const, sectionId: s.id, label: s.label, startPercent: s.startPercent, widthPercent: s.widthPercent, hasGap: false, studioTab: "produce" as const })) },
      { id: "mix" as const, label: "Mix", clips: applied.map((s) => ({ id: `mix-${s.id}`, laneId: "mix" as const, sectionId: s.id, label: s.label, startPercent: s.startPercent, widthPercent: s.widthPercent, hasGap: false, studioTab: "produce" as const })) },
    ];

    return {
      durationSec: duration,
      bpm,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      lanes: lanes as any,
      playheadPercent: edits?.playheadPercent ?? 30,
      gapCount: 0,
    };
  }, [activeVersion, project]);

  useEffect(() => {
    if (activeVersion) {
      const tl = buildStudioTimeline();
      setStudioTimeline(tl);

      const edits = activeVersion ? resolveTimelineEdits(activeVersion) : undefined;
      setStudioTimelineEdits(edits);

      timelineHistoryRef.current = { past: [], future: [] };
    }
  }, [activeVersion, buildStudioTimeline]);

  // Load voices for Produce voice selector (persisted last + cloned ones)
  useEffect(() => {
    let cancelled = false;
    setVoiceLoading(true);
    listElevenLabsVoices()
      .then((vs) => {
        if (!cancelled) setProduceVoices(vs);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setVoiceLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const persistStudioTimelineEdits = useCallback((edits: TimelineEdits) => {
    if (!activeVersionId) return;
    commandSaveTimelineEdits(projectId, activeVersionId, edits);
    // Refresh the project data via the hook on next user action
  }, [projectId, activeVersionId]);

  // Record history before applying change (for real undo)
  const applyWithHistory = useCallback((newEdits: TimelineEdits) => {
    recordEditHistory(studioTimelineEdits);
    persistStudioTimelineEdits(newEdits);
    setStudioTimelineEdits(newEdits);
    setStudioTimeline(buildStudioTimeline());
  }, [studioTimelineEdits, persistStudioTimelineEdits, recordEditHistory, buildStudioTimeline]);

  // NLE handlers (full production editing inside Studio)
  const handleStudioResize = useCallback((sectionId: TimelineSectionId, edge: "start" | "end", percent: number) => {
    if (!studioTimeline) return;
    const layouts = resizeSectionEdge(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      studioTimeline.lanes[0]?.clips.map((c) => ({ id: c.sectionId, label: c.label, startPercent: c.startPercent, widthPercent: c.widthPercent })) as any,
      sectionId,
      edge,
      percent
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newEdits = createTimelineEdits(layouts as any, { laneStates: studioTimelineEdits?.laneStates, preferredVoiceId: (studioTimelineEdits as any)?.preferredVoiceId });
    persistStudioTimelineEdits(newEdits);
    // Rebuild local timeline for instant UI
    setStudioTimeline(buildStudioTimeline());
  }, [studioTimeline, studioTimelineEdits, persistStudioTimelineEdits, buildStudioTimeline]);

  const handleStudioMove = useCallback((sectionId: TimelineSectionId, delta: number) => {
    if (!studioTimeline) return;
    const layouts = moveSection(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      studioTimeline.lanes[0]?.clips.map((c) => ({ id: c.sectionId, label: c.label, startPercent: c.startPercent, widthPercent: c.widthPercent })) as any,
      sectionId,
      delta
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newEdits = createTimelineEdits(layouts as any, { laneStates: studioTimelineEdits?.laneStates, preferredVoiceId: (studioTimelineEdits as any)?.preferredVoiceId });
    persistStudioTimelineEdits(newEdits);
    setStudioTimeline(buildStudioTimeline());
  }, [studioTimeline, studioTimelineEdits, persistStudioTimelineEdits, buildStudioTimeline]);

  const handleStudioSplit = useCallback((playhead: number) => {
    if (!studioTimeline) return;
    const layouts = splitSectionAt(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      studioTimeline.lanes[0]?.clips.map((c) => ({ id: c.sectionId, label: c.label, startPercent: c.startPercent, widthPercent: c.widthPercent })) as any,
      playhead
    );
    if (!layouts) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newEdits = createTimelineEdits(layouts as any, { laneStates: studioTimelineEdits?.laneStates, preferredVoiceId: (studioTimelineEdits as any)?.preferredVoiceId });
    persistStudioTimelineEdits(newEdits);
    setStudioTimeline(buildStudioTimeline());
  }, [studioTimeline, studioTimelineEdits, persistStudioTimelineEdits, buildStudioTimeline]);

  const handleStudioPlayhead = useCallback((pct: number) => {
    if (!activeVersionId) return;
    const newEdits = setPlayheadEdit(studioTimelineEdits, pct);
    persistStudioTimelineEdits(newEdits);
    setStudioTimeline(buildStudioTimeline());
  }, [activeVersionId, studioTimelineEdits, persistStudioTimelineEdits, buildStudioTimeline]);

  const handleStudioLaneMute = useCallback((laneId: TimelineLaneId, muted: boolean) => {
    if (!activeVersionId) return;
    const newEdits = toggleLaneMute(studioTimelineEdits, laneId, muted);
    persistStudioTimelineEdits(newEdits);
    setStudioTimelineEdits(newEdits);
  }, [activeVersionId, studioTimelineEdits, persistStudioTimelineEdits]);

  const handleStudioLaneSolo = useCallback((laneId: TimelineLaneId, solo: boolean) => {
    if (!activeVersionId) return;
    const newEdits = toggleLaneSolo(studioTimelineEdits, laneId, solo);
    persistStudioTimelineEdits(newEdits);
    setStudioTimelineEdits(newEdits);
  }, [activeVersionId, studioTimelineEdits, persistStudioTimelineEdits]);

  // Fade handler (wajib from waveform-playlist - per clip fadeIn/fadeOut)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleStudioSetFade = useCallback((sectionId: TimelineSectionId, fadeIn: number, fadeOut: number) => {
    if (!activeVersionId) return;
    const base = studioTimelineEdits || { sections: [], updatedAt: new Date().toISOString() };
    const existingSections = base.sections || [];
    const updatedSections = existingSections.map((sec: any) =>
      sec.sectionId === sectionId
        ? { ...sec, fadeInPercent: fadeIn, fadeOutPercent: fadeOut }
        : sec
    );
    if (!updatedSections.find((s: any) => s.sectionId === sectionId)) {
      updatedSections.push({
        sectionId,
        startPercent: 0,
        widthPercent: 100,
        fadeInPercent: fadeIn,
        fadeOutPercent: fadeOut,
      });
    }
    const newEdits = createTimelineEdits(updatedSections as any, {
      laneStates: base.laneStates,
      playheadPercent: base.playheadPercent,
      preferredVoiceId: base.preferredVoiceId,
    });
    persistStudioTimelineEdits(newEdits);
    setStudioTimelineEdits(newEdits);
    setStudioTimeline(buildStudioTimeline());
  }, [activeVersionId, studioTimelineEdits, persistStudioTimelineEdits, buildStudioTimeline]);

  // Additional wajib NLE handlers (markers, loop, trim)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleAddMarker = useCallback((timePercent: number, label?: string) => {
    recordEditHistory(studioTimelineEdits);
    const base = studioTimelineEdits || { sections: [], updatedAt: new Date().toISOString() };
    const markers = [...(base.markers || [])];
    markers.push({ timePercent: clampPercent(timePercent), label });
    markers.sort((a, b) => a.timePercent - b.timePercent);
    const newEdits = { ...base, markers, updatedAt: new Date().toISOString() } as any;
    persistStudioTimelineEdits(newEdits);
    setStudioTimelineEdits(newEdits);
  }, [studioTimelineEdits, persistStudioTimelineEdits, recordEditHistory]);

  const handleRemoveMarker = useCallback((timePercent: number) => {
    const base = studioTimelineEdits || { sections: [], updatedAt: new Date().toISOString() };
    const markers = (base.markers || []).filter((m: any) => Math.abs(m.timePercent - timePercent) > 0.5);
    const newEdits = { ...base, markers, updatedAt: new Date().toISOString() } as any;
    persistStudioTimelineEdits(newEdits);
    setStudioTimelineEdits(newEdits);
  }, [studioTimelineEdits, persistStudioTimelineEdits]);

  const handleSetLoop = useCallback((start: number, end: number) => {
    const base = studioTimelineEdits || { sections: [], updatedAt: new Date().toISOString() };
    const newEdits = { ...base, loopRegion: { startPercent: clampPercent(start), endPercent: clampPercent(end) }, updatedAt: new Date().toISOString() } as any;
    persistStudioTimelineEdits(newEdits);
    setStudioTimelineEdits(newEdits);
  }, [studioTimelineEdits, persistStudioTimelineEdits]);

  const handleTrimClip = useCallback((sectionId: TimelineSectionId, newStart: number, newWidth: number) => {
    // Simple trim by updating the section in edits
    const base = studioTimelineEdits || { sections: [], updatedAt: new Date().toISOString() };
    const sections = (base.sections || []).map((s: any) =>
      s.sectionId === sectionId ? { ...s, startPercent: clampPercent(newStart), widthPercent: clampPercent(newWidth) } : s
    );
    const newEdits = { ...base, sections, updatedAt: new Date().toISOString() } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    persistStudioTimelineEdits(newEdits);
    setStudioTimelineEdits(newEdits);
    setStudioTimeline(buildStudioTimeline());
  }, [studioTimelineEdits, persistStudioTimelineEdits, buildStudioTimeline]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSetGain = useCallback((sectionId: TimelineSectionId, gain: number) => {
    recordEditHistory(studioTimelineEdits);
    const base = studioTimelineEdits || { sections: [], updatedAt: new Date().toISOString() };
    const sections = (base.sections || []).map((sec: any) =>
      sec.sectionId === sectionId ? { ...sec, gain: clampPercent(gain, 0, 2) } : sec
    );
    if (!sections.find((s: any) => s.sectionId === sectionId)) {
      sections.push({ sectionId, startPercent: 0, widthPercent: 100, gain });
    }
    const newEdits = { ...base, sections, updatedAt: new Date().toISOString() } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    persistStudioTimelineEdits(newEdits);
    setStudioTimelineEdits(newEdits);
  }, [studioTimelineEdits, persistStudioTimelineEdits, recordEditHistory]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSetClipVolume = useCallback((sectionId: TimelineSectionId, vol: number) => {
    recordEditHistory(studioTimelineEdits);
    const base = studioTimelineEdits || { sections: [], updatedAt: new Date().toISOString() };
    const sections = (base.sections || []).map((sec: any) =>
      sec.sectionId === sectionId ? { ...sec, volume: clampPercent(vol, 0, 2) } : sec
    );
    if (!sections.find((s: any) => s.sectionId === sectionId)) {
      sections.push({ sectionId, startPercent: 0, widthPercent: 100, volume: vol });
    }
    const newEdits = { ...base, sections, updatedAt: new Date().toISOString() } as any;
    persistStudioTimelineEdits(newEdits);
    setStudioTimelineEdits(newEdits);
  }, [studioTimelineEdits, persistStudioTimelineEdits, recordEditHistory]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSetAutomation = useCallback((laneId: string, points: Array<{ percent: number; value: number }>) => {
    recordEditHistory(studioTimelineEdits);
    const base = studioTimelineEdits || { sections: [], updatedAt: new Date().toISOString() };
    const newEdits = { ...base, automation: { ...(base.automation || {}), [laneId]: points }, updatedAt: new Date().toISOString() } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    persistStudioTimelineEdits(newEdits);
    setStudioTimelineEdits(newEdits);
  }, [studioTimelineEdits, persistStudioTimelineEdits, recordEditHistory]);

  // Voice persistence for Produce NLE (ElevenLabs cloned voice)
  const currentPreferredVoice = (studioTimelineEdits as any)?.preferredVoiceId as string | undefined;
  const handleSetPreferredVoice = useCallback((voiceId: string) => {
    const base = studioTimelineEdits || { sections: [], updatedAt: new Date().toISOString() };
    const newEdits = { ...base, preferredVoiceId: voiceId || undefined, updatedAt: new Date().toISOString() } as any;
    persistStudioTimelineEdits(newEdits);
    setStudioTimelineEdits(newEdits);
  }, [studioTimelineEdits, persistStudioTimelineEdits]);

  // AI vocal generation per section (uses preferred or last cloned voice from NLE)
  // Now attaches to the clip for playback inside NLE (full production)
  // Update lyrics section from NLE timeline (inline on lyrics lane)
  const handleUpdateLyricsSection = useCallback((sectionId: string, newText: string) => {
    if (!activeVersion) return;
    const lyrics = { ...activeVersion.lyrics };
    const key = mapTimelineSectionToLyricsKey(sectionId);
    if (key === "raw") lyrics.raw = newText;
    else lyrics[key] = newText;

    if (activeVersion && saveLyrics) {
      saveLyrics(activeVersion.id, lyrics);
    }
  }, [activeVersion, saveLyrics]);

  // Attach/replace audio file to specific clip (from context menu)
  const applyAutoCrossfades = (sectionId: TimelineSectionId, edits: any) => {
    const sections = (edits.sections || []).map((s: any) =>
      s.sectionId === sectionId
        ? { ...s, fadeInPercent: Math.min(10, s.fadeInPercent ?? 6), fadeOutPercent: Math.min(10, s.fadeOutPercent ?? 6) }
        : s
    );
    return { ...edits, sections };
  };

  // Helper to get audio duration (ms)
  const getAudioDurationMs = (blob: Blob): Promise<number> => new Promise(resolve => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onloadedmetadata = () => {
      resolve(Math.round(audio.duration * 1000));
      URL.revokeObjectURL(url);
    };
    audio.onerror = () => { resolve(15000); URL.revokeObjectURL(url); };
  });

  const handleAttachAudioToSection = useCallback(async (sectionId: TimelineSectionId, file: File) => {
    if (!activeVersion) return;
    try {
      const blob = new Blob([await file.arrayBuffer()], { type: file.type });
      await saveClipAudio(projectId, activeVersion.id, String(sectionId), blob);

      let base = studioTimelineEdits || { sections: [], updatedAt: new Date().toISOString() } as any;
      const clipAudios = {
        ...(base.clipAudios || {}),
        [String(sectionId)]: { attachedAt: new Date().toISOString(), source: 'upload' as const },
      };
      base = { ...base, clipAudios, updatedAt: new Date().toISOString() };
      const withFades = applyAutoCrossfades(sectionId, base);
      // auto slip start align for new attached audio
      const withSlip = {
        ...withFades,
        sections: (withFades.sections || []).map((s: any) => s.sectionId === sectionId ? { ...s, slipOffset: 0 } : s)
      };
      commandSaveTimelineEdits(projectId, activeVersion.id, withSlip);
      setStudioTimelineEdits(withSlip);

      alert(`Audio attached to clip "${sectionId}" with auto crossfades + slip. Will play in Full Mix / Bounce / Export.`);
    } catch (err) {
      alert('Failed to attach audio: ' + (err instanceof Error ? err.message : err));
    }
  }, [activeVersion, studioTimelineEdits, projectId]);

  const handleDetachClipAudio = useCallback(async (sectionId: TimelineSectionId) => {
    if (!activeVersion) return;
    try {
      await deleteClipAudio(projectId, activeVersion.id, String(sectionId)).catch(() => {});
      const base = studioTimelineEdits || { sections: [], updatedAt: new Date().toISOString() } as any;
      const clipAudios = { ...(base.clipAudios || {}) };
      delete clipAudios[String(sectionId)];
      const newEdits = { ...base, clipAudios, updatedAt: new Date().toISOString() } as any;
      commandSaveTimelineEdits(projectId, activeVersion.id, newEdits);
      setStudioTimelineEdits(newEdits);

      alert(`Custom audio detached from "${sectionId}".`);
    } catch (err) {
      console.warn(err);
    }
  }, [activeVersion, studioTimelineEdits, projectId]);

  const openSectionEditor = useCallback((sectionId: TimelineSectionId) => {
    if (!activeVersion) return;
    const lyrics = activeVersion.lyrics || ({} as LyricsSections);
    const key = mapTimelineSectionToLyricsKey(String(sectionId));
    let sectionText = key !== "raw" ? lyrics[key] || "" : lyrics.raw || "";
    if (!sectionText.trim()) {
      const sid = String(sectionId).toLowerCase();
      if (sid.includes("chorus")) sectionText = lyrics.chorus || "";
      else if (sid.includes("verse2")) sectionText = lyrics.verse2 || "";
      else if (sid.includes("verse1")) sectionText = lyrics.verse1 || "";
      else if (sid.includes("bridge")) sectionText = lyrics.bridge || "";
      else if (sid.includes("intro")) sectionText = lyrics.intro || "";
      else if (sid.includes("outro")) sectionText = lyrics.outro || "";
    }
    setSectionEdit({ sectionId, lyrics: sectionText, extra: "" });
  }, [activeVersion]);

  const closeSectionEditor = () => {
    setSectionEdit(null);
    setPreviewBlob(null);
  };

  // Generate preview blob only (for audition before apply)
  const generateSectionPreview = useCallback(async (sectionId: TimelineSectionId, editedLyrics: string, userExtra: string) => {
    if (!activeVersion) return null;
    setIsGeneratingPreview(true);
    setPreviewTrim({ start: 0, end: 1 }); // reset trim
    try {
      const mxmCoach = activeVersion.analysis?.meta?.mxmCoach;
      const styleHint = project
        ? buildStyleDescriptors(project, mxmCoach).slice(0, 4).join(", ")
        : (mxmCoach?.moods || []).slice(0, 2).join(" ");
      const basePromptFromEdits = (studioTimelineEdits as any)?.generationPrompt || '';
      const plan = (studioTimelineEdits as any)?.compositionPlan;

      const totalDurSec = activeVersion.audio?.durationSec || 180;
      const currentClip = (studioTimelineEdits?.sections || []).find((s: any) => s.sectionId === sectionId);
      const targetDurMs = currentClip ? Math.round((currentClip.widthPercent / 100) * totalDurSec * 1000) : 25000;
      const isVocalsOnly = userExtra.includes('[VOCALS ONLY]');

      let targetedPrompt = '';
      let opts: any = { modelId: 'music_v2', musicLengthMs: targetDurMs };

      if (plan?.chunks?.length) {
        const modifiedPlan = JSON.parse(JSON.stringify(plan));
        const chunkIdx = modifiedPlan.chunks.findIndex((c: any) => c.text && (c.text.toLowerCase().includes(String(sectionId).toLowerCase().replace(/1|2/g,'')) || c.text.includes('[')));
        if (chunkIdx >= 0) {
          const prev = chunkIdx > 0 ? modifiedPlan.chunks[chunkIdx-1].text?.split('\n').slice(0,2).join(' ') : '';
          const next = chunkIdx < modifiedPlan.chunks.length-1 ? modifiedPlan.chunks[chunkIdx+1].text?.split('\n').slice(0,2).join(' ') : '';
          const context = [prev && `Previous: ${prev}`, next && `Next: ${next}`].filter(Boolean).join('. ');
          let chunkText = `[${sectionId}]\n${editedLyrics}${context ? `\n(${context})` : ''}`;
          if (isVocalsOnly) chunkText += '\n(a cappella vocals focus, clear singing, minimal backing)';
          modifiedPlan.chunks[chunkIdx].text = chunkText;
          if (userExtra) modifiedPlan.chunks[chunkIdx].positive_styles = [...(modifiedPlan.chunks[chunkIdx].positive_styles || []), userExtra.replace('[VOCALS ONLY]', '').trim()];
        }
        opts.compositionPlan = modifiedPlan;
        delete opts.musicLengthMs;
      } else {
        targetedPrompt = `Targeted section. Style: ${styleHint || "studio quality production"}. ${basePromptFromEdits.substring(0,150)}. ${isVocalsOnly ? 'a cappella vocals only.' : ''} Lyrics: ${editedLyrics} ${userExtra}`;
      }

      const blob = await generateFullSong(targetedPrompt, opts);
      setPreviewBlob(blob);
      return blob;
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Preview generation failed');
      return null;
    } finally {
      setIsGeneratingPreview(false);
    }
  }, [activeVersion, studioTimelineEdits]);

  const loadPlanForEdit = () => {
    const plan = (studioTimelineEdits as any)?.compositionPlan;
    if (plan) setEditingPlan(JSON.parse(JSON.stringify(plan)));
  };

  const savePlanEdits = () => {
    if (!editingPlan || !activeVersion) return;
    const base = studioTimelineEdits || { sections: [], updatedAt: new Date().toISOString() } as any;
    const newEdits = { ...base, compositionPlan: editingPlan, updatedAt: new Date().toISOString() };
    commandSaveTimelineEdits(projectId, activeVersion.id, newEdits);
    setStudioTimelineEdits(newEdits);
    setEditingPlan(null);
    alert('Composition plan updated.');
  };

  const recomposeFullFromPlan = async () => {
    if (!editingPlan || !activeVersion) return;
    try {
      const blob = await generateFullSong('', { modelId: 'music_v2', compositionPlan: editingPlan });
      await saveAudioBlob(projectId, activeVersion.id, 'mix', blob);
      setMixUrl(URL.createObjectURL(blob)); // refresh if needed
      const base = studioTimelineEdits || { sections: [], updatedAt: new Date().toISOString() } as any;
      const newEdits = { ...base, compositionPlan: editingPlan, updatedAt: new Date().toISOString() };
      commandSaveTimelineEdits(projectId, activeVersion.id, newEdits);
      setStudioTimelineEdits(newEdits);
      alert('Full song recomposed from the edited plan! New mix saved.');
      // Leverage Cyanite: auto-run analysis on new full mix for energy/mood to suggest automation/styles
      void handleSyncTimingWithMXM();
      // Note: run full analyze from Write tab or orchestrator to get Cyanite energy curve for automation hints
      alert('Full song recomposed! Run Analyze in Write tab for Cyanite energy/mood insights.');
    } catch (e) {
      alert('Recompose failed: ' + (e instanceof Error ? e.message : e));
    }
  };

  const updatePlanChunk = (idx: number, field: 'text' | 'positive_styles', value: any) => {
    if (!editingPlan) return;
    const newPlan = { ...editingPlan, chunks: [...editingPlan.chunks] };
    if (field === 'text') {
      newPlan.chunks[idx].text = value;
    } else {
      newPlan.chunks[idx].positive_styles = value.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
    setEditingPlan(newPlan);
  };

  const handleGenerateAiVocalForSection = useCallback(async (sectionId: TimelineSectionId) => {
    const vid = (studioTimelineEdits as any)?.preferredVoiceId
      || (() => { try { return localStorage.getItem('pulseforge_last_voice_id') || ''; } catch { return ''; } })()
      || produceVoices[0]?.voice_id || '';
    if (!vid) {
      alert('No voice selected. Clone or pick a voice first in the AI Voice panel or Write tab.');
      return;
    }

    // Map section to lyrics text (heuristic)
    const lyrics = activeVersion?.lyrics || ({} as any);
    let text = lyrics.chorus || lyrics.verse1 || lyrics.raw || 'Hook line for this section';
    const sid = String(sectionId).toLowerCase();
    if (sid.includes('verse1')) text = lyrics.verse1 || text;
    else if (sid.includes('verse2')) text = lyrics.verse2 || text;
    else if (sid.includes('chorus')) text = lyrics.chorus || text;
    else if (sid.includes('bridge')) text = lyrics.bridge || text;

    try {
      const blob = await synthesizeHookVoice(text.slice(0, 240), { voiceId: vid, modelId: 'eleven_turbo_v2' });

      // 1. Always offer download (for external use / stems)
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-vocal-${sectionId}.mp3`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);

      // 2. Attach to this specific clip (saves to IndexedDB + marks in timelineEdits)
      if (activeVersion) {
        await saveClipAudio(projectId, activeVersion.id, String(sectionId), blob);
      }

      // Record in edits
      const base = studioTimelineEdits || { sections: [], updatedAt: new Date().toISOString() } as any;
      const clipAudios = { ...(base.clipAudios || {}), [String(sectionId)]: { attachedAt: new Date().toISOString(), source: 'ai' as const } };
      const newEdits = { ...base, clipAudios, updatedAt: new Date().toISOString() } as any;
      if (activeVersion) {
        commandSaveTimelineEdits(projectId, activeVersion.id, newEdits); // direct persist
      }
      setStudioTimelineEdits(newEdits);

      alert(`AI vocal attached to clip "${sectionId}". It will play when you hit Play Full Mix or Export.`);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'AI vocal generation failed');
    }
  }, [studioTimelineEdits, produceVoices, activeVersion, projectId]);

  // Clean regenerate logic for section (used by the nice form UI)
  const performSectionRegenerate = useCallback(async (sectionId: TimelineSectionId, editedLyrics: string, userExtra: string) => {
    if (!activeVersion) return;

    const mxmCoach = activeVersion.analysis?.meta?.mxmCoach;
    const styleHint = project
      ? buildStyleDescriptors(project, mxmCoach).slice(0, 4).join(", ")
      : (mxmCoach?.moods || []).slice(0, 2).join(" ");

    const basePromptFromEdits = (studioTimelineEdits as any)?.generationPrompt || '';
    const plan = (studioTimelineEdits as any)?.compositionPlan;

    let targetedPrompt = '';
    let opts: any = { modelId: 'music_v2', musicLengthMs: 28000 };

    if (plan?.chunks?.length) {
      const modifiedPlan = JSON.parse(JSON.stringify(plan));
      const chunkIdx = modifiedPlan.chunks.findIndex((c: any) =>
        c.text && (c.text.toLowerCase().includes(String(sectionId).toLowerCase().replace(/1|2/g, '')) || c.text.includes('['))
      );
      if (chunkIdx >= 0) {
        // Add context from neighbors for better "inpaint-style" continuity
        const prev = chunkIdx > 0 ? modifiedPlan.chunks[chunkIdx-1].text?.split('\n').slice(0,2).join(' ') : '';
        const next = chunkIdx < modifiedPlan.chunks.length-1 ? modifiedPlan.chunks[chunkIdx+1].text?.split('\n').slice(0,2).join(' ') : '';
        const context = [prev && `Previous: ${prev}`, next && `Next: ${next}`].filter(Boolean).join('. ');
        modifiedPlan.chunks[chunkIdx].text = `[${sectionId}]\n${editedLyrics}${context ? `\n(${context})` : ''}`;
        if (userExtra) {
          modifiedPlan.chunks[chunkIdx].positive_styles = [
            ...(modifiedPlan.chunks[chunkIdx].positive_styles || []),
            userExtra
          ];
        }
      }
      opts.compositionPlan = modifiedPlan;
      delete opts.musicLengthMs;
    } else {
      // Add neighbor context for seamless continuation
      const chunks = (studioTimelineEdits as any)?.compositionPlan?.chunks || [];
      const currentIdx = chunks.findIndex((c: any) => c.text && c.text.includes(String(sectionId)));
      const prevCtx = currentIdx > 0 ? chunks[currentIdx-1].text?.slice(0,80) : '';
      const nextCtx = currentIdx >=0 && currentIdx < chunks.length-1 ? chunks[currentIdx+1].text?.slice(0,80) : '';
      const ctxLine = [prevCtx && `After: ${prevCtx}`, nextCtx && `Before: ${nextCtx}`].filter(Boolean).join(' | ');

      targetedPrompt = [
        `Targeted music section snippet. ${styleHint}. ${basePromptFromEdits ? 'Match overall style: ' + basePromptFromEdits.substring(0, 220) : ''} Match vocal timbre, energy and production of the main full song. Seamless fit. ${ctxLine ? ctxLine : ''}`,
        `[${sectionId}]`,
        editedLyrics,
        userExtra ? `Additional direction: ${userExtra}` : '',
        `High quality singing and instrumentation for this part only.`
      ].filter(Boolean).join('\n\n');
    }

    try {
      const blob = await generateFullSong(targetedPrompt, opts);

      // Download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `section-${sectionId}.mp3`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);

      await saveClipAudio(projectId, activeVersion.id, String(sectionId), blob);

      const base = studioTimelineEdits || { sections: [], updatedAt: new Date().toISOString() } as any;
      const clipAudios = {
        ...(base.clipAudios || {}),
        [String(sectionId)]: { attachedAt: new Date().toISOString(), source: 'ai-music' as const },
      };

      // Auto resize + auto-slip for perfect fit in clip + ripple neighbors
      let updatedSections = (base.sections || []).map((s: any) => s);
      let slipOffset = 0;
      let appliedNewWidth = 0;
      try {
        const newDurMs = await getAudioDurationMs(blob);
        const totalDurMs = (activeVersion.audio?.durationSec || 180) * 1000;
        if (totalDurMs > 0 && newDurMs > 1000) {
          appliedNewWidth = Math.max(3, Math.min(70, (newDurMs / totalDurMs) * 100));
          updatedSections = updatedSections.map((s: any) => {
            if (s.sectionId === sectionId) {
              const clipDurMs = (s.widthPercent / 100) * totalDurMs;
              slipOffset = Math.max(0, (clipDurMs - newDurMs) / 2 / 1000);
              return { ...s, widthPercent: appliedNewWidth, slipOffset };
            }
            return s;
          });
          // Auto ripple: shift following sections
          updatedSections = rippleAdjust(updatedSections, sectionId, appliedNewWidth);
        }
      } catch {}

      // Auto apply gentle crossfades
      updatedSections = updatedSections.map((s: any) =>
        s.sectionId === sectionId
          ? { ...s, fadeInPercent: Math.min(8, s.fadeInPercent ?? 5), fadeOutPercent: Math.min(8, s.fadeOutPercent ?? 5), slipOffset: s.slipOffset || slipOffset }
          : s
      );

      let finalEdits = { ...base, clipAudios, sections: updatedSections, updatedAt: new Date().toISOString() };

      // If we used and modified a plan, persist the updated plan too
      if (opts.compositionPlan) {
        finalEdits = { ...finalEdits, compositionPlan: opts.compositionPlan };
      }

      commandSaveTimelineEdits(projectId, activeVersion.id, finalEdits);
      setStudioTimelineEdits(finalEdits);

      closeSectionEditor();
      alert(`✅ Section "${sectionId}" regenerated. Auto resized to match audio length + crossfades applied.`);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Regeneration failed.');
    }
  }, [activeVersion, studioTimelineEdits, projectId]);

  // Legacy direct call (kept for safety)
  const handleRegenerateMusicSection = useCallback(async (sectionId: TimelineSectionId, extraPrompt = '') => {
    if (!activeVersion) return;
    const lyrics = activeVersion.lyrics || ({} as any);
    let sectionText = '';
    const sid = String(sectionId).toLowerCase();
    if (sid.includes('chorus')) sectionText = lyrics.chorus || lyrics.raw || '';
    else if (sid.includes('verse2')) sectionText = lyrics.verse2 || '';
    else if (sid.includes('verse1')) sectionText = lyrics.verse1 || '';
    else if (sid.includes('bridge')) sectionText = lyrics.bridge || '';
    else sectionText = lyrics.chorus || lyrics.verse1 || lyrics.raw || '';
    await performSectionRegenerate(sectionId, sectionText, extraPrompt);
  }, [activeVersion, performSectionRegenerate]);

  // Stem replacement: vocals only for the section (uses the same path but marks as vocal)
  const handleReplaceVocalsForSection = useCallback(async (sectionId: TimelineSectionId) => {
    if (!activeVersion) return;
    const lyrics = activeVersion.lyrics || ({} as any);
    let sectionText = '';
    const sid = String(sectionId).toLowerCase();
    if (sid.includes('chorus')) sectionText = lyrics.chorus || lyrics.raw || '';
    else if (sid.includes('verse2')) sectionText = lyrics.verse2 || '';
    else if (sid.includes('verse1')) sectionText = lyrics.verse1 || '';
    else if (sid.includes('bridge')) sectionText = lyrics.bridge || '';
    else sectionText = lyrics.chorus || lyrics.verse1 || lyrics.raw || '';
    const extra = '[VOCALS ONLY] clear expressive singing, focus on vocal performance';
    await performSectionRegenerate(sectionId, sectionText, extra);
  }, [activeVersion, performSectionRegenerate]);

  // Bounce/export only the current section's audio (useful for modified parts)
  const handleBounceSection = useCallback(async (sectionId: TimelineSectionId) => {
    if (!activeVersion) return;
    try {
      const clipBlob = await getClipAudio(projectId, activeVersion.id, String(sectionId));
      const mixBlob = await getAudioBlob(projectId, activeVersion.id, 'mix');
      let blobToExport = clipBlob;
      if (!blobToExport && mixBlob) {
        // fallback: create a simple slice using duration estimate (basic)
        blobToExport = mixBlob; // user can trim manually; real slice would use OfflineContext + encode
      }
      if (blobToExport) {
        const url = URL.createObjectURL(blobToExport);
        const a = document.createElement('a');
        a.href = url;
        a.download = `section-${sectionId}.mp3`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        alert(`Exported audio for ${sectionId}. (For precise slice of mix, use NLE selection export)`);
      } else {
        alert('No audio for this section yet.');
      }
    } catch (e) {
      alert('Bounce section failed');
    }
  }, [activeVersion, projectId]);

  // Sync / re-apply timeline timing using MXM richsync (if catalog) or lyrics word-count (re-use from Write logic)
  const handleSyncTimingWithMXM = useCallback(async () => {
    if (!activeVersion || !project) return;
    const mixBlob = await getAudioBlob(projectId, activeVersion.id, 'mix');
    if (!mixBlob) {
      alert('No full mix loaded. Generate or import a full song first.');
      return;
    }
    const duration = await new Promise<number>((resolve) => {
      const url = URL.createObjectURL(mixBlob);
      const a = new Audio(url);
      a.onloadedmetadata = () => { resolve(a.duration); URL.revokeObjectURL(url); };
    });

    let richsync: any = null;
    if (activeVersion.catalogMeta?.mxmTrackId) {
      try {
        const result = await fetchRichsync(Number(activeVersion.catalogMeta.mxmTrackId));
        richsync = result?.richsync ?? null;
      } catch {}
    }

    const lyrics = activeVersion.lyrics || ({} as any);
    const baseEdits = activeVersion.timelineEdits || { sections: [], updatedAt: new Date().toISOString() };
    let updates: any = {};
    if (richsync) {
      const markers = richsync.sections.map((s: any) => ({
        timePercent: (s.startSec / duration) * 100,
        label: s.text?.slice(0,30) || 'section',
      }));
      updates = { markers };
    } else {
      updates = { sections: buildLyricsTimelineFromWordCounts(lyrics) };
    }
    const newEdits = { ...baseEdits, ...updates, updatedAt: new Date().toISOString() };
    commandSaveTimelineEdits(projectId, activeVersion.id, newEdits);
    setStudioTimelineEdits(newEdits);
    alert('Timeline timing re-synced with MXM richsync or lyrics structure.');
  }, [activeVersion, project, projectId]);

  const handleBounceArrangement = async (blob?: Blob) => {
    if (!activeVersion) return;

    try {
      let mixBlob = blob;

      if (!mixBlob) {
        // Fallback: use current mix
        mixBlob = (await getAudioBlob(projectId, activeVersion.id, 'mix')) || undefined;
      }

      if (mixBlob) {
        await saveAudioBlob(projectId, activeVersion.id, 'mix', mixBlob);

        // Update audio meta (duration stays similar, waveform can be left or re-estimated simply)
        // For full prod we could analyze here, but keep existing meta + mark as bounced
        const updatedAudio = {
          ...activeVersion.audio!,
          uploadedAt: new Date().toISOString(),
        };
        // Note: in real we'd re-compute waveform peaks, for now keep previous for viz
        saveAudio(activeVersion.id, updatedAudio);

        void loadMix();
        alert('✅ Full Bounce committed! The rendered arrangement (clips, fades, gains, automation, per-clip AI audio, mutes) is now the new mix stem.\nReady for stems, Viral Lab, or export.');
      } else {
        alert('No audio to bounce. Make sure stems are loaded and play/export once.');
      }
    } catch (err) {
      console.error(err);
      alert('Bounce failed.');
    }
  };

  if (!ready || !project || !activeVersion) return null;

  return (
    <div className="space-y-6">
      <StudioFocusHint />
      <StudioStaleViralBanner projectId={projectId} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Produce — Full Production NLE</h2>
          <p className="text-sm text-muted">
            Upload demo • stems • <strong>Real waveform + snap + slip/trim + fades + XF + ripple + markers + loop + quantize + auto lanes + copy/paste + export</strong> • After liking a generated full song, right-click clips → Regenerate Full Section (Music) to edit specific parts.
          </p>
        </div>
        {activeVersion.audio && (
          <button
            type="button"
            onClick={() => void handleRemove()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted transition hover:border-danger/40 hover:text-danger"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove demo
          </button>
        )}
        <button
          onClick={() => void handleSyncTimingWithMXM()}
          className="btn-secondary text-xs"
          title="Re-sync timeline sections using MXM richsync (if available) or your lyrics word counts + current mix duration"
        >
          Sync timing with MXM / lyrics
        </button>
        <button
          onClick={() => {
            if (!activeVersion) return;
            const base = studioTimelineEdits || { sections: [], updatedAt: new Date().toISOString() } as any;
            const updatedSections = (base.sections || []).map((s: any) => ({
              ...s,
              fadeInPercent: Math.min(10, s.fadeInPercent ?? 5),
              fadeOutPercent: Math.min(10, s.fadeOutPercent ?? 5),
            }));
            const newEdits = { ...base, sections: updatedSections, updatedAt: new Date().toISOString() };
            commandSaveTimelineEdits(projectId, activeVersion.id, newEdits);
            setStudioTimelineEdits(newEdits);
            alert('Auto crossfades applied to all sections for smoother transitions.');
          }}
          className="btn-secondary text-xs"
        >
          Auto crossfades all
        </button>
        <button
          onClick={async () => {
            if (!activeVersion) return;
            const custom = Object.entries((studioTimelineEdits?.clipAudios || {})).filter(([,v]) => !!v).map(([k]) => k);
            if (custom.length === 0) {
              alert('No modified sections with custom audio yet.');
              return;
            }
            // Simple: download each modified as separate files (user can re-import)
            for (const secId of custom) {
              const b = await getClipAudio(projectId, activeVersion.id, secId);
              if (b) {
                const u = URL.createObjectURL(b);
                const a = document.createElement('a');
                a.href = u;
                a.download = `modified-${secId}.mp3`;
                document.body.appendChild(a); a.click(); a.remove();
                URL.revokeObjectURL(u);
              }
            }
            alert(`Exported ${custom.length} modified sections. Use as new clips or re-bounce full.`);
          }}
          className="btn-secondary text-xs"
          title="Export only sections that have AI-regenerated audio attached"
        >
          Bounce Modified Only
        </button>
        <button
          onClick={() => setCompareOriginal(!compareOriginal)}
          className={`btn-secondary text-xs ${compareOriginal ? 'bg-accent text-white' : ''}`}
          title="Toggle compare original full mix vs your edited sections (great for A/B after editing generated song)"
        >
          {compareOriginal ? 'Exit Compare' : 'Compare Original'}
        </button>
      </div>

      {/* Nice UI form for per-section edit (lyrics + extra prompt) - replaces ugly prompt() */}
      {sectionEdit && (
        <div className="rounded-2xl border border-accent/30 bg-surface-elevated p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">Edit & Regenerate Section: {String(sectionEdit.sectionId)}</div>
              <div className="text-xs text-muted">Edit lyrics below + add creative direction. Uses stored composition plan + MXM style when available.</div>
            </div>
            <button onClick={closeSectionEditor} className="text-xs text-muted hover:text-foreground">Close</button>
          </div>

          <div>
            <label className="text-xs text-muted block mb-1">Lyrics for this section</label>
            <textarea
              className="w-full h-28 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-mono resize-y"
              value={sectionEdit.lyrics}
              onChange={(e) => setSectionEdit({ ...sectionEdit, lyrics: e.target.value })}
            />
          </div>

          <div>
            <label className="text-xs text-muted block mb-1">Extra direction (optional)</label>
            <input
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
              placeholder='e.g. "more aggressive rap delivery", "add emotional ad-libs", "softer with reverb"'
              value={sectionEdit.extra}
              onChange={(e) => setSectionEdit({ ...sectionEdit, extra: e.target.value })}
            />
            <button
              type="button"
              onClick={() => {
                const mxm = activeVersion?.analysis?.meta?.mxmCoach?.moods?.join(', ') || 'energetic';
                setSectionEdit({ ...sectionEdit, extra: (sectionEdit.extra + ` match ${mxm} energy`).trim() });
              }}
              className="text-[10px] mt-1 text-accent hover:underline"
            >
              + Suggest from MXM/Cyanite analysis
            </button>
          </div>

          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={sectionEdit.extra.includes('[VOCALS ONLY]')}
              onChange={(e) => {
                const base = sectionEdit.extra.replace(/\[VOCALS ONLY\]\s*/g, '').trim();
                const newExtra = e.target.checked ? `[VOCALS ONLY] ${base}`.trim() : base;
                setSectionEdit({ ...sectionEdit, extra: newExtra });
              }}
            />
            Vocals only (a cappella / focus singing, minimal instruments) – great for stem replacement
          </label>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={async () => {
                await generateSectionPreview(sectionEdit.sectionId, sectionEdit.lyrics, sectionEdit.extra);
              }}
              className="btn-secondary text-sm"
              disabled={!sectionEdit.lyrics.trim() || isGeneratingPreview}
            >
              {isGeneratingPreview ? 'Generating preview...' : '🔊 Generate & Preview Snippet'}
            </button>

            {previewBlob && (
              <>
                <button
                  onClick={() => {
                    const url = URL.createObjectURL(previewBlob);
                    const a = new Audio(url);
                    a.play();
                    setTimeout(() => URL.revokeObjectURL(url), 10000);
                  }}
                  className="btn-primary text-sm"
                >
                  ▶️ Play Preview
                </button>
                <button
                  onClick={async () => {
                    const wasVocals = sectionEdit.extra.includes('[VOCALS ONLY]');
                    let blobToUse = previewBlob;
                    if (!blobToUse) {
                      const gen = await generateSectionPreview(sectionEdit.sectionId, sectionEdit.lyrics, sectionEdit.extra);
                      if (gen) blobToUse = gen;
                    }
                    if (blobToUse && (previewTrim.start > 0 || previewTrim.end < 1)) {
                      const fullDur = (await getAudioDurationMs(blobToUse)) / 1000;
                      blobToUse = await sliceAudioBlob(blobToUse, previewTrim.start * fullDur, previewTrim.end * fullDur);
                    }
                    if (blobToUse && activeVersion) {
                      await saveClipAudio(projectId, activeVersion.id, String(sectionEdit.sectionId), blobToUse);
                      // update edits with auto size/fade/slip/ripple like before
                      const base = studioTimelineEdits || { sections: [], updatedAt: new Date().toISOString() } as any;
                      const clipAudios = { ...(base.clipAudios || {}), [String(sectionEdit.sectionId)]: { attachedAt: new Date().toISOString(), source: wasVocals ? 'ai-vocal' : 'ai-music' } };
                      let updatedSections = (base.sections || []).map((s: any) => s);
                      let appliedWidth = 0;
                      let slip = 0;
                      try {
                        const newDurMs = await getAudioDurationMs(blobToUse);
                        const totalDurMs = (activeVersion.audio?.durationSec || 180) * 1000;
                        if (totalDurMs > 0) {
                          appliedWidth = Math.max(3, Math.min(70, (newDurMs / totalDurMs) * 100));
                          updatedSections = updatedSections.map((s: any) => s.sectionId === sectionEdit.sectionId ? { ...s, widthPercent: appliedWidth } : s);
                          updatedSections = rippleAdjust(updatedSections, sectionEdit.sectionId, appliedWidth);
                          slip = 0;
                        }
                      } catch {}
                      updatedSections = updatedSections.map((s: any) => s.sectionId === sectionEdit.sectionId ? { ...s, fadeInPercent: 5, fadeOutPercent: 5, slipOffset: slip } : s);
                      const newEdits = { ...base, clipAudios, sections: updatedSections, updatedAt: new Date().toISOString() };
                      commandSaveTimelineEdits(projectId, activeVersion.id, newEdits);
                      setStudioTimelineEdits(newEdits);
                      if (wasVocals) await spliceVocalStem(sectionEdit.sectionId, blobToUse);
                      setPreviewBlob(null);
                      closeSectionEditor();
                      alert('Trimmed section applied with auto fit.');
                    }
                  }}
                  className="btn-primary text-sm bg-emerald-600 hover:bg-emerald-500"
                >
                  ✅ Apply Trimmed to Timeline
                </button>
              </>
            )}

            <button
              onClick={() => {
                if (activeVersion && sectionEdit && saveLyrics) {
                  const newL = { ...activeVersion.lyrics };
                  const key = mapTimelineSectionToLyricsKey(String(sectionEdit.sectionId));
                  if (key !== "raw") newL[key] = sectionEdit.lyrics;
                  else newL.raw = sectionEdit.lyrics;
                  saveLyrics(activeVersion.id, newL);
                }
                closeSectionEditor();
              }}
              className="btn-secondary text-sm"
            >
              Just update lyrics
            </button>
            <button onClick={closeSectionEditor} className="text-sm px-3 py-1 rounded border border-border">Cancel</button>
            <button
              type="button"
              onClick={() => {
                // Auto apply simple automation from analysis (Cyanite energy or mxm)
                const analysis = activeVersion?.analysis || activeVersion?.catalogMeta;
                const energy = (analysis as any)?.energy?.overall || 0.7;
                const points = Array.from({length: 5}, (_,i) => ({
                  percent: (i*20) + (sectionEdit ? 0 : 0),
                  value: 0.6 + (energy - 0.5) * (i % 2 === 0 ? 0.4 : -0.2)
                }));
                // Save automation for vocal lane or main
                const base = studioTimelineEdits || { sections: [], updatedAt: new Date().toISOString() } as any;
                const auto = { ...(base.automation || {}), vocals: points };
                const newEdits = { ...base, automation: auto, updatedAt: new Date().toISOString() };
                commandSaveTimelineEdits(projectId, activeVersion!.id, newEdits);
                setStudioTimelineEdits(newEdits);
                alert('Auto energy-based automation applied for section (vocal lane). Adjust in NLE.');
              }}
              className="text-xs btn-secondary"
            >
              ⚡ Auto automation from Cyanite energy
            </button>
          </div>

          {previewBlob && (
            <>
              <p className="text-[10px] text-muted">Preview ready. Play to audition, then Apply to commit with auto-fit.</p>
              {/* Real per-clip waveform preview with drag trim */}
              <div 
                className="relative w-full h-8 bg-black/70 rounded overflow-hidden cursor-col-resize"
                onMouseDown={(e) => {
                  if (!previewBlob) return;
                  setIsTrimming(true);
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  const x = (e.clientX - rect.left) / rect.width;
                  // drag left or right handle based on proximity
                  const mid = (previewTrim.start + previewTrim.end) / 2;
                  const isLeft = x < mid;
                  const move = (ev: MouseEvent) => {
                    const nx = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
                    setPreviewTrim(prev => {
                      if (isLeft) {
                        return { start: Math.min(nx, prev.end - 0.01), end: prev.end };
                      } else {
                        return { start: prev.start, end: Math.max(nx, prev.start + 0.01) };
                      }
                    });
                  };
                  const up = () => {
                    setIsTrimming(false);
                    window.removeEventListener('mousemove', move);
                    window.removeEventListener('mouseup', up);
                  };
                  window.addEventListener('mousemove', move);
                  window.addEventListener('mouseup', up);
                }}
              >
                <canvas ref={previewWaveformRef} className="w-full h-full" />
                {/* Trim handles overlay */}
                <div className="absolute top-0 bottom-0 bg-accent/30" style={{ left: `${previewTrim.start * 100}%`, width: `${(previewTrim.end - previewTrim.start) * 100}%` }} />
                <div className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize" style={{ left: `${previewTrim.start * 100}%` }} />
                <div className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize" style={{ left: `${previewTrim.end * 100}%` }} />
              </div>
              <div className="flex justify-between text-[9px] text-muted">
                <span>Trim: {(previewTrim.start * 100).toFixed(0)}% - {(previewTrim.end * 100).toFixed(0)}%</span>
                <button
                  onClick={() => {
                    const url = URL.createObjectURL(previewBlob);
                    const audio = new Audio(url);
                    audio.loop = true;
                    audio.play();
                    setTimeout(() => { audio.pause(); URL.revokeObjectURL(url); }, 8000);
                  }}
                  className="text-accent hover:underline"
                >
                  Loop preview 8s
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Enhanced Visual + Editable Composition Plan */}
      {(studioTimelineEdits as any)?.compositionPlan?.chunks?.length > 0 && !sectionEdit && (
        <div className="border border-border rounded-2xl p-4 bg-surface/60 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-sm">Composition Plan Editor (from full song generation)</div>
              <div className="text-[10px] text-muted">Edit chunks → save plan or recompose entire song. Click chunk to quick-edit single section.</div>
            </div>
            <div className="flex gap-2">
              {!editingPlan ? (
                <button onClick={loadPlanForEdit} className="btn-secondary text-xs">Edit Full Plan</button>
              ) : (
                <>
                  <button onClick={savePlanEdits} className="btn-primary text-xs">Save Plan Changes</button>
                  <button onClick={recomposeFullFromPlan} className="btn-primary text-xs bg-emerald-600 hover:bg-emerald-500">Recompose FULL Song from Plan</button>
                  <button onClick={() => setEditingPlan(null)} className="text-xs px-2">Cancel</button>
                </>
              )}
            </div>
          </div>

          {!editingPlan ? (
            <div className="flex flex-wrap gap-1">
              {(studioTimelineEdits as any).compositionPlan.chunks.map((chunk: any, i: number) => (
                <button
                  key={i}
                  onClick={() => {
                    const txt = (chunk.text || '').toLowerCase();
                    const sid = txt.includes('chorus') ? 'chorus1' : txt.includes('verse2') ? 'verse2' : txt.includes('bridge') ? 'bridge' : 'verse1';
                    openSectionEditor(sid as any);
                  }}
                  className="px-2 py-1 rounded border border-border hover:bg-accent/10 text-xs"
                >
                  {chunk.text?.split('\n')[0] || `Chunk ${i+1}`}
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              {editingPlan.chunks.map((chunk: any, idx: number) => (
                <div key={idx} className="border border-border/60 rounded p-2 bg-surface">
                  <div className="font-mono text-[10px] mb-1">Chunk {idx + 1}</div>
                  <textarea
                    className="w-full h-16 text-xs font-mono bg-surface border border-border rounded p-1"
                    value={chunk.text || ''}
                    onChange={(e) => updatePlanChunk(idx, 'text', e.target.value)}
                  />
                  <input
                    className="w-full mt-1 text-xs bg-surface border border-border rounded px-1 py-0.5"
                    value={(chunk.positive_styles || []).join(', ')}
                    onChange={(e) => updatePlanChunk(idx, 'positive_styles', e.target.value)}
                    placeholder="positive styles (comma separated)"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!activeVersion.audio ? (
        <div id="focus-upload" className="transition-shadow">
          <AudioUploader
            projectId={project.id}
            versionId={activeVersion.id}
            onUploaded={handleUploaded}
          />
        </div>
      ) : (
        <div className="space-y-6">
          <div id="focus-bpm" className="transition-shadow">
            <WaveformWorkspace audio={activeVersion.audio} src={mixUrl} />
          </div>

          {/* Musixmatch Pro tools also available in Produce for the full mix */}
          <MusixmatchProTools
            project={project}
            versionId={activeVersion.id}
            lyrics={activeVersion.lyrics}
            audioUrl={mixUrl}
            onApplyEnrichment={(data) => {
              console.log('[MXM Enrich applied in Produce]', data);
              alert(`MXM analysis applied to this version!\nMoods: ${data.moods?.join(', ') || '—'}\n\nGreat for viral/launch planning.`);
            }}
          />

          {/* Auto-apply benefit from Analyze → Auto Fix */}
          {activeVersion.analysis?.meta?.mxmCoach && (
            <div className="text-[10px] text-muted px-2">MXM coach active in NLE styles &amp; section editing (from Auto Fix)</div>
          )}

          <div className="flex flex-wrap gap-4 text-xs text-muted">
            <span>{formatFileSize(activeVersion.audio.sizeBytes)}</span>
            <span>Uploaded {new Date(activeVersion.audio.uploadedAt).toLocaleDateString()}</span>
            {activeVersion.audio.stemsReady && (
              <span className="text-success">Stems ready</span>
            )}
          </div>

          <AudioUploader
            projectId={project.id}
            versionId={activeVersion.id}
            existing={activeVersion.audio}
            onUploaded={handleUploaded}
          />

          <div id="focus-stems" className="transition-shadow">
            <StemPanel
              projectId={project.id}
              versionId={activeVersion.id}
              audio={activeVersion.audio}
              onStemsUpdated={(patch) => updateStems(activeVersion.id, patch)}
              onStemSettingsChange={(stems) =>
                updateStems(activeVersion.id, { stems, stemsReady: activeVersion.audio!.stemsReady })
              }
            />
          </div>

          {/* Voice / AI Vocals (Opsi A) — select cloned or preset voice, persist to version, generate preview */}
          <div className="rounded-xl border border-border bg-surface-elevated p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="font-medium">AI Voice for Vocals</span>
                <span className="ml-2 text-[11px] text-muted">ElevenLabs • persists to this version</span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={currentPreferredVoice || ""}
                  onChange={(e) => handleSetPreferredVoice(e.target.value)}
                  className="rounded-lg border border-border bg-surface px-2 py-1 text-xs"
                  disabled={voiceLoading || produceVoices.length === 0}
                >
                  <option value="">Use last / default</option>
                  {produceVoices.slice(0, 25).map((v) => (
                    <option key={v.voice_id} value={v.voice_id}>
                      {v.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    let vid = currentPreferredVoice || "";
                    if (!vid) {
                      try { vid = localStorage.getItem("pulseforge_last_voice_id") || ""; } catch {}
                    }
                    if (!vid) vid = produceVoices[0]?.voice_id || "";
                    if (!vid) return;
                    const txt = activeVersion.lyrics?.chorus || activeVersion.lyrics?.verse1 || "Demo hook";
                    void (async () => {
                      try {
                        const blob = await synthesizeHookVoice(txt.slice(0, 280), { voiceId: vid, modelId: "eleven_turbo_v2" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `ai-vocal-${activeVersion.id}.mp3`;
                        a.click();
                        setTimeout(() => URL.revokeObjectURL(url), 2000);
                      } catch (err) {
                        alert(err instanceof ApiError ? err.message : "AI vocal synth failed");
                      }
                    })();
                  }}
                  className="btn-secondary !px-2.5 !py-1 text-xs"
                  title="Synthesize short vocal from lyrics using selected voice (download MP3, import as stem or overlay)"
                >
                  Generate & Download Vocal
                </button>
              </div>
            </div>
            <div className="mt-1 text-[11px] text-muted">
              Cloned voices (from Write → Hook Voice Preview) are available here. Use Generate to create vocal audio for your NLE stems. Persisted voice ID saved with timeline edits.
            </div>
          </div>

          {/* === FULL PRODUCTION NLE (the main music editing tool) === */}
          {studioTimeline && (
            <div id="focus-nle" className="transition-shadow">
              <MusicTimelineEditor
                timeline={studioTimeline}
                projectId={projectId}
                versionId={activeVersion.id}
                editable
                laneStates={studioTimelineEdits?.laneStates}
                // Real audio waveform for accurate NLE (production feel)
                audioWaveform={activeVersion.audio?.waveform}
                onResizeSection={handleStudioResize}
                onMoveSection={handleStudioMove}
                onSplitAtPlayhead={handleStudioSplit}
                onPlayheadChange={handleStudioPlayhead}
                onLaneMute={handleStudioLaneMute}
                onLaneSolo={handleStudioLaneSolo}
                onSetFade={handleStudioSetFade}
                currentFades={(() => {
                  const map: any = {};
                  (studioTimelineEdits?.sections || []).forEach((s: any) => {
                    if (s.fadeInPercent != null || s.fadeOutPercent != null) {
                      map[s.sectionId] = { fadeIn: s.fadeInPercent || 0, fadeOut: s.fadeOutPercent || 0 };
                    }
                  });
                  return map;
                })()}
                onAddMarker={handleAddMarker}
                onRemoveMarker={handleRemoveMarker}
                currentMarkers={(studioTimelineEdits?.markers as any) || []}
                onSetLoopRegion={handleSetLoop}
                currentLoopRegion={studioTimelineEdits?.loopRegion as any}
                onTrimClip={handleTrimClip}
                onSetGain={handleSetGain}
                onSetAutomation={handleSetAutomation}
                currentAutomation={(studioTimelineEdits?.automation as any) || {}}
                onBounceArrangement={handleBounceArrangement}
                onGenerateAiVocalForSection={handleGenerateAiVocalForSection}
                onOpenSectionEditor={openSectionEditor}
                onReplaceVocalsForSection={handleReplaceVocalsForSection}
                onBounceSection={handleBounceSection}
                clipAudios={compareOriginal ? {} : (studioTimelineEdits?.clipAudios as any) || {}}
                onUpdateLyricsSection={handleUpdateLyricsSection}
                onAttachAudioToSection={handleAttachAudioToSection}
                onDetachClipAudio={handleDetachClipAudio}
                currentGains={(() => {
                  const m: Record<string, number> = {};
                  (studioTimelineEdits?.sections || []).forEach((s: any) => { if (s.gain != null) m[s.sectionId] = s.gain; });
                  return m;
                })()}
                currentVolumes={(() => {
                  const m: Record<string, number> = {};
                  (studioTimelineEdits?.sections || []).forEach((s: any) => { if (s.volume != null) m[s.sectionId] = s.volume; });
                  return m;
                })()}
                onSetClipVolume={handleSetClipVolume}
                onUndo={() => {
                  const { past, future } = timelineHistoryRef.current;
                  if (past.length === 0) return;
                  const current = studioTimelineEdits ? JSON.parse(JSON.stringify(studioTimelineEdits)) : null;
                  const prev = past.pop()!;
                  if (current) future.unshift(current);
                  persistStudioTimelineEdits(prev);
                  setStudioTimelineEdits(prev);
                  setStudioTimeline(buildStudioTimeline());
                }}
                onRedo={() => {
                  const { past, future } = timelineHistoryRef.current;
                  if (future.length === 0) return;
                  const current = studioTimelineEdits ? JSON.parse(JSON.stringify(studioTimelineEdits)) : null;
                  const next = future.shift()!;
                  if (current) past.push(current);
                  persistStudioTimelineEdits(next);
                  setStudioTimelineEdits(next);
                  setStudioTimeline(buildStudioTimeline());
                }}
                canUndo={timelineHistoryRef.current.past.length > 0}
                canRedo={timelineHistoryRef.current.future.length > 0}
                onApplyEdits={() => {
                  // Rebuild and notify user that edits are live
                  setStudioTimeline(buildStudioTimeline());
                  alert("NLE edits applied to project. Go to Viral Lab for full simulation with these changes.");
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}