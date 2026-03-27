"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import HunterAvatar from "../../components/HunterAvatar";
import { supabase } from "../../supabase";
import { buscarTop3FavoritosMembro } from "../fetchTopFavoritos";
import type { EstatisticasHunter, FavoritoComTipo, Perfil } from "../types";
import { formatTempoVidaGuildaHoras } from "../rankUtils";

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
  /** Rank dinâmico (`guilda_ranks`); vazio = sem tabela / fallback visual. */
  guildaRankNome?: string;
  guildaRankNomeClasses?: string;
  rankTailwindClasses?: string;
  xpMissoesAtual?: number;
  xpMinimoProximoRank?: number | null;
}

function capaThumb(o: FavoritoComTipo["obra"]): string {
  const u = (o.capa_url || o.capa || "").trim();
  return u || "";
}

type AggScanner = { obras: number; caps: number; horasVida: number; esmolas: number };

async function buscarAggScannerMembro(usuario: string): Promise<AggScanner> {
  const [
    { data: m },
    { data: a },
    { data: f },
    { data: l },
    { data: s },
    { data: j },
    { data: mu },
    { data: p },
  ] = await Promise.all([
    supabase.from("mangas").select("capitulo_atual").eq("usuario", usuario),
    supabase.from("animes").select("capitulo_atual, duracao_episodio_minutos").eq("usuario", usuario),
    supabase.from("filmes").select("capitulo_atual, status").eq("usuario", usuario),
    supabase.from("livros").select("capitulo_atual").eq("usuario", usuario),
    supabase.from("series").select("capitulo_atual, duracao_episodio_minutos").eq("usuario", usuario),
    supabase.from("jogos").select("capitulo_atual").eq("usuario", usuario),
    supabase.from("musicas").select("capitulo_atual").eq("usuario", usuario),
    supabase.from("perfis").select("esmolas").eq("nome_original", usuario).maybeSingle(),
  ]);

  const all = [
    ...(m || []),
    ...(a || []),
    ...(f || []),
    ...(l || []),
    ...(s || []),
    ...(j || []),
    ...(mu || []),
  ];
  const caps = all.reduce((acc, obj) => acc + (obj.capitulo_atual || 0), 0);
  const obras = all.length;
  const minutosAnimes = (a || []).reduce((acc, obj) => {
    const eps = obj.capitulo_atual || 0;
    const duracao = obj.duracao_episodio_minutos || 23;
    return acc + eps * duracao;
  }, 0);
  const minutosSeries = (s || []).reduce((acc, obj) => {
    const eps = obj.capitulo_atual || 0;
    const duracao = obj.duracao_episodio_minutos || 45;
    return acc + eps * duracao;
  }, 0);
  const jogosHoras = (j || []).reduce((acc, obj) => acc + (obj.capitulo_atual || 0), 0);
  const musicasMinutos = (mu || []).reduce((acc, obj) => acc + (obj.capitulo_atual || 0), 0);
  const minFilmes = (f || []).filter((obj) => obj.status === "Completos").length * 120;
  const totalMinutos = minutosAnimes + minutosSeries + jogosHoras * 60 + musicasMinutos * 3 + minFilmes;

  return {
    obras,
    caps,
    horasVida: Math.floor(totalMinutos / 60),
    esmolas: p?.esmolas ?? 0,
  };
}

