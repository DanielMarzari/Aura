'use client';
import { useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import { SceneBackground } from '@/components/SceneBackground';
import { Mixer } from '@/components/Mixer';
import { SceneSelection } from '@/components/SceneSelection';
import { SceneEditor } from '@/components/SceneEditor';
import { LibraryManager } from '@/components/LibraryManager';
import { useScenesData } from '@/hooks/useScenesData';
import { useSoundscape } from '@/hooks/useSoundscape';
import type { Scene, SceneDraft } from '@/lib/types';

type View = 'selection' | 'editor' | 'library' | 'playing';

export default function HomePage() {
  const data = useScenesData();
  const sound = useSoundscape();
  const [view, setView] = useState<View>('selection');
  const [saving, setSaving] = useState(false);
  const [hoveredScene, setHoveredScene] = useState<Scene | null>(null);
  const [editingScene, setEditingScene] = useState<Scene | null>(null);

  const bg: { videoSrc: string; posterSrc: string | null } | null =
    (hoveredScene && view === 'selection')
      ? { videoSrc: hoveredScene.videoSrc, posterSrc: hoveredScene.posterSrc }
      : sound.currentScene
        ?? data.scenes?.[0]
        ?? null;

  const handlePlay = async (scene: Scene) => {
    setHoveredScene(null);
    setView('playing');
    await sound.loadScene(scene);
  };

  const handleReturnToSelection = () => {
    sound.stop();
    setView('selection');
  };

  const handleCreate = async (draft: SceneDraft) => {
    setSaving(true);
    const created = await data.createScene(draft);
    setSaving(false);
    if (created) {
      setEditingScene(null);
      setView('playing');
      await sound.loadScene(created);
    }
  };

  const handleUpdate = async (draft: SceneDraft) => {
    if (!editingScene) return;
    setSaving(true);
    const updated = await data.updateScene(editingScene.id, draft);
    setSaving(false);
    if (updated) {
      setEditingScene(null);
      // If this scene is currently playing, the Mixer still references the stale scene.
      // Easiest: return to selection so the updated scene is in the grid.
      if (sound.currentScene?.id === updated.id) {
        sound.stop();
      }
      setView('selection');
    }
  };

  const handleEdit = (scene: Scene) => {
    setEditingScene(scene);
    setView('editor');
  };

  const handleCancelEdit = () => {
    setEditingScene(null);
    setView('selection');
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden">
      {bg && <SceneBackground src={bg.videoSrc} poster={bg.posterSrc ?? undefined} />}
      {!bg && <div className="fixed inset-0 bg-black z-0" />}

      {view === 'selection' && (
        <SceneSelection
          scenes={data.scenes}
          loading={data.scenes === null}
          onPlayScene={handlePlay}
          onCreateScene={() => setView('editor')}
          onEditScene={handleEdit}
          onDeleteScene={data.deleteScene}
          onToggleFavorite={data.toggleFavorite}
          onHoverScene={setHoveredScene}
          onOpenLibrary={() => setView('library')}
        />
      )}

      {view === 'library' && data.sounds && data.videos && (
        <LibraryManager
          sounds={data.sounds}
          videos={data.videos}
          onClose={() => setView('selection')}
          onUpdateSound={data.updateSound}
          onDeleteSound={data.deleteSound}
          onUpdateVideo={data.updateVideo}
          onDeleteVideo={data.deleteVideo}
        />
      )}

      {view === 'editor' && data.videos && data.sounds && (
        <SceneEditor
          videos={data.videos}
          sounds={data.sounds}
          initialScene={editingScene}
          saving={saving}
          onCancel={handleCancelEdit}
          onSave={editingScene ? handleUpdate : handleCreate}
        />
      )}

      {view === 'playing' && sound.currentScene && (
        <>
          <div className="fixed top-6 left-6 z-20 text-[10px] tracking-[0.6em] text-[var(--ui-text-muted)] uppercase aura-fade-in">
            Aura
          </div>
          <button
            onClick={handleReturnToSelection}
            className="fixed top-6 right-6 z-20 w-9 h-9 rounded-full flex items-center justify-center transition-colors aura-fade-in"
            style={{
              border: '1px solid var(--ui-border)',
              color: 'var(--ui-text-muted)',
              background: 'var(--ui-panel)',
            }}
            title="Return to selection"
            aria-label="Return to selection"
          >
            <LayoutGrid size={14} strokeWidth={1.8} />
          </button>

          <Mixer
            scene={sound.currentScene}
            volumes={sound.volumes}
            master={sound.master}
            muted={sound.muted}
            onLayer={sound.setLayerVolume}
            onMaster={sound.setMasterVolume}
            onMute={sound.toggleMute}
          />
        </>
      )}

      {view === 'playing' && sound.status === 'loading' && !sound.currentScene && (
        <div
          className="fixed inset-0 z-40 backdrop-blur-md flex items-center justify-center"
          style={{ background: 'var(--ui-overlay)' }}
        >
          <div className="text-xs tracking-[0.5em] uppercase text-[var(--ui-text-muted)]">Loading</div>
        </div>
      )}

      {sound.error && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-red-950/80 border border-red-400/30 text-red-200 text-xs px-4 py-2 rounded-lg">
          {sound.error}
        </div>
      )}
    </main>
  );
}
