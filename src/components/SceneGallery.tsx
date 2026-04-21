'use client';
import type { Scene } from '@/lib/scenes';

type Props = {
  scenes: Scene[];
  selectedId: string | null | undefined;
  onSelect: (scene: Scene) => void;
  size?: 'lg' | 'sm';
};

export function SceneGallery({ scenes, selectedId, onSelect, size = 'lg' }: Props) {
  const dims = size === 'lg'
    ? { w: 200, h: 120, titleCls: 'text-sm', subCls: 'text-[9px]' }
    : { w: 140, h: 86, titleCls: 'text-xs', subCls: 'text-[8px]' };

  return (
    <div className="flex items-center gap-4 flex-wrap justify-center">
      {scenes.map(s => {
        const active = s.id === selectedId;
        return (
          <button
            key={s.id}
            onClick={() => onSelect(s)}
            className={`group relative overflow-hidden rounded-xl transition-all duration-500 border ${
              active
                ? 'border-white/70 scale-[1.04] shadow-[0_8px_30px_rgba(255,255,255,0.12)]'
                : 'border-white/10 hover:border-white/40 hover:scale-[1.02]'
            }`}
            style={{ width: dims.w, height: dims.h }}
          >
            <img
              src={s.posterSrc}
              alt={s.name}
              className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${
                active ? 'brightness-100' : 'brightness-60 group-hover:brightness-90'
              }`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-2 left-3 right-3 text-left">
              <div className={`${dims.titleCls} tracking-widest uppercase transition-colors ${active ? 'text-white' : 'text-white/85'}`}>
                {s.name}
              </div>
              <div className={`${dims.subCls} tracking-[0.3em] uppercase transition-colors ${active ? 'text-white/70' : 'text-white/45'}`}>
                {s.subtitle}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
