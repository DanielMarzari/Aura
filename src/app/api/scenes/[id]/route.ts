import { NextResponse } from 'next/server';
import { deleteScene } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ok = deleteScene(id);
  if (!ok) {
    return NextResponse.json({ error: 'Not found or built-in (not deletable)' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
