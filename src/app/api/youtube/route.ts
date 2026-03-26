import { NextResponse } from 'next/server';

// Força a Vercel a usar o ambiente Node completo
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  try {
    /**
     * ESTRATÉGIA DE ISOLAMENTO:
     * Usamos 'require' dentro da função para que o bundler não tente
     * analisar a biblioteca durante a fase de build/estática.
     */
    const yts = require('yt-search');

    // Executa a busca
    const searchResult = await yts(query);

    if (!searchResult || !searchResult.videos) {
      return NextResponse.json({ results: [] });
    }

    const videos = searchResult.videos.slice(0, 5).map((v: any) => ({
      titulo: v.title,
      url: v.url,
      duracao: v.timestamp,
      thumbnail: v.thumbnail,
      id: v.videoId
    }));

    return NextResponse.json({ results: videos });

  } catch (error: any) {
    console.error("[RadioHunter] Erro no Servidor:", error.message);
    return NextResponse.json(
      { error: "Erro ao buscar", details: error.message },
      { status: 200 } // Retornamos 200 para o rádio não 'morrer' no front
    );
  }
}
