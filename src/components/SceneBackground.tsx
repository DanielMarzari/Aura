'use client';
import { useEffect, useRef, useState } from 'react';

type Props = {
  src: string;
  poster?: string;
};

type Layer = { src: string; poster?: string };

export function SceneBackground({ src, poster }: Props) {
  const [layers, setLayers] = useState<[Layer, Layer]>([{ src, poster }, { src, poster }]);
  const [activeIdx, setActiveIdx] = useState(0);
  const prevSrcRef = useRef(src);

  useEffect(() => {
    if (src === prevSrcRef.current) return;
    prevSrcRef.current = src;
    const nextIdx = 1 - activeIdx;
    setLayers(prev => {
      const next: [Layer, Layer] = [...prev] as [Layer, Layer];
      next[nextIdx] = { src, poster };
      return next;
    });
    const t = setTimeout(() => setActiveIdx(nextIdx), 50);
    return () => clearTimeout(t);
  }, [src, poster, activeIdx]);

  return (
    <>
      {layers.map((l, i) => (
        <VideoLayer
          key={`${l.src}-${i}`}
          src={l.src}
          poster={l.poster}
          active={i === activeIdx}
        />
      ))}
      <div className="fixed inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/60 z-[1] pointer-events-none" />
    </>
  );
}

function VideoLayer({ src, poster, active }: { src: string; poster?: string; active: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (active) {
      v.play().catch(() => {});
    }
  }, [active, src]);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      className={`fixed inset-0 w-full h-full object-cover z-0 transition-opacity duration-[1500ms] ease-out ${active ? 'opacity-100' : 'opacity-0'}`}
    />
  );
}
