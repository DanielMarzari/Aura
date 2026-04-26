import { NextResponse } from 'next/server';
import { deleteSound, updateSound } from '@/lib/db';
import type { SoundUpdate } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null) as Partial<SoundUpdate> | null;
  if (!body) return NextResponse.json({ error: 'Empty body' }, { status: 400 });
  const patch: SoundUpdate = {};
  if (typeof body.name === 'string') patch.name = body.name.trim();
  if (typeof body.group === 'string') patch.group = body.group.trim();
  if (typeof body.defaultVolume === 'number') patch.defaultVolume = body.defaultVolume;
  if (Array.isArray(body.regions)) patch.regions = body.regions.filter(r => typeof r === 'string');
  if (typeof body.sortOrder === 'number') patch.sortOrder = body.sortOrder;
  const updated = updateSound(id, patch);
  if (!updated) return NextResponse.json({ error: 'Sound not found' }, { status: 404 });
  return NextResponse.json({ sound: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = deleteSound(id);
  if (!result.ok) return NextResponse.json({ error: result.reason ?? 'Cannot delete' }, { status: 409 });
  return NextResponse.json({ ok: true });
}
