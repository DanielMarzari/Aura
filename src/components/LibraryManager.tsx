'use client';
import { useMemo, useState } from 'react';
import { ArrowLeft, Check, Pencil, Play, Trash2, X } from 'lucide-react';
import { SoundIcon } from './SoundIcon';
import { useSoundPreview } from '@/hooks/useSoundPreview';
import { REGIONS, REGION_LABELS, SOUND_GROUP_ORDER } from '@/lib/types';
import type { Sound, SoundUpdate, Video, VideoUpdate } from '@/lib/types';

type Props = {
  sounds: Sound[];
  videos: Video[];
  onClose: () => void;
  onUpdateSound: (id: string, patch: SoundUpdate) => Promise<Sound | null>;
  onDeleteSound: (id: string) => Promise<boolean>;
  onUpdateVideo: (id: string, patch: VideoUpdate) => Promise<Video | null>;
  onDeleteVideo: (id: string) => Promise<boolean>;
};

type Tab = 'sounds' | 'videos';

export function LibraryManager({ sounds, videos, onClose, onUpdateSound, onDeleteSound, onUpdateVideo, onDeleteVideo }: Props) {
  const [tab, setTab] = useState<Tab>('sounds');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<{ kind: 'sound' | 'video'; id: string; name: string } | null>(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const filteredSounds = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sounds;
    return sounds.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.group.toLowerCase().includes(q) ||
      s.regions.some(r => REGION_LABELS[r]?.toLowerCase().includes(q))
    );
  }, [sounds, query]);

  const filteredVideos = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return videos;
    return videos.filter(v =>
      v.name.toLowerCase().includes(q) ||
      v.tags.some(t => t.toLowerCase().includes(q)) ||
      v.regions.some(r => REGION_LABELS[r]?.toLowerCase().includes(q))
    );
  }, [videos, query]);

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    const ok = confirmDeleteId.kind === 'sound'
      ? await onDeleteSound(confirmDeleteId.id)
      : await onDeleteVideo(confirmDeleteId.id);
    if (!ok) setError('Delete failed — see console');
    setConfirmDeleteId(null);
  };

  return (
    <div className="fixed inset-0 z-30 backdrop-blur-md flex flex-col" style={{ background: 'var(--ui-overlay)' }}>
      <header className="flex items-center justify-between px-8 py-5 shrink-0" style={{ borderBottom: '1px solid var(--ui-border)' }}>
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-xs tracking-[0.3em] uppercase"
          style={{ color: 'var(--ui-text-muted)' }}
        >
          <ArrowLeft size={14} strokeWidth={1.8} />
          Back
        </button>
        <div className="text-[10px] tracking-[0.6em] uppercase text-[var(--ui-text-muted)]">Library</div>
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search"
          className="rounded-full px-4 py-2 text-sm w-48 outline-none"
          style={{
            background: 'var(--ui-panel)',
            border: '1px solid var(--ui-border)',
            color: 'var(--ui-text)',
          }}
        />
      </header>

      <div className="flex justify-center gap-6 py-4 shrink-0">
        <TabButton active={tab === 'sounds'} onClick={() => setTab('sounds')}>
          Sounds <span className="opacity-50 ml-1">{sounds.length}</span>
        </TabButton>
        <TabButton active={tab === 'videos'} onClick={() => setTab('videos')}>
          Videos <span className="opacity-50 ml-1">{videos.length}</span>
        </TabButton>
      </div>

      {error && (
        <div className="mx-auto mb-3 px-4 py-2 rounded-lg text-xs bg-red-950/60 text-red-200 border border-red-400/30">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 md:px-12 pb-8">
        <div className="max-w-5xl mx-auto">
          {tab === 'sounds' ? (
            <div className="space-y-2">
              {filteredSounds.map(s => (
                <SoundRow
                  key={s.id}
                  sound={s}
                  editing={editingId === s.id}
                  onEdit={() => setEditingId(s.id)}
                  onCancel={() => setEditingId(null)}
                  onSave={async patch => {
                    const updated = await onUpdateSound(s.id, patch);
                    if (updated) setEditingId(null);
                  }}
                  onDelete={() => setConfirmDeleteId({ kind: 'sound', id: s.id, name: s.name })}
                />
              ))}
              {filteredSounds.length === 0 && (
                <div className="text-center text-[var(--ui-text-dim)] text-sm mt-12">No sounds match.</div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredVideos.map(v => (
                <VideoRow
                  key={v.id}
                  video={v}
                  editing={editingId === v.id}
                  onEdit={() => setEditingId(v.id)}
                  onCancel={() => setEditingId(null)}
                  onSave={async patch => {
                    const updated = await onUpdateVideo(v.id, patch);
                    if (updated) setEditingId(null);
                  }}
                  onDelete={() => setConfirmDeleteId({ kind: 'video', id: v.id, name: v.name })}
                />
              ))}
              {filteredVideos.length === 0 && (
                <div className="text-center text-[var(--ui-text-dim)] text-sm mt-12 col-span-full">No videos match.</div>
              )}
            </div>
          )}
        </div>
      </div>

      {confirmDeleteId && (
        <ConfirmDelete
          name={confirmDeleteId.name}
          kind={confirmDeleteId.kind}
          onCancel={() => setConfirmDeleteId(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-5 py-2 rounded-full text-xs tracking-[0.3em] uppercase transition-colors"
      style={{
        border: '1px solid var(--ui-border)',
        background: active ? 'var(--ui-panel-strong)' : 'transparent',
        color: active ? 'var(--ui-text)' : 'var(--ui-text-muted)',
      }}
    >
      {children}
    </button>
  );
}

function SoundRow({ sound, editing, onEdit, onCancel, onSave, onDelete }: {
  sound: Sound;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (patch: SoundUpdate) => Promise<void>;
  onDelete: () => void;
}) {
  const preview = useSoundPreview();
  const [name, setName] = useState(sound.name);
  const [group, setGroup] = useState(sound.group);
  const [regions, setRegions] = useState<string[]>(sound.regions);
  const [defaultVolume, setDefaultVolume] = useState(sound.defaultVolume);

  const start = () => {
    setName(sound.name);
    setGroup(sound.group);
    setRegions(sound.regions);
    setDefaultVolume(sound.defaultVolume);
    onEdit();
  };

  if (!editing) {
    return (
      <div
        className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
        style={{ background: 'var(--ui-panel)', border: '1px solid var(--ui-border)' }}
        onMouseEnter={() => preview.play(sound.src)}
        onMouseLeave={() => preview.stop()}
      >
        <div className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'var(--ui-panel-strong)', color: 'var(--ui-text-muted)' }}>
          <SoundIcon name={sound.icon} size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-[var(--ui-text)] truncate">{sound.name}</div>
          <div className="text-[10px] tracking-[0.2em] uppercase text-[var(--ui-text-dim)]">
            {sound.group} · {formatDuration(sound.durationSec)}
            {sound.regions.length > 0 && (
              <> · {sound.regions.map(r => REGION_LABELS[r] ?? r).join(', ')}</>
            )}
          </div>
        </div>
        {preview.playingSrc === sound.src && (
          <Play size={11} strokeWidth={2} fill="currentColor" className="text-[var(--ui-text-muted)]" />
        )}
        <button onClick={start} className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ color: 'var(--ui-text-muted)' }} aria-label="Edit">
          <Pencil size={12} strokeWidth={1.8} />
        </button>
        <button onClick={onDelete} className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-red-300 hover:bg-red-900/20" aria-label="Delete">
          <Trash2 size={12} strokeWidth={1.8} />
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 rounded-xl space-y-3" style={{ background: 'var(--ui-panel-strong)', border: '1px solid var(--ui-border)' }}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label="Name">
          <input value={name} onChange={e => setName(e.target.value)} className="field-input" maxLength={80} />
        </Field>
        <Field label="Group">
          <select value={group} onChange={e => setGroup(e.target.value)} className="field-input">
            {SOUND_GROUP_ORDER.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </Field>
        <Field label={`Default volume (${Math.round(defaultVolume * 100)})`}>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={defaultVolume}
            onChange={e => setDefaultVolume(parseFloat(e.target.value))}
            className="aura-slider-horizontal w-full mt-3"
          />
        </Field>
      </div>
      <RegionPicker selected={regions} onChange={setRegions} />
      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} className="px-4 py-1.5 rounded-full text-[10px] tracking-[0.3em] uppercase" style={{ border: '1px solid var(--ui-border)', color: 'var(--ui-text-muted)' }}>
          Cancel
        </button>
        <button
          onClick={() => onSave({ name, group, regions, defaultVolume })}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] tracking-[0.3em] uppercase"
          style={{ background: 'var(--ui-accent)', color: 'var(--ui-accent-fg)' }}
        >
          <Check size={11} strokeWidth={2.5} /> Save
        </button>
      </div>
    </div>
  );
}

function VideoRow({ video, editing, onEdit, onCancel, onSave, onDelete }: {
  video: Video;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (patch: VideoUpdate) => Promise<void>;
  onDelete: () => void;
}) {
  const [name, setName] = useState(video.name);
  const [regions, setRegions] = useState<string[]>(video.regions);
  const [tags, setTags] = useState(video.tags.join(', '));

  const start = () => {
    setName(video.name);
    setRegions(video.regions);
    setTags(video.tags.join(', '));
    onEdit();
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--ui-panel)', border: '1px solid var(--ui-border)' }}>
        <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-black" style={{ border: '1px solid var(--ui-border)' }}>
          {video.posterSrc && <img src={video.posterSrc} alt="" className="w-full h-full object-cover" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-[var(--ui-text)] truncate">{video.name}</div>
          <div className="text-[10px] tracking-[0.2em] uppercase text-[var(--ui-text-dim)] truncate">
            {video.regions.length > 0 ? video.regions.map(r => REGION_LABELS[r] ?? r).join(', ') : 'No region'}
          </div>
          <div className="text-[10px] text-[var(--ui-text-dim)] truncate">{video.tags.join(' · ')}</div>
        </div>
        <button onClick={start} className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ color: 'var(--ui-text-muted)' }} aria-label="Edit">
          <Pencil size={12} strokeWidth={1.8} />
        </button>
        <button onClick={onDelete} className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-red-300 hover:bg-red-900/20" aria-label="Delete">
          <Trash2 size={12} strokeWidth={1.8} />
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl space-y-3 col-span-full" style={{ background: 'var(--ui-panel-strong)', border: '1px solid var(--ui-border)' }}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Name">
          <input value={name} onChange={e => setName(e.target.value)} className="field-input" maxLength={80} />
        </Field>
        <Field label="Tags (comma-separated)">
          <input value={tags} onChange={e => setTags(e.target.value)} className="field-input" />
        </Field>
      </div>
      <RegionPicker selected={regions} onChange={setRegions} />
      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} className="px-4 py-1.5 rounded-full text-[10px] tracking-[0.3em] uppercase" style={{ border: '1px solid var(--ui-border)', color: 'var(--ui-text-muted)' }}>
          Cancel
        </button>
        <button
          onClick={() => onSave({
            name,
            regions,
            tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          })}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] tracking-[0.3em] uppercase"
          style={{ background: 'var(--ui-accent)', color: 'var(--ui-accent-fg)' }}
        >
          <Check size={11} strokeWidth={2.5} /> Save
        </button>
      </div>
    </div>
  );
}

