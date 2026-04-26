export type Video = {
  id: string;
  name: string;
  src: string;
  posterSrc: string | null;
  tags: string[];
  regions: string[];
  sortOrder: number;
};

export type Sound = {
  id: string;
  name: string;
  group: string;
  category: string;
  icon: string;
  src: string;
  durationSec: number;
  defaultVolume: number;
  regions: string[];
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
  isFavorite: boolean;
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

export type SoundUpdate = Partial<Pick<Sound, 'name' | 'group' | 'defaultVolume' | 'regions'>> & {
  sortOrder?: number;
};
export type VideoUpdate = Partial<Pick<Video, 'name' | 'tags' | 'regions'>> & {
  sortOrder?: number;
};

export const SUBTITLE = (s: Pick<Scene, 'location' | 'timeOfDay'>) => {
  const parts = [s.timeOfDay, s.location].filter(Boolean);
  return parts.join(' · ');
};

export const SOUND_GROUP_ORDER = [
  'Rain',
  'Thunder',
  'Wind',
  'Water',
  'Ocean',
  'Coastal',
  'Fire',
  'Birds',
  'Wildlife',
  'Bells',
  'Noise',
  'Other',
];

// Geographic regions used to tag sounds (where they natively occur)
// and videos (the location depicted). Used by the scene editor to
// surface region-appropriate sounds when a video is picked.
export type Region = {
  id: string;
  label: string;
  // High-level continent/zone bucket for grouping in the picker
  zone: 'north-america' | 'europe' | 'pacific' | 'tropics' | 'arctic' | 'global';
};

export const REGIONS: Region[] = [
  { id: 'pacific-northwest', label: 'Pacific Northwest', zone: 'north-america' },
  { id: 'california-coast', label: 'California Coast', zone: 'north-america' },
  { id: 'rocky-mountains', label: 'Rocky Mountains', zone: 'north-america' },
  { id: 'southwest-desert', label: 'Southwest Desert', zone: 'north-america' },
  { id: 'new-england', label: 'New England', zone: 'north-america' },
  { id: 'southeast-us', label: 'Southeast US', zone: 'north-america' },
  { id: 'midwest', label: 'Midwest', zone: 'north-america' },
  { id: 'alaska', label: 'Alaska', zone: 'north-america' },
  { id: 'hawaii', label: 'Hawaii', zone: 'pacific' },
  { id: 'boreal-forest', label: 'Boreal Forest', zone: 'arctic' },
  { id: 'iceland', label: 'Iceland', zone: 'arctic' },
  { id: 'arctic', label: 'Arctic', zone: 'arctic' },
  { id: 'british-isles', label: 'British Isles', zone: 'europe' },
  { id: 'scandinavia', label: 'Scandinavia', zone: 'europe' },
  { id: 'mediterranean', label: 'Mediterranean', zone: 'europe' },
  { id: 'alpine-europe', label: 'Alpine Europe', zone: 'europe' },
  { id: 'tropical-jungle', label: 'Tropical Jungle', zone: 'tropics' },
  { id: 'global', label: 'Global', zone: 'global' },
];

export const REGION_LABELS = Object.fromEntries(REGIONS.map(r => [r.id, r.label]));
