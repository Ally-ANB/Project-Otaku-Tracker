import { API_DB_PATH } from "@/lib/dbClient";
import { supabase } from "../supabase";
import {
  type GuildaRank,
  type ResultadoRecompensaRank,
  type StatsHunterAgregado,
  ESMOLAS_BONUS_POR_OBRA_DIA,
  ESTANTE_ESMOLAS_LIMITE_DIARIO,
  acumularObraNasStats,
  calcularRecompensaSubidaDeRank,
  calcularXpTotalHunter,
  ordenarRanksPorXpMinimoDesc,
  statsVazio,
} from "./rankUtils";

async function apiAtualizarPerfil(nome_original: string, dados: Record<string, unknown>) {
  const res = await fetch(API_DB_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tabela: "perfis", nome_original, dados }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok && !!data?.success, data };
}

export async function buscarGuildaRanksOrdenados(): Promise<GuildaRank[]> {
  const { data, error } = await supabase
    .from("guilda_ranks")
    .select("id,nome,xp_minimo,recompensa_esmolas,classes_tailwind")
    .order("xp_minimo", { ascending: false });
  if (error || !data?.length) return [];
  return data as GuildaRank[];
}

async function agregarStatsUsuario(nomeUsuario: string): Promise<StatsHunterAgregado> {
  const [m, a, f, l, s, j, mu] = await Promise.all([
    supabase.from("mangas").select("usuario, capitulo_atual, favorito, status").eq("usuario", nomeUsuario),
    supabase.from("animes").select("usuario, capitulo_atual, favorito, status").eq("usuario", nomeUsuario),
    supabase.from("filmes").select("usuario, capitulo_atual, favorito, status").eq("usuario", nomeUsuario),
    supabase.from("livros").select("usuario, capitulo_atual, favorito, status").eq("usuario", nomeUsuario),
    supabase.from("series").select("usuario, capitulo_atual, favorito, status").eq("usuario", nomeUsuario),
    supabase.from("jogos").select("usuario, capitulo_atual, favorito, status").eq("usuario", nomeUsuario),
    supabase.from("musicas").select("usuario, capitulo_atual, favorito, status").eq("usuario", nomeUsuario),
  ]);

  const stats = statsVazio();
  const proc = (dados: Record<string, unknown>[] | null, tipo: Parameters<typeof acumularObraNasStats>[2]) => {
    (dados || []).forEach((obra) => acumularObraNasStats(stats, obra, tipo));
  };

  proc(m.data, "outro");
  proc(a.data, "anime");
  proc(f.data, "filme");
  proc(l.data, "livro");
  proc(s.data, "serie");
  proc(j.data, "jogo");
  proc(mu.data, "musica");

  return stats;
}

interface EfeitosEconomia {
  mensagensToast: string[];
  bonusEsmolasEstante: number;
  esmolasRank: number;
}

/** Após inserir obra na estante: XP já refletido na contagem de obras; aplica bônus diário e rank. */
export async function aplicarEconomiaPosAdicaoEstante(usuario: string): Promise<EfeitosEconomia> {
  const mensagensToast: string[] = [];
  const { data: perfil, error: ePerfil } = await supabase
    .from("perfis")
    .select("esmolas, xp_missoes, guilda_ultimo_rank_id, estante_adicoes_hoje")
    .eq("nome_original", usuario)
    .maybeSingle();

  if (ePerfil || !perfil) {
    return { mensagensToast, bonusEsmolasEstante: 0, esmolasRank: 0 };
  }

  const hoje = new Date().toISOString().split("T")[0];
  let farm = (perfil.estante_adicoes_hoje as { data?: string; count?: number } | null) || { data: hoje, count: 0 };
  if (farm.data !== hoje) farm = { data: hoje, count: 0 };
  const prevCount = typeof farm.count === "number" ? farm.count : 0;
  const adicoesHoje = prevCount + 1;
  farm = { data: hoje, count: adicoesHoje };

  let bonusEsmolasEstante = 0;
  if (adicoesHoje <= ESTANTE_ESMOLAS_LIMITE_DIARIO) {
    bonusEsmolasEstante = ESMOLAS_BONUS_POR_OBRA_DIA;
    mensagensToast.push(
      `Bônus de estante: +${bonusEsmolasEstante} Esmolas (${adicoesHoje}/${ESTANTE_ESMOLAS_LIMITE_DIARIO} obras hoje).`
    );
  }

  const ranks = ordenarRanksPorXpMinimoDesc(await buscarGuildaRanksOrdenados());
  const stats = await agregarStatsUsuario(usuario);
  const totalXp = calcularXpTotalHunter(stats, perfil.xp_missoes || 0);
  const ranksPorId = new Map(ranks.map((r) => [r.id, r]));
  const rankRes = calcularRecompensaSubidaDeRank(
    ranks,
    totalXp,
    perfil.guilda_ultimo_rank_id as string | null,
    ranksPorId
  );

  if (rankRes.mensagemToast) mensagensToast.push(rankRes.mensagemToast);

  let saldo = perfil.esmolas || 0;
  saldo += bonusEsmolasEstante + rankRes.esmolasExtras;

  const dados: Record<string, unknown> = {
    estante_adicoes_hoje: farm,
    esmolas: saldo,
  };
  if (rankRes.novoUltimoRankId !== perfil.guilda_ultimo_rank_id) {
    dados.guilda_ultimo_rank_id = rankRes.novoUltimoRankId;
  }

  const { ok } = await apiAtualizarPerfil(usuario, dados);
  if (!ok) {
    return { mensagensToast: [], bonusEsmolasEstante: 0, esmolasRank: 0 };
  }

  return {
    mensagensToast,
    bonusEsmolasEstante,
    esmolasRank: rankRes.esmolasExtras,
  };
}

/** Usa o XP de missões já projetado (ex.: após +XP por missão) para calcular esmolas / toast de rank sem gravar. */
export async function preverRecompensaRank(
  usuario: string,
  xpMissoes: number,
  guildaUltimoRankId: string | null
): Promise<ResultadoRecompensaRank> {
  const ranks = ordenarRanksPorXpMinimoDesc(await buscarGuildaRanksOrdenados());
  if (!ranks.length) {
    return { novoUltimoRankId: guildaUltimoRankId, esmolasExtras: 0, mensagemToast: null };
  }
  const stats = await agregarStatsUsuario(usuario);
  const totalXp = calcularXpTotalHunter(stats, xpMissoes);
  const ranksPorId = new Map(ranks.map((r) => [r.id, r]));
  return calcularRecompensaSubidaDeRank(ranks, totalXp, guildaUltimoRankId, ranksPorId);
}
