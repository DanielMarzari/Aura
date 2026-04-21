import { NextResponse } from 'next/server';
import { listVideos } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ videos: listVideos() });
}
