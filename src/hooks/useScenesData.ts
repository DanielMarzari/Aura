'use client';
import { useCallback, useEffect, useState } from 'react';
import type { Scene, SceneDraft, Sound, Video } from '@/lib/types';

export function useScenesData() {
  const [scenes, setScenes] = useState<Scene[] | null>(null);
  const [videos, setVideos] = useState<Video[] | null>(null);
  const [sounds, setSounds] = useState<Sound[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [s, v, snd] = await Promise.all([
        fetch('/api/scenes').then(r => r.json()),
        fetch('/api/videos').then(r => r.json()),
        fetch('/api/sounds').then(r => r.json()),
      ]);
      setScenes(s.scenes);
      setVideos(v.videos);
      setSounds(snd.sounds);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const createScene = useCallback(async (draft: SceneDraft): Promise<Scene | null> => {
    const res = await fetch('/api/scenes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    if (!res.ok) {
      setError((await res.json().catch(() => ({})))?.error ?? `HTTP ${res.status}`);
      return null;
    }
    const { scene } = await res.json();
    setScenes(prev => (prev ? [...prev, scene] : [scene]));
    return scene as Scene;
  }, []);

  const deleteScene = useCallback(async (id: string): Promise<boolean> => {
    const res = await fetch(`/api/scenes/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      setError((await res.json().catch(() => ({})))?.error ?? `HTTP ${res.status}`);
      return false;
    }
    setScenes(prev => prev?.filter(s => s.id !== id) ?? prev);
    return true;
  }, []);

  return { scenes, videos, sounds, error, reload, createScene, deleteScene };
}
