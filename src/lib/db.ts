import Database from 'better-sqlite3';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Scene, SceneDraft, Sound, SoundUpdate, Video, VideoUpdate } from './types';

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (_db) return _db;
  const dbPath = process.env.DATABASE_PATH ?? path.join(process.cwd(), 'aura.db');
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  migrate(db);
  seed(db);
  _db = db;
  return db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY);

    CREATE TABLE IF NOT EXISTS videos (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      src TEXT NOT NULL,
      poster_src TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sounds (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      icon TEXT NOT NULL,
      src TEXT NOT NULL,
      duration_sec INTEGER NOT NULL,
      default_volume REAL NOT NULL DEFAULT 0.5,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS scenes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT,
      time_of_day TEXT,
      video_id TEXT NOT NULL REFERENCES videos(id),
      is_builtin INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS scene_layers (
      scene_id TEXT NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
      sound_id TEXT NOT NULL REFERENCES sounds(id),
      volume REAL NOT NULL DEFAULT 0.5,
      position INTEGER NOT NULL,
      PRIMARY KEY (scene_id, sound_id)
    );
  `);

  const version = (db.prepare('SELECT MAX(version) AS v FROM schema_version').get() as { v: number | null }).v ?? 0;

  if (version < 1) {
    db.prepare('INSERT INTO schema_version (version) VALUES (1)').run();
  }
  if (version < 2) {
    if (!columnExists(db, 'sounds', 'group_name')) {
      db.exec(`ALTER TABLE sounds ADD COLUMN group_name TEXT NOT NULL DEFAULT 'Other'`);
    }
    if (!columnExists(db, 'scenes', 'is_favorite')) {
      db.exec(`ALTER TABLE scenes ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0`);
    }
    db.prepare('INSERT INTO schema_version (version) VALUES (2)').run();
  }
  if (version < 3) {
    db.prepare('DELETE FROM sounds WHERE id = ?').run('rain-clear');
    db.prepare('DELETE FROM scene_layers WHERE sound_id = ?').run('rain-clear');
    db.prepare('INSERT INTO schema_version (version) VALUES (3)').run();
  }
  if (version < 4) {
    db.prepare('INSERT INTO schema_version (version) VALUES (4)').run();
  }
  if (version < 5) {
    db.prepare(`DELETE FROM scene_layers WHERE scene_id IN (SELECT id FROM scenes WHERE is_builtin = 1)`).run();
    db.prepare('INSERT INTO schema_version (version) VALUES (5)').run();
  }
  if (version < 6) {
    if (!columnExists(db, 'sounds', 'regions')) {
      db.exec(`ALTER TABLE sounds ADD COLUMN regions TEXT NOT NULL DEFAULT '[]'`);
    }
    if (!columnExists(db, 'videos', 'regions')) {
      db.exec(`ALTER TABLE videos ADD COLUMN regions TEXT NOT NULL DEFAULT '[]'`);
    }
    db.prepare('INSERT INTO schema_version (version) VALUES (6)').run();
  }
  if (version < 7) {
    // Refresh built-in scene layers again so newly-seeded built-ins (Acadia, Hawaii) land cleanly.
    db.prepare(`DELETE FROM scene_layers WHERE scene_id IN (SELECT id FROM scenes WHERE is_builtin = 1)`).run();
    db.prepare('INSERT INTO schema_version (version) VALUES (7)').run();
  }
}

function columnExists(db: Database.Database, table: string, column: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return rows.some(r => r.name === column);
}

type VideoSeed = {
  id: string; name: string; src: string; posterSrc: string;
  tags: string[]; regions: string[]; sortOrder: number;
};
type SoundSeed = {
  id: string; name: string; group: string; category: string; icon: string;
  src: string; durationSec: number; defaultVolume: number; regions: string[]; sortOrder: number;
};

const VIDEO_SEED: VideoSeed[] = [
  { id: 'rainy-forest',   name: 'Rainforest',      src: '/videos/rainy-forest.mp4',   posterSrc: '/videos/rainy-forest-poster.jpg',   tags: ['rain','forest','dusk','green'],          regions: ['pacific-northwest'],   sortOrder: 10 },
  { id: 'campfire-night', name: 'Campfire',        src: '/videos/campfire-night.mp4', posterSrc: '/videos/campfire-night-poster.jpg', tags: ['fire','night','warm'],                   regions: ['rocky-mountains'],     sortOrder: 20 },
  { id: 'mountain-creek', name: 'Mountain Creek',  src: '/videos/mountain-creek.mp4', posterSrc: '/videos/mountain-creek-poster.jpg', tags: ['water','forest','morning','mist'],       regions: ['southeast-us'],        sortOrder: 30 },
  { id: 'rain-window',    name: 'Rain on Window',  src: '/videos/rain-window.mp4',    posterSrc: '/videos/rain-window-poster.jpg',    tags: ['rain','indoor','cozy','close'],          regions: ['new-england'],         sortOrder: 40 },
  { id: 'fireplace',      name: 'Fireplace',       src: '/videos/fireplace.mp4',      posterSrc: '/videos/fireplace-poster.jpg',      tags: ['fire','indoor','warm','cozy'],           regions: ['british-isles'],       sortOrder: 50 },
  { id: 'ocean-waves',    name: 'Ocean Waves',     src: '/videos/ocean-waves.mp4',    posterSrc: '/videos/ocean-waves-poster.jpg',    tags: ['water','ocean','blue','open'],           regions: ['california-coast'],    sortOrder: 60 },
  { id: 'starry-night',   name: 'Starry Night',    src: '/videos/starry-night.mp4',   posterSrc: '/videos/starry-night-poster.jpg',   tags: ['night','stars','dark','open'],           regions: ['southwest-desert'],    sortOrder: 70 },
  { id: 'snowy-forest',   name: 'Snowstorm',       src: '/videos/snowy-forest.mp4',   posterSrc: '/videos/snowy-forest-poster.jpg',   tags: ['snow','winter','night','storm'],         regions: ['boreal-forest'],       sortOrder: 80 },
  { id: 'lavender-field', name: 'Lavender Field',  src: '/videos/lavender-field.mp4', posterSrc: '/videos/lavender-field-poster.jpg', tags: ['field','flowers','summer','bright'],     regions: ['mediterranean'],       sortOrder: 90 },
  { id: 'maine-coast',    name: 'Maine Coast',     src: '/videos/maine-coast.mp4',    posterSrc: '/videos/maine-coast-poster.jpg',    tags: ['ocean','rocks','wave','rugged'],         regions: ['new-england'],         sortOrder: 100 },
  { id: 'palm-tree',      name: 'Palm Tree',       src: '/videos/palm-tree.mp4',      posterSrc: '/videos/palm-tree-poster.jpg',      tags: ['tropical','beach','wind','bright'],      regions: ['hawaii','tropical-jungle'], sortOrder: 110 },
];

const SOUND_SEED: SoundSeed[] = [
  // Rain
  { id: 'rain-heavy',  name: 'Heavy Rain',  group: 'Rain', category: 'weather', icon: 'rain', src: '/sounds/rain-heavy.mp3',  durationSec: 130, defaultVolume: 0.7,  regions: ['global'], sortOrder: 10 },
  { id: 'rain-light',  name: 'Light Rain',  group: 'Rain', category: 'weather', icon: 'rain', src: '/sounds/rain-light.mp3',  durationSec: 39,  defaultVolume: 0.6,  regions: ['global'], sortOrder: 11 },
  { id: 'rain-long',   name: 'Rain Loop',   group: 'Rain', category: 'weather', icon: 'rain', src: '/sounds/rain-long.mp3',   durationSec: 57,  defaultVolume: 0.65, regions: ['global'], sortOrder: 12 },
  { id: 'rain-jungle', name: 'Jungle Rain', group: 'Rain', category: 'weather', icon: 'rain', src: '/sounds/rain-jungle.mp3', durationSec: 31,  defaultVolume: 0.65, regions: ['tropical-jungle','hawaii'], sortOrder: 13 },
  // Thunder
  { id: 'thunder',         name: 'Thunder Rumble', group: 'Thunder', category: 'weather', icon: 'thunder', src: '/sounds/thunder.mp3',         durationSec: 52, defaultVolume: 0.3,  regions: ['global'], sortOrder: 20 },
  { id: 'thunder-jungle',  name: 'Jungle Thunder', group: 'Thunder', category: 'weather', icon: 'thunder', src: '/sounds/thunder-jungle.mp3',  durationSec: 49, defaultVolume: 0.3,  regions: ['tropical-jungle','hawaii'], sortOrder: 21 },
  { id: 'thunder-storm',   name: 'Storm Thunder',  group: 'Thunder', category: 'weather', icon: 'thunder', src: '/sounds/thunder-storm.mp3',   durationSec: 52, defaultVolume: 0.35, regions: ['global'], sortOrder: 22 },
  { id: 'thunder-stormy',  name: 'Stormy Thunder', group: 'Thunder', category: 'weather', icon: 'thunder', src: '/sounds/thunder-stormy.mp3',  durationSec: 44, defaultVolume: 0.3,  regions: ['global'], sortOrder: 23 },
  // Wind
  { id: 'wind-forest',     name: 'Forest Wind',  group: 'Wind', category: 'wind', icon: 'wind', src: '/sounds/wind-forest.mp3',     durationSec: 62,  defaultVolume: 0.4,  regions: ['global'], sortOrder: 30 },
  { id: 'wind-night',      name: 'Night Wind',   group: 'Wind', category: 'wind', icon: 'wind', src: '/sounds/wind-night.mp3',      durationSec: 30,  defaultVolume: 0.3,  regions: ['global'], sortOrder: 31 },
  { id: 'wind-mountain',   name: 'Mountain Wind',group: 'Wind', category: 'wind', icon: 'wind', src: '/sounds/wind-mountain.mp3',   durationSec: 31,  defaultVolume: 0.35, regions: ['rocky-mountains','alpine-europe','iceland','alaska'], sortOrder: 32 },
  { id: 'snowstorm-wind',  name: 'Winter Storm', group: 'Wind', category: 'weather', icon: 'wind', src: '/sounds/snowstorm-wind.mp3', durationSec: 183, defaultVolume: 0.4,  regions: ['boreal-forest','alaska','iceland','rocky-mountains','scandinavia'], sortOrder: 33 },
  // Water
  { id: 'creek-flowing',   name: 'Flowing Creek',  group: 'Water', category: 'water', icon: 'water', src: '/sounds/creek-flowing.mp3',   durationSec: 180, defaultVolume: 0.7,  regions: ['global'], sortOrder: 40 },
  { id: 'waterfall-forest',name: 'Forest Waterfall', group: 'Water', category: 'water', icon: 'water', src: '/sounds/waterfall-forest.mp3', durationSec: 25, defaultVolume: 0.65, regions: ['global'], sortOrder: 41 },
  { id: 'waterfall-large', name: 'Large Waterfall',  group: 'Water', category: 'water', icon: 'water', src: '/sounds/waterfall-large.mp3',  durationSec: 72, defaultVolume: 0.7,  regions: ['global'], sortOrder: 42 },
  { id: 'water-flow',      name: 'Water Flow',       group: 'Water', category: 'water', icon: 'water', src: '/sounds/water-flow.mp3',      durationSec: 51, defaultVolume: 0.6,  regions: ['global'], sortOrder: 43 },
  { id: 'river-forest',    name: 'Forest River',     group: 'Water', category: 'water', icon: 'water', src: '/sounds/river-forest.mp3',    durationSec: 60, defaultVolume: 0.6,  regions: ['global'], sortOrder: 44 },
  { id: 'ice-cracking',    name: 'Ice Cracking',     group: 'Water', category: 'water', icon: 'water', src: '/sounds/ice-cracking.mp3',    durationSec: 25, defaultVolume: 0.2,  regions: ['alaska','iceland','arctic','boreal-forest'], sortOrder: 45 },
  // Ocean
  { id: 'ocean-waves',     name: 'Ocean Waves',  group: 'Ocean', category: 'water',   icon: 'waves', src: '/sounds/ocean-waves.mp3',     durationSec: 48,  defaultVolume: 0.7,  regions: ['california-coast','new-england','hawaii','mediterranean','british-isles','iceland'], sortOrder: 50 },
  { id: 'ocean-harbor',    name: 'Harbor Waves', group: 'Ocean', category: 'water',   icon: 'waves', src: '/sounds/ocean-harbor.mp3',    durationSec: 77,  defaultVolume: 0.6,  regions: ['new-england','california-coast','british-isles','mediterranean'], sortOrder: 51 },
  { id: 'ocean-rough',     name: 'Rough Seas',   group: 'Ocean', category: 'water',   icon: 'waves', src: '/sounds/ocean-rough.mp3',     durationSec: 70,  defaultVolume: 0.65, regions: ['new-england','iceland','british-isles','alaska'], sortOrder: 52 },
  { id: 'coast-breaking',  name: 'Breaking Coast', group: 'Ocean', category: 'water', icon: 'waves', src: '/sounds/coast-breaking.mp3',  durationSec: 120, defaultVolume: 0.65, regions: ['new-england','california-coast','british-isles','iceland'], sortOrder: 53 },
  { id: 'humpback-whale',  name: 'Humpback Song',  group: 'Ocean', category: 'animals', icon: 'waves', src: '/sounds/humpback-whale.mp3', durationSec: 19, defaultVolume: 0.15, regions: ['alaska','hawaii','california-coast','new-england'], sortOrder: 54 },
  // Coastal
  { id: 'fog-horn',        name: 'Fog Horn',     group: 'Coastal', category: 'ambient', icon: 'bell', src: '/sounds/fog-horn.mp3',        durationSec: 20, defaultVolume: 0.18, regions: ['new-england','california-coast','british-isles'], sortOrder: 55 },
  // Fire
  { id: 'fire-crackle',    name: 'Campfire',     group: 'Fire',    category: 'fire',     icon: 'fire',  src: '/sounds/fire-crackle.mp3', durationSec: 24, defaultVolume: 0.6,  regions: ['global'], sortOrder: 60 },
  // Birds
  { id: 'birds-forest',    name: 'Forest Birds',     group: 'Birds', category: 'animals', icon: 'bird', src: '/sounds/birds-forest.mp3',    durationSec: 55,  defaultVolume: 0.3,  regions: ['pacific-northwest','new-england','southeast-us','midwest','british-isles','alpine-europe'], sortOrder: 70 },
  { id: 'birds-morning',   name: 'Morning Birds',    group: 'Birds', category: 'animals', icon: 'bird', src: '/sounds/birds-morning.mp3',   durationSec: 120, defaultVolume: 0.4,  regions: ['southeast-us','new-england','midwest','british-isles','mediterranean','alpine-europe'], sortOrder: 71 },
  { id: 'birds-long',      name: 'Dawn Chorus',      group: 'Birds', category: 'animals', icon: 'bird', src: '/sounds/birds-long.mp3',      durationSec: 209, defaultVolume: 0.35, regions: ['british-isles','new-england','midwest','southeast-us'], sortOrder: 72 },
  { id: 'birds-jungle',    name: 'Jungle Birds',     group: 'Birds', category: 'animals', icon: 'bird', src: '/sounds/birds-jungle.mp3',    durationSec: 60,  defaultVolume: 0.35, regions: ['tropical-jungle','hawaii'], sortOrder: 73 },
  { id: 'hawk',            name: 'Red-tailed Hawk',  group: 'Birds', category: 'animals', icon: 'bird', src: '/sounds/hawk.mp3',            durationSec: 18,  defaultVolume: 0.1,  regions: ['rocky-mountains','southwest-desert','new-england','pacific-northwest'], sortOrder: 74 },
  { id: 'raven',           name: 'Raven Call',       group: 'Birds', category: 'animals', icon: 'bird', src: '/sounds/raven.mp3',           durationSec: 14,  defaultVolume: 0.12, regions: ['rocky-mountains','alaska','iceland','boreal-forest','pacific-northwest'], sortOrder: 75 },
  { id: 'loon-call',       name: 'Loon Call',        group: 'Birds', category: 'animals', icon: 'bird', src: '/sounds/loon-call.mp3',       durationSec: 20,  defaultVolume: 0.15, regions: ['new-england','boreal-forest','midwest'], sortOrder: 76 },
  { id: 'seagulls-harbor', name: 'Harbor Gulls',     group: 'Birds', category: 'animals', icon: 'bird', src: '/sounds/seagulls-harbor.mp3', durationSec: 56,  defaultVolume: 0.25, regions: ['new-england','california-coast','british-isles','mediterranean'], sortOrder: 77 },
  { id: 'tropical-birds',  name: 'Tropical Birds',   group: 'Birds', category: 'animals', icon: 'bird', src: '/sounds/tropical-birds.mp3',  durationSec: 25,  defaultVolume: 0.3,  regions: ['hawaii','tropical-jungle'], sortOrder: 78 },
  { id: 'wood-thrush',     name: 'Wood Thrush',      group: 'Birds', category: 'animals', icon: 'bird', src: '/sounds/wood-thrush.mp3',     durationSec: 94,  defaultVolume: 0.22, regions: ['new-england','southeast-us','midwest'], sortOrder: 79 },
  { id: 'eagle-cry',       name: 'Eagle Cry',        group: 'Birds', category: 'animals', icon: 'bird', src: '/sounds/eagle-cry.mp3',       durationSec: 18,  defaultVolume: 0.1,  regions: ['alaska','rocky-mountains','pacific-northwest'], sortOrder: 80 },
  { id: 'macaw',           name: 'Macaw',            group: 'Birds', category: 'animals', icon: 'bird', src: '/sounds/macaw.mp3',           durationSec: 18,  defaultVolume: 0.1,  regions: ['tropical-jungle'], sortOrder: 81 },
  // Wildlife
  { id: 'owl',             name: 'Hooting Owl',     group: 'Wildlife', category: 'animals', icon: 'owl',     src: '/sounds/owl.mp3',             durationSec: 90,  defaultVolume: 0.15, regions: ['global'], sortOrder: 90 },
  { id: 'crickets-night',  name: 'Night Crickets',  group: 'Wildlife', category: 'animals', icon: 'cricket', src: '/sounds/crickets-night.mp3',  durationSec: 180, defaultVolume: 0.4,  regions: ['southeast-us','new-england','midwest','rocky-mountains','mediterranean'], sortOrder: 91 },
  { id: 'crickets-summer', name: 'Summer Crickets', group: 'Wildlife', category: 'animals', icon: 'cricket', src: '/sounds/crickets-summer.mp3', durationSec: 42,  defaultVolume: 0.4,  regions: ['southeast-us','new-england','midwest','rocky-mountains','southwest-desert','mediterranean'], sortOrder: 92 },
  { id: 'crickets-forest', name: 'Forest Crickets', group: 'Wildlife', category: 'animals', icon: 'cricket', src: '/sounds/crickets-forest.mp3', durationSec: 126, defaultVolume: 0.4,  regions: ['southeast-us','new-england','midwest','pacific-northwest'], sortOrder: 93 },
  { id: 'frogs',           name: 'Frogs',           group: 'Wildlife', category: 'animals', icon: 'frog',    src: '/sounds/frogs.mp3',           durationSec: 113, defaultVolume: 0.2,  regions: ['southeast-us','new-england','midwest','tropical-jungle'], sortOrder: 94 },
  { id: 'spring-peepers',  name: 'Spring Peepers',  group: 'Wildlife', category: 'animals', icon: 'frog',    src: '/sounds/spring-peepers.mp3',  durationSec: 72,  defaultVolume: 0.3,  regions: ['new-england','southeast-us','midwest'], sortOrder: 95 },
  { id: 'bullfrog',        name: 'Bullfrog',        group: 'Wildlife', category: 'animals', icon: 'frog',    src: '/sounds/bullfrog.mp3',        durationSec: 57,  defaultVolume: 0.2,  regions: ['southeast-us','new-england','midwest'], sortOrder: 96 },
  { id: 'wolf-howl',       name: 'Wolf Howl',       group: 'Wildlife', category: 'animals', icon: 'wolf',    src: '/sounds/wolf-howl.mp3',       durationSec: 24,  defaultVolume: 0.1,  regions: ['rocky-mountains','alaska','boreal-forest','iceland','scandinavia'], sortOrder: 97 },
  { id: 'coyote-howl',     name: 'Coyote Howl',     group: 'Wildlife', category: 'animals', icon: 'wolf',    src: '/sounds/coyote-howl.mp3',     durationSec: 22,  defaultVolume: 0.1,  regions: ['southwest-desert','rocky-mountains','california-coast','midwest'], sortOrder: 98 },
  { id: 'coqui-frog',      name: 'Coquí Frog',      group: 'Wildlife', category: 'animals', icon: 'frog',    src: '/sounds/coqui-frog.mp3',      durationSec: 26,  defaultVolume: 0.18, regions: ['hawaii','tropical-jungle'], sortOrder: 99 },
  { id: 'rainforest-ambient', name: 'Rainforest Ambience', group: 'Wildlife', category: 'animals', icon: 'cricket', src: '/sounds/rainforest-ambient.mp3', durationSec: 418, defaultVolume: 0.35, regions: ['tropical-jungle','hawaii'], sortOrder: 100 },
  // Bells
  { id: 'bell-distant',    name: 'Distant Bell',    group: 'Bells', category: 'ambient', icon: 'bell', src: '/sounds/bell-distant.mp3',  durationSec: 27,  defaultVolume: 0.25, regions: ['global'], sortOrder: 110 },
  { id: 'bell-tower',      name: 'Tower Bell',      group: 'Bells', category: 'ambient', icon: 'bell', src: '/sounds/bell-tower.mp3',    durationSec: 28,  defaultVolume: 0.25, regions: ['global'], sortOrder: 111 },
  { id: 'bell-high',       name: 'High Bell',       group: 'Bells', category: 'ambient', icon: 'bell', src: '/sounds/bell-high.mp3',     durationSec: 123, defaultVolume: 0.22, regions: ['global'], sortOrder: 112 },
  { id: 'bell-dramatic',   name: 'Dramatic Bells',  group: 'Bells', category: 'ambient', icon: 'bell', src: '/sounds/bell-dramatic.mp3', durationSec: 47,  defaultVolume: 0.22, regions: ['global'], sortOrder: 113 },
  { id: 'chime-wood',      name: 'Wood Chime',      group: 'Bells', category: 'ambient', icon: 'bell', src: '/sounds/chime-wood.mp3',    durationSec: 24,  defaultVolume: 0.3,  regions: ['global'], sortOrder: 114 },
  { id: 'gong',            name: 'Gong',            group: 'Bells', category: 'ambient', icon: 'bell', src: '/sounds/gong.mp3',          durationSec: 44,  defaultVolume: 0.25, regions: ['global'], sortOrder: 115 },
  // Noise
  { id: 'pink-noise',      name: 'Pink Noise',      group: 'Noise', category: 'noise',   icon: 'music',src: '/sounds/pink-noise.mp3',    durationSec: 60,  defaultVolume: 0.4,  regions: ['global'], sortOrder: 120 },
  { id: 'brown-noise',     name: 'Brown Noise',     group: 'Noise', category: 'noise',   icon: 'music',src: '/sounds/brown-noise.mp3',   durationSec: 60,  defaultVolume: 0.4,  regions: ['global'], sortOrder: 121 },
  { id: 'white-noise',     name: 'White Noise',     group: 'Noise', category: 'noise',   icon: 'music',src: '/sounds/white-noise.mp3',   durationSec: 60,  defaultVolume: 0.3,  regions: ['global'], sortOrder: 122 },
];

type BuiltinSceneSeed = {
  id: string; name: string; location: string | null; timeOfDay: string | null;
  videoId: string; sortOrder: number;
  layers: { soundId: string; volume: number }[];
};

const BUILTIN_SCENES: BuiltinSceneSeed[] = [
  {
    id: 'builtin-rainy-forest',
    name: 'Hoh Rainforest',
    location: 'Washington, USA',
    timeOfDay: 'Dusk',
    videoId: 'rainy-forest',
    sortOrder: 10,
    layers: [
      { soundId: 'rain-heavy', volume: 0.75 },
      { soundId: 'thunder', volume: 0.3 },
      { soundId: 'wind-forest', volume: 0.4 },
      { soundId: 'birds-forest', volume: 0.25 },
    ],
  },
  {
    id: 'builtin-campfire-night',
    name: 'Aspen Grove Camp',
    location: 'Colorado Rockies',
    timeOfDay: 'Late summer',
    videoId: 'campfire-night',
    sortOrder: 20,
    layers: [
      { soundId: 'fire-crackle', volume: 0.7 },
      { soundId: 'crickets-night', volume: 0.45 },
      { soundId: 'wind-night', volume: 0.3 },
      { soundId: 'owl', volume: 0.15 },
    ],
  },
  {
    id: 'builtin-mountain-creek',
    name: 'Smoky Mountain Creek',
    location: 'Tennessee, USA',
    timeOfDay: 'Morning',
    videoId: 'mountain-creek',
    sortOrder: 30,
    layers: [
      { soundId: 'creek-flowing', volume: 0.75 },
      { soundId: 'birds-morning', volume: 0.45 },
      { soundId: 'wind-forest', volume: 0.3 },
      { soundId: 'frogs', volume: 0.2 },
    ],
  },
  {
    id: 'builtin-rain-window',
    name: 'Stowe Cabin Window',
    location: 'Vermont, USA',
    timeOfDay: 'Autumn storm',
    videoId: 'rain-window',
    sortOrder: 40,
    layers: [
      { soundId: 'rain-heavy', volume: 0.8 },
      { soundId: 'thunder-storm', volume: 0.35 },
      { soundId: 'wind-mountain', volume: 0.25 },
    ],
  },
  {
    id: 'builtin-fireplace',
    name: 'Eilean Donan Hearth',
    location: 'Scottish Highlands',
    timeOfDay: 'Mid-winter',
    videoId: 'fireplace',
    sortOrder: 50,
    layers: [
      { soundId: 'fire-crackle', volume: 0.8 },
      { soundId: 'wind-night', volume: 0.25 },
      { soundId: 'bell-distant', volume: 0.12 },
    ],
  },
  {
    id: 'builtin-pacific-shore',
    name: 'Pfeiffer Beach',
    location: 'Big Sur, California',
    timeOfDay: 'Sunrise',
    videoId: 'ocean-waves',
    sortOrder: 60,
    layers: [
      { soundId: 'ocean-waves', volume: 0.75 },
      { soundId: 'coast-breaking', volume: 0.4 },
      { soundId: 'seagulls-harbor', volume: 0.25 },
      { soundId: 'fog-horn', volume: 0.12 },
    ],
  },
  {
    id: 'builtin-starlit-desert',
    name: 'Sedona Vortex',
    location: 'Arizona, USA',
    timeOfDay: 'Summer night',
    videoId: 'starry-night',
    sortOrder: 70,
    layers: [
      { soundId: 'crickets-summer', volume: 0.5 },
      { soundId: 'coyote-howl', volume: 0.12 },
      { soundId: 'owl', volume: 0.15 },
      { soundId: 'wind-night', volume: 0.3 },
    ],
  },
  {
    id: 'builtin-snowfall',
    name: 'Koli National Park',
    location: 'Karelia, Finland',
    timeOfDay: 'Deep winter',
    videoId: 'snowy-forest',
    sortOrder: 80,
    layers: [
      { soundId: 'snowstorm-wind', volume: 0.55 },
      { soundId: 'wind-mountain', volume: 0.35 },
      { soundId: 'wolf-howl', volume: 0.1 },
    ],
  },
  {
    id: 'builtin-lavender',
    name: 'Valensole Plateau',
    location: 'Provence, France',
    timeOfDay: 'Summer evening',
    videoId: 'lavender-field',
    sortOrder: 90,
    layers: [
      { soundId: 'wind-forest', volume: 0.4 },
      { soundId: 'crickets-summer', volume: 0.35 },
      { soundId: 'birds-morning', volume: 0.2 },
      { soundId: 'bell-distant', volume: 0.12 },
    ],
  },
  {
    id: 'builtin-acadia',
    name: 'Acadia Coast',
    location: 'Maine, USA',
    timeOfDay: 'Foggy morning',
    videoId: 'maine-coast',
    sortOrder: 100,
    layers: [
      { soundId: 'coast-breaking', volume: 0.6 },
      { soundId: 'ocean-rough', volume: 0.45 },
      { soundId: 'seagulls-harbor', volume: 0.3 },
      { soundId: 'fog-horn', volume: 0.18 },
      { soundId: 'wood-thrush', volume: 0.15 },
    ],
  },
  {
    id: 'builtin-hawaii-palm',
    name: 'Kailua Palms',
    location: "O'ahu, Hawaii",
    timeOfDay: 'Trade wind afternoon',
    videoId: 'palm-tree',
    sortOrder: 110,
    layers: [
      { soundId: 'wind-forest', volume: 0.45 },
      { soundId: 'ocean-waves', volume: 0.35 },
      { soundId: 'tropical-birds', volume: 0.3 },
      { soundId: 'coqui-frog', volume: 0.18 },
    ],
  },
];

function seed(db: Database.Database) {
  const insertVideo = db.prepare(`
    INSERT OR IGNORE INTO videos (id, name, src, poster_src, tags, regions, sort_order)
    VALUES (@id, @name, @src, @posterSrc, @tags, @regions, @sortOrder)
  `);
  const updateVideoMeta = db.prepare(`
    UPDATE videos SET src = @src, poster_src = @posterSrc, name = @name, tags = @tags, regions = @regions, sort_order = @sortOrder
    WHERE id = @id
  `);
  const insertSound = db.prepare(`
    INSERT OR IGNORE INTO sounds (id, name, category, icon, src, duration_sec, default_volume, sort_order, group_name, regions)
    VALUES (@id, @name, @category, @icon, @src, @durationSec, @defaultVolume, @sortOrder, @group, @regions)
  `);
  const updateSoundMeta = db.prepare(`
    UPDATE sounds SET group_name = @group, src = @src, name = @name, category = @category, icon = @icon, regions = @regions, sort_order = @sortOrder
    WHERE id = @id
  `);

  db.transaction(() => {
    for (const v of VIDEO_SEED) {
      const serialized = { ...v, tags: JSON.stringify(v.tags), regions: JSON.stringify(v.regions) };
      insertVideo.run(serialized);
      updateVideoMeta.run(serialized);
    }
    for (const s of SOUND_SEED) {
      const serialized = { ...s, regions: JSON.stringify(s.regions) };
      insertSound.run(serialized);
      updateSoundMeta.run(serialized);
    }
  })();

  const insertScene = db.prepare(`
    INSERT OR IGNORE INTO scenes (id, name, location, time_of_day, video_id, is_builtin, sort_order)
    VALUES (@id, @name, @location, @timeOfDay, @videoId, 1, @sortOrder)
  `);
  const updateSceneMeta = db.prepare(`
    UPDATE scenes
    SET name = @name, location = @location, time_of_day = @timeOfDay, video_id = @videoId, sort_order = @sortOrder
    WHERE id = @id AND is_builtin = 1
  `);
  const insertLayer = db.prepare(`
    INSERT OR IGNORE INTO scene_layers (scene_id, sound_id, volume, position)
    VALUES (@sceneId, @soundId, @volume, @position)
  `);
  db.transaction(() => {
    for (const b of BUILTIN_SCENES) {
      insertScene.run(b);
      updateSceneMeta.run(b);
      b.layers.forEach((l, i) =>
        insertLayer.run({ sceneId: b.id, soundId: l.soundId, volume: l.volume, position: i })
      );
    }
  })();
}

type VideoRow = { id: string; name: string; src: string; poster_src: string | null; tags: string; regions: string; sort_order: number };
type SoundRow = { id: string; name: string; group_name: string; category: string; icon: string; src: string; duration_sec: number; default_volume: number; regions: string; sort_order: number };
type SceneRow = { id: string; name: string; location: string | null; time_of_day: string | null; video_id: string; video_src: string; poster_src: string | null; is_builtin: number; is_favorite: number; sort_order: number; created_at: string };
type SceneLayerRow = { scene_id: string; sound_id: string; sound_name: string; icon: string; src: string; volume: number; position: number };

function parseJsonArray(s: string): string[] {
  try { const v = JSON.parse(s); return Array.isArray(v) ? v.map(String) : []; }
  catch { return []; }
}

export function listVideos(): Video[] {
  return (getDb().prepare('SELECT * FROM videos ORDER BY sort_order, name').all() as VideoRow[])
    .map(r => ({
      id: r.id, name: r.name, src: r.src, posterSrc: r.poster_src,
      tags: parseJsonArray(r.tags),
      regions: parseJsonArray(r.regions),
      sortOrder: r.sort_order,
    }));
}

export function listSounds(): Sound[] {
  return (getDb().prepare('SELECT * FROM sounds ORDER BY sort_order, name').all() as SoundRow[])
    .map(r => ({
      id: r.id, name: r.name, group: r.group_name, category: r.category, icon: r.icon, src: r.src,
      durationSec: r.duration_sec, defaultVolume: r.default_volume,
      regions: parseJsonArray(r.regions),
    }));
}

export function listScenes(): Scene[] {
  const db = getDb();
  const sceneRows = db.prepare(`
    SELECT s.id, s.name, s.location, s.time_of_day, s.video_id,
           v.src AS video_src, v.poster_src,
           s.is_builtin, s.is_favorite, s.sort_order, s.created_at
    FROM scenes s
    JOIN videos v ON v.id = s.video_id
    ORDER BY s.is_builtin DESC, s.sort_order, s.created_at DESC
  `).all() as SceneRow[];

  const layerRows = db.prepare(`
    SELECT sl.scene_id, sl.sound_id, sn.name AS sound_name, sn.icon, sn.src, sl.volume, sl.position
    FROM scene_layers sl
    JOIN sounds sn ON sn.id = sl.sound_id
    ORDER BY sl.scene_id, sl.position
  `).all() as SceneLayerRow[];

  const layersByScene = new Map<string, SceneLayerRow[]>();
  for (const l of layerRows) {
    const arr = layersByScene.get(l.scene_id) ?? [];
    arr.push(l);
    layersByScene.set(l.scene_id, arr);
  }

  return sceneRows.map(r => ({
    id: r.id,
    name: r.name,
    location: r.location,
    timeOfDay: r.time_of_day,
    videoId: r.video_id,
    videoSrc: r.video_src,
    posterSrc: r.poster_src,
    isBuiltin: r.is_builtin === 1,
    isFavorite: r.is_favorite === 1,
    sortOrder: r.sort_order,
    createdAt: r.created_at,
    layers: (layersByScene.get(r.id) ?? []).map(l => ({
      soundId: l.sound_id,
      name: l.sound_name,
      icon: l.icon,
      src: l.src,
      volume: l.volume,
      position: l.position,
    })),
  }));
}

export function createScene(draft: SceneDraft): Scene {
  const db = getDb();
  const id = randomUUID();
  const insertScene = db.prepare(`
    INSERT INTO scenes (id, name, location, time_of_day, video_id, is_builtin, sort_order)
    VALUES (?, ?, ?, ?, ?, 0, 0)
  `);
  const insertLayer = db.prepare(`
    INSERT INTO scene_layers (scene_id, sound_id, volume, position)
    VALUES (?, ?, ?, ?)
  `);
  db.transaction(() => {
    insertScene.run(id, draft.name, draft.location, draft.timeOfDay, draft.videoId);
    draft.layers.forEach((l, i) => insertLayer.run(id, l.soundId, l.volume, i));
  })();
  const result = listScenes().find(s => s.id === id);
  if (!result) throw new Error('Scene insert failed');
  return result;
}

export function deleteScene(id: string): boolean {
  const db = getDb();
  const row = db.prepare('SELECT is_builtin FROM scenes WHERE id = ?').get(id) as { is_builtin: number } | undefined;
  if (!row || row.is_builtin === 1) return false;
  db.prepare('DELETE FROM scenes WHERE id = ?').run(id);
  return true;
}

export function updateScene(id: string, draft: SceneDraft): Scene | null {
  const db = getDb();
  const row = db.prepare('SELECT is_builtin FROM scenes WHERE id = ?').get(id) as { is_builtin: number } | undefined;
  if (!row || row.is_builtin === 1) return null;

  const insertLayer = db.prepare(`
    INSERT INTO scene_layers (scene_id, sound_id, volume, position)
    VALUES (?, ?, ?, ?)
  `);
  db.transaction(() => {
    db.prepare(`
      UPDATE scenes SET name = ?, location = ?, time_of_day = ?, video_id = ?
      WHERE id = ?
    `).run(draft.name, draft.location, draft.timeOfDay, draft.videoId, id);
    db.prepare('DELETE FROM scene_layers WHERE scene_id = ?').run(id);
    draft.layers.forEach((l, i) => insertLayer.run(id, l.soundId, l.volume, i));
  })();

  return listScenes().find(s => s.id === id) ?? null;
}

export function setSceneFavorite(id: string, favorite: boolean): Scene | null {
  const db = getDb();
  const row = db.prepare('SELECT id FROM scenes WHERE id = ?').get(id);
  if (!row) return null;
  db.prepare('UPDATE scenes SET is_favorite = ? WHERE id = ?').run(favorite ? 1 : 0, id);
  return listScenes().find(s => s.id === id) ?? null;
}

// ─── Sound CRUD ────────────────────────────────────────────────────────────

export function updateSound(id: string, patch: SoundUpdate): Sound | null {
  const db = getDb();
  const row = db.prepare('SELECT id FROM sounds WHERE id = ?').get(id);
  if (!row) return null;
  const sets: string[] = [];
  const params: Record<string, unknown> = { id };
  if (patch.name !== undefined)        { sets.push('name = @name');                   params.name = patch.name.slice(0, 80); }
  if (patch.group !== undefined)       { sets.push('group_name = @group');            params.group = patch.group.slice(0, 40); }
  if (patch.defaultVolume !== undefined) { sets.push('default_volume = @vol');         params.vol = Math.max(0, Math.min(1, patch.defaultVolume)); }
  if (patch.regions !== undefined)     { sets.push('regions = @regions');             params.regions = JSON.stringify(patch.regions); }
  if (patch.sortOrder !== undefined)   { sets.push('sort_order = @sort');             params.sort = patch.sortOrder; }
  if (sets.length === 0) return listSounds().find(s => s.id === id) ?? null;
  db.prepare(`UPDATE sounds SET ${sets.join(', ')} WHERE id = @id`).run(params);
  return listSounds().find(s => s.id === id) ?? null;
}

export function deleteSound(id: string): { ok: boolean; reason?: string } {
  const db = getDb();
  const used = (db.prepare('SELECT COUNT(*) AS c FROM scene_layers WHERE sound_id = ?').get(id) as { c: number }).c;
  if (used > 0) return { ok: false, reason: `Used in ${used} scene layer(s). Remove from scenes first.` };
  const result = db.prepare('DELETE FROM sounds WHERE id = ?').run(id);
  if (result.changes === 0) return { ok: false, reason: 'Sound not found' };
  return { ok: true };
}

// ─── Video CRUD ────────────────────────────────────────────────────────────

export function updateVideo(id: string, patch: VideoUpdate): Video | null {
  const db = getDb();
  const row = db.prepare('SELECT id FROM videos WHERE id = ?').get(id);
  if (!row) return null;
  const sets: string[] = [];
  const params: Record<string, unknown> = { id };
  if (patch.name !== undefined)      { sets.push('name = @name');         params.name = patch.name.slice(0, 80); }
  if (patch.tags !== undefined)      { sets.push('tags = @tags');         params.tags = JSON.stringify(patch.tags); }
  if (patch.regions !== undefined)   { sets.push('regions = @regions');   params.regions = JSON.stringify(patch.regions); }
  if (patch.sortOrder !== undefined) { sets.push('sort_order = @sort');   params.sort = patch.sortOrder; }
  if (sets.length === 0) return listVideos().find(v => v.id === id) ?? null;
  db.prepare(`UPDATE videos SET ${sets.join(', ')} WHERE id = @id`).run(params);
  return listVideos().find(v => v.id === id) ?? null;
}

export function deleteVideo(id: string): { ok: boolean; reason?: string } {
  const db = getDb();
  const used = (db.prepare('SELECT COUNT(*) AS c FROM scenes WHERE video_id = ?').get(id) as { c: number }).c;
  if (used > 0) return { ok: false, reason: `Used by ${used} scene(s). Reassign or delete those scenes first.` };
  const result = db.prepare('DELETE FROM videos WHERE id = ?').run(id);
  if (result.changes === 0) return { ok: false, reason: 'Video not found' };
  return { ok: true };
}
