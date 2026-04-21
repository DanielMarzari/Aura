'use client';
import { useState } from 'react';
import { SceneBackground } from '@/components/SceneBackground';
import { Mixer } from '@/components/Mixer';
import { SceneGallery } from '@/components/SceneGallery';
import { scenes, defaultScene, type Scene } from '@/lib/scenes';
import { useSoundscape } from '@/hooks/useSoundscape';

export default function HomePage() {
  const sound = useSoundscape();
  const [previewScene, setPreviewScene] = useState<Scene>(defaultScene);
  const [view, setView] = useState<'landing' | 'playing'>('landing');
  const [pickerOpen, setPickerOpen] = useState(false);

  const activeScene = sound.currentScene ?? previewScene;

  const handleBegin = async () => {
    await sound.loadScene(previewScene);
    setView('playing');
  };

  const handleSwitchScene = (scene: Scene) => {
    setPreviewScene(scene);
    if (view === 'playing') {
      void sound.loadScene(scene);
      setPickerOpen(false);
    }
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden">
      <SceneBackground src={activeScene.videoSrc} poster={activeScene.posterSrc} />

      <div
        className={`fixed inset-0 z-30 flex flex-col items-center justify-center bg-black/55 backdrop-blur-sm transition-opacity duration-1000 ${
          view === 'landing' ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="text-[10px] tracking-[0.6em] text-white/50 uppercase mb-4">Aura</div>
        <h1 className="text-5xl md:text-7xl font-extralight tracking-widest text-white/95 mb-3 text-center px-4">
          {previewScene.name}
        </h1>
        <p className="text-white/55 text-sm tracking-[0.3em] uppercase mb-10 text-center px-4">
          {previewScene.subtitle}
        </p>
        <button
          onClick={handleBegin}
          disabled={sound.status === 'loading'}
          className="px-10 py-3.5 rounded-full border border-white/25 bg-white/5 hover:bg-white/15 hover:border-white/50 text-white/90 text-xs tracking-[0.4em] uppercase transition-all duration-500 backdrop-blur-md disabled:opacity-50 disabled:cursor-wait"
        >
          {sound.status === 'loading' ? 'Loading' : 'Begin'}
        </button>
        {sound.error && (
          <p className="mt-6 text-red-300/80 text-xs max-w-md text-center px-4">{sound.error}</p>
        )}

        <div className="absolute bottom-20 px-4">
          <SceneGallery
            scenes={scenes}
            selectedId={previewScene.id}
            onSelect={handleSwitchScene}
          />
        </div>
        <p className="absolute bottom-6 text-white/30 text-[10px] tracking-[0.3em] uppercase">
          Best with headphones
        </p>
      </div>

      {view === 'playing' && sound.currentScene && (
        <>
          <div className="fixed top-6 left-6 z-20 text-[10px] tracking-[0.6em] text-white/55 uppercase aura-fade-in">
            Aura
          </div>
          <button
            onClick={() => setPickerOpen(p => !p)}
            className={`fixed top-6 right-6 z-20 w-9 h-9 rounded-full border flex items-center justify-center transition-colors aura-fade-in ${
              pickerOpen
                ? 'border-white/60 bg-white/15 text-white'
                : 'border-white/20 text-white/75 hover:text-white hover:bg-white/10'
            }`}
            title="Change scene"
            aria-label="Change scene"
          >
            <IconGrid />
          </button>

          <div
            className={`fixed top-20 right-6 z-20 p-5 rounded-2xl bg-black/45 backdrop-blur-xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] transition-all duration-300 ${
              pickerOpen
                ? 'opacity-100 translate-y-0 pointer-events-auto'
                : 'opacity-0 -translate-y-2 pointer-events-none'
            }`}
          >
            <div className="mb-3 text-[10px] tracking-[0.4em] uppercase text-white/50">Scenes</div>
            <SceneGallery
              scenes={scenes}
              selectedId={sound.currentScene.id}
              onSelect={handleSwitchScene}
              size="sm"
            />
          </div>

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
    </main>
  );
}

function IconGrid() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}