export default function MemberPopout({
  member,
  stats,
  anchorRect,
  onClose,
  onSelectObra,
  onInspecionar: _onInspecionar,
  membroEmSintonia,
  getMolduraPng,
  getTituloItem,
  getCor,
  guildaRankNome,
  guildaRankNomeClasses = "text-zinc-400",
  rankTailwindClasses,
  xpMissoesAtual = 0,
  xpMinimoProximoRank,
}: MemberPopoutProps) {
  void _onInspecionar;
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const [favoritos, setFavoritos] = useState<FavoritoComTipo[]>([]);
  const [carregandoFav, setCarregandoFav] = useState(false);
  const [isScanner, setIsScanner] = useState(false);
  const [aggScanner, setAggScanner] = useState<AggScanner | null>(null);
  const [carregandoAgg, setCarregandoAgg] = useState(false);

  const aberto = !!member && !!anchorRect;

  const bannerUrl = member?.cosmeticos?.ativos?.card_config?.banner_url || "";

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
    setIsScanner(false);
    setAggScanner(null);
    if (!member?.nome_original) return;
    let cancel = false;
    setCarregandoAgg(true);
    buscarAggScannerMembro(member.nome_original)
      .then((agg) => {
        if (!cancel) {
          setAggScanner(agg);
          setCarregandoAgg(false);
        }
      })
      .catch(() => {
        if (!cancel) setCarregandoAgg(false);
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

  const barraXpMissoes =
    xpMinimoProximoRank != null && xpMinimoProximoRank > 0
      ? Math.min(100, Math.max(0, (xpMissoesAtual / xpMinimoProximoRank) * 100))
      : 100;

  const obrasScan = aggScanner?.obras ?? stats?.total_obras ?? 0;
  const capsScan = aggScanner?.caps ?? stats?.total_capitulos ?? 0;
  const horasScan = aggScanner?.horasVida ?? stats?.tempo_vida ?? 0;
  const esmolasScan = aggScanner?.esmolas ?? member.esmolas ?? stats?.esmolas ?? 0;

  return (
    <div
      id="guilda-member-popout-panel"
      role="dialog"
      aria-label={`Perfil de ${member.nome_exibicao}`}
      className="relative flex max-h-[min(420px,85vh)] flex-col overflow-hidden rounded-2xl border border-cyan-500/35 bg-[#0e0e11] shadow-[0_0_40px_rgba(34,211,238,0.18),inset_0_1px_0_rgba(34,211,238,0.12)] backdrop-blur-md"
      style={panelStyle}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <div className="relative overflow-hidden border-b border-cyan-500/20 bg-black/40 px-4 py-3 backdrop-blur-[2px]">
          {bannerUrl && (
            <>
              <div
                className="absolute inset-0 z-0 bg-cover bg-center opacity-40"
                style={{ backgroundImage: `url(${bannerUrl})` }}
              />
              <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#0e0e11] via-[#0e0e11]/60 to-transparent" />
            </>
          )}
          <div className="relative z-10 flex items-start gap-3">
            <HunterAvatar
              avatarUrl={member.avatar}
              idMoldura={member.cosmeticos?.ativos?.moldura}
              imagemMolduraUrl={moldura || undefined}
              tamanho="md"
              temaCor={member.cor_tema?.startsWith("#") ? member.cor_tema : member.custom_color}
              rankTailwindClasses={rankTailwindClasses}
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
              {guildaRankNome != null && guildaRankNome !== "" && (
                <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-zinc-500">
                  Rank{" "}
                  <span className={`normal-case tracking-tight ${guildaRankNomeClasses}`}>{guildaRankNome}</span>
                </p>
              )}
              <div className="mt-2 space-y-1">
                <div className="flex justify-between gap-2 text-[7px] font-black uppercase tracking-widest text-zinc-500">
                  <span>XP missões</span>
                  <span className="tabular-nums text-cyan-400/90">
                    {xpMissoesAtual}
                    {xpMinimoProximoRank != null && xpMinimoProximoRank > 0 ? (
                      <span className="text-zinc-600"> / {xpMinimoProximoRank}</span>
                    ) : (
                      <span className="text-zinc-600"> · máx.</span>
                    )}
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full border border-cyan-500/25 bg-zinc-950 shadow-[inset_0_0_10px_rgba(0,0,0,0.65)]">
                  <div
                    className="h-full rounded-full bg-cyan-500 shadow-[0_0_12px_rgba(34,211,238,0.85)] transition-[width] duration-500"
                    style={{ width: `${barraXpMissoes}%` }}
                  />
                </div>
              </div>
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

        {!isScanner ? (
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
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar px-4 py-4">
            {carregandoAgg && !aggScanner && (
              <p className="mb-3 text-center text-[9px] font-bold uppercase tracking-widest text-zinc-500">
                Sincronizando scanner…
              </p>
            )}
            <div className="flex flex-col items-center">
              <h3 className="mb-5 w-full border-b border-amber-500/25 pb-2 text-center text-[11px] font-black uppercase tracking-[0.28em] text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.25)]">
                Scanner de Combate
              </h3>
              <div className="w-full space-y-3">
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/45 p-3 backdrop-blur-sm">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Obras Caçadas</span>
                  <span className="text-sm font-black tabular-nums text-white">{obrasScan}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/45 p-3 backdrop-blur-sm">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Capítulos / Eps</span>
                  <span className="text-sm font-black tabular-nums text-white">{capsScan}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/45 p-3 backdrop-blur-sm">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Patrimônio</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px]" aria-hidden>
                      🪙
                    </span>
                    <span className="text-sm font-black tabular-nums text-yellow-400">{esmolasScan}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/45 p-3 backdrop-blur-sm">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Imersão de Vida</span>
                  <span className="text-sm font-black tabular-nums text-blue-400">
                    {formatTempoVidaGuildaHoras(horasScan)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="border-t border-zinc-800/80 bg-black/50 px-4 py-2 backdrop-blur-[2px]">
          {!isScanner ? (
            <button
              type="button"
              onClick={() => setIsScanner(true)}
              className="w-full rounded-xl border border-amber-500/30 bg-amber-500/5 py-2 text-[9px] font-black uppercase tracking-widest text-amber-400/90 transition-all hover:border-amber-400/50 hover:shadow-[0_0_14px_rgba(245,158,11,0.2)]"
            >
              ABRIR INSPEÇÃO (SCANNER)
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsScanner(false)}
              className="w-full rounded-xl border border-cyan-500/30 bg-cyan-500/5 py-2 text-[9px] font-black uppercase tracking-widest text-cyan-400/90 transition-all hover:border-cyan-400/50 hover:shadow-[0_0_14px_rgba(34,211,238,0.2)]"
            >
              VOLTAR AO CARD
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