function RegionPicker({ selected, onChange }: { selected: string[]; onChange: (regions: string[]) => void }) {
  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter(r => r !== id) : [...selected, id]);
  };
  return (
    <div>
      <div className="text-[10px] tracking-[0.3em] uppercase text-[var(--ui-text-dim)] mb-2">Regions</div>
      <div className="flex flex-wrap gap-1.5">
        {REGIONS.map(r => {
          const active = selected.includes(r.id);
          return (
            <button
              key={r.id}
              onClick={() => toggle(r.id)}
              className="px-2.5 py-1 rounded-full text-[10px] tracking-[0.15em] uppercase transition-colors"
              style={{
                border: '1px solid var(--ui-border)',
                background: active ? 'var(--ui-accent)' : 'transparent',
                color: active ? 'var(--ui-accent-fg)' : 'var(--ui-text-muted)',
              }}
            >
              {r.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[10px] tracking-[0.3em] uppercase text-[var(--ui-text-dim)] mb-1.5">{label}</div>
      {children}
    </label>
  );
}

function ConfirmDelete({ name, kind, onCancel, onConfirm }: {
  name: string;
  kind: 'sound' | 'video';
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
      <div
        className="rounded-2xl p-8 max-w-sm w-full"
        style={{ background: 'var(--ui-overlay-strong)', border: '1px solid var(--ui-border)', boxShadow: 'var(--ui-shadow)' }}
      >
        <div className="text-[10px] tracking-[0.4em] uppercase text-[var(--ui-text-muted)] mb-2">Delete {kind}</div>
        <div className="text-xl font-light text-[var(--ui-text)] mb-4">{name}?</div>
        <p className="text-sm text-[var(--ui-text-muted)] mb-6">
          {kind === 'sound'
            ? 'Sounds used by any scene cannot be deleted — remove them from those scenes first.'
            : 'Videos used by any scene cannot be deleted — reassign or remove those scenes first.'}
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-full text-xs tracking-[0.3em] uppercase" style={{ border: '1px solid var(--ui-border)', color: 'var(--ui-text)' }}>
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-full bg-red-900/40 border border-red-400/30 text-red-200 hover:bg-red-900/60 text-xs tracking-[0.3em] uppercase">
            <X size={11} strokeWidth={2.5} className="inline mr-1" /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`;
}
