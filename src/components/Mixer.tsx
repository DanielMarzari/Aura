'use client';
import { useEffect, useRef, useState } from 'react';
import type { Scene } from '@/lib/scenes';

type Props = {
  scene: Scene;
  volumes: Record<string, number>;
  master: number;
  muted: boolean;
  onLayer: (id: string, v: number) => void;
  onMaster: (v: number) => void;
  onMute: () => void;
};

export function Mixer({ scene, volumes, master, muted, onLayer, onMaster, onMute }: Props) {
  const [visible, setVisible] = useState(true);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const show = () => {
      setVisible(true);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setVisible(false), 4000);
    };
    show();
    window.addEventListener('mousemove', show);
    window.addEventListener('touchstart', show);
    window.addEventListener('keydown', show);
    return () => {
      window.removeEventListener('mousemove', show);
      window.removeEventListener('touchstart', show);
      window.removeEventListener('keydown', show);
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  return (
    <div
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-20 transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      onMouseEnter={() => {
        if (timer.current) window.clearTimeout(timer.current);
      }}
    >
      <div className="flex items-end gap-5 px-7 py-5 rounded-2xl bg-black/35 backdrop-blur-xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
        {scene.layers.map(layer => (
          <LayerSlider
            key={layer.id}
            label={layer.label}
            value={volumes[layer.id] ?? 0}
            onChange={v => onLayer(layer.id, v)}
          />
        ))}
        <div className="w-px h-20 bg-white/15 self-center" />
        <LayerSlider
          label="Master"
          value={master}
          onChange={onMaster}
          emphasis
        />
        <button
          onClick={onMute}
          className="w-9 h-9 rounded-full border border-white/20 text-white/75 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors self-end mb-1"
          title={muted ? 'Unmute' : 'Mute'}
          aria-label={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? <IconMuted /> : <IconSpeaker />}
        </button>
      </div>
      <div className="mt-3 text-center text-[10px] tracking-[0.5em] text-white/40 uppercase">
        {scene.name}
      </div>
    </div>
  );
}

function LayerSlider({
  label,
  value,
  onChange,
  emphasis,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  emphasis?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-3 w-12">
      <div className="h-24 flex items-center justify-center">
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          className={`aura-slider ${emphasis ? 'aura-slider-emphasis' : ''}`}
        />
      </div>
      <span className={`text-[10px] tracking-[0.2em] uppercase ${emphasis ? 'text-white/90' : 'text-white/65'}`}>
        {label}
      </span>
    </div>
  );
}

function IconSpeaker() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function IconMuted() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="22" y1="9" x2="16" y2="15" />
      <line x1="16" y1="9" x2="22" y2="15" />
    </svg>
  );
}
