import { NextResponse } from 'next/server';
import { deleteScene, setSceneFavorite } from '@/lib/db';

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
  const body = await req.json().catch(() => null) as { isFavorite?: boolean } | null;
  if (!body || typeof body.isFavorite !== 'boolean') {
    return NextResponse.json({ error: 'Missing isFavorite boolean' }, { status: 400 });
  }
  const updated = setSceneFavorite(id, body.isFavorite);
  if (!updated) return NextResponse.json({ error: 'Scene not found' }, { status: 404 });
  return NextResponse.json({ scene: updated });
}
