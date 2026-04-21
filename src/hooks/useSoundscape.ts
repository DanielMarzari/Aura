'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Scene } from '@/lib/scenes';

type LayerState = {
  layerId: string;
  source: AudioBufferSourceNode;
  gain: GainNode;
};

export type SoundscapeStatus = 'idle' | 'loading' | 'playing' | 'error';

const CROSSFADE_SEC = 1.2;
const RAMP_SEC = 0.05;

export function useSoundscape() {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const layersRef = useRef<LayerState[]>([]);

  const [status, setStatus] = useState<SoundscapeStatus>('idle');
  const [currentScene, setCurrentScene] = useState<Scene | null>(null);
  const [volumes, setVolumes] = useState<Record<string, number>>({});
  const [master, setMaster] = useState(0.85);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const masterVolRef = useRef(0.85);
  const mutedRef = useRef(false);

  const ensureContext = () => {
    if (ctxRef.current) return ctxRef.current;
    const AC = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    const ctx: AudioContext = new AC!();
    ctxRef.current = ctx;
    const g = ctx.createGain();
    g.gain.value = mutedRef.current ? 0 : masterVolRef.current;
    g.connect(ctx.destination);
    masterRef.current = g;
    return ctx;
  };

  const loadScene = useCallback(async (scene: Scene) => {
    setStatus('loading');
    setError(null);
    try {
      const ctx = ensureContext();
      const masterGain = masterRef.current!;

      const oldLayers = layersRef.current;
      if (oldLayers.length) {
        const fadeEnd = ctx.currentTime + CROSSFADE_SEC;
        for (const l of oldLayers) {
          l.gain.gain.cancelScheduledValues(ctx.currentTime);
          l.gain.gain.setValueAtTime(l.gain.gain.value, ctx.currentTime);
          l.gain.gain.linearRampToValueAtTime(0, fadeEnd);
        }
        const toStop = oldLayers;
        setTimeout(() => {
          for (const l of toStop) {
            try { l.source.stop(); } catch {}
          }
        }, (CROSSFADE_SEC + 0.1) * 1000);
      }

      const loaded = await Promise.all(
        scene.layers.map(async l => {
          const res = await fetch(l.src);
          if (!res.ok) throw new Error(`Failed to load ${l.src}: ${res.status}`);
          const arr = await res.arrayBuffer();
          const buffer = await ctx.decodeAudioData(arr);
          return { layer: l, buffer };
        })
      );

      const initialVols: Record<string, number> = {};
      const newLayers: LayerState[] = [];
      const startAt = ctx.currentTime + 0.15;
      const fadeEnd = startAt + CROSSFADE_SEC;
      for (const { layer, buffer } of loaded) {
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        const gain = ctx.createGain();
        gain.gain.value = 0;
        source.connect(gain).connect(masterGain);
        const offset = Math.random() * buffer.duration;
        source.start(startAt, offset);
        const target = layer.defaultVolume;
        gain.gain.linearRampToValueAtTime(target, fadeEnd);
        initialVols[layer.id] = target;
        newLayers.push({ layerId: layer.id, source, gain });
      }

      layersRef.current = newLayers;
      setVolumes(initialVols);
      setCurrentScene(scene);
      setStatus('playing');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('Soundscape error:', msg);
      setError(msg);
      setStatus('error');
    }
  }, []);

  const setLayerVolume = useCallback((id: string, v: number) => {
    setVolumes(prev => ({ ...prev, [id]: v }));
    const ctx = ctxRef.current;
    const layer = layersRef.current.find(l => l.layerId === id);
    if (ctx && layer) {
      layer.gain.gain.cancelScheduledValues(ctx.currentTime);
      layer.gain.gain.linearRampToValueAtTime(v, ctx.currentTime + RAMP_SEC);
    }
  }, []);

  const setMasterVolume = useCallback((v: number) => {
    masterVolRef.current = v;
    setMaster(v);
    const ctx = ctxRef.current;
    const g = masterRef.current;
    if (ctx && g && !mutedRef.current) {
      g.gain.cancelScheduledValues(ctx.currentTime);
      g.gain.linearRampToValueAtTime(v, ctx.currentTime + RAMP_SEC);
    }
  }, []);

  const toggleMute = useCallback(() => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    const ctx = ctxRef.current;
    const g = masterRef.current;
    if (ctx && g) {
      g.gain.cancelScheduledValues(ctx.currentTime);
      g.gain.linearRampToValueAtTime(next ? 0 : masterVolRef.current, ctx.currentTime + 0.1);
    }
  }, []);

  useEffect(() => {
    return () => {
      for (const l of layersRef.current) {
        try { l.source.stop(); } catch {}
      }
      layersRef.current = [];
      ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
      masterRef.current = null;
    };
  }, []);

  return {
    status,
    error,
    currentScene,
    volumes,
    master,
    muted,
    loadScene,
    setLayerVolume,
    setMasterVolume,
    toggleMute,
  };
}
