"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  Command,
  X,
  Youtube,
  Compass,
  Trash2,
  Plus,
  Check,
  ListPlus,
  Loader2,
  Globe,
  Play,
} from "lucide-react";
import { useHunterAtivo } from "@/hooks/useHunterAtivo";
import { useCatalogSearch, type GalaxiaModo } from "@/hooks/useCatalogSearch";
import { useObraInsert } from "@/hooks/useObraInsert";
import { useSenhaMestraInterativa } from "@/hooks/useSenhaMestraInterativa";
import {
  API_DB_PATH,
  limparSenhaMestreNaSessao,
  obterSenhaMestreRevelada,
} from "@/lib/dbClient";
import {
  RADIO_HUNTER_ADD_QUEUE,
  type RadioHunterTrackDetail,
} from "@/lib/radioHunterEvents";
import type { AbaPrincipal, EstanteItem, ResultadoBusca, TipoObra } from "@/types/hunter_registry";
import {
  TIPO_OBRA_PARA_ABA,
  TIPO_OBRA_TABELA_DB,
  TIPO_OBRA_ORDEM_UI,
  TIPO_OBRA_LABEL_SECAO,
  TIPO_OBRA_TAG_MINI,
  resultadoBuscaParaEstanteItem,
} from "@/types/hunter_registry";

export type { EstanteItem, TipoObra } from "@/types/hunter_registry";

/** Dispare com `window.dispatchEvent(new CustomEvent(OMNISEARCH_OPEN_EVENT))` para abrir o painel. */
export const OMNISEARCH_OPEN_EVENT = "omnisearch:open";

type FiltroCategoria = "todos" | TipoObra;

function rotuloProgresso(item: EstanteItem): string {
  const p = Number.isFinite(item.progresso) ? item.progresso : 0;
  switch (item.tipo_obra) {
    case "manga":
      return `Cap. ${p}`;
    case "anime":
    case "series":
      return `Ep. ${p}`;
    case "movie":
      return "—";
    case "game":
      return `${p}`;
    case "book":
      return `Cap. ${p}`;
    case "song":
      return `${p}`;
    default:
      return "—";
  }
}

function isTypingInField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "TEXTAREA") return true;
  if (tag === "INPUT") return true;
  return false;
}

function normalizarTitulo(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim();
}

function titulosProvavelmenteMesmaObra(a: string, b: string): boolean {
  const na = normalizarTitulo(a);
  const nb = normalizarTitulo(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.length >= 8 && nb.includes(na)) return true;
  if (nb.length >= 8 && na.includes(nb)) return true;
  return false;
}

function itemJaNaEstanteCatalogo(item: ResultadoBusca, hits: EstanteItem[]): boolean {
  return hits.some(
    (h) =>
      h.tipo_obra === item.tipoCatalogo &&
      titulosProvavelmenteMesmaObra(h.titulo, item.titulo)
  );
}

function chaveResultadoGalaxia(r: ResultadoBusca, index: number): string {
  return `${r.fonte}-${r.id}-${r.tipoCatalogo}-${index}`;
}

function resultadoParaDraft(r: ResultadoBusca) {
  return {
    titulo: r.titulo,
    capa: r.capa,
    capitulo_atual: 0,
    total_capitulos: r.total,
    status: "Planejo Ler",
    sinopse: r.sinopse,
    favorito: false,
    link_url: r.link_url?.trim() || "",
    provider_data: r.providers || [],
    duracao_episodio_minutos: r.duracao_episodio_minutos ?? 0,
  };
}

function urlRadioDaEstante(item: EstanteItem): string | null {
  const u = typeof item.link_url === "string" ? item.link_url.trim() : "";
  return u || null;
}

function chaveEstanteItem(item: EstanteItem, idx: number): string {
  if (item.id != null) return `estante-${item.tipo_obra}-${item.id}`;
  return `estante-${item.tipo_obra}-i${idx}`;
}

function logSearchFailure(context: string, error: unknown) {
  console.error(`[OmniSearch] ${context}:`, error);
}

