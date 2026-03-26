import type { EstatisticasHunter, FiltroRanking } from "./types";

export function metricaRanking(filtro: FiltroRanking, hunter: EstatisticasHunter) {
  let corTexto = "text-indigo-400";
  let valor = hunter.total_obras;
  let label = "Obras Lidas";
  if (filtro === "ESMOLAS") {
    corTexto = "text-yellow-500";
    valor = hunter.esmolas;
    label = "Esmolas";
  } else if (filtro === "TEMPO") {
    corTexto = "text-purple-400";
    valor = hunter.tempo_vida;
    label = "Horas Consumidas";
  } else if (filtro === "CAPITULOS") {
    corTexto = "text-red-400";
    valor = hunter.total_capitulos;
    label = "Caps / Episódios";
  } else if (filtro === "FAVORITOS") {
    corTexto = "text-green-400";
    valor = hunter.total_favoritos;
    label = "Obras Favoritas";
  } else if (filtro === "CONQUISTAS") {
    corTexto = "text-cyan-400";
    valor = hunter.total_conquistas;
    label = "Troféus Desbloqueados";
  }
  return { corTexto, valor, label };
}

/** Linha da tabela `guilda_ranks` (Supabase). */
export interface GuildaRank {
  id: string;
  nome: string;
  xp_minimo: number;
  recompensa_esmolas: number;
  classes_tailwind: string;
}

/** Agregado por usuário — mesma lógica de `gerarRanking` na página da guilda. */
export interface StatsHunterAgregado {
  obras: number;
  caps: number;
  tempoMin: number;
  favs: number;
  filmes: number;
  livros: number;
}

export const XP_POR_OBRA_NA_ESTANTE = 10;
export const XP_POR_TROFEU = 50;
export const XP_POR_MISSAO_COMPLETA = 40;
/** Esmolas extras por obra adicionada no dia, até o limite diário (ver `ESTANTE_ESMOLAS_LIMITE_DIARIO`). */
export const ESMOLAS_BONUS_POR_OBRA_DIA = 10;
export const ESTANTE_ESMOLAS_LIMITE_DIARIO = 5;

export function ordenarRanksPorXpMinimoDesc(ranks: GuildaRank[]): GuildaRank[] {
  return [...ranks].sort((a, b) => b.xp_minimo - a.xp_minimo);
}

export function ordenarRanksPorXpMinimoAsc(ranks: GuildaRank[]): GuildaRank[] {
  return [...ranks].sort((a, b) => a.xp_minimo - b.xp_minimo);
}

/** XP total de ascensão (mesma base que `rankAtualDeListaOrdenada`). */
export function totalXpAscensaoHunter(input: {
  total_obras?: number;
  total_conquistas?: number;
  xp_missoes?: number;
}): number {
  const obras = input.total_obras ?? 0;
  const conquistas = input.total_conquistas ?? 0;
  const xpMissoes = input.xp_missoes ?? 0;
  return obras * XP_POR_OBRA_NA_ESTANTE + xpMissoes + conquistas * XP_POR_TROFEU;
}

/** Próximo degrau acima do XP atual (null se já no teto da tabela). */
export function proximoRankPorXp(ranksAsc: GuildaRank[], totalXp: number): GuildaRank | null {
  for (const r of ranksAsc) {
    if (r.xp_minimo > totalXp) return r;
  }
  return null;
}

/** Tokens de `classes_tailwind` adequados ao nome do rank (evita `border-*` no texto). */
export function classesTailwindNomeRank(classesTailwind: string): string {
  const parts = classesTailwind.trim().split(/\s+/).filter(Boolean);
  const keep = parts.filter(
    (c) =>
      c.startsWith("text-") ||
      c.startsWith("drop-shadow") ||
      c.startsWith("animate-") ||
      c.startsWith("font-")
  );
  return keep.join(" ") || "text-zinc-400";
}

/** Borda / sombra do rank (avatar, trilha da barra) — extrai de `classes_tailwind` da tabela. */
export function classesTailwindContornoRank(classesTailwind: string): string {
  const parts = classesTailwind.trim().split(/\s+/).filter(Boolean);
  return parts
    .filter(
      (c) =>
        c.startsWith("border-") ||
        c.startsWith("shadow") ||
        c.startsWith("ring-") ||
        c.startsWith("drop-shadow")
    )
    .join(" ");
}

/** Progresso de XP entre o rank atual e o próximo degrau (0–100; 100 se não houver próximo). */
export function percentualAscensaoAteProximoRank(
  totalXp: number,
  rankAtual: GuildaRank | null,
  proximoRank: GuildaRank | null
): number {
  if (!proximoRank) return 100;
  const base = rankAtual?.xp_minimo ?? 0;
  const span = proximoRank.xp_minimo - base;
  if (span <= 0) return 100;
  const pct = ((totalXp - base) / span) * 100;
  return Math.min(100, Math.max(0, pct));
}

