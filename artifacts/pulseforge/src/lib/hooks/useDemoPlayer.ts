
import { useCallback, useEffect, useRef, useState } from "react";

interface UseDemoPlayerOptions {
  src: string | null;
  duration: number;
}

export function useDemoPlayer({ src, duration }: UseDemoPlayerOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!src) {
      audioRef.current = null;
      setPlaying(false);
      setCurrentTime(0);
      return;
    }

    const audio = new Audio(src);
    audioRef.current = audio;

    const onEnded = () => setPlaying(false);
    const onPause = () => setPlaying(false);
    const onPlay = () => setPlaying(true);

    audio.addEventListener("ended", onEnded);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("play", onPlay);

    return () => {
      audio.pause();
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("play", onPlay);
      audioRef.current = null;
    };
  }, [src]);

  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    const tick = () => {
      if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) audio.pause();
    else void audio.play();
  }, [playing]);

  const seek = useCallback(
    (ratio: number) => {
      const audio = audioRef.current;
      if (!audio || !duration) return;
      const t = Math.max(0, Math.min(duration, ratio * duration));
      audio.currentTime = t;
      setCurrentTime(t);
    },
    [duration]
  );

  return { playing, currentTime, toggle, seek, progress: duration ? currentTime / duration : 0 };
}