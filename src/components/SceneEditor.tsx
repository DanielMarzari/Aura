'use client';
import { useMemo, useState } from 'react';
import { ArrowLeft, Check, Play, Volume2, X } from 'lucide-react';
import { SoundIcon } from './SoundIcon';
import { useSoundPreview } from '@/hooks/useSoundPreview';
import type { Scene, SceneDraft, Sound, Video } from '@/lib/types';
import { SOUND_GROUP_ORDER } from '@/lib/types';

type Props = {
  videos: Video[];
  sounds: Sound[];
  initialScene?: Scene | null;
  onCancel: () => void;
  onSave: (draft: SceneDraft) => Promise<void>;
  saving?: boolean;
};

export function SceneEditor({ videos, sounds, initialScene, onCancel, onSave, saving }: Props) {
  const [name, setName] = useState(initialScene?.name ?? '');
  const [timeOfDay, setTimeOfDay] = useState(initialScene?.timeOfDay ?? '');
  const [location, setLocation] = useState(initialScene?.location ?? '');
  const [videoId, setVideoId] = useState<string>(initialScene?.videoId ?? videos[0]?.id ?? '');
  const [layers, setLayers] = useState<Record<string, number>>(
    () => initialScene
      ? Object.fromEntries(initialScene.layers.map(l => [l.soundId, l.volume]))
      : {}
  );
  const [soundQuery, setSoundQuery] = useState('');
  const preview = useSoundPreview();
  const editing = !!initialScene;

  const filteredSounds = useMemo(() => {
    const q = soundQuery.trim().toLowerCase();
    if (!q) return sounds;
    return sounds.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      s.group.toLowerCase().includes(q)
    );
  }, [sounds, soundQuery]);

  const grouped = useMemo(() => {
    const map = new Map<string, Sound[]>();
    for (const s of filteredSounds) {
      const arr = map.get(s.group) ?? [];
      arr.push(s);
      map.set(s.group, arr);
    }
    return SOUND_GROUP_ORDER
      .filter(g => map.has(g))
      .map(g => ({ group: g, items: map.get(g)! }))
      .concat(
        Array.from(map.keys())
          .filter(g => !SOUND_GROUP_ORDER.includes(g))
          .sort()
          .map(g => ({ group: g, items: map.get(g)! }))
      );
  }, [filteredSounds]);

  const selectedSounds = useMemo(
    () => sounds.filter(s => layers[s.id] !== undefined),
    [sounds, layers]
  );

  const selectedVideo = videos.find(v => v.id === videoId);
  const canSave = name.trim().length > 0 && !!videoId && selectedSounds.length > 0 && !saving;

  const toggleSound = (sound: Sound) => {
    setLayers(prev => {
      if (prev[sound.id] !== undefined) {
        const copy = { ...prev };
        delete copy[sound.id];
        return copy;
      }
      return { ...prev, [sound.id]: sound.defaultVolume };
    });
  };

  const setVolume = (soundId: string, v: number) => {
    setLayers(prev => ({ ...prev, [soundId]: v }));
  };

  const handleSave = async () => {
    if (!canSave) return;
    preview.stop();
    await onSave({
      name: name.trim(),
      location: location.trim() || null,
      timeOfDay: timeOfDay.trim() || null,
      videoId,
      layers: Object.entries(layers).map(([soundId, volume]) => ({ soundId, volume })),
    });
  };

  const handleCancel = () => {
    preview.stop();
    onCancel();
  };

  return (
    <div
      className="fixed inset-0 z-30 backdrop-blur-md flex flex-col"
      style={{ background: 'var(--ui-overlay-strong)' }}
    >
      <header
        className="flex items-center justify-between px-8 py-5 shrink-0"
        style={{ borderBottom: '1px solid var(--ui-border)' }}
      >
        <button
          onClick={handleCancel}
          className="flex items-center gap-2 text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] text-xs tracking-[0.3em] uppercase"
        >
          <ArrowLeft size={14} strokeWidth={1.8} />
          Back
        </button>
        <div className="text-[10px] tracking-[0.6em] uppercase text-[var(--ui-text-muted)]">
          {editing ? 'Edit Scene' : 'New Scene'}
        </div>
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="flex items-center gap-2 px-5 py-2 rounded-full text-xs tracking-[0.3em] uppercase disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          style={{
            background: 'var(--ui-panel)',
            color: 'var(--ui-text)',
            border: '1px solid var(--ui-border)',
          }}
        >
          <Check size={14} strokeWidth={1.8} />
          {saving ? 'Saving' : 'Save'}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-8 space-y-10">
          <Section label="Details">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Place name" required>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Hoh Rainforest"
                  maxLength={80}
                  className="field-input"
                />
              </Field>
              <Field label="Time">
                <input
                  value={timeOfDay}
                  onChange={e => setTimeOfDay(e.target.value)}
                  placeholder="Autumn · Dusk"
                  maxLength={80}
                  className="field-input"
                />
              </Field>
              <Field label="Location">
                <input
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="Washington, USA"
                  maxLength={80}
                  className="field-input"
                />
              </Field>
            </div>
          </Section>

          <Section label="Scene" sublabel={selectedVideo?.name ?? 'Pick one'}>
            <div className="flex items-start gap-5 overflow-x-auto overflow-y-visible pb-3 pt-4 px-1 -mx-1 snap-x">
              {videos.map(v => (
                <button
                  key={v.id}
                  onClick={() => setVideoId(v.id)}
                  className="flex flex-col items-center gap-3 shrink-0 snap-start group"
                  style={{ width: 132 }}
                >
                  <div
                    className={`relative w-[132px] h-[132px] rounded-full overflow-hidden transition-all duration-300 ${
                      videoId === v.id ? 'scale-[1.05]' : 'group-hover:scale-[1.02]'
                    }`}
                    style={{
                      border: `1px solid ${videoId === v.id ? 'var(--ui-border-hover)' : 'var(--ui-border)'}`,
                      boxShadow: videoId === v.id ? 'var(--ui-shadow)' : 'none',
                    }}
                  >
                    {v.posterSrc && (
                      <img
                        src={v.posterSrc}
                        alt=""
                        className={`absolute inset-0 w-full h-full object-cover transition-all ${
                          videoId === v.id ? 'brightness-100' : 'brightness-60'
                        }`}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30" />
                    {videoId === v.id && (
                      <div
                        className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ background: 'var(--ui-accent)', color: 'var(--ui-accent-fg)' }}
                      >
                        <Check size={12} strokeWidth={2.5} />
                      </div>
                    )}
                  </div>
                  <div className="text-[11px] tracking-[0.18em] uppercase text-[var(--ui-text)] text-center truncate w-full">
                    {v.name}
                  </div>
                </button>
              ))}
            </div>
          </Section>

          <Section label="Your Mix" sublabel={selectedSounds.length > 0 ? `${selectedSounds.length} layers` : 'Pick at least one'}>
            {selectedSounds.length === 0 ? (
              <div
                className="rounded-xl p-8 text-center text-sm"
                style={{
                  border: '1px dashed var(--ui-border)',
                  color: 'var(--ui-text-dim)',
                }}
              >
                Add sounds below to start mixing
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {selectedSounds.map(s => (
                  <MixChip
                    key={s.id}
                    sound={s}
                    volume={layers[s.id]}
                    onVolume={v => setVolume(s.id, v)}
                    onRemove={() => toggleSound(s)}
                  />
                ))}
              </div>
            )}
          </Section>

          <Section label="Sound Library" sublabel={`${sounds.length} sounds`}>
            <input
              type="search"
              value={soundQuery}
              onChange={e => setSoundQuery(e.target.value)}
              placeholder="Search sounds"
              aria-label="Filter sounds"
              className="w-full max-w-sm field-input mb-5"
            />
            <p className="text-[10px] tracking-[0.2em] uppercase text-[var(--ui-text-dim)] mb-4">
              Hover a sound to preview. Click to add to your mix.
            </p>
            <div className="space-y-7">
              {grouped.map(({ group, items }) => (
                <div key={group}>
                  <div className="text-[10px] tracking-[0.4em] uppercase text-[var(--ui-text-muted)] mb-3 flex items-center gap-3">
                    <span>{group}</span>
                    <span className="text-[var(--ui-text-dim)] font-mono">{items.length}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {items.map(s => (
                      <SoundCard
                        key={s.id}
                        sound={s}
                        selected={layers[s.id] !== undefined}
                        previewing={preview.playingSrc === s.src}
                        onToggle={() => toggleSound(s)}
                        onHoverStart={() => preview.play(s.src)}
                        onHoverEnd={() => preview.stop()}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ label, sublabel, children }: { label: string; sublabel?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-4">
        <div className="text-[11px] tracking-[0.5em] uppercase text-[var(--ui-text-muted)]">{label}</div>
        {sublabel && <div className="text-[10px] tracking-[0.3em] uppercase text-[var(--ui-text-dim)]">{sublabel}</div>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[10px] tracking-[0.3em] uppercase text-[var(--ui-text-dim)] mb-1.5">
        {label}
        {required && <span className="text-[var(--ui-text-muted)] ml-1">*</span>}
      </div>
      {children}
    </label>
  );
}

function MixChip({ sound, volume, onVolume, onRemove }: {
  sound: Sound;
  volume: number;
  onVolume: (v: number) => void;
  onRemove: () => void;
}) {
  return (
    <div
      className="group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors"
      style={{
        border: '1px solid var(--ui-border-hover)',
        background: 'var(--ui-panel)',
      }}
    >
      <div
        className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
        style={{ background: 'var(--ui-panel-hover)', color: 'var(--ui-text)' }}
      >
        <SoundIcon name={sound.icon} size={15} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <div className="text-[12px] text-[var(--ui-text)] truncate">{sound.name}</div>
          <div className="text-[9px] tracking-[0.2em] uppercase text-[var(--ui-text-dim)] font-mono">{Math.round(volume * 100)}</div>
        </div>
        <div className="flex items-center gap-2">
          <Volume2 size={10} strokeWidth={1.6} className="text-[var(--ui-text-dim)] shrink-0" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={e => onVolume(parseFloat(e.target.value))}
            aria-label={`${sound.name} volume`}
            className="aura-slider-horizontal flex-1"
          />
        </div>
      </div>
      <button
        onClick={onRemove}
        className="shrink-0 w-7 h-7 rounded-full text-[var(--ui-text-dim)] hover:text-red-400 hover:bg-[var(--ui-panel-hover)] flex items-center justify-center"
        aria-label={`Remove ${sound.name}`}
      >
        <X size={14} strokeWidth={2} />
      </button>
    </div>
  );
}

function SoundCard({ sound, selected, previewing, onToggle, onHoverStart, onHoverEnd }: {
  sound: Sound;
  selected: boolean;
  previewing: boolean;
  onToggle: () => void;
  onHoverStart: () => void;
  onHoverEnd: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      onFocus={onHoverStart}
      onBlur={onHoverEnd}
      className="relative group rounded-xl p-3 flex flex-col items-start gap-2 text-left transition-all duration-200"
      style={{
        border: `1px solid ${selected ? 'var(--ui-border-hover)' : 'var(--ui-border)'}`,
        background: selected ? 'var(--ui-panel-hover)' : 'var(--ui-panel)',
      }}
    >
      <div className="flex items-center gap-2.5 w-full">
        <div
          className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors"
          style={
            selected
              ? { background: 'var(--ui-accent)', color: 'var(--ui-accent-fg)' }
              : { background: 'var(--ui-panel-hover)', color: 'var(--ui-text)' }
          }
        >
          <SoundIcon name={sound.icon} size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] text-[var(--ui-text)] truncate">{sound.name}</div>
          <div className="text-[9px] tracking-[0.2em] uppercase text-[var(--ui-text-dim)] font-mono">
            {formatDuration(sound.durationSec)}
          </div>
        </div>
        {previewing && (
          <div className="shrink-0 text-[var(--ui-text-muted)]">
            <Play size={10} strokeWidth={2} fill="currentColor" />
          </div>
        )}
      </div>
    </button>
  );
}

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`;
}
