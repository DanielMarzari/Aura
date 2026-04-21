import Database from 'better-sqlite3';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Scene, SceneDraft, Sound, Video } from './types';

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
    // Remove mis-labeled rain-clear (it was thunder) — reseeded below as thunder-stormy
    db.prepare('DELETE FROM sounds WHERE id = ?').run('rain-clear');
    // Remove any scene_layers that referenced rain-clear (shouldn't exist in built-ins, but user scenes might)
    // ON DELETE CASCADE handled on scene-level; layer rows for removed sound need explicit cleanup
    db.prepare('DELETE FROM scene_layers WHERE sound_id = ?').run('rain-clear');
    db.prepare('INSERT INTO schema_version (version) VALUES (3)').run();
  }
  if (version < 4) {
    // Scenes renamed to PLACE format; reset built-in scene names/locations via seed (handled in seed)
    db.prepare('INSERT INTO schema_version (version) VALUES (4)').run();
  }
}

function columnExists(db: Database.Database, table: string, column: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return rows.some(r => r.name === column);
}

type VideoSeed = { id: string; name: string; src: string; posterSrc: string; tags: string[]; sortOrder: number };
type SoundSeed = {
  id: string; name: string; group: string; category: string; icon: string;
  src: string; durationSec: number; defaultVolume: number; sortOrder: number;
};

const VIDEO_SEED: VideoSeed[] = [
  { id: 'rainy-forest', name: 'Rainforest', src: '/videos/rainy-forest.mp4', posterSrc: '/videos/rainy-forest-poster.jpg', tags: ['rain','forest','dusk','green'], sortOrder: 10 },
  { id: 'campfire-night', name: 'Campfire', src: '/videos/campfire-night.mp4', posterSrc: '/videos/campfire-night-poster.jpg', tags: ['fire','night','warm'], sortOrder: 20 },
  { id: 'mountain-creek', name: 'Mountain Creek', src: '/videos/mountain-creek.mp4', posterSrc: '/videos/mountain-creek-poster.jpg', tags: ['water','forest','morning','mist'], sortOrder: 30 },
  { id: 'rain-window', name: 'Rain on Window', src: '/videos/rain-window.mp4', posterSrc: '/videos/rain-window-poster.jpg', tags: ['rain','indoor','cozy','close'], sortOrder: 40 },
  { id: 'fireplace', name: 'Fireplace', src: '/videos/fireplace.mp4', posterSrc: '/videos/fireplace-poster.jpg', tags: ['fire','indoor','warm','cozy'], sortOrder: 50 },
  { id: 'ocean-waves', name: 'Ocean Waves', src: '/videos/ocean-waves.mp4', posterSrc: '/videos/ocean-waves-poster.jpg', tags: ['water','ocean','blue','open'], sortOrder: 60 },
  { id: 'starry-night', name: 'Starry Night', src: '/videos/starry-night.mp4', posterSrc: '/videos/starry-night-poster.jpg', tags: ['night','stars','dark','open'], sortOrder: 70 },
  { id: 'snowy-forest', name: 'Snowstorm', src: '/videos/snowy-forest.mp4', posterSrc: '/videos/snowy-forest-poster.jpg', tags: ['snow','winter','night','storm'], sortOrder: 80 },
  { id: 'lavender-field', name: 'Lavender Field', src: '/videos/lavender-field.mp4', posterSrc: '/videos/lavender-field-poster.jpg', tags: ['field','flowers','summer','bright'], sortOrder: 90 },
];

