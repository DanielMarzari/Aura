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
}

function seed(db: Database.Database) {
  const videoCount = (db.prepare('SELECT COUNT(*) AS c FROM videos').get() as { c: number }).c;
  if (videoCount === 0) {
    const insertVideo = db.prepare(`
      INSERT INTO videos (id, name, src, poster_src, tags, sort_order)
      VALUES (@id, @name, @src, @posterSrc, @tags, @sortOrder)
    `);
    const videos = [
      { id: 'rainy-forest', name: 'Rainy Forest', src: '/scenes/rainy-forest/bg.mp4', posterSrc: '/scenes/rainy-forest/poster.jpg', tags: '["rain","forest","dusk"]', sortOrder: 10 },
      { id: 'campfire-night', name: 'Campfire', src: '/scenes/campfire-night/bg.mp4', posterSrc: '/scenes/campfire-night/poster.jpg', tags: '["fire","night"]', sortOrder: 20 },
      { id: 'mountain-creek', name: 'Mountain Creek', src: '/scenes/mountain-creek/bg.mp4', posterSrc: '/scenes/mountain-creek/poster.jpg', tags: '["water","forest","morning"]', sortOrder: 30 },
    ];
    const txn = db.transaction(() => {
      for (const v of videos) insertVideo.run(v);
    });
    txn();
  }

  const soundCount = (db.prepare('SELECT COUNT(*) AS c FROM sounds').get() as { c: number }).c;
  if (soundCount === 0) {
    const insertSound = db.prepare(`
      INSERT INTO sounds (id, name, category, icon, src, duration_sec, default_volume, sort_order)
      VALUES (@id, @name, @category, @icon, @src, @durationSec, @defaultVolume, @sortOrder)
    `);
    const sounds = [
      { id: 'rain-heavy', name: 'Heavy Rain', category: 'weather', icon: 'rain', src: '/scenes/rainy-forest/rain.mp3', durationSec: 130, defaultVolume: 0.75, sortOrder: 10 },
      { id: 'thunder', name: 'Thunder', category: 'weather', icon: 'thunder', src: '/scenes/rainy-forest/thunder.mp3', durationSec: 52, defaultVolume: 0.3, sortOrder: 20 },
      { id: 'wind-forest', name: 'Forest Wind', category: 'wind', icon: 'wind', src: '/scenes/rainy-forest/wind.mp3', durationSec: 62, defaultVolume: 0.4, sortOrder: 30 },
      { id: 'wind-night', name: 'Night Wind', category: 'wind', icon: 'wind', src: '/scenes/campfire-night/wind.mp3', durationSec: 30, defaultVolume: 0.3, sortOrder: 40 },
      { id: 'birds-forest', name: 'Forest Birds', category: 'animals', icon: 'bird', src: '/scenes/rainy-forest/birds.mp3', durationSec: 55, defaultVolume: 0.25, sortOrder: 50 },
      { id: 'birds-morning', name: 'Morning Birds', category: 'animals', icon: 'bird', src: '/scenes/mountain-creek/birds.mp3', durationSec: 120, defaultVolume: 0.45, sortOrder: 60 },
      { id: 'fire-crackle', name: 'Campfire', category: 'fire', icon: 'fire', src: '/scenes/campfire-night/fire.mp3', durationSec: 24, defaultVolume: 0.7, sortOrder: 70 },
      { id: 'crickets-night', name: 'Night Crickets', category: 'animals', icon: 'cricket', src: '/scenes/campfire-night/crickets.mp3', durationSec: 180, defaultVolume: 0.45, sortOrder: 80 },
      { id: 'owl', name: 'Hooting Owl', category: 'animals', icon: 'owl', src: '/scenes/campfire-night/owl.mp3', durationSec: 90, defaultVolume: 0.15, sortOrder: 90 },
      { id: 'creek-flowing', name: 'Flowing Creek', category: 'water', icon: 'water', src: '/scenes/mountain-creek/creek.mp3', durationSec: 180, defaultVolume: 0.75, sortOrder: 100 },
      { id: 'frogs', name: 'Frogs', category: 'animals', icon: 'frog', src: '/scenes/mountain-creek/frogs.mp3', durationSec: 113, defaultVolume: 0.2, sortOrder: 110 },
    ];
    const txn = db.transaction(() => {
      for (const s of sounds) insertSound.run(s);
    });
    txn();
  }

  const sceneCount = (db.prepare('SELECT COUNT(*) AS c FROM scenes WHERE is_builtin = 1').get() as { c: number }).c;
  if (sceneCount === 0) {
    const insertScene = db.prepare(`
      INSERT INTO scenes (id, name, location, time_of_day, video_id, is_builtin, sort_order)
      VALUES (@id, @name, @location, @timeOfDay, @videoId, 1, @sortOrder)
    `);
    const insertLayer = db.prepare(`
      INSERT INTO scene_layers (scene_id, sound_id, volume, position)
      VALUES (@sceneId, @soundId, @volume, @position)
    `);
    type Builtin = {
      id: string;
      name: string;
      location: string | null;
      timeOfDay: string | null;
      videoId: string;
      sortOrder: number;
      layers: { soundId: string; volume: number }[];
    };
    const builtins: Builtin[] = [
      {
        id: 'builtin-rainy-forest',
        name: 'Rainy Forest',
        location: 'Pacific Northwest',
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
        name: 'Campfire Night',
        location: 'Rockies',
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
        name: 'Mountain Creek',
        location: 'Tennessee',
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
    ];
    const txn = db.transaction(() => {
      for (const b of builtins) {
        insertScene.run(b);
        b.layers.forEach((l, i) =>
          insertLayer.run({ sceneId: b.id, soundId: l.soundId, volume: l.volume, position: i })
        );
      }
    });
    txn();
  }
}

type VideoRow = {
  id: string; name: string; src: string; poster_src: string | null;
  tags: string; sort_order: number;
};

export function listVideos(): Video[] {
  return (getDb()
    .prepare('SELECT * FROM videos ORDER BY sort_order, name')
    .all() as VideoRow[])
    .map(r => ({
      id: r.id,
      name: r.name,
      src: r.src,
      posterSrc: r.poster_src,
      tags: JSON.parse(r.tags) as string[],
      sortOrder: r.sort_order,
    }));
}

type SoundRow = {
  id: string; name: string; category: string; icon: string; src: string;
  duration_sec: number; default_volume: number; sort_order: number;
};

export function listSounds(): Sound[] {
  return (getDb()
    .prepare('SELECT * FROM sounds ORDER BY sort_order, name')
    .all() as SoundRow[])
    .map(r => ({
      id: r.id,
      name: r.name,
      category: r.category,
      icon: r.icon,
      src: r.src,
      durationSec: r.duration_sec,
      defaultVolume: r.default_volume,
    }));
}

type SceneRow = {
  id: string; name: string; location: string | null; time_of_day: string | null;
  video_id: string; video_src: string; poster_src: string | null;
  is_builtin: number; sort_order: number; created_at: string;
};

type SceneLayerRow = {
  scene_id: string; sound_id: string; sound_name: string; icon: string;
  src: string; volume: number; position: number;
};

export function listScenes(): Scene[] {
  const db = getDb();
  const sceneRows = db.prepare(`
    SELECT s.id, s.name, s.location, s.time_of_day, s.video_id,
           v.src AS video_src, v.poster_src,
           s.is_builtin, s.sort_order, s.created_at
    FROM scenes s
    JOIN videos v ON v.id = s.video_id
    ORDER BY s.is_builtin DESC, s.sort_order, s.created_at DESC
  `).all() as SceneRow[];

  const layerRows = db.prepare(`
    SELECT sl.scene_id, sl.sound_id,
           sn.name AS sound_name, sn.icon, sn.src,
           sl.volume, sl.position
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
  const txn = db.transaction(() => {
    insertScene.run(
      id,
      draft.name,
      draft.location,
      draft.timeOfDay,
      draft.videoId,
    );
    draft.layers.forEach((l, i) => insertLayer.run(id, l.soundId, l.volume, i));
  });
  txn();
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
