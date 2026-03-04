import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// =============================================================================
// [SESSÃO 1] - SETUP E SUPABASE
// =============================================================================
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

// =============================================================================
// [SESSÃO 2] - LOGICA DE SINCRONIZAÇÃO BI-DIRECIONAL
// =============================================================================
export async function POST(request: Request) {
  try {
    const { token, usuario, tipoObra, acao } = await request.json();
    if (!token) return NextResponse.json({ error: "Token ausente" }, { status: 401 });

    // --- SUB-SESSÃO 2.1: PUXAR DO ANILIST (PULL) ---
    if (acao === "PULL") {
      // 1. Pegar ID do usuário no AniList
      const viewerRes = await fetch('https://graphql.anilist.co', {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `query { Viewer { id } }` })
      });
      const viewerData = await viewerRes.json();
      const aniUserId = viewerData.data?.Viewer?.id;

      // 2. Buscar coleção completa
      const query = `query ($userId: Int, $type: MediaType) { MediaListCollection(userId: $userId, type: $type) { lists { entries { progress status media { id title { romaji english } coverImage { large } chapters episodes } } } } }`;
      const listRes = await fetch('https://graphql.anilist.co', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { userId: aniUserId, type: tipoObra === "ANIME" ? "ANIME" : "MANGA" } })
      });
      const listData = await listRes.json();
      const entries = listData.data?.MediaListCollection?.lists.flatMap((l: any) => l.entries) || [];

      // 3. Upsert no Supabase (Atualiza se existir, cria se não)
      const tabela = tipoObra === "ANIME" ? "animes" : "mangas";
      const mapaStatus: any = { CURRENT: "Lendo", COMPLETED: "Completos", PLANNING: "Planejo Ler", DROPPED: "Dropados", PAUSED: "Pausados" };

      for (const entry of entries) {
        const titulo = entry.media.title.romaji || entry.media.title.english;
        await supabase.from(tabela).upsert({
          usuario: usuario,
          titulo: titulo,
          capa: entry.media.coverImage.large,
          capitulo_atual: entry.progress,
          total_capitulos: entry.media.chapters || entry.media.episodes || 0,
          status: mapaStatus[entry.status] || "Lendo",
          ultima_leitura: new Date().toISOString()
        }, { onConflict: 'usuario, titulo' });
      }

      return NextResponse.json({ success: true, count: entries.length });
    }

    return NextResponse.json({ error: "Ação inválida" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}