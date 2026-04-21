'use client';
import { useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import { SceneBackground } from '@/components/SceneBackground';
import { Mixer } from '@/components/Mixer';
import { SceneSelection } from '@/components/SceneSelection';
import { SceneEditor } from '@/components/SceneEditor';
import { useScenesData } from '@/hooks/useScenesData';
import { useSoundscape } from '@/hooks/useSoundscape';
import type { Scene, SceneDraft } from '@/lib/types';

type View = 'selection' | 'editor' | 'playing';

export default function HomePage() {
  const data = useScenesData();
  const sound = useSoundscape();
  const [view, setView] = useState<View>('selection');
  const [saving, setSaving] = useState(false);

  const bgScene: { videoSrc: string; posterSrc: string | null } | null =
    sound.currentScene ??
    data.scenes?.[0] ??
    null;

  const handlePlay = async (scene: Scene) => {
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
      setView('playing');
      await sound.loadScene(created);
    }
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden">
      {bgScene && <SceneBackground src={bgScene.videoSrc} poster={bgScene.posterSrc ?? undefined} />}
      {!bgScene && <div className="fixed inset-0 bg-black z-0" />}

      {view === 'selection' && (
        <SceneSelection
          scenes={data.scenes}
          loading={data.scenes === null}
          onPlayScene={handlePlay}
          onCreateScene={() => setView('editor')}
          onDeleteScene={data.deleteScene}
        />
      )}

      {view === 'editor' && data.videos && data.sounds && (
        <SceneEditor
          videos={data.videos}
          sounds={data.sounds}
          saving={saving}
          onCancel={() => setView('selection')}
          onSave={handleCreate}
        />
      )}

      {view === 'playing' && sound.currentScene && (
        <>
          <div className="fixed top-6 left-6 z-20 text-[10px] tracking-[0.6em] text-white/55 uppercase aura-fade-in">
            Aura
          </div>
          <button
            onClick={handleReturnToSelection}
            className="fixed top-6 right-6 z-20 w-9 h-9 rounded-full border border-white/20 text-white/75 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors aura-fade-in"
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
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md flex items-center justify-center">
          <div className="text-xs tracking-[0.5em] uppercase text-white/60">Loading</div>
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
