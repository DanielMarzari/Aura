'use client';
import { useMemo, useState } from 'react';
import { Bookmark, Library, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import type { Scene } from '@/lib/types';
import { SUBTITLE } from '@/lib/types';
import { ThemeToggle } from './ThemeToggle';

type Props = {
  scenes: Scene[] | null;
  onPlayScene: (scene: Scene) => void;
  onCreateScene: () => void;
  onEditScene: (scene: Scene) => void;
  onDeleteScene: (id: string) => void;
  onToggleFavorite: (id: string, next: boolean) => void;
  onHoverScene: (scene: Scene | null) => void;
  onOpenLibrary: () => void;
  loading?: boolean;
};

export function SceneSelection({
  scenes, onPlayScene, onCreateScene, onEditScene, onDeleteScene, onToggleFavorite, onHoverScene, onOpenLibrary, loading,
}: Props) {
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

  const favorites = useMemo(() => (scenes ?? []).filter(s => s.isFavorite), [scenes]);

  return (
    <div
      className="fixed inset-0 z-30 backdrop-blur-md flex flex-col"
      style={{ background: 'var(--ui-overlay)' }}
    >
      <header className="flex items-center justify-between px-8 md:px-12 py-7 shrink-0">
        <div className="flex items-center gap-3">
          <div className="text-[10px] tracking-[0.6em] uppercase text-[var(--ui-text-muted)]">Aura</div>
          <ThemeToggle />
          <button
            onClick={onOpenLibrary}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{
              border: '1px solid var(--ui-border)',
              color: 'var(--ui-text-muted)',
              background: 'transparent',
            }}
            title="Library manager"
            aria-label="Open library manager"
          >
            <Library size={14} strokeWidth={1.6} />
          </button>
        </div>
        <div className="text-center">
          <div className="text-2xl md:text-3xl font-extralight tracking-[0.3em] text-[var(--ui-text)]">LIBRARY</div>
          <div className="text-[10px] tracking-[0.4em] uppercase text-[var(--ui-text-dim)] mt-1">
            Soundscapes for every moment
          </div>
        </div>
        <div className="relative">
          <Search
            size={14}
            strokeWidth={1.6}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ui-text-dim)] pointer-events-none"
          />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search"
            aria-label="Search scenes"
            className="rounded-full pl-10 pr-10 py-2 text-sm w-48 md:w-60 outline-none transition-colors"
            style={{
              background: 'var(--ui-panel)',
              border: '1px solid var(--ui-border)',
              color: 'var(--ui-text)',
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ui-text-dim)] hover:text-[var(--ui-text)]"
            >
              <X size={14} strokeWidth={1.8} />
            </button>
          )}
        </div>
      </header>

      <main
        className="flex-1 overflow-y-auto px-6 md:px-12 pb-4"
        onMouseLeave={() => onHoverScene(null)}
      >
        {loading && !scenes && (
          <div className="flex justify-center gap-6 mt-16">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="w-36 h-36 rounded-full animate-pulse"
                style={{ background: 'var(--ui-panel)', border: '1px solid var(--ui-border)' }}
              />
            ))}
          </div>
        )}

        {scenes && (
          <>
            <div className="max-w-[1600px] mx-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-5 gap-y-7 justify-items-center pt-4">
                {filtered.map(s => (
                  <CircleTile
                    key={s.id}
                    scene={s}
                    onPlay={() => onPlayScene(s)}
                    onHover={() => onHoverScene(s)}
                    onToggleFavorite={() => onToggleFavorite(s.id, !s.isFavorite)}
                    onEdit={s.isBuiltin ? undefined : () => onEditScene(s)}
                    onDelete={s.isBuiltin ? undefined : () => setConfirmDeleteId(s.id)}
                  />
                ))}
                <CreateTile onClick={onCreateScene} />
              </div>

              {filtered.length === 0 && query && (
                <div className="text-center text-[var(--ui-text-dim)] text-sm mt-24">
                  No scenes match <span className="text-[var(--ui-text-muted)]">&ldquo;{query}&rdquo;</span>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <FavoritesBar
        favorites={favorites}
        onPlay={onPlayScene}
        onHover={onHoverScene}
        onLeave={() => onHoverScene(null)}
      />

      {confirmDeleteId && scenes && (
        <ConfirmDelete
          scene={scenes.find(s => s.id === confirmDeleteId)!}
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

function CircleTile({
  scene, onPlay, onHover, onToggleFavorite, onEdit, onDelete,
}: {
  scene: Scene;
  onPlay: () => void;
  onHover: () => void;
  onToggleFavorite: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      className="flex flex-col items-center gap-3 group w-full"
      style={{ maxWidth: 200 }}
      onMouseEnter={onHover}
    >
      <div className="relative w-full aspect-square">
        <button
          onClick={onPlay}
          className="relative w-full h-full rounded-full overflow-hidden transition-all duration-300 hover:scale-[1.04] bg-black"
          style={{
            border: '1px solid var(--ui-border)',
            boxShadow: 'var(--ui-shadow)',
          }}
          aria-label={`Play ${scene.name}`}
        >
          {scene.posterSrc && (
            <img
              src={scene.posterSrc}
              alt=""
              className="absolute inset-0 w-full h-full object-cover brightness-80 group-hover:brightness-100 transition-all duration-300"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/15 to-black/60" />
        </button>

        <button
          onClick={onToggleFavorite}
          className={`absolute top-2 right-2 w-7 h-7 rounded-full backdrop-blur-sm flex items-center justify-center transition-all ${
            scene.isFavorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
          style={
            scene.isFavorite
              ? { background: 'var(--ui-accent)', color: 'var(--ui-accent-fg)' }
              : { background: 'rgba(0,0,0,0.5)', color: 'rgba(255,255,255,0.8)' }
          }
          aria-label={scene.isFavorite ? 'Unfavorite' : 'Favorite'}
        >
          <Bookmark size={12} strokeWidth={1.8} fill={scene.isFavorite ? 'currentColor' : 'none'} />
        </button>

        {(onEdit || onDelete) && (
          <div className="absolute top-2 left-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <button
                onClick={onEdit}
                className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm text-white/75 hover:text-white flex items-center justify-center"
                aria-label={`Edit ${scene.name}`}
              >
                <Pencil size={11} strokeWidth={1.8} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm text-white/60 hover:text-red-300 flex items-center justify-center"
                aria-label={`Delete ${scene.name}`}
              >
                <Trash2 size={11} strokeWidth={1.8} />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="text-center w-full px-1">
        <div className="text-[11px] tracking-[0.18em] uppercase text-[var(--ui-text)] leading-tight">
          {scene.name}
        </div>
        {SUBTITLE(scene) && (
          <div className="text-[9px] tracking-[0.25em] uppercase text-[var(--ui-text-dim)] mt-0.5 leading-tight">
            {SUBTITLE(scene)}
          </div>
        )}
      </div>
    </div>
  );
}

function CreateTile({ onClick }: { onClick: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 group w-full" style={{ maxWidth: 200 }}>
      <button
        onClick={onClick}
        className="w-full aspect-square rounded-full transition-all duration-300 flex items-center justify-center hover:scale-[1.04]"
        style={{
          border: '2px dashed var(--ui-border)',
          color: 'var(--ui-text-muted)',
          background: 'transparent',
        }}
        aria-label="Create scene"
      >
        <Plus size={26} strokeWidth={1.6} className="group-hover:scale-110 transition-transform" />
      </button>
      <div className="text-[11px] tracking-[0.2em] uppercase text-[var(--ui-text-muted)] text-center">Create</div>
    </div>
  );
}

function FavoritesBar({ favorites, onPlay, onHover, onLeave }: {
  favorites: Scene[];
  onPlay: (s: Scene) => void;
  onHover: (s: Scene) => void;
  onLeave: () => void;
}) {
  return (
    <div
      className="shrink-0 px-6 md:px-12 pt-3 pb-4"
      style={{
        borderTop: '1px solid var(--ui-border)',
        background: 'var(--ui-overlay-strong)',
      }}
      onMouseLeave={onLeave}
    >
      <div className="max-w-[1600px] mx-auto">
        <div className="text-[9px] tracking-[0.5em] uppercase text-[var(--ui-text-dim)] mb-2 px-1">
          Favorites
        </div>
        {favorites.length === 0 ? (
          <div className="flex items-center h-[88px]">
            <div className="text-xs tracking-[0.2em] uppercase text-[var(--ui-text-dim)]">
              Bookmark scenes to pin them here
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 overflow-x-auto overflow-y-visible pt-2 pb-1 snap-x">
            {favorites.map(s => (
              <button
                key={s.id}
                onClick={() => onPlay(s)}
                onMouseEnter={() => onHover(s)}
                className="flex flex-col items-center gap-1.5 shrink-0 snap-start group"
                style={{ width: 78 }}
                aria-label={`Play ${s.name}`}
              >
                <div
                  className="relative w-[72px] h-[72px] rounded-full overflow-hidden transition-all duration-300 group-hover:scale-[1.06]"
                  style={{ border: '1px solid var(--ui-border)' }}
                >
                  {s.posterSrc && (
                    <img
                      src={s.posterSrc}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover brightness-85 group-hover:brightness-100 transition"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50" />
                </div>
                <div className="text-[8px] tracking-[0.15em] uppercase text-[var(--ui-text-muted)] truncate w-full text-center leading-none">
                  {s.name}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ConfirmDelete({ scene, onCancel, onConfirm }: {
  scene: Scene;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
      <div
        className="rounded-2xl p-8 max-w-sm w-full"
        style={{
          background: 'var(--ui-overlay-strong)',
          border: '1px solid var(--ui-border)',
          boxShadow: 'var(--ui-shadow)',
        }}
      >
        <div className="text-[10px] tracking-[0.4em] uppercase text-[var(--ui-text-muted)] mb-2">Delete scene</div>
        <div className="text-xl font-light text-[var(--ui-text)] mb-6">{scene.name}?</div>
        <p className="text-sm text-[var(--ui-text-muted)] mb-8">
          This only deletes the mix. The underlying sounds and video stay in the library.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-full text-xs tracking-[0.3em] uppercase transition-colors"
            style={{
              border: '1px solid var(--ui-border)',
              color: 'var(--ui-text)',
              background: 'transparent',
            }}
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
