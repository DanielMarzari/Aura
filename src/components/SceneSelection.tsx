'use client';
import { useMemo, useState } from 'react';
import { Bookmark, Plus, Search, Trash2, X } from 'lucide-react';
import type { Scene } from '@/lib/types';
import { SUBTITLE } from '@/lib/types';
import { ThemeToggle } from './ThemeToggle';

type Props = {
  scenes: Scene[] | null;
  onPlayScene: (scene: Scene) => void;
  onCreateScene: () => void;
  onDeleteScene: (id: string) => void;
  onToggleFavorite: (id: string, next: boolean) => void;
  onHoverScene: (scene: Scene | null) => void;
  loading?: boolean;
};

export function SceneSelection({
  scenes, onPlayScene, onCreateScene, onDeleteScene, onToggleFavorite, onHoverScene, loading,
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

  const featured = filtered.filter(s => s.isBuiltin);
  const yours = filtered.filter(s => !s.isBuiltin);
  const favorites = filtered.filter(s => s.isFavorite);

  return (
    <div
      className="fixed inset-0 z-30 backdrop-blur-md flex flex-col"
      style={{ background: 'var(--ui-overlay)' }}
    >
      <header className="flex items-center justify-between px-8 md:px-12 py-7 shrink-0">
        <div className="flex items-center gap-3">
          <div className="text-[10px] tracking-[0.6em] uppercase text-[var(--ui-text-muted)]">Aura</div>
          <ThemeToggle />
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
              borderWidth: 1,
              borderStyle: 'solid',
              borderColor: 'var(--ui-border)',
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

      <div className="flex-1 overflow-y-auto px-6 md:px-12 pb-8" onMouseLeave={() => onHoverScene(null)}>
        {loading && !scenes && (
          <div className="flex justify-center gap-6 mt-16">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="w-36 h-36 rounded-full animate-pulse"
                style={{ background: 'var(--ui-panel)', border: '1px solid var(--ui-border)' }}
              />
            ))}
          </div>
        )}

        {scenes && (
          <div className="max-w-[1600px] mx-auto space-y-12 mt-4">
            {favorites.length > 0 && (
              <Row label="Your Favorites">
                <HorizontalScroll>
                  {favorites.map(s => (
                    <CircleTile
                      key={s.id}
                      scene={s}
                      size="md"
                      onPlay={() => onPlayScene(s)}
                      onHover={() => onHoverScene(s)}
                      onToggleFavorite={() => onToggleFavorite(s.id, !s.isFavorite)}
                      onDelete={s.isBuiltin ? undefined : () => setConfirmDeleteId(s.id)}
                    />
                  ))}
                </HorizontalScroll>
              </Row>
            )}

            {featured.length > 0 && (
              <Row label="Featured">
                <HorizontalScroll>
                  {featured.map(s => (
                    <CircleTile
                      key={s.id}
                      scene={s}
                      size="lg"
                      onPlay={() => onPlayScene(s)}
                      onHover={() => onHoverScene(s)}
                      onToggleFavorite={() => onToggleFavorite(s.id, !s.isFavorite)}
                    />
                  ))}
                </HorizontalScroll>
              </Row>
            )}

            {yours.length > 0 && (
              <Row label="Your Scenes">
                <HorizontalScroll>
                  {yours.map(s => (
                    <CircleTile
                      key={s.id}
                      scene={s}
                      size="md"
                      onPlay={() => onPlayScene(s)}
                      onHover={() => onHoverScene(s)}
                      onToggleFavorite={() => onToggleFavorite(s.id, !s.isFavorite)}
                      onDelete={() => setConfirmDeleteId(s.id)}
                    />
                  ))}
                  <CreateTile onClick={onCreateScene} size="md" />
                </HorizontalScroll>
              </Row>
            )}

            {yours.length === 0 && (
              <Row label="Your Scenes">
                <div className="flex gap-4 px-1 py-3">
                  <CreateTile onClick={onCreateScene} size="md" />
                  <div className="self-center text-[var(--ui-text-dim)] text-xs tracking-[0.2em] uppercase">
                    Mix your own
                  </div>
                </div>
              </Row>
            )}

            {filtered.length === 0 && query && (
              <div className="text-center text-[var(--ui-text-dim)] text-sm mt-24">
                No scenes match <span className="text-[var(--ui-text-muted)]">&ldquo;{query}&rdquo;</span>
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="text-center text-[var(--ui-text-dim)] text-[10px] tracking-[0.3em] uppercase pb-5 shrink-0">
        Best with headphones · Hover a scene to preview
      </footer>

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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] tracking-[0.4em] uppercase text-[var(--ui-text-muted)] mb-3 px-1">
        {label}
      </div>
      {children}
    </div>
  );
}

function HorizontalScroll({ children }: { children: React.ReactNode }) {
  // py-4 leaves room for the hover/selected scale transform so the top edge isn't clipped
  return (
    <div className="flex items-start gap-5 overflow-x-auto overflow-y-visible pb-3 pt-4 -mx-1 px-1 snap-x">
      {children}
    </div>
  );
}

function CircleTile({
  scene, size, onPlay, onHover, onToggleFavorite, onDelete,
}: {
  scene: Scene;
  size: 'lg' | 'md' | 'sm';
  onPlay: () => void;
  onHover: () => void;
  onToggleFavorite: () => void;
  onDelete?: () => void;
}) {
  const px = size === 'lg' ? 168 : size === 'md' ? 132 : 96;

  return (
    <div
      className="flex flex-col items-center gap-3 shrink-0 snap-start group"
      style={{ width: px }}
      onMouseEnter={onHover}
    >
      <div className="relative" style={{ width: px, height: px }}>
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
            scene.isFavorite
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100'
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

        {onDelete && (
          <button
            onClick={onDelete}
            className="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm text-white/60 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            aria-label={`Delete ${scene.name}`}
          >
            <Trash2 size={12} strokeWidth={1.8} />
          </button>
        )}
      </div>

      <div className="text-center w-full">
        <div className="text-[11px] md:text-xs tracking-[0.18em] uppercase text-[var(--ui-text)] truncate">
          {scene.name}
        </div>
        {SUBTITLE(scene) && (
          <div className="text-[9px] tracking-[0.25em] uppercase text-[var(--ui-text-dim)] mt-0.5 truncate">
            {SUBTITLE(scene)}
          </div>
        )}
      </div>
    </div>
  );
}

function CreateTile({ onClick, size }: { onClick: () => void; size: 'md' | 'sm' }) {
  const px = size === 'md' ? 132 : 96;
  return (
    <div className="flex flex-col items-center gap-3 shrink-0 snap-start group" style={{ width: px }}>
      <button
        onClick={onClick}
        className="relative rounded-full transition-all duration-300 flex items-center justify-center hover:scale-[1.04]"
        style={{
          width: px,
          height: px,
          border: '2px dashed var(--ui-border)',
          color: 'var(--ui-text-muted)',
          background: 'transparent',
        }}
        aria-label="Create scene"
      >
        <Plus size={24} strokeWidth={1.6} className="group-hover:scale-110 transition-transform" />
      </button>
      <div className="text-[11px] tracking-[0.2em] uppercase text-[var(--ui-text-muted)] text-center">Create</div>
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
