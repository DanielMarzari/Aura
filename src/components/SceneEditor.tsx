'use client';
import { useMemo, useState } from 'react';
import { ArrowLeft, Check, Plus, X } from 'lucide-react';
import { SoundIcon } from './SoundIcon';
import type { SceneDraft, Sound, Video } from '@/lib/types';

type Props = {
  videos: Video[];
  sounds: Sound[];
  onCancel: () => void;
  onSave: (draft: SceneDraft) => Promise<void>;
  saving?: boolean;
};

export function SceneEditor({ videos, sounds, onCancel, onSave, saving }: Props) {
  const [name, setName] = useState('');
  const [timeOfDay, setTimeOfDay] = useState('');
  const [location, setLocation] = useState('');
  const [videoId, setVideoId] = useState<string>(videos[0]?.id ?? '');
  const [layers, setLayers] = useState<Record<string, number>>({});
  const [soundQuery, setSoundQuery] = useState('');

  const filteredSounds = useMemo(() => {
    const q = soundQuery.trim().toLowerCase();
    if (!q) return sounds;
    return sounds.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q)
    );
  }, [sounds, soundQuery]);

  const selectedVideo = videos.find(v => v.id === videoId);
  const hasLayers = Object.keys(layers).length > 0;
  const canSave = name.trim().length > 0 && !!videoId && hasLayers && !saving;

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
    await onSave({
      name: name.trim(),
      location: location.trim() || null,
      timeOfDay: timeOfDay.trim() || null,
      videoId,
      layers: Object.entries(layers).map(([soundId, volume]) => ({ soundId, volume })),
    });
  };

  return (
    <div className="fixed inset-0 z-30 bg-black/85 backdrop-blur-md flex flex-col">
      <header className="flex items-center justify-between px-8 py-5 shrink-0 border-b border-white/5">
        <button
          onClick={onCancel}
          className="flex items-center gap-2 text-white/60 hover:text-white text-xs tracking-[0.3em] uppercase"
        >
          <ArrowLeft size={14} strokeWidth={1.8} />
          Back
        </button>
        <div className="text-[10px] tracking-[0.6em] text-white/50 uppercase">New Scene</div>
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="flex items-center gap-2 px-5 py-2 rounded-full border border-white/25 bg-white/5 hover:bg-white/15 hover:border-white/50 text-xs tracking-[0.3em] uppercase disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Check size={14} strokeWidth={1.8} />
          {saving ? 'Saving' : 'Save'}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-6 md:px-8 py-8">
        <div className="max-w-5xl mx-auto space-y-10">
          <Section label="Details">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Name" required>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="My favorite night"
                  maxLength={80}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/25 focus:outline-none focus:border-white/40 text-sm"
                />
              </Field>
              <Field label="Time">
                <input
                  value={timeOfDay}
                  onChange={e => setTimeOfDay(e.target.value)}
                  placeholder="Dusk"
                  maxLength={80}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/25 focus:outline-none focus:border-white/40 text-sm"
                />
              </Field>
              <Field label="Location">
                <input
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="Pacific Northwest"
                  maxLength={80}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/25 focus:outline-none focus:border-white/40 text-sm"
                />
              </Field>
            </div>
          </Section>

          <Section label="Video" sublabel={selectedVideo ? selectedVideo.name : 'Choose one'}>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {videos.map(v => (
                <button
                  key={v.id}
                  onClick={() => setVideoId(v.id)}
                  className={`relative aspect-video rounded-xl overflow-hidden border transition-all duration-300 ${
                    videoId === v.id
                      ? 'border-white/70 scale-[1.03] shadow-[0_0_25px_rgba(255,255,255,0.12)]'
                      : 'border-white/10 hover:border-white/30 hover:scale-[1.01]'
                  }`}
                >
                  {v.posterSrc && (
                    <img
                      src={v.posterSrc}
                      alt={v.name}
                      className={`absolute inset-0 w-full h-full object-cover transition-all ${
                        videoId === v.id ? 'brightness-100' : 'brightness-60'
                      }`}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-2 left-3 right-3 text-left text-xs tracking-widest uppercase text-white">
                    {v.name}
                  </div>
                  {videoId === v.id && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white text-black flex items-center justify-center">
                      <Check size={12} strokeWidth={2.5} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </Section>

          <Section
            label="Sounds"
            sublabel={hasLayers ? `${Object.keys(layers).length} selected` : 'Pick at least one'}
          >
            <input
              type="search"
              value={soundQuery}
              onChange={e => setSoundQuery(e.target.value)}
              placeholder="Filter sounds"
              aria-label="Filter sounds"
              className="w-full max-w-sm bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/30 mb-4"
            />
            <div className="space-y-2">
              {filteredSounds.map(sound => {
                const selected = layers[sound.id] !== undefined;
                return (
                  <div
                    key={sound.id}
                    className={`flex items-center gap-4 px-4 py-3 rounded-xl border transition-all ${
                      selected ? 'border-white/40 bg-white/5' : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <button
                      onClick={() => toggleSound(sound)}
                      className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        selected
                          ? 'bg-white text-black'
                          : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/15'
                      }`}
                      aria-label={selected ? 'Remove sound' : 'Add sound'}
                    >
                      {selected ? <X size={14} strokeWidth={2} /> : <Plus size={14} strokeWidth={2} />}
                    </button>
                    <div className="shrink-0 w-8 h-8 rounded-md bg-white/5 text-white/70 flex items-center justify-center">
                      <SoundIcon name={sound.icon} size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{sound.name}</div>
                      <div className="text-[10px] tracking-[0.3em] uppercase text-white/40">
                        {sound.category} · {formatDuration(sound.durationSec)}
                      </div>
                    </div>
                    {selected && (
                      <div className="w-40 shrink-0 flex items-center gap-3">
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          value={layers[sound.id] ?? 0}
                          onChange={e => setVolume(sound.id, parseFloat(e.target.value))}
                          aria-label={`${sound.name} volume`}
                          className="aura-slider-horizontal flex-1"
                        />
                        <div className="text-[10px] tracking-[0.2em] uppercase text-white/50 w-8 text-right">
                          {Math.round((layers[sound.id] ?? 0) * 100)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
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
        <div className="text-[10px] tracking-[0.5em] uppercase text-white/50">{label}</div>
        {sublabel && (
          <div className="text-[10px] tracking-[0.3em] uppercase text-white/30">{sublabel}</div>
        )}
      </div>
      {children}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[10px] tracking-[0.3em] uppercase text-white/40 mb-1.5">
        {label}
        {required && <span className="text-white/60 ml-1">*</span>}
      </div>
      {children}
    </label>
  );
}

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`;
}
