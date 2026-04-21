'use client';
import { useMemo, useState } from 'react';
import { Plus, Search, Trash2, X } from 'lucide-react';
import type { Scene } from '@/lib/types';
import { SUBTITLE } from '@/lib/types';

type Props = {
  scenes: Scene[] | null;
  onPlayScene: (scene: Scene) => void;
  onCreateScene: () => void;
  onDeleteScene: (id: string) => void;
  loading?: boolean;
};

export function SceneSelection({ scenes, onPlayScene, onCreateScene, onDeleteScene, loading }: Props) {
  const [query, setQuery] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!scenes) return [];
    const q = query.trim().toLowerCase();
    if (!q) return scenes;
    return scenes.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.location ?? '').toLowerCase().includes(q) ||
      (s.timeOfDay ?? '').toLowerCase().includes(q)
    );
  }, [scenes, query]);

  return (
    <div className="fixed inset-0 z-30 bg-black/75 backdrop-blur-md flex flex-col">
      <header className="flex items-center justify-between px-8 py-6 shrink-0">
        <div className="text-[10px] tracking-[0.6em] text-white/50 uppercase">Aura</div>
        <div className="relative">
          <Search
            size={14}
            strokeWidth={1.6}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
          />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search"
            aria-label="Search scenes"
            className="bg-white/5 border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm text-white/90 placeholder:text-white/30 w-56 md:w-72 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80"
            >
              <X size={14} strokeWidth={1.8} />
            </button>
          )}
        </div>
        <div className="text-[10px] tracking-[0.3em] text-white/30 uppercase w-16 text-right">
          {scenes ? `${filtered.length}/${scenes.length}` : ''}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5 max-w-[1400px] mx-auto">
          {loading && !scenes && Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-video rounded-xl bg-white/[0.03] border border-white/5 animate-pulse" />
          ))}

          {filtered.map(scene => (
            <SceneCard
              key={scene.id}
              scene={scene}
              onPlay={() => onPlayScene(scene)}
              onDelete={scene.isBuiltin ? undefined : () => setConfirmDeleteId(scene.id)}
            />
          ))}

          {!loading && scenes && <CreateSceneTile onClick={onCreateScene} />}
        </div>

        {!loading && scenes && filtered.length === 0 && query && (
          <div className="text-center text-white/40 text-sm mt-16">
            No scenes match <span className="text-white/70">&ldquo;{query}&rdquo;</span>
          </div>
        )}
      </div>

      <footer className="text-center text-white/30 text-[10px] tracking-[0.3em] uppercase pb-6 shrink-0">
        Best with headphones
      </footer>

      {confirmDeleteId && (
        <ConfirmDelete
          scene={scenes!.find(s => s.id === confirmDeleteId)!}
          onCancel={() => setConfirmDeleteId(null)}
          onConfirm={() => {
            onDeleteScene(confirmDeleteId);
            setConfirmDeleteId(null);
          }}
        />
      )}
    </div>
  );
}

function SceneCard({ scene, onPlay, onDelete }: {
  scene: Scene;
  onPlay: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="relative group aspect-video">
      <button
        onClick={onPlay}
        className="absolute inset-0 overflow-hidden rounded-xl border border-white/10 hover:border-white/40 transition-all duration-300 hover:scale-[1.02] bg-black"
      >
        {scene.posterSrc && (
          <img
            src={scene.posterSrc}
            alt={scene.name}
            className="absolute inset-0 w-full h-full object-cover brightness-75 group-hover:brightness-100 transition-all duration-300"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
        <div className="absolute bottom-3 left-4 right-4 text-left">
          <div className="text-sm tracking-widest uppercase text-white">{scene.name}</div>
          {SUBTITLE(scene) && (
            <div className="text-[9px] tracking-[0.3em] uppercase text-white/55 mt-0.5">
              {SUBTITLE(scene)}
            </div>
          )}
        </div>
      </button>
      {onDelete && (
        <button
          onClick={onDelete}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm text-white/50 hover:text-red-300 hover:bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          aria-label={`Delete ${scene.name}`}
        >
          <Trash2 size={12} strokeWidth={1.8} />
        </button>
      )}
    </div>
  );
}

function CreateSceneTile({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="aspect-video rounded-xl border-2 border-dashed border-white/15 hover:border-white/50 hover:bg-white/5 transition-all duration-300 flex flex-col items-center justify-center gap-3 text-white/50 hover:text-white group"
    >
      <div className="w-10 h-10 rounded-full border border-current flex items-center justify-center group-hover:scale-110 transition-transform">
        <Plus size={18} strokeWidth={1.8} />
      </div>
      <div className="text-[10px] tracking-[0.4em] uppercase">Create Scene</div>
    </button>
  );
}

function ConfirmDelete({ scene, onCancel, onConfirm }: {
  scene: Scene;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="bg-[#141414] border border-white/10 rounded-2xl p-8 max-w-sm w-full shadow-2xl">
        <div className="text-[10px] tracking-[0.4em] uppercase text-white/50 mb-2">Delete scene</div>
        <div className="text-xl font-light text-white mb-6">{scene.name}?</div>
        <p className="text-sm text-white/60 mb-8">
          This only deletes the mix. The underlying sounds and video stay in the library.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-full border border-white/20 text-white/80 hover:bg-white/5 text-xs tracking-[0.3em] uppercase transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-full bg-red-900/40 border border-red-400/30 text-red-200 hover:bg-red-900/60 text-xs tracking-[0.3em] uppercase transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
