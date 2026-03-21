"use client";

import HunterAvatar from "../../components/HunterAvatar";
import type { EstatisticasHunter, FiltroRanking } from "../types";
import { metricaRanking } from "../rankUtils";

type LojaTitulo = { id: string; nome: string; imagem_url?: string };

interface HuntersListProps {
  hunters: EstatisticasHunter[];
  filtroRanking: FiltroRanking;
  onFiltroChange: (f: FiltroRanking) => void;
  onInspect: (nomeOriginal: string) => void;
  getMolduraPng: (idItem?: string) => string | null;
  getTituloItem: (idItem?: string) => LojaTitulo | null | undefined;
  /** Índice inicial na lista ordenada (ex.: 3 para exibir a partir do 4º lugar) */
  startIndex?: number;
}

export default function HuntersList({
  hunters,
  filtroRanking,
  onFiltroChange,
  onInspect,
  getMolduraPng,
  getTituloItem,
  startIndex = 0
}: HuntersListProps) {
  const slice = hunters.slice(startIndex);

  return (
    <div className="flex flex-col gap-4 min-h-0 flex-1">
      <div className="flex flex-wrap justify-center gap-3 shrink-0">
        <button
          type="button"
          onClick={() => onFiltroChange("OBRAS")}
          className={`px-4 py-2 rounded-xl border text-[9px] font-black uppercase transition-all ${
            filtroRanking === "OBRAS"
              ? "bg-indigo-600/20 border-indigo-500 text-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.25)]"
              : "bg-black/50 border-zinc-800 text-zinc-500 hover:text-white"
          }`}
        >
          📚 Mais Viciados
        </button>
        <button
          type="button"
          onClick={() => onFiltroChange("ESMOLAS")}
          className={`px-4 py-2 rounded-xl border text-[9px] font-black uppercase transition-all ${
            filtroRanking === "ESMOLAS"
              ? "bg-yellow-600/20 border-yellow-500 text-yellow-400 shadow-[0_0_12px_rgba(234,179,8,0.2)]"
              : "bg-black/50 border-zinc-800 text-zinc-500 hover:text-white"
          }`}
        >
          🪙 Mais Ricos
        </button>
        <button
          type="button"
          onClick={() => onFiltroChange("TEMPO")}
          className={`px-4 py-2 rounded-xl border text-[9px] font-black uppercase transition-all ${
            filtroRanking === "TEMPO"
              ? "bg-purple-600/20 border-purple-500 text-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.2)]"
              : "bg-black/50 border-zinc-800 text-zinc-500 hover:text-white"
          }`}
        >
          ⏳ Veteranos (Horas)
        </button>
        <button
          type="button"
          onClick={() => onFiltroChange("CAPITULOS")}
          className={`px-4 py-2 rounded-xl border text-[9px] font-black uppercase transition-all ${
            filtroRanking === "CAPITULOS"
              ? "bg-red-600/20 border-red-500 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.2)]"
              : "bg-black/50 border-zinc-800 text-zinc-500 hover:text-white"
          }`}
        >
          🔥 Devoradores (Caps)
        </button>
        <button
          type="button"
          onClick={() => onFiltroChange("FAVORITOS")}
          className={`px-4 py-2 rounded-xl border text-[9px] font-black uppercase transition-all ${
            filtroRanking === "FAVORITOS"
              ? "bg-green-600/20 border-green-500 text-green-400 shadow-[0_0_12px_rgba(34,197,94,0.2)]"
              : "bg-black/50 border-zinc-800 text-zinc-500 hover:text-white"
          }`}
        >
          ⭐ Curadores
        </button>
        <button
          type="button"
          onClick={() => onFiltroChange("CONQUISTAS")}
          className={`px-4 py-2 rounded-xl border text-[9px] font-black uppercase transition-all ${
            filtroRanking === "CONQUISTAS"
              ? "bg-cyan-600/20 border-cyan-500 text-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.2)]"
              : "bg-black/50 border-zinc-800 text-zinc-500 hover:text-white"
          }`}
        >
          🏆 Platinadores
        </button>
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto custom-scrollbar flex-1 min-h-0 pr-1">
        {slice.length === 0 && (
          <p className="text-center text-[10px] font-black uppercase tracking-widest text-zinc-600 py-8">
            {startIndex > 0
              ? "Ranking completo no pódio acima."
              : hunters.length === 0
                ? "Nenhum hunter na guilda."
                : "Carregando hunters…"}
          </p>
        )}
        {slice.map((hunter, i) => {
          const index = startIndex + i;
          const isTop1 = index === 0;
          const isTop2 = index === 1;
          const isTop3 = index === 2;
          let medalha = "🏅";
          if (isTop1) medalha = "👑";
          else if (isTop2) medalha = "🥈";
          else if (isTop3) medalha = "🥉";
          const { corTexto, valor, label } = metricaRanking(filtroRanking, hunter);
          const molduraRank = getMolduraPng(hunter.cosmeticos?.ativos?.moldura as string | undefined);
          const tituloRank = getTituloItem(hunter.cosmeticos?.ativos?.titulo as string | undefined);

          return (
            <div
              key={hunter.nome_original}
              role="button"
              tabIndex={0}
              onClick={() => onInspect(hunter.nome_original)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onInspect(hunter.nome_original);
                }
              }}
              className={`flex items-center justify-between p-5 rounded-3xl border transition-all cursor-pointer ${
                isTop1
                  ? "bg-yellow-900/10 border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.1)]"
                  : isTop2
                    ? "bg-zinc-800/20 border-zinc-400/50"
                    : isTop3
                      ? "bg-orange-900/10 border-orange-700/50"
                      : "bg-zinc-900/30 border-zinc-800"
              }`}
            >
              <div className="flex items-center gap-6">
                <span
                  className={`text-3xl font-black italic w-10 text-center ${
                    isTop1 ? "text-yellow-500 drop-shadow-md" : isTop2 ? "text-zinc-300" : isTop3 ? "text-orange-500" : "text-zinc-600"
                  }`}
                >
                  #{index + 1}
                </span>
                <HunterAvatar
                  avatarUrl={hunter.avatar}
                  idMoldura={hunter.cosmeticos?.ativos?.moldura as string | undefined}
                  imagemMolduraUrl={molduraRank || undefined}
                  tamanho="md"
                  temaCor={hunter.cor_tema?.startsWith("#") ? hunter.cor_tema : hunter.custom_color}
                />
                <div>
                  <p className="font-black text-lg uppercase flex items-center gap-2">
                    {hunter.nome_exibicao} {isTop1 || isTop2 || isTop3 ? <span className="text-xl">{medalha}</span> : ""}
                  </p>
                  {tituloRank && (
                    <p className={`text-[9px] font-black uppercase tracking-[0.2em] mt-0.5 ${tituloRank.id}`}>
                      « {tituloRank.nome.replace("Título: ", "")} »
                    </p>
                  )}
                  <p className="text-[9px] text-zinc-500 uppercase tracking-widest mt-1">
                    RANK: <span className="text-white">{hunter.elo}</span>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-3xl font-black italic ${corTexto}`}>{valor}</p>
                <p className="text-[8px] text-zinc-500 uppercase tracking-widest">{label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
