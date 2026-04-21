import { NextResponse } from 'next/server';
import { createScene, listScenes } from '@/lib/db';
import type { SceneDraft } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ scenes: listScenes() });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as Partial<SceneDraft> | null;
  if (!body || !body.name || !body.videoId || !Array.isArray(body.layers) || body.layers.length === 0) {
    return NextResponse.json(
      { error: 'Missing required fields: name, videoId, at least one layer' },
      { status: 400 }
    );
  }
  const draft: SceneDraft = {
    name: body.name.trim().slice(0, 80),
    location: body.location?.trim().slice(0, 80) || null,
    timeOfDay: body.timeOfDay?.trim().slice(0, 80) || null,
    videoId: body.videoId,
    layers: body.layers
      .filter(l => l && typeof l.soundId === 'string')
      .map(l => ({
        soundId: l.soundId,
        volume: typeof l.volume === 'number' ? Math.max(0, Math.min(1, l.volume)) : 0.5,
      })),
  };
  if (draft.layers.length === 0) {
    return NextResponse.json({ error: 'At least one valid layer required' }, { status: 400 });
  }
  const scene = createScene(draft);
  return NextResponse.json({ scene }, { status: 201 });
}
