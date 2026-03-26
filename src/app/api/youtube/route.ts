import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) return NextResponse.json({ results: [] });

  try {
    // Import dinâmico com cast para contornar a checagem de tipo e de ambiente
    const yts = await import('yt-search').then(mod => mod.default || mod);
    const r = await yts(query);

    const videos = (r.videos || []).slice(0, 5).map((v: any) => ({
      titulo: v.title,
      url: v.url,
      duracao: v.timestamp,
      thumbnail: v.thumbnail,
      id: v.videoId
    }));

    return NextResponse.json({ results: videos });
  } catch (error: any) {
    console.error("Erro na API de Busca:", error.message);
    // Se o YouTube bloquear o IP da Vercel, retornamos vazio em vez de erro 500
    return NextResponse.json({ results: [], error: "Busca limitada pelo YouTube" });
  }
}