const SOUND_SEED: SoundSeed[] = [
  // Rain (4)
  { id: 'rain-heavy', name: 'Heavy Rain', group: 'Rain', category: 'weather', icon: 'rain', src: '/sounds/rain-heavy.mp3', durationSec: 130, defaultVolume: 0.7, sortOrder: 10 },
  { id: 'rain-light', name: 'Light Rain', group: 'Rain', category: 'weather', icon: 'rain', src: '/sounds/rain-light.mp3', durationSec: 39, defaultVolume: 0.6, sortOrder: 11 },
  { id: 'rain-long', name: 'Rain Loop', group: 'Rain', category: 'weather', icon: 'rain', src: '/sounds/rain-long.mp3', durationSec: 57, defaultVolume: 0.65, sortOrder: 12 },
  { id: 'rain-jungle', name: 'Jungle Rain', group: 'Rain', category: 'weather', icon: 'rain', src: '/sounds/rain-jungle.mp3', durationSec: 31, defaultVolume: 0.65, sortOrder: 13 },
  // Thunder (4) — includes thunder-stormy (previously mislabeled as rain-clear)
  { id: 'thunder', name: 'Thunder Rumble', group: 'Thunder', category: 'weather', icon: 'thunder', src: '/sounds/thunder.mp3', durationSec: 52, defaultVolume: 0.3, sortOrder: 20 },
  { id: 'thunder-jungle', name: 'Jungle Thunder', group: 'Thunder', category: 'weather', icon: 'thunder', src: '/sounds/thunder-jungle.mp3', durationSec: 49, defaultVolume: 0.3, sortOrder: 21 },
  { id: 'thunder-storm', name: 'Storm Thunder', group: 'Thunder', category: 'weather', icon: 'thunder', src: '/sounds/thunder-storm.mp3', durationSec: 52, defaultVolume: 0.35, sortOrder: 22 },
  { id: 'thunder-stormy', name: 'Stormy Thunder', group: 'Thunder', category: 'weather', icon: 'thunder', src: '/sounds/thunder-stormy.mp3', durationSec: 44, defaultVolume: 0.3, sortOrder: 23 },
  // Wind (3)
  { id: 'wind-forest', name: 'Forest Wind', group: 'Wind', category: 'wind', icon: 'wind', src: '/sounds/wind-forest.mp3', durationSec: 62, defaultVolume: 0.4, sortOrder: 30 },
  { id: 'wind-night', name: 'Night Wind', group: 'Wind', category: 'wind', icon: 'wind', src: '/sounds/wind-night.mp3', durationSec: 30, defaultVolume: 0.3, sortOrder: 31 },
  { id: 'wind-mountain', name: 'Mountain Wind', group: 'Wind', category: 'wind', icon: 'wind', src: '/sounds/wind-mountain.mp3', durationSec: 31, defaultVolume: 0.35, sortOrder: 32 },
  // Water (5)
  { id: 'creek-flowing', name: 'Flowing Creek', group: 'Water', category: 'water', icon: 'water', src: '/sounds/creek-flowing.mp3', durationSec: 180, defaultVolume: 0.7, sortOrder: 40 },
  { id: 'waterfall-forest', name: 'Forest Waterfall', group: 'Water', category: 'water', icon: 'water', src: '/sounds/waterfall-forest.mp3', durationSec: 25, defaultVolume: 0.65, sortOrder: 41 },
  { id: 'waterfall-large', name: 'Large Waterfall', group: 'Water', category: 'water', icon: 'water', src: '/sounds/waterfall-large.mp3', durationSec: 72, defaultVolume: 0.7, sortOrder: 42 },
  { id: 'water-flow', name: 'Water Flow', group: 'Water', category: 'water', icon: 'water', src: '/sounds/water-flow.mp3', durationSec: 51, defaultVolume: 0.6, sortOrder: 43 },
  { id: 'river-forest', name: 'Forest River', group: 'Water', category: 'water', icon: 'water', src: '/sounds/river-forest.mp3', durationSec: 60, defaultVolume: 0.6, sortOrder: 44 },
  // Ocean (4)
  { id: 'ocean-waves', name: 'Ocean Waves', group: 'Ocean', category: 'water', icon: 'waves', src: '/sounds/ocean-waves.mp3', durationSec: 48, defaultVolume: 0.7, sortOrder: 50 },
  { id: 'ocean-harbor', name: 'Harbor Waves', group: 'Ocean', category: 'water', icon: 'waves', src: '/sounds/ocean-harbor.mp3', durationSec: 77, defaultVolume: 0.6, sortOrder: 51 },
  { id: 'ocean-rough', name: 'Rough Seas', group: 'Ocean', category: 'water', icon: 'waves', src: '/sounds/ocean-rough.mp3', durationSec: 70, defaultVolume: 0.65, sortOrder: 52 },
  { id: 'coast-breaking', name: 'Breaking Coast', group: 'Ocean', category: 'water', icon: 'waves', src: '/sounds/coast-breaking.mp3', durationSec: 120, defaultVolume: 0.65, sortOrder: 53 },
  // Fire (1)
  { id: 'fire-crackle', name: 'Campfire', group: 'Fire', category: 'fire', icon: 'fire', src: '/sounds/fire-crackle.mp3', durationSec: 24, defaultVolume: 0.6, sortOrder: 60 },
  // Birds (4)
  { id: 'birds-forest', name: 'Forest Birds', group: 'Birds', category: 'animals', icon: 'bird', src: '/sounds/birds-forest.mp3', durationSec: 55, defaultVolume: 0.3, sortOrder: 70 },
  { id: 'birds-morning', name: 'Morning Birds', group: 'Birds', category: 'animals', icon: 'bird', src: '/sounds/birds-morning.mp3', durationSec: 120, defaultVolume: 0.4, sortOrder: 71 },
  { id: 'birds-long', name: 'Dawn Chorus', group: 'Birds', category: 'animals', icon: 'bird', src: '/sounds/birds-long.mp3', durationSec: 209, defaultVolume: 0.35, sortOrder: 72 },
  { id: 'birds-jungle', name: 'Jungle Birds', group: 'Birds', category: 'animals', icon: 'bird', src: '/sounds/birds-jungle.mp3', durationSec: 60, defaultVolume: 0.35, sortOrder: 73 },
  // Wildlife (5)
  { id: 'owl', name: 'Hooting Owl', group: 'Wildlife', category: 'animals', icon: 'owl', src: '/sounds/owl.mp3', durationSec: 90, defaultVolume: 0.15, sortOrder: 80 },
  { id: 'crickets-night', name: 'Night Crickets', group: 'Wildlife', category: 'animals', icon: 'cricket', src: '/sounds/crickets-night.mp3', durationSec: 180, defaultVolume: 0.4, sortOrder: 81 },
  { id: 'crickets-summer', name: 'Summer Crickets', group: 'Wildlife', category: 'animals', icon: 'cricket', src: '/sounds/crickets-summer.mp3', durationSec: 42, defaultVolume: 0.4, sortOrder: 82 },
  { id: 'crickets-forest', name: 'Forest Crickets', group: 'Wildlife', category: 'animals', icon: 'cricket', src: '/sounds/crickets-forest.mp3', durationSec: 126, defaultVolume: 0.4, sortOrder: 83 },
  { id: 'frogs', name: 'Frogs', group: 'Wildlife', category: 'animals', icon: 'frog', src: '/sounds/frogs.mp3', durationSec: 113, defaultVolume: 0.2, sortOrder: 84 },
  // Bells (6)
  { id: 'bell-distant', name: 'Distant Bell', group: 'Bells', category: 'ambient', icon: 'bell', src: '/sounds/bell-distant.mp3', durationSec: 27, defaultVolume: 0.25, sortOrder: 90 },
  { id: 'bell-tower', name: 'Tower Bell', group: 'Bells', category: 'ambient', icon: 'bell', src: '/sounds/bell-tower.mp3', durationSec: 28, defaultVolume: 0.25, sortOrder: 91 },
  { id: 'bell-high', name: 'High Bell', group: 'Bells', category: 'ambient', icon: 'bell', src: '/sounds/bell-high.mp3', durationSec: 123, defaultVolume: 0.22, sortOrder: 92 },
  { id: 'bell-dramatic', name: 'Dramatic Bells', group: 'Bells', category: 'ambient', icon: 'bell', src: '/sounds/bell-dramatic.mp3', durationSec: 47, defaultVolume: 0.22, sortOrder: 93 },
  { id: 'chime-wood', name: 'Wood Chime', group: 'Bells', category: 'ambient', icon: 'bell', src: '/sounds/chime-wood.mp3', durationSec: 24, defaultVolume: 0.3, sortOrder: 94 },
  { id: 'gong', name: 'Gong', group: 'Bells', category: 'ambient', icon: 'bell', src: '/sounds/gong.mp3', durationSec: 44, defaultVolume: 0.25, sortOrder: 95 },
  // Noise (3)
  { id: 'pink-noise', name: 'Pink Noise', group: 'Noise', category: 'noise', icon: 'music', src: '/sounds/pink-noise.mp3', durationSec: 60, defaultVolume: 0.4, sortOrder: 100 },
  { id: 'brown-noise', name: 'Brown Noise', group: 'Noise', category: 'noise', icon: 'music', src: '/sounds/brown-noise.mp3', durationSec: 60, defaultVolume: 0.4, sortOrder: 101 },
  { id: 'white-noise', name: 'White Noise', group: 'Noise', category: 'noise', icon: 'music', src: '/sounds/white-noise.mp3', durationSec: 60, defaultVolume: 0.3, sortOrder: 102 },
];

