import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// =============================================================================
// [SESSÃO 1] - SETUP E SUPABASE
// =============================================================================
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// 🔥 Usa a Chave Mestra se existir, senão cai para a Anônima
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// =============================================================================
// [SESSÃO 2] - LOGICA DE SINCRONIZAÇÃO BI-DIRECIONAL
// =============================================================================
export async function POST(request: Request) {
  try {
    const { token, usuario, tipoObra, acao, titulo, capitulo, statusLocal } = await request.json();
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

      if (!aniUserId) return NextResponse.json({ error: "Falha ao obter ID do AniList" }, { status: 400 });

      // 2. Buscar coleção completa
      const query = `query ($userId: Int, $type: MediaType) { MediaListCollection(userId: $userId, type: $type) { lists { entries { progress status media { id title { romaji english } coverImage { large } chapters episodes } } } } }`;
      const listRes = await fetch('https://graphql.anilist.co', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { userId: aniUserId, type: tipoObra === "ANIME" ? "ANIME" : "MANGA" } })
      });
      const listData = await listRes.json();
      const entries = listData.data?.MediaListCollection?.lists.flatMap((l: any) => l.entries) || [];

      if (entries.length === 0) return NextResponse.json({ success: true, count: 0 });

      // 3. Preparar array para Upsert em Lote (Bulk Upsert)
      const tabela = tipoObra === "ANIME" ? "animes" : "mangas";
      const mapaStatus: any = { CURRENT: "Lendo", COMPLETED: "Completos", PLANNING: "Planejo Ler", DROPPED: "Dropados", PAUSED: "Pausados" };

      // Transforma o array do AniList no formato exato do nosso banco
      const obrasParaSalvar = entries.map((entry: any) => ({
        usuario: usuario,
        titulo: entry.media.title.romaji || entry.media.title.english || "Obra Desconhecida",
        capa: entry.media.coverImage.large,
        capitulo_atual: entry.progress,
        total_capitulos: entry.media.chapters || entry.media.episodes || 0,
        status: mapaStatus[entry.status] || "Lendo",
        ultima_leitura: new Date().toISOString()
      }));

      // 4. Executar o Upsert de uma vez só e TRATAR O ERRO
      const { error } = await supabase.from(tabela).upsert(obrasParaSalvar, { onConflict: 'usuario, titulo' });

      // 🔥 Se o Supabase bloquear, estouramos o erro!
      if (error) {
        console.error("Erro CRÍTICO no Supabase:", error);
        throw new Error(`Erro do Banco: ${error.message}`);
      }

      return NextResponse.json({ success: true, count: obrasParaSalvar.length });
    }

    // --- SUB-SESSÃO 2.2: ENVIAR PARA O ANILIST (PUSH/SALVAR) ---
    if (acao === "SALVAR") {
      console.log("=== [ANILIST SYNC] INICIANDO PUSH ===", { titulo, capitulo, statusLocal, tipoObra });
      if (!titulo) return NextResponse.json({ error: "Título ausente para salvar" }, { status: 400 });

      // Mapeamento Inverso (Local -> AniList)
      const mapaStatusInverso: any = {
        "Lendo": "CURRENT", "Assistindo": "CURRENT",
        "Completos": "COMPLETED",
        "Planejo Ler": "PLANNING", "Planejo Assistir": "PLANNING",
        "Dropados": "DROPPED",
        "Pausados": "PAUSED"
      };

      // 1. Buscar o ID da Mídia no AniList pelo título
      const queryMedia = `query ($search: String, $type: MediaType) { Page(perPage: 1) { media(search: $search, type: $type) { id } } }`;
      const mediaRes = await fetch('https://graphql.anilist.co', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryMedia, variables: { search: titulo, type: tipoObra === "ANIME" ? "ANIME" : "MANGA" } })
      });
      const mediaData = await mediaRes.json();
      const mediaId = mediaData.data?.Page?.media?.[0]?.id;

      console.log("=== [ANILIST SYNC] MEDIA ID ENCONTRADO ==:", mediaId);
      if (!mediaId) return NextResponse.json({ error: "Obra não encontrada no AniList" }, { status: 404 });

      // 2. Fazer a Mutation de Salvar/Atualizar (SaveMediaListEntry)
      const mutationSave = `mutation ($mediaId: Int, $progress: Int, $status: MediaListStatus) { SaveMediaListEntry(mediaId: $mediaId, progress: $progress, status: $status) { id } }`;
      const vars = {
        mediaId: mediaId,
        progress: capitulo ? parseInt(capitulo) : 0,
        status: statusLocal ? (mapaStatusInverso[statusLocal] || "CURRENT") : "CURRENT"
      };

      const saveRes = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: mutationSave, variables: vars })
      });
      const saveData = await saveRes.json();

      console.log("=== [ANILIST SYNC] RESPOSTA DA MUTATION ==:", saveData);

      if (saveData.errors) {
        console.error("Erro AniList Mutation:", saveData.errors);
        return NextResponse.json({ error: "Erro ao salvar no AniList" }, { status: 400 });
      }

      return NextResponse.json({ success: true, acao: "SALVAR", mediaId });
    }

    // --- SUB-SESSÃO 2.3: DELETAR DO ANILIST ---
    if (acao === "DELETAR") {
      if (!titulo) return NextResponse.json({ error: "Título ausente para deletar" }, { status: 400 });

      // 1. Pegar ID do usuário (Viewer)
      const viewerRes = await fetch('https://graphql.anilist.co', {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `query { Viewer { id } }` })
      });
      const viewerData = await viewerRes.json();
      const aniUserId = viewerData.data?.Viewer?.id;

      // 2. Pegar mediaId pelo titulo
      const queryMedia = `query ($search: String, $type: MediaType) { Page(perPage: 1) { media(search: $search, type: $type) { id } } }`;
      const mediaRes = await fetch('https://graphql.anilist.co', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryMedia, variables: { search: titulo, type: tipoObra === "ANIME" ? "ANIME" : "MANGA" } })
      });
      const mediaData = await mediaRes.json();
      const mediaId = mediaData.data?.Page?.media?.[0]?.id;

      if (aniUserId && mediaId) {
         // 3. Pegar o ID da entrada na lista do usuário
         const queryEntry = `query ($userId: Int, $mediaId: Int) { MediaList(userId: $userId, mediaId: $mediaId) { id } }`;
         const entryRes = await fetch('https://graphql.anilist.co', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: queryEntry, variables: { userId: aniUserId, mediaId: mediaId } })
         });
         const entryData = await entryRes.json();
         const entryId = entryData.data?.MediaList?.id;

         if (entryId) {
             // 4. Deletar a entrada
             const mutationDelete = `mutation ($id: Int) { DeleteMediaListEntry(id: $id) { deleted } }`;
             await fetch('https://graphql.anilist.co', {
                method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: mutationDelete, variables: { id: entryId } })
             });
         }
      }
      return NextResponse.json({ success: true, acao: "DELETAR" });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (err: any) {
    console.error("Erro na API de Sync:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}