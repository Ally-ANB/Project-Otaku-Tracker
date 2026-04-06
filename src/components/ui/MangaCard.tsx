"use client";
import { useState, useEffect } from "react"; // ✅ Adicionado para gerenciar o input local
import type { Manga } from "@/types/hunter_registry";

interface MangaCardProps {
  manga: Manga;
  aura: any;
  abaPrincipal: "MANGA" | "ANIME" | "FILME" | "LIVRO" | "SERIE" | "JOGO" | "MUSICA";
  atualizarCapitulo: (manga: Manga, novo: number) => Promise<void>;
  deletarManga: (id: number) => Promise<void>;
  mudarStatusManual: (id: number, status: string) => Promise<void>;
  abrirDetalhes: (manga: Manga) => void;
}

export default function MangaCard({ manga, aura, abaPrincipal, atualizarCapitulo, abrirDetalhes }: MangaCardProps) {
  // ✅ Estado local para permitir que o usuário digite sem travar a UI
  const [valorInput, setValorInput] = useState(manga.capitulo_atual);

  // Sincroniza o input se o valor mudar externamente (ex: clicou no +)
  useEffect(() => {
    setValorInput(manga.capitulo_atual);
  }, [manga.capitulo_atual]);

  const statusBadge =
    abaPrincipal === "ANIME" || abaPrincipal === "FILME" || abaPrincipal === "SERIE"
      ? (manga.status === "Lendo" ? "Assistindo" : manga.status === "Planejo Ler" ? "Planejo Assistir" : manga.status)
      : abaPrincipal === "JOGO"
        ? (manga.status === "Lendo" ? "Jogando" : manga.status === "Planejo Ler" ? "Planejo Jogar" : manga.status)
        : abaPrincipal === "MUSICA" && manga.status === "Lendo"
          ? "Ouvindo"
          : manga.status;

  const total = Math.max(0, Number(manga.total_capitulos) || 0);
  const atual = Math.max(0, Number(manga.capitulo_atual) || 0);
  const porcentagem = total > 0 ? Math.min(100, Math.max(0, Math.round((atual / total) * 100))) : 0;

  const capaSrc = manga.capa_url?.trim() || manga.capa;

  // ✅ Função para processar a mudança manual (Enter ou Blur)
  const handleBlurOuEnter = () => {
    if (valorInput !== manga.capitulo_atual) {
      atualizarCapitulo(manga, valorInput);
    }
  };

  return (
    <div className="group relative overflow-visible rounded-[2rem] border border-zinc-800/50 bg-zinc-900/40 p-4 transition-all hover:border-zinc-700">
      <div className="pointer-events-none absolute top-6 right-6 z-20">
        <span className="pointer-events-none rounded-full border border-white/10 bg-black/60 px-3 py-1.5 text-[8px] font-black tracking-widest text-white uppercase backdrop-blur-md">
          {statusBadge}
        </span>
      </div>

      <div
        role="button"
        tabIndex={0}
        className="relative z-0 w-full cursor-pointer text-left"
        onClick={() => abrirDetalhes(manga)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            abrirDetalhes(manga);
          }
        }}
      >
        <div className="relative mb-3 overflow-hidden rounded-[1.5rem] shadow-2xl">
          <img
            src={capaSrc}
            className="aspect-[2/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            alt={manga.titulo}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 translate-y-2 rounded-b-[1.5rem] bg-black/60 px-2 pb-2.5 pt-3 opacity-0 backdrop-blur-md transition-all duration-300 ease-out group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
            <div className="space-y-2">
              <div className="flex items-end justify-between px-0.5">
                <span className="text-[8px] font-black tracking-widest text-zinc-400 uppercase">Progresso</span>
                <span className={`${aura.text} text-[10px] font-black`}>{porcentagem}%</span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-800/90">
                <div
                  className={`${aura.bg} h-full transition-all duration-500`}
                  style={{ width: `${porcentagem}%` }}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/30 p-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void atualizarCapitulo(manga, manga.capitulo_atual - 1);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                  -
                </button>
                <div className="flex flex-col items-center text-center" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="number"
                    value={valorInput}
                    onChange={(e) => setValorInput(parseInt(e.target.value) || 0)}
                    onBlur={handleBlurOuEnter}
                    onKeyDown={(e) => e.key === "Enter" && handleBlurOuEnter()}
                    onClick={(e) => e.stopPropagation()}
                    className="w-12 bg-transparent text-center text-xs font-black text-white outline-none transition-colors [appearance:textfield] focus:text-green-500 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  {abaPrincipal === "ANIME" || abaPrincipal === "SERIE" ? (
                    <p className="max-w-[10rem] text-center text-[6px] font-bold leading-tight text-zinc-500 uppercase">
                      T: {manga.temporadas_assistidas ?? "?"}/{manga.temporadas_totais ?? "?"} • Ep:{" "}
                      {manga.capitulo_atual}/{manga.total_capitulos || "?"}
                    </p>
                  ) : (
                    <p className="text-[6px] font-bold text-zinc-500 uppercase">
                      Capítulo: {manga.capitulo_atual}/{manga.total_capitulos || "?"}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void atualizarCapitulo(manga, manga.capitulo_atual + 1);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-bold uppercase leading-tight tracking-tighter transition-colors group-hover:text-white">
          {manga.titulo}
        </h3>
      </div>
    </div>
  );
}