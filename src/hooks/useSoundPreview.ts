'use client';
import { useEffect, useRef, useState } from 'react';

export function useSoundPreview() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingSrc, setPlayingSrc] = useState<string | null>(null);
  const fadeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const a = new Audio();
    a.loop = true;
    a.volume = 0;
    a.preload = 'auto';
    audioRef.current = a;
    return () => {
      a.pause();
      a.src = '';
      audioRef.current = null;
      if (fadeTimerRef.current) window.clearInterval(fadeTimerRef.current);
    };
  }, []);

  const play = (src: string) => {
    const a = audioRef.current;
    if (!a) return;
    if (fadeTimerRef.current) {
      window.clearInterval(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
    if (a.src !== new URL(src, window.location.origin).href) {
      a.pause();
      a.src = src;
      a.volume = 0;
    }
    setPlayingSrc(src);
    a.play().catch(() => {});
    // Fade in over 200ms
    fadeIn(a);
  };

  const stop = () => {
    const a = audioRef.current;
    if (!a) return;
    if (fadeTimerRef.current) {
      window.clearInterval(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
    // Fade out over 150ms then pause
    const start = a.volume;
    const steps = 8;
    let i = 0;
    const timer = window.setInterval(() => {
      i++;
      a.volume = Math.max(0, start * (1 - i / steps));
      if (i >= steps) {
        window.clearInterval(timer);
        a.pause();
        setPlayingSrc(null);
      }
    }, 20);
    fadeTimerRef.current = timer;
  };

  function fadeIn(a: HTMLAudioElement) {
    const target = 0.55;
    const steps = 10;
    let i = 0;
    const timer = window.setInterval(() => {
      i++;
      a.volume = Math.min(target, target * (i / steps));
      if (i >= steps) window.clearInterval(timer);
    }, 20);
    fadeTimerRef.current = timer;
  }

  return { play, stop, playingSrc };
}
