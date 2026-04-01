"use client";

import { useMemo } from "react";
import HunterAvatar from "@/components/ui/HunterAvatar";
import type { EstatisticasHunter, FiltroRanking } from "../types";
import {
  metricaRanking,
  type GuildaRank,
  ordenarRanksPorXpMinimoDesc,
  rankAtualDeListaOrdenada,
  totalXpAscensaoHunter,
  classesTailwindNomeRank,
} from "../rankUtils";

type LojaTitulo = { id: string; nome: string; imagem_url?: string };

interface PodiumProps {
  hunters: EstatisticasHunter[];
  filtroRanking: FiltroRanking;
  onInspect: (nomeOriginal: string) => void;
  getMolduraPng: (idItem?: string) => string | null;
  getTituloItem: (idItem?: string) => LojaTitulo | null | undefined;
  guildaRanks: GuildaRank[];
}

const ORDEM_PODIO: [number, number, number] = [1, 0, 2];

export default function Podium({
  hunters,
  filtroRanking,
  onInspect,
  getMolduraPng,
  getTituloItem,
  guildaRanks,
}: PodiumProps) {
  const ranksDesc = useMemo(() => ordenarRanksPorXpMinimoDesc(guildaRanks), [guildaRanks]);
  const slots = ORDEM_PODIO.map((i) => hunters[i]).filter(Boolean) as EstatisticasHunter[];
  if (slots.length === 0) {
    return (
      <div className="rounded-3xl border border-zinc-800 bg-black/40 p-8 text-center text-[10px] font-black uppercase tracking-widest text-zinc-500 shadow-[0_0_24px_rgba(59,130,246,0.08)]">
        Nenhum hunter no pódio ainda.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-4 items-end min-h-[200px]">
      {ORDEM_PODIO.map((idx, iter) => {
        const orderClass = iter === 0 ? "order-1" : iter === 1 ? "order-2 z-10" : "order-3";
        const hunter = hunters[idx];
        if (!hunter) {
          return (
            <div
              key={`empty-${idx}`}
              className={`rounded-2xl border border-transparent bg-black/20 min-h-[120px] ${orderClass}`}
              aria-hidden
            />
          );
        }
        const rank = idx + 1;
        const isTop1 = rank === 1;
        const isTop2 = rank === 2;
        const isTop3 = rank === 3;
        const medalha = isTop1 ? "👑" : isTop2 ? "🥈" : "🥉";
        const molduraRank = getMolduraPng(hunter.cosmeticos?.ativos?.moldura as string | undefined);
        const tituloRank = getTituloItem(hunter.cosmeticos?.ativos?.titulo as string | undefined);
        const { corTexto, valor, label } = metricaRanking(filtroRanking, hunter);
        const altura =
          isTop1 ? "min-h-[200px] sm:min-h-[240px]" : isTop2 ? "min-h-[160px] sm:min-h-[190px]" : "min-h-[140px] sm:min-h-[170px]";
        const totalXp = totalXpAscensaoHunter(hunter);
        const rankGuilda =
          guildaRanks.length > 0 ? rankAtualDeListaOrdenada(ranksDesc, totalXp) : null;
        const rankClassesAvatar =
          guildaRanks.length > 0 ? (rankGuilda?.classes_tailwind ?? "") : undefined;

        return (
          <button
            key={hunter.nome_original}
            type="button"
            onClick={() => onInspect(hunter.nome_original)}
            className={`flex flex-col items-center justify-end rounded-2xl border p-4 text-left transition-all hover:brightness-110 ${altura} ${orderClass} ${
              isTop1
                ? "border-yellow-500/60 bg-gradient-to-b from-yellow-500/15 to-black/80 shadow-[0_0_32px_rgba(234,179,8,0.25)]"
                : isTop2
                  ? "border-cyan-500/40 bg-gradient-to-b from-cyan-500/10 to-black/70 shadow-[0_0_20px_rgba(34,211,238,0.12)]"
                  : "border-orange-600/40 bg-gradient-to-b from-orange-600/10 to-black/70 shadow-[0_0_18px_rgba(234,88,12,0.12)]"
            }`}
          >
            <span
              className={`mb-2 text-2xl font-black italic ${
                isTop1 ? "text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]" : isTop2 ? "text-cyan-300" : "text-orange-400"
              }`}
            >
              #{rank}
            </span>
            <HunterAvatar
              avatarUrl={hunter.avatar}
              idMoldura={hunter.cosmeticos?.ativos?.moldura as string | undefined}
              imagemMolduraUrl={molduraRank || undefined}
              tamanho={isTop1 ? "lg" : "md"}
              temaCor={hunter.cor_tema?.startsWith("#") ? hunter.cor_tema : hunter.custom_color}
              rankTailwindClasses={rankClassesAvatar}
            />
            <p className="mt-2 text-center font-black text-xs uppercase tracking-tight text-white">
              {hunter.nome_exibicao} <span className="text-base">{medalha}</span>
            </p>
            {rankGuilda && (
              <p
                className={`mt-0.5 text-center text-[8px] font-black uppercase tracking-[0.2em] ${classesTailwindNomeRank(rankGuilda.classes_tailwind)}`}
              >
                {rankGuilda.nome}
              </p>
            )}
            {tituloRank && (
              <p className={`text-[7px] font-black uppercase tracking-[0.2em] text-zinc-400 ${tituloRank.id}`}>
                « {tituloRank.nome.replace("Título: ", "")} »
              </p>
            )}
            <p className={`mt-1 text-2xl font-black italic ${corTexto} drop-shadow-[0_0_6px_currentColor]`}>{valor}</p>
            <p className="text-[7px] font-black uppercase tracking-widest text-zinc-500">{label}</p>
          </button>
        );
      })}
    </div>
  );
}
