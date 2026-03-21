"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import HunterAvatar from "../../components/HunterAvatar";
import { buscarTop3FavoritosMembro } from "../fetchTopFavoritos";
import type { EstatisticasHunter, FavoritoComTipo, Perfil } from "../types";

interface MemberPopoutProps {
  member: Perfil | null;
  stats: EstatisticasHunter | null;
  anchorRect: DOMRect | null;
  /** Quando o membro do popout é você e a sintonia de voz está ligada. */
  membroEmSintonia: boolean;
  onClose: () => void;
  onSelectObra: (item: FavoritoComTipo) => void;
  onInspecionar: () => void;
  getMolduraPng: (idItem?: string) => string | null;
  getTituloItem: (idItem?: string) => { id: string; nome: string; imagem_url?: string } | null | undefined;
  getCor: (nomeUsuario: string) => string;
}

function capaThumb(o: FavoritoComTipo["obra"]): string {
  const u = (o.capa_url || o.capa || "").trim();
  return u || "";
}

export default function MemberPopout({
  member,
  stats,
  anchorRect,
  onClose,
  onSelectObra,
  onInspecionar,
  membroEmSintonia,
  getMolduraPng,
  getTituloItem,
  getCor,
}: MemberPopoutProps) {
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const [favoritos, setFavoritos] = useState<FavoritoComTipo[]>([]);
  const [carregandoFav, setCarregandoFav] = useState(false);

  const aberto = !!member && !!anchorRect;

  useLayoutEffect(() => {
    if (!aberto || !anchorRect) return;
    const pad = 8;
    const w = Math.min(300, window.innerWidth - 32);
    let left = anchorRect.left;
    let top = anchorRect.bottom + pad;
    if (left + w > window.innerWidth - 16) left = window.innerWidth - w - 16;
    if (left < 16) left = 16;
    const estHeight = 400;
    if (top + estHeight > window.innerHeight - 16) {
      top = Math.max(16, anchorRect.top - estHeight - pad);
    }
    setPanelStyle({ position: "fixed", top, left, width: w, zIndex: 440 });
  }, [aberto, anchorRect]);

  useEffect(() => {
    if (!member?.nome_original) {
      setFavoritos([]);
      return;
    }
    let cancel = false;
    setCarregandoFav(true);
    buscarTop3FavoritosMembro(member.nome_original).then((rows) => {
      if (!cancel) {
        setFavoritos(rows);
        setCarregandoFav(false);
      }
    });
    return () => {
      cancel = true;
    };
  }, [member?.nome_original]);

  useEffect(() => {
    if (!aberto) return;
    const fechar = (e: MouseEvent) => {
      const alvo = e.target as Node;
      const pop = document.getElementById("guilda-member-popout-panel");
      if (pop?.contains(alvo)) return;
      onClose();
    };
    const t = setTimeout(() => document.addEventListener("mousedown", fechar), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", fechar);
    };
  }, [aberto, onClose]);

  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aberto, onClose]);

  if (!aberto || !member) return null;

  const moldura = getMolduraPng(member.cosmeticos?.ativos?.moldura);
  const titulo = getTituloItem(member.cosmeticos?.ativos?.titulo);
  const elo = stats?.elo ?? "—";

  return (
    <div
        id="guilda-member-popout-panel"
        role="dialog"
        aria-label={`Perfil de ${member.nome_exibicao}`}
        className="flex max-h-[min(420px,85vh)] flex-col overflow-hidden rounded-2xl border border-cyan-500/35 bg-[#0a0a0c]/98 shadow-[0_0_40px_rgba(34,211,238,0.18),inset_0_1px_0_rgba(34,211,238,0.12)] backdrop-blur-md"
        style={panelStyle}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="border-b border-cyan-500/20 bg-black/50 px-4 py-3">
          <div className="flex items-start gap-3">
            <HunterAvatar
              avatarUrl={member.avatar}
              idMoldura={member.cosmeticos?.ativos?.moldura}
              imagemMolduraUrl={moldura || undefined}
              tamanho="md"
              temaCor={member.cor_tema?.startsWith("#") ? member.cor_tema : member.custom_color}
            />
            <div className="min-w-0 flex-1">
              <p
                className={`truncate font-black text-sm uppercase tracking-tight ${member.cor_tema?.startsWith("#") ? "" : getCor(member.nome_original)}`}
                style={member.cor_tema?.startsWith("#") ? { color: member.cor_tema } : undefined}
              >
                {member.nome_exibicao}
              </p>
              {titulo && (
                <p className={`truncate text-[7px] font-black uppercase tracking-[0.2em] text-zinc-500 ${titulo.id}`}>
                  « {titulo.nome.replace("Título: ", "")} »
                </p>
              )}
              <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-cyan-400/90 drop-shadow-[0_0_6px_rgba(34,211,238,0.5)]">
                Rank <span className="text-white">{elo}</span>
              </p>
              {membroEmSintonia && (
                <p className="mt-1 text-[7px] font-bold uppercase tracking-widest text-emerald-400/90">
                  ● Em sintonia de voz
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-500 transition-colors hover:border-zinc-500 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar px-4 py-3">
          <p className="mb-2 text-[9px] font-black uppercase tracking-[0.25em] text-violet-400 drop-shadow-[0_0_8px_rgba(167,139,250,0.35)]">
            Top 3 Favoritos
          </p>
          {carregandoFav && <p className="text-[10px] text-zinc-500">Sincronizando estante…</p>}
          {!carregandoFav && favoritos.length === 0 && (
            <p className="text-[10px] italic text-zinc-600">Nenhum favorito público nesta estante.</p>
          )}
          <ul className="space-y-2">
            {favoritos.map((item) => {
              const thumb = capaThumb(item.obra);
              return (
                <li key={`${item.tabelaObra}-${item.obra.id}`}>
                  <button
                    type="button"
                    onClick={() => onSelectObra(item)}
                    className="flex w-full items-center gap-3 rounded-xl border border-white/5 bg-black/50 p-2 text-left transition-all hover:border-cyan-500/40 hover:shadow-[0_0_16px_rgba(34,211,238,0.12)]"
                  >
                    <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
                      {thumb ? (
                        <img src={thumb} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] text-zinc-600">—</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="mb-0.5 inline-block rounded bg-zinc-800 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider text-cyan-400/90">
                        {item.abaPrincipal}
                      </span>
                      <p className="truncate font-bold text-xs text-zinc-200">{item.obra.titulo}</p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="border-t border-zinc-800/80 bg-black/40 px-4 py-2">
          <button
            type="button"
            onClick={() => {
              onInspecionar();
              onClose();
            }}
            className="w-full rounded-xl border border-amber-500/30 bg-amber-500/5 py-2 text-[9px] font-black uppercase tracking-widest text-amber-400/90 transition-all hover:border-amber-400/50 hover:shadow-[0_0_14px_rgba(245,158,11,0.2)]"
          >
            Abrir inspeção (scanner)
          </button>
        </div>
      </div>
  );
}
