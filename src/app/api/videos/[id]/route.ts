import { NextResponse } from 'next/server';
import { deleteVideo, updateVideo } from '@/lib/db';
import type { VideoUpdate } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null) as Partial<VideoUpdate> | null;
  if (!body) return NextResponse.json({ error: 'Empty body' }, { status: 400 });
  const patch: VideoUpdate = {};
  if (typeof body.name === 'string') patch.name = body.name.trim();
  if (Array.isArray(body.tags)) patch.tags = body.tags.filter(t => typeof t === 'string');
  if (Array.isArray(body.regions)) patch.regions = body.regions.filter(r => typeof r === 'string');
  if (typeof body.sortOrder === 'number') patch.sortOrder = body.sortOrder;
  const updated = updateVideo(id, patch);
  if (!updated) return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  return NextResponse.json({ video: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = deleteVideo(id);
  if (!result.ok) return NextResponse.json({ error: result.reason ?? 'Cannot delete' }, { status: 409 });
  return NextResponse.json({ ok: true });
}