/** Total XP usado para ranks: obras na estante + missões + troféus (mesma fórmula que a guilda usa para troféus). */
export function calcularXpTotalHunter(stats: StatsHunterAgregado, xpMissoes: number): number {
  const trofeus = contarTrofeusDeAgregado(stats);
  return stats.obras * XP_POR_OBRA_NA_ESTANTE + xpMissoes + trofeus * XP_POR_TROFEU;
}

/** Replica a contagem de troféus de `guilda/page.tsx` → `gerarRanking`. */
export function contarTrofeusDeAgregado(s: StatsHunterAgregado): number {
  let trofeus = 0;
  for (let id = 1; id <= 85; id++) {
    let check = false;
    if (id <= 50) {
      if (id === 1) check = s.obras >= 1;
      else if (id === 2) check = s.obras >= 10;
      else if (id === 3) check = s.caps >= 100;
      else if (id === 4) check = Math.floor(s.tempoMin / 60) >= 10;
      else if (id === 5) check = s.favs >= 5;
      else check = s.obras >= id * 3;
    } else if (id <= 70) {
      check = s.filmes >= (id - 50) * 5;
    } else {
      check = s.livros >= (id - 70) * 5;
    }
    if (check) trofeus++;
  }
  return trofeus;
}

type TipoObraStats = "anime" | "filme" | "livro" | "outro" | "serie" | "jogo" | "musica";

export function statsVazio(): StatsHunterAgregado {
  return { obras: 0, caps: 0, tempoMin: 0, favs: 0, filmes: 0, livros: 0 };
}

export function acumularObraNasStats(stats: StatsHunterAgregado, obra: Record<string, unknown>, tipo: TipoObraStats) {
  stats.obras += 1;
  stats.caps += (obra.capitulo_atual as number) || 0;
  if (obra.favorito) stats.favs += 1;
  if (tipo === "anime") stats.tempoMin += ((obra.capitulo_atual as number) || 0) * 23;
  else if (tipo === "filme" && obra.status === "Completos") {
    stats.tempoMin += 120;
    stats.filmes += 1;
  } else if (tipo === "filme") stats.filmes += 1;
  else if (tipo === "livro") stats.livros += 1;
  else if (tipo === "serie") stats.tempoMin += ((obra.capitulo_atual as number) || 0) * 45;
  else if (tipo === "jogo") stats.tempoMin += ((obra.capitulo_atual as number) || 0) * 60;
  else if (tipo === "musica") stats.tempoMin += ((obra.capitulo_atual as number) || 0) * 3;
}

/** Rank atual: maior `xp_minimo` tal que totalXp >= xp_minimo (lista já ordenada desc). */
export function rankAtualDeListaOrdenada(ranksOrdenadosDesc: GuildaRank[], totalXp: number): GuildaRank | null {
  for (const r of ranksOrdenadosDesc) {
    if (totalXp >= r.xp_minimo) return r;
  }
  return ranksOrdenadosDesc.length ? ranksOrdenadosDesc[ranksOrdenadosDesc.length - 1] : null;
}

export interface ResultadoRecompensaRank {
  novoUltimoRankId: string | null;
  esmolasExtras: number;
  mensagemToast: string | null;
}

/**
 * Se o tier atual (por XP) está acima do último rank já pago, credita só a recompensa do tier atual
 * e devolve o novo `guilda_ultimo_rank_id`.
 */
export function calcularRecompensaSubidaDeRank(
  ranksOrdenadosDesc: GuildaRank[],
  totalXp: number,
  ultimoRankIdPago: string | null,
  ranksPorId: Map<string, GuildaRank>
): ResultadoRecompensaRank {
  if (!ranksOrdenadosDesc.length) {
    return { novoUltimoRankId: ultimoRankIdPago, esmolasExtras: 0, mensagemToast: null };
  }

  const atual = rankAtualDeListaOrdenada(ranksOrdenadosDesc, totalXp);
  if (!atual) {
    return { novoUltimoRankId: ultimoRankIdPago, esmolasExtras: 0, mensagemToast: null };
  }

  const anterior = ultimoRankIdPago ? ranksPorId.get(ultimoRankIdPago) : null;
  if (anterior && atual.xp_minimo <= anterior.xp_minimo) {
    return { novoUltimoRankId: ultimoRankIdPago, esmolasExtras: 0, mensagemToast: null };
  }

  const extra = atual.recompensa_esmolas || 0;
  let mensagemToast: string | null = null;
  if (extra > 0) {
    mensagemToast = `Rank alcançado: ${atual.nome}! +${extra} Esmolas de ascensão.`;
  } else if (anterior && atual.xp_minimo > anterior.xp_minimo) {
    mensagemToast = `Ascensão de Hunter: ${atual.nome}!`;
  }

  return {
    novoUltimoRankId: atual.id,
    esmolasExtras: extra,
    mensagemToast,
  };
}