const acaoIconBtn =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-500/10 bg-zinc-900/90 text-zinc-200 shadow-lg transition-colors hover:border-emerald-500/40 hover:bg-zinc-800 hover:text-white disabled:pointer-events-none disabled:opacity-35";

const capaAcOverlay =
  "pointer-events-none absolute inset-0 z-10 hidden items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity duration-200 group-hover/card:pointer-events-auto group-hover/card:opacity-100 md:flex";

export default function OmniSearch() {
  const hunterUserId = useHunterAtivo();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState<FiltroCategoria>("todos");
  const filtroCategoriaRef = useRef(filtroCategoria);
  const buscaEstanteSerialRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const [estanteHits, setEstanteHits] = useState<EstanteItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [estanteRefreshNonce, setEstanteRefreshNonce] = useState(0);

  const [galaxiaModoAtivo, setGalaxiaModoAtivo] = useState<GalaxiaModo | null>(null);
  const [soloMotor, setSoloMotor] = useState<GalaxiaModo | null>(null);
  const [webSugestaoAuto, setWebSugestaoAuto] = useState(false);

  const [importandoChave, setImportandoChave] = useState<string | null>(null);
  const [galaxiaImportadas, setGalaxiaImportadas] = useState<Set<string>>(() => new Set());
  const [excluindoChave, setExcluindoChave] = useState<string | null>(null);
  const [feedbackInline, setFeedbackInline] = useState<string | null>(null);

  const { obterSenhaMestreInterativa, modalSenhaMestra } = useSenhaMestraInterativa();

  const {
    resultados: externalHits,
    buscando: galaxiaLoading,
    buscarGalaxia,
    buscarPorAba,
    limpar: limparGalaxia,
  } = useCatalogSearch();

  const usuarioParaInsert = hunterUserId ?? "";

  const { salvarObra, salvando } = useObraInsert({
    usuarioAtual: usuarioParaInsert,
    solicitarSenhaMestre: obterSenhaMestreInterativa,
    mostrarFeedback: (msg, tipo) => {
      setFeedbackInline(
        tipo === "erro" ? `Erro: ${msg}` : tipo === "aviso" ? msg : msg
      );
      window.setTimeout(() => setFeedbackInline(null), 4000);
    },
  });

  useEffect(() => {
    filtroCategoriaRef.current = filtroCategoria;
  }, [filtroCategoria]);

  const podeBuscar = useMemo(() => {
    if (!hunterUserId || hunterUserId === "Admin") return false;
    return searchTerm.trim().length >= 2;
  }, [hunterUserId, searchTerm]);

  useEffect(() => {
    setSoloMotor(null);
    setWebSugestaoAuto(false);
    setGalaxiaImportadas(new Set());
    limparGalaxia();
    setGalaxiaModoAtivo(null);
  }, [searchTerm, limparGalaxia]);

  useEffect(() => {
    const term = searchTerm.trim();
    if (!podeBuscar) {
      setEstanteHits([]);
      setSearchError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const serial = ++buscaEstanteSerialRef.current;

    const delayDebounceFn = setTimeout(async () => {
      setIsLoading(true);
      setSearchError(null);
      limparGalaxia();
      setWebSugestaoAuto(false);

      const userIdNaFila = hunterUserId;
      if (!userIdNaFila || userIdNaFila === "Admin") {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/estante/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: term,
            hunterId: userIdNaFila,
          }),
        });
        const json = (await res.json()) as { items?: unknown; error?: string };

        if (cancelled || buscaEstanteSerialRef.current !== serial) return;

        if (!res.ok) {
          setSearchError(json.error || `Erro na busca (${res.status}).`);
          setEstanteHits([]);
          setIsLoading(false);
          return;
        }

        const raw = json.items;
        const rows = Array.isArray(raw) ? raw : [];
        const hits: EstanteItem[] = [];
        for (const r of rows) {
          if (r && typeof r === "object") {
            hits.push(r as EstanteItem);
          }
        }
        setEstanteHits(hits);

        if (cancelled || buscaEstanteSerialRef.current !== serial) return;

        if (hits.length >= 3) {
          limparGalaxia();
          setWebSugestaoAuto(false);
        } else {
          const filtro = filtroCategoriaRef.current;
          setWebSugestaoAuto(true);
          try {
            if (filtro === "todos") {
              const termoMin = term.toLowerCase();
              const isBuscaMusical =
                termoMin.includes("musica") ||
                termoMin.includes("música") ||
                termoMin.includes("ost") ||
                termoMin.includes("opening") ||
                termoMin.includes("ending") ||
                termoMin.includes("cover");

              if (isBuscaMusical) {
                await buscarGalaxia(term, "youtube");
              } else {
                await buscarGalaxia(term, "anilist");
              }
            } else {
              const aba: AbaPrincipal = TIPO_OBRA_PARA_ABA[filtro];
              await buscarPorAba(term, aba);
            }
          } catch (e) {
            logSearchFailure("sugestões web automáticas", e);
          }
        }
      } catch (error) {
        if (!cancelled && buscaEstanteSerialRef.current === serial) {
          logSearchFailure("fetch /api/estante/search", error);
          setSearchError(error instanceof Error ? error.message : "Falha na busca.");
          setEstanteHits([]);
        }
      } finally {
        if (!cancelled && buscaEstanteSerialRef.current === serial) setIsLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(delayDebounceFn);
    };
  }, [
    searchTerm,
    podeBuscar,
    hunterUserId,
    estanteRefreshNonce,
    limparGalaxia,
    buscarGalaxia,
    buscarPorAba,
  ]);

  const close = useCallback(() => {
    setSearchTerm("");
    setEstanteHits([]);
    setSearchError(null);
    limparGalaxia();
    setGalaxiaModoAtivo(null);
    setSoloMotor(null);
    setWebSugestaoAuto(false);
    setGalaxiaImportadas(new Set());
    setFeedbackInline(null);
    setFiltroCategoria("todos");
    setIsOpen(false);
  }, [limparGalaxia]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        close();
        return;
      }

      if (e.key === "/" || e.code === "Slash") {
        if (isTypingInField(e.target)) return;
        e.preventDefault();
        setIsOpen(true);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close]);

  useEffect(() => {
    const abrir = () => setIsOpen(true);
    window.addEventListener(OMNISEARCH_OPEN_EVENT, abrir);
    return () => window.removeEventListener(OMNISEARCH_OPEN_EVENT, abrir);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [isOpen]);

  const sessaoBloqueada = !hunterUserId || hunterUserId === "Admin";

  const contagensEstante = useMemo(() => {
    const m = new Map<TipoObra, number>();
    for (const t of TIPO_OBRA_ORDEM_UI) m.set(t, 0);
    for (const h of estanteHits) {
      m.set(h.tipo_obra, (m.get(h.tipo_obra) ?? 0) + 1);
    }
    return m;
  }, [estanteHits]);

  const estanteFiltrada = useMemo(() => {
    if (filtroCategoria === "todos") return estanteHits;
    return estanteHits.filter((h) => h.tipo_obra === filtroCategoria);
  }, [estanteHits, filtroCategoria]);

  const externalFiltrados = useMemo(() => {
    if (filtroCategoria === "todos") return externalHits;
    return externalHits.filter((r) => r.tipoCatalogo === filtroCategoria);
  }, [externalHits, filtroCategoria]);

  const webEntries = useMemo(() => {
    return externalFiltrados.map((r, idx) => ({
      resultado: r,
      item: resultadoBuscaParaEstanteItem(r),
      chave: chaveResultadoGalaxia(r, idx),
    }));
  }, [externalFiltrados]);

  const termoWeb = searchTerm.trim();
  const podeAcionarGalaxia = termoWeb.length >= 2;

  const podeImportar = Boolean(
    hunterUserId && hunterUserId !== "Admin" && usuarioParaInsert
  );

  const dispararRadioFila = useCallback((item: EstanteItem) => {
    const url = urlRadioDaEstante(item);
    if (!url) return;
    const detail: RadioHunterTrackDetail = {
      titulo: item.titulo,
      url,
      id: item.id != null ? String(item.id) : url,
    };
    window.dispatchEvent(new CustomEvent(RADIO_HUNTER_ADD_QUEUE, { detail }));
  }, []);

  const dispararRadioPlayNow = useCallback((titulo: string, url: string, id: string) => {
    if (!url) return;
    const detail: RadioHunterTrackDetail = { titulo, url, id };
    window.dispatchEvent(new CustomEvent("RADIO_HUNTER_PLAY_NOW", { detail }));
  }, []);

  const dispararSelecaoPlaylist = useCallback((titulo: string, url: string, id: string) => {
    if (!url) return;
    const detail: RadioHunterTrackDetail = { titulo, url, id };
    window.dispatchEvent(new CustomEvent("RADIO_HUNTER_SELECT_PLAYLIST", { detail }));
  }, []);

  const selecionarCategoria = useCallback((f: FiltroCategoria) => {
    setFiltroCategoria(f);
    setSoloMotor(null);
  }, []);

  async function excluirDaEstante(item: EstanteItem, idx: number) {
    if (item.id == null) {
      setFeedbackInline("Este item ainda não pode ser removido (sem id).");
      window.setTimeout(() => setFeedbackInline(null), 3000);
      return;
    }
    const senha = obterSenhaMestreRevelada();
    if (!senha) {
      setFeedbackInline("Desbloqueie a senha mestra na sessão para excluir sem pedir de novo.");
      window.setTimeout(() => setFeedbackInline(null), 4000);
      return;
    }

    const tabela = TIPO_OBRA_TABELA_DB[item.tipo_obra];
    const chave = chaveEstanteItem(item, idx);
    setExcluindoChave(chave);
    try {
      const idVal = item.id;
      const body: Record<string, unknown> = { tabela, senhaMestre: senha };
      if (typeof idVal === "number" && Number.isFinite(idVal)) {
        body.id = idVal;
      } else if (typeof idVal === "string" && idVal.trim()) {
        body.id = idVal.trim();
      } else {
        setFeedbackInline("Id inválido para exclusão.");
        return;
      }

      const res = await fetch(API_DB_PATH, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (res.status === 401) limparSenhaMestreNaSessao();
      if (!res.ok || !data.success) {
        setFeedbackInline(data.error || "Erro ao excluir.");
        window.setTimeout(() => setFeedbackInline(null), 4000);
        return;
      }

      setEstanteHits((prev) =>
        prev.filter((h) => !(h.tipo_obra === item.tipo_obra && h.id === item.id))
      );
      setEstanteRefreshNonce((n) => n + 1);
      if (item.tipo_obra === "song") {
        window.dispatchEvent(new Event("music-updated"));
      }
    } finally {
      setExcluindoChave(null);
    }
  }

  async function aoClicarGalaxia(modo: GalaxiaModo) {
    if (!podeAcionarGalaxia) return;
    setSoloMotor(modo);
    setWebSugestaoAuto(false);
    setGalaxiaModoAtivo(modo);
    await buscarGalaxia(termoWeb, modo);
  }

  async function importarDaGalaxia(r: ResultadoBusca, chave: string) {
    if (!podeImportar || itemJaNaEstanteCatalogo(r, estanteHits)) return;
    setImportandoChave(chave);
    try {
      const draft = resultadoParaDraft(r);
      const aba = TIPO_OBRA_PARA_ABA[r.tipoCatalogo];
      const out = await salvarObra(draft, aba);
      if (out.ok) {
        setGalaxiaImportadas((prev) => new Set(prev).add(chave));
        const novoItem: EstanteItem = {
          ...(out.insertedId != null ? { id: out.insertedId } : {}),
          titulo: r.titulo,
          capa: r.capa,
          capa_url: r.capa,
          progresso: 0,
          tipo_obra: r.tipoCatalogo,
          link_url: r.link_url?.trim() || null,
        };
        setEstanteHits((prev) => {
          if (itemJaNaEstanteCatalogo(r, prev)) return prev;
          return [...prev, novoItem];
        });
        setEstanteRefreshNonce((n) => n + 1);
        setFeedbackInline(`"${r.titulo}" na estante.`);
        window.setTimeout(() => setFeedbackInline(null), 3200);
      }
    } finally {
      setImportandoChave(null);
    }
  }

  const gridClass =
    "grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4";

  function renderAcoesEstante(
    item: EstanteItem,
    idx: number,
    songComLink: boolean,
    busyExcluir: boolean
  ) {
    const isMusic = item.tipo_obra === "song";

    if (isMusic) {
      const urlLocal = urlRadioDaEstante(item) || "";
      const idLocal = item.id != null ? String(item.id) : urlLocal;

      return (
        <>
          <button
            type="button"
            className={acaoIconBtn}
            title="Ouvir"
            aria-label="Ouvir"
            onClick={() => dispararRadioPlayNow(item.titulo, urlLocal, idLocal)}
          >
            <Play className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={acaoIconBtn}
            title="Adicionar à playlist"
            aria-label="Adicionar à playlist"
            onClick={() => dispararSelecaoPlaylist(item.titulo, urlLocal, idLocal)}
          >
            <ListPlus className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={`${acaoIconBtn} hover:border-red-500/40 hover:text-red-300`}
            title="Remover da estante"
            aria-label="Remover da estante"
            disabled={item.id == null || busyExcluir}
            onClick={() => void excluirDaEstante(item, idx)}
          >
            {busyExcluir ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        </>
      );
    }

    // Para as demais categorias (Mangá, Anime, Série, etc) que já estão na estante
    return (
      <button
        type="button"
        className={`${acaoIconBtn} hover:border-red-500/40 hover:text-red-300`}
        title="Remover da estante"
        aria-label="Remover da estante"
        disabled={item.id == null || busyExcluir}
        onClick={() => void excluirDaEstante(item, idx)}
      >
        {busyExcluir ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
      </button>
    );
  }

  return (
    <>
      <AnimatePresence>
        {isOpen ? (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Busca global"
            className="fixed inset-0 z-[9900] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm md:p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) close();
            }}
          >
            <motion.div
              className="flex h-[min(88vh,820px)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-emerald-500/10 bg-zinc-950/60 shadow-[0_0_48px_rgba(0,0,0,0.75),0_0_80px_rgba(34,197,94,0.06)] ring-1 ring-emerald-500/10 backdrop-blur-xl"
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {feedbackInline && (
                <p className="border-b border-emerald-500/10 bg-emerald-500/10 px-4 py-2 text-center text-sm text-emerald-200/95">
                  {feedbackInline}
                </p>
              )}

              <div className="flex min-h-0 flex-1 flex-col md:flex-row">
                <aside className="flex w-full shrink-0 flex-col gap-4 border-b border-emerald-500/10 p-4 md:w-[280px] md:border-b-0 md:border-r md:border-emerald-500/10">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500/70">
                      OmniSearch
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="hidden items-center gap-1 rounded border border-emerald-500/10 bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500 sm:inline-flex">
                        <Command className="h-3 w-3 text-emerald-500/80" aria-hidden />/
                      </span>
                      <button
                        type="button"
                        onClick={close}
                        className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-white/10 hover:text-emerald-400"
                        aria-label="Fechar busca"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <Search
                      className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${
                        isLoading || galaxiaLoading
                          ? "text-emerald-400/50"
                          : "text-emerald-500"
                      }`}
                      aria-hidden
                    />
                    <input
                      ref={inputRef}
                      autoFocus
                      type="text"
                      placeholder="Buscar na estante…"
                      className="w-full rounded-xl border border-emerald-500/10 bg-zinc-900/50 py-3 pl-10 pr-3 text-sm text-white outline-none ring-0 placeholder:text-zinc-600 focus:border-emerald-500/30"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto">
                    <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                      Categorias
                    </p>
                    <nav className="flex flex-col gap-1" aria-label="Filtrar por tipo">
                      <button
                        type="button"
                        onClick={() => selecionarCategoria("todos")}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-left text-xs font-semibold transition-colors ${
                          filtroCategoria === "todos"
                            ? "border-emerald-500/35 bg-emerald-500/10 text-white"
                            : "border-emerald-500/10 bg-zinc-900/40 text-zinc-400 hover:border-emerald-500/25 hover:text-zinc-200"
                        }`}
                      >
                        <span>Todos</span>
                        <span className="tabular-nums text-[10px] text-zinc-500">
                          {estanteHits.length}
                        </span>
                      </button>
                      {TIPO_OBRA_ORDEM_UI.map((tipo) => {
                        const n = contagensEstante.get(tipo) ?? 0;
                        const ativo = filtroCategoria === tipo;
                        return (
                          <button
                            key={tipo}
                            type="button"
                            onClick={() => selecionarCategoria(tipo)}
                            className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-left text-xs font-semibold transition-colors ${
                              ativo
                                ? "border-emerald-500/35 bg-emerald-500/10 text-white"
                                : "border-emerald-500/10 bg-zinc-900/40 text-zinc-400 hover:border-emerald-500/25 hover:text-zinc-200"
                            }`}
                          >
                            <span>{TIPO_OBRA_LABEL_SECAO[tipo]}</span>
                            <span className="tabular-nums text-[10px] text-zinc-500">{n}</span>
                          </button>
                        );
                      })}
                    </nav>
                  </div>

                  <div className="border-t border-emerald-500/10 pt-3">
                    <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                      Motores
                    </p>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        disabled={!podeAcionarGalaxia || galaxiaLoading}
                        onClick={() => void aoClicarGalaxia("anilist")}
                        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-[11px] font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40 ${
                          galaxiaModoAtivo === "anilist"
                            ? "border-emerald-500/45 bg-emerald-500/15 text-white"
                            : "border-emerald-500/10 bg-zinc-900/50 text-zinc-300 hover:border-emerald-500/30 hover:bg-zinc-800/80"
                        }`}
                      >
                        <Compass className="h-3.5 w-3.5 shrink-0 text-emerald-500/80" aria-hidden />
                        AniList
                      </button>
                      <button
                        type="button"
                        disabled={!podeAcionarGalaxia || galaxiaLoading}
                        onClick={() => void aoClicarGalaxia("tmdb")}
                        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-[11px] font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40 ${
                          galaxiaModoAtivo === "tmdb"
                            ? "border-sky-500/45 bg-sky-500/10 text-white"
                            : "border-emerald-500/10 bg-zinc-900/50 text-zinc-300 hover:border-sky-500/30 hover:bg-zinc-800/80"
                        }`}
                      >
                        <Globe className="h-3.5 w-3.5 shrink-0 text-sky-400/85" aria-hidden />
                        TMDB
                      </button>
                      <button
                        type="button"
                        disabled={!podeAcionarGalaxia || galaxiaLoading}
                        onClick={() => void aoClicarGalaxia("youtube")}
                        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-[11px] font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40 ${
                          galaxiaModoAtivo === "youtube"
                            ? "border-red-500/35 bg-red-500/10 text-white"
                            : "border-emerald-500/10 bg-zinc-900/50 text-zinc-300 hover:border-red-500/25 hover:bg-zinc-800/80"
                        }`}
                      >
                        <Youtube className="h-3.5 w-3.5 shrink-0 text-red-400/85" aria-hidden />
                        YouTube
                      </button>
                    </div>
                  </div>

                  <p className="text-[10px] text-zinc-600">ESC fecha</p>
                </aside>

                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                  {sessaoBloqueada && (
                    <p className="mb-4 text-sm text-zinc-500">
                      Selecione um Hunter na home para buscar na sua estante.
                    </p>
                  )}

                  {!sessaoBloqueada && searchTerm.trim().length > 0 && searchTerm.trim().length < 2 && (
                    <p className="mb-4 text-sm text-zinc-500">
                      Digite pelo menos 2 caracteres para buscar.
                    </p>
                  )}

                  {searchError && (
                    <p className="mb-4 text-sm text-red-400/90">{searchError}</p>
                  )}

                  {(isLoading || galaxiaLoading) && (
                    <p className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-500/80">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      {galaxiaLoading ? "Buscando na web…" : "Buscando na estante…"}
                    </p>
                  )}

                  {!soloMotor && (
                    <div className={gridClass}>
                      <AnimatePresence mode="popLayout">
                        {estanteFiltrada.map((item) => {
                          const globalIdx = estanteHits.indexOf(item);
                          const idx = globalIdx >= 0 ? globalIdx : 0;
                          const capaSrc =
                            (typeof item.capa_url === "string" && item.capa_url.trim()) ||
                            (typeof item.capa === "string" && item.capa.trim()) ||
                            "";
                          const key = chaveEstanteItem(item, idx);
                          const urlRadio = urlRadioDaEstante(item);
                          const songComLink =
                            item.tipo_obra === "song" && urlRadio != null && urlRadio.length > 0;
                          const busyExcluir = excluindoChave === key;
                          return (
                            <motion.article
                              key={key}
                              layout
                              initial={{ opacity: 1 }}
                              exit={{ opacity: 0, scale: 0.96 }}
                              transition={{ duration: 0.22, ease: "easeOut" }}
                              className="group/card flex flex-col overflow-hidden rounded-xl border border-emerald-500/10 bg-zinc-900/40 transition-colors hover:border-emerald-500/25 hover:bg-zinc-900/60"
                            >
                              <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-800/80">
                                {capaSrc ? (
                                  <img
                                    src={capaSrc}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                ) : null}
                                <span className="pointer-events-none absolute left-2 top-2 z-[5] rounded border border-emerald-500/20 bg-zinc-950/75 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-emerald-400/90 backdrop-blur-sm">
                                  Local
                                </span>
                                <div className={capaAcOverlay}>
                                  {renderAcoesEstante(item, idx, songComLink, busyExcluir)}
                                </div>
                              </div>
                              <div className="flex flex-1 flex-col gap-2 p-3">
                                <h3 className="line-clamp-2 text-left text-xs font-semibold leading-snug text-white">
                                  {item.titulo}
                                </h3>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-[8px] font-medium uppercase tracking-[0.12em] text-emerald-500/55">
                                    {TIPO_OBRA_TAG_MINI[item.tipo_obra]}
                                  </span>
                                  <span className="text-[9px] tabular-nums text-zinc-500">
                                    {rotuloProgresso(item)}
                                  </span>
                                </div>
                                <div className="mt-auto flex flex-wrap items-center justify-end gap-1.5 border-t border-emerald-500/10 pt-2 md:hidden">
                                  {renderAcoesEstante(item, idx, songComLink, busyExcluir)}
                                </div>
                              </div>
                            </motion.article>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  )}

                  {!soloMotor &&
                    webSugestaoAuto &&
                    webEntries.length > 0 &&
                    podeBuscar &&
                    !searchError && (
                      <div
                        className="my-6 flex flex-col gap-3 border-t border-emerald-500/15 pt-6"
                        role="separator"
                        aria-label="Sugestões da Web"
                      >
                        <h3 className="text-center text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-500/70">
                          Sugestões da Web
                        </h3>
                      </div>
                    )}

                  {soloMotor && webEntries.length > 0 && (
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                      Descoberta:{" "}
                      {soloMotor === "anilist"
                        ? "AniList"
                        : soloMotor === "tmdb"
                          ? "TMDB"
                          : "YouTube"}
                    </p>
                  )}

                  <div className={gridClass}>
                    <AnimatePresence mode="popLayout">
                      {webEntries.map(({ resultado: r, item: webItem, chave }) => {
                        const naEstante =
                          itemJaNaEstanteCatalogo(r, estanteHits) ||
                          galaxiaImportadas.has(chave);
                        const busy = importandoChave === chave || salvando;
                        const capaSrc =
                          (typeof webItem.capa_url === "string" && webItem.capa_url.trim()) ||
                          (typeof webItem.capa === "string" && webItem.capa.trim()) ||
                          "";
                        const isMusic = r.tipoCatalogo === "song";
                        const webUrl = r.link_url?.trim() || "";

                        return (
                          <motion.article
                            key={chave}
                            layout
                            initial={{ opacity: 1 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="group/card flex flex-col overflow-hidden rounded-xl border border-emerald-500/10 bg-zinc-900/40 transition-colors hover:border-emerald-500/25 hover:bg-zinc-900/60"
                          >
                            <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-800/80">
                              {capaSrc ? (
                                <img src={capaSrc} alt="" className="h-full w-full object-cover" />
                              ) : null}
                              <span className="pointer-events-none absolute bottom-2 left-2 z-[5] rounded border border-white/10 bg-zinc-950/70 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-zinc-400 backdrop-blur-sm">
                                Web
                              </span>
                              {naEstante ? (
                                <div
                                  className="absolute right-2 top-2 z-[6] flex h-7 w-7 items-center justify-center rounded-full border border-emerald-500/35 bg-zinc-950/85 text-emerald-400 shadow-md backdrop-blur-sm"
                                  title="Na estante"
                                  aria-hidden
                                >
                                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                                </div>
                              ) : null}
                              <div className={capaAcOverlay}>
                                {!naEstante ? (
                                  <>
                                    {isMusic && webUrl ? (
                                      <button
                                        type="button"
                                        className={acaoIconBtn}
                                        title="Ouvir prévia"
                                        aria-label="Ouvir prévia"
                                        onClick={() => dispararRadioPlayNow(webItem.titulo, webUrl, chave)}
                                      >
                                        <Play className="h-4 w-4" />
                                      </button>
                                    ) : null}
                                    <button
                                      type="button"
                                      disabled={!podeImportar || busy}
                                      className={acaoIconBtn}
                                      title="Importar para a estante"
                                      aria-label="Importar para a estante"
                                      onClick={() => void importarDaGalaxia(r, chave)}
                                    >
                                      {busy ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Plus className="h-4 w-4" />
                                      )}
                                    </button>
                                  </>
                                ) : null}
                              </div>
                            </div>
                            <div className="flex flex-1 flex-col gap-2 p-3">
                              <h3 className="line-clamp-2 text-left text-xs font-semibold leading-snug text-white">
                                {webItem.titulo}
                              </h3>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[8px] font-semibold uppercase tracking-wider text-zinc-500">
                                  {r.fonte}
                                </span>
                                <span className="text-[8px] font-medium uppercase tracking-[0.12em] text-emerald-500/55">
                                  {TIPO_OBRA_TAG_MINI[r.tipoCatalogo]}
                                </span>
                              </div>
                              <div className="mt-auto flex justify-end gap-1.5 border-t border-emerald-500/10 pt-2 md:hidden">
                                {!naEstante ? (
                                  <>
                                    {isMusic && webUrl ? (
                                      <button
                                        type="button"
                                        className={acaoIconBtn}
                                        title="Ouvir prévia"
                                        aria-label="Ouvir prévia"
                                        onClick={() => dispararRadioPlayNow(webItem.titulo, webUrl, chave)}
                                      >
                                        <Play className="h-4 w-4" />
                                      </button>
                                    ) : null}
                                    <button
                                      type="button"
                                      disabled={!podeImportar || busy}
                                      className={acaoIconBtn}
                                      title="Importar para a estante"
                                      aria-label="Importar para a estante"
                                      onClick={() => void importarDaGalaxia(r, chave)}
                                    >
                                      {busy ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Plus className="h-4 w-4" />
                                      )}
                                    </button>
                                  </>
                                ) : (
                                  <div
                                    className={`${acaoIconBtn} border-emerald-500/30 text-emerald-400`}
                                    aria-label="Já na estante"
                                  >
                                    <Check className="h-4 w-4" />
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.article>
                        );
                      })}
                    </AnimatePresence>
                  </div>

                  {!isLoading &&
                    !galaxiaLoading &&
                    podeBuscar &&
                    !searchError &&
                    !soloMotor &&
                    estanteFiltrada.length === 0 &&
                    webEntries.length === 0 && (
                      <p className="mt-6 text-center text-sm text-zinc-500">
                        Nenhum resultado para este filtro. Use os motores para buscar na web.
                      </p>
                    )}

                  {!isLoading &&
                    !galaxiaLoading &&
                    podeBuscar &&
                    !searchError &&
                    soloMotor &&
                    webEntries.length === 0 && (
                      <p className="mt-6 text-center text-sm text-zinc-500">
                        Nenhum resultado neste motor para o termo atual.
                      </p>
                    )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      {modalSenhaMestra}
    </>
  );
}
