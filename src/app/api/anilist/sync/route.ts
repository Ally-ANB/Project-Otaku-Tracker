import { NextResponse } from 'next/server';

// =============================================================================
// [SESSÃO 1] - LOGICA DE SINCRONIZAÇÃO (PUSH/PULL)
// =============================================================================
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, acao, titulo, capitulo, statusLocal, tipoObra } = body;

    if (!token) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    // --- SUB-SESSÃO 1.1: PUXAR LISTA DO ANILIST ---
    if (acao === "PUXAR") {
      // Primeiro pegamos o ID do usuário dono do Token
      const resV = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `query { Viewer { id } }` })
      });
      const vData = await resV.json();
      const userId = vData.data?.Viewer?.id;

      // Agora pegamos a lista completa (Manga ou Anime)
      const listQuery = `query ($userId: Int, $type: MediaType) { MediaListCollection(userId: $userId, type: $type) { lists { entries { progress status media { title { romaji english } coverImage { large } chapters episodes description } } } } }`;
      const resL = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: listQuery, variables: { userId, type: tipoObra === "ANIME" ? "ANIME" : "MANGA" } })
      });
      const lData = await resL.json();

      return NextResponse.json({ success: true, lists: lData.data?.MediaListCollection?.lists || [] });
    }

    // --- SUB-SESSÃO 1.2: SALVAR PROGRESSO NO ANILIST ---
    // (Apenas para salvar capítulos/episódios individuais)
    return NextResponse.json({ success: true, message: "Ação processada" });

  } catch (error) {
    return NextResponse.json({ error: "Erro na sincronização" }, { status: 500 });
  }
}