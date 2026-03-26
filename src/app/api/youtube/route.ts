import { NextResponse } from 'next/server';
import ytSearch from 'yt-search';

export const runtime = 'nodejs'; // Mantém o ambiente Node.js
export const dynamic = 'force-dynamic'; // Garante que não tente gerar estático no build

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  console.log(`[RadioHunter] Iniciando busca para: "${query}"`);

  try {
    // Executa a busca com um limite de tempo ou tratamento de erro
    const searchResult = await ytSearch(query);
    
    if (!searchResult || !searchResult.videos) {
      console.error("[RadioHunter] Nenhum resultado retornado pelo yt-search");
      return NextResponse.json({ results: [] });
    }

    const videos = searchResult.videos.slice(0, 5).map((v) => ({
      titulo: v.title,
      url: v.url,
      duracao: v.timestamp,
      thumbnail: v.thumbnail,
      id: v.videoId
    }));

    console.log(`[RadioHunter] Busca concluída com sucesso. Itens: ${videos.length}`);
    return NextResponse.json({ results: videos });

  } catch (error: any) {
    // Log detalhado no servidor da Vercel
    console.error("[RadioHunter] Erro crítico na API:", error.message);
    
    // Retorna um erro amigável em vez de um 500 seco
    return NextResponse.json(
      { error: "Erro ao buscar no YouTube", details: error.message }, 
      { status: 200 } // Retornamos 200 com erro no corpo para não quebrar o fetch do front
    );
  }
}
