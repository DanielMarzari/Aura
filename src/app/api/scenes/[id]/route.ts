import { NextResponse } from 'next/server';
import { deleteScene, setSceneFavorite, updateScene } from '@/lib/db';
import type { SceneDraft } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ok = deleteScene(id);
  if (!ok) {
    return NextResponse.json({ error: 'Not found or built-in (not deletable)' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null) as (Partial<SceneDraft> & { isFavorite?: boolean }) | null;
  if (!body) return NextResponse.json({ error: 'Empty body' }, { status: 400 });

  // Favorite toggle
  if (typeof body.isFavorite === 'boolean') {
    const updated = setSceneFavorite(id, body.isFavorite);
    if (!updated) return NextResponse.json({ error: 'Scene not found' }, { status: 404 });
    return NextResponse.json({ scene: updated });
  }

  // Full edit
  if (!body.name || !body.videoId || !Array.isArray(body.layers) || body.layers.length === 0) {
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
  const updated = updateScene(id, draft);
  if (!updated) return NextResponse.json({ error: 'Not found or built-in (not editable)' }, { status: 404 });
  return NextResponse.json({ scene: updated });
}
