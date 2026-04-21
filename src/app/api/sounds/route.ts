import { NextResponse } from 'next/server';
import { listSounds } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ sounds: listSounds() });
}
