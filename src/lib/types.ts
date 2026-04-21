export type Video = {
  id: string;
  name: string;
  src: string;
  posterSrc: string | null;
  tags: string[];
  sortOrder: number;
};

export type Sound = {
  id: string;
  name: string;
  category: string;
  icon: string;
  src: string;
  durationSec: number;
  defaultVolume: number;
};

export type SceneLayer = {
  soundId: string;
  name: string;
  icon: string;
  src: string;
  volume: number;
  position: number;
};

export type Scene = {
  id: string;
  name: string;
  location: string | null;
  timeOfDay: string | null;
  videoId: string;
  videoSrc: string;
  posterSrc: string | null;
  layers: SceneLayer[];
  isBuiltin: boolean;
  sortOrder: number;
  createdAt: string;
};

export type SceneDraft = {
  name: string;
  location: string | null;
  timeOfDay: string | null;
  videoId: string;
  layers: { soundId: string; volume: number }[];
};

export const SUBTITLE = (s: Pick<Scene, 'location' | 'timeOfDay'>) => {
  const parts = [s.timeOfDay, s.location].filter(Boolean);
  return parts.join(' · ');
};
