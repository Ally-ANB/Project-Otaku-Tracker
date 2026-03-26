import ytsr from '@distube/ytsr';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) return NextResponse.json({ results: [] });

  try {
    const result = await ytsr(query.trim(), { limit: 5, type: 'video' });
    const videos = result.items.map((v) => ({
      titulo: v.name,
      url: v.url,
      duracao: v.duration,
      thumbnail: v.thumbnail,
      id: v.id,
    }));

    return NextResponse.json({ results: videos });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[api/youtube]', message);
    return NextResponse.json({ results: [], error: 'Busca limitada pelo YouTube' });
  }
}