type BuiltinSceneSeed = {
  id: string; name: string; location: string | null; timeOfDay: string | null;
  videoId: string; sortOrder: number;
  layers: { soundId: string; volume: number }[];
};

// Scenes use PLACE naming (Portal-inspired): a specific named place as the title,
// with region + time of day as the subtitle.
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
      { soundId: 'birds-morning', volume: 0.25 },
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
      { soundId: 'wind-mountain', volume: 0.45 },
      { soundId: 'wind-forest', volume: 0.3 },
      { soundId: 'brown-noise', volume: 0.15 },
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
];

function seed(db: Database.Database) {
  const insertVideo = db.prepare(`
    INSERT OR IGNORE INTO videos (id, name, src, poster_src, tags, sort_order)
    VALUES (@id, @name, @src, @posterSrc, @tags, @sortOrder)
  `);
  const updateVideoMeta = db.prepare(`
    UPDATE videos SET src = @src, poster_src = @posterSrc, name = @name, tags = @tags, sort_order = @sortOrder
    WHERE id = @id
  `);
  const insertSound = db.prepare(`
    INSERT OR IGNORE INTO sounds (id, name, category, icon, src, duration_sec, default_volume, sort_order, group_name)
    VALUES (@id, @name, @category, @icon, @src, @durationSec, @defaultVolume, @sortOrder, @group)
  `);
  const updateSoundMeta = db.prepare(`
    UPDATE sounds SET group_name = @group, src = @src, name = @name, category = @category, icon = @icon, sort_order = @sortOrder
    WHERE id = @id
  `);

  db.transaction(() => {
    for (const v of VIDEO_SEED) {
      const serialized = { ...v, tags: JSON.stringify(v.tags) };
      insertVideo.run(serialized);
      updateVideoMeta.run(serialized);
    }
    for (const s of SOUND_SEED) {
      insertSound.run(s);
      updateSoundMeta.run(s);
    }
  })();

  // Seed built-in scenes. Also refresh their metadata (name/location/time) so rename lands on existing DBs.
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

type VideoRow = { id: string; name: string; src: string; poster_src: string | null; tags: string; sort_order: number };
type SoundRow = { id: string; name: string; group_name: string; category: string; icon: string; src: string; duration_sec: number; default_volume: number; sort_order: number };
type SceneRow = { id: string; name: string; location: string | null; time_of_day: string | null; video_id: string; video_src: string; poster_src: string | null; is_builtin: number; is_favorite: number; sort_order: number; created_at: string };
type SceneLayerRow = { scene_id: string; sound_id: string; sound_name: string; icon: string; src: string; volume: number; position: number };

export function listVideos(): Video[] {
  return (getDb().prepare('SELECT * FROM videos ORDER BY sort_order, name').all() as VideoRow[])
    .map(r => ({ id: r.id, name: r.name, src: r.src, posterSrc: r.poster_src, tags: JSON.parse(r.tags) as string[], sortOrder: r.sort_order }));
}

export function listSounds(): Sound[] {
  return (getDb().prepare('SELECT * FROM sounds ORDER BY sort_order, name').all() as SoundRow[])
    .map(r => ({ id: r.id, name: r.name, group: r.group_name, category: r.category, icon: r.icon, src: r.src, durationSec: r.duration_sec, defaultVolume: r.default_volume }));
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

export function setSceneFavorite(id: string, favorite: boolean): Scene | null {
  const db = getDb();
  const row = db.prepare('SELECT id FROM scenes WHERE id = ?').get(id);
  if (!row) return null;
  db.prepare('UPDATE scenes SET is_favorite = ? WHERE id = ?').run(favorite ? 1 : 0, id);
  return listScenes().find(s => s.id === id) ?? null;
}
