import ytpl from '@distube/ytpl';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_ITEMS = 500;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url')?.trim();

  if (!url) {
    return NextResponse.json({ videos: [], error: 'Parâmetro url ausente' }, { status: 400 });
  }

  try {
    const result = await ytpl(url, { limit: MAX_ITEMS });
    const videos = result.items.map((v) => ({
      titulo: v.title,
      url: v.url_simple || v.url,
      thumbnail: v.thumbnail,
      id: v.id,
    }));

    return NextResponse.json({ videos });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[api/youtube-playlist]', message);
    return NextResponse.json(
      { videos: [], error: 'Não foi possível ler esta playlist do YouTube' },
      { status: 502 }
    );
  }
}
