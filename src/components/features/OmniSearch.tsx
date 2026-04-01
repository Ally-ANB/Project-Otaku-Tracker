"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  Search,
  Database,
  Globe,
  Command,
  X,
  Youtube,
  Compass,
  Trash2,
  Play,
  Plus,
  Check,
  ListPlus,
  Loader2,
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
  RADIO_HUNTER_PLAY_URL,
  type RadioHunterTrackDetail,
} from "@/lib/radioHunterEvents";
import type { EstanteItem, ResultadoBusca, TipoObra } from "@/types/hunter_registry";
import { TIPO_OBRA_PARA_ABA } from "@/types/hunter_registry";

export type { EstanteItem, TipoObra } from "@/types/hunter_registry";

/** Dispare com `window.dispatchEvent(new CustomEvent(OMNISEARCH_OPEN_EVENT))` para abrir o painel. */
export const OMNISEARCH_OPEN_EVENT = "omnisearch:open";

const TABELA_POR_TIPO: Record<TipoObra, string> = {
  manga: "mangas",
  anime: "animes",
  movie: "filmes",
  series: "series",
  book: "livros",
  game: "jogos",
  song: "musicas",
};

const TIPOS_ORDEM: TipoObra[] = [
  "manga",
  "anime",
  "series",
  "movie",
  "book",
  "game",
  "song",
];

const TITULO_SECAO: Record<TipoObra, string> = {
  manga: "Mangá",
  anime: "Anime",
  series: "Série",
  movie: "Filme",
  book: "Livro",
  game: "Jogo",
  song: "Música",
};

const TIPO_TAG_CURTA: Record<TipoObra, string> = {
  manga: "MAN",
  anime: "ANM",
  series: "SÉR",
  movie: "FIL",
  book: "LIV",
  game: "JGO",
  song: "MUS",
};

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

function TipoTagMinimal({ tipo }: { tipo: TipoObra }) {
  return (
    <span
      className="w-fit border-l border-emerald-500/20 pl-2 text-[9px] font-medium uppercase tracking-[0.14em] text-emerald-500/50"
      aria-hidden
    >
      {TIPO_TAG_CURTA[tipo]}
    </span>
  );
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

function itemJaNaEstante(item: ResultadoBusca, hits: EstanteItem[]): boolean {
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

const categoriasContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.02 },
  },
};

const categoriaBloco: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.055, delayChildren: 0.02 },
  },
};

const listContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.02 },
  },
};

const listItem: Variants = {
  hidden: { opacity: 0, x: -8 },
  show: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", stiffness: 420, damping: 28 },
  },
};

const secaoTituloVariant: Variants = {
  hidden: { opacity: 0, x: -6 },
  show: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", stiffness: 400, damping: 28 },
  },
};

function logSearchFailure(context: string, error: unknown) {
  console.error(`[OmniSearch] ${context}:`, error);
}

const acaoIconBtn =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-zinc-900/80 text-zinc-300 transition-colors hover:border-emerald-500/35 hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-35";

export default function OmniSearch() {
  const hunterUserId = useHunterAtivo();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const [estanteHits, setEstanteHits] = useState<EstanteItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [estanteRefreshNonce, setEstanteRefreshNonce] = useState(0);

  const [galaxiaModoAtivo, setGalaxiaModoAtivo] = useState<GalaxiaModo | null>(null);
  const [importandoChave, setImportandoChave] = useState<string | null>(null);
  const [galaxiaImportadas, setGalaxiaImportadas] = useState<Set<string>>(() => new Set());
  const [excluindoChave, setExcluindoChave] = useState<string | null>(null);
  const [feedbackInline, setFeedbackInline] = useState<string | null>(null);

  const { obterSenhaMestreInterativa, modalSenhaMestra } = useSenhaMestraInterativa();

  const {
    resultados: galaxiaHits,
    buscando: galaxiaLoading,
    buscarGalaxia,
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

  const podeBuscar = useMemo(() => {
    if (!hunterUserId || hunterUserId === "Admin") return false;
    return searchTerm.trim().length >= 2;
  }, [hunterUserId, searchTerm]);

  useEffect(() => {
    limparGalaxia();
    setGalaxiaModoAtivo(null);
    setGalaxiaImportadas(new Set());
  }, [searchTerm, limparGalaxia]);

  useEffect(() => {
    if (!podeBuscar) {
      setEstanteHits([]);
      setSearchError(null);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsLoading(true);
      setSearchError(null);
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
            query: searchTerm.trim(),
            hunterId: userIdNaFila,
          }),
        });
        const json = (await res.json()) as { items?: unknown; error?: string };

        if (!res.ok) {
          setSearchError(json.error || `Erro na busca (${res.status}).`);
          setEstanteHits([]);
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
      } catch (error) {
        logSearchFailure("fetch /api/estante/search", error);
        setSearchError(error instanceof Error ? error.message : "Falha na busca.");
        setEstanteHits([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, podeBuscar, hunterUserId, estanteRefreshNonce]);

  const close = useCallback(() => {
    setSearchTerm("");
    setEstanteHits([]);
    setSearchError(null);
    limparGalaxia();
    setGalaxiaModoAtivo(null);
    setGalaxiaImportadas(new Set());
    setFeedbackInline(null);
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

  const hitsPorTipo = useMemo(() => {
    const grupos = new Map<TipoObra, EstanteItem[]>();
    for (const h of estanteHits) {
      const arr = grupos.get(h.tipo_obra) ?? [];
      arr.push(h);
      grupos.set(h.tipo_obra, arr);
    }
    return TIPOS_ORDEM.filter((t) => (grupos.get(t)?.length ?? 0) > 0).map((t) => ({
      tipo: t,
      items: grupos.get(t)!,
    }));
  }, [estanteHits]);

  const explorarGalaxiaEmDestaque =
    !sessaoBloqueada &&
    podeBuscar &&
    !isLoading &&
    !searchError &&
    estanteHits.length === 0;

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

  const dispararRadioPlay = useCallback((item: EstanteItem) => {
    const url = urlRadioDaEstante(item);
    if (!url) return;
    const detail: RadioHunterTrackDetail = {
      titulo: item.titulo,
      url,
      id: item.id != null ? String(item.id) : url,
    };
    window.dispatchEvent(new CustomEvent(RADIO_HUNTER_PLAY_URL, { detail }));
  }, []);

  async function excluirDaEstante(item: EstanteItem, idx: number) {
    if (item.id == null) {
      setFeedbackInline("Este item ainda não pode ser removido (sem id).");
      window.setTimeout(() => setFeedbackInline(null), 3000);
      return;
    }
    const tabela = TABELA_POR_TIPO[item.tipo_obra];
    const chave = chaveEstanteItem(item, idx);
    setExcluindoChave(chave);
    try {
      let senha = obterSenhaMestreRevelada();
      if (!senha) senha = await obterSenhaMestreInterativa();
      if (!senha) return;

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
      if (item.tipo_obra === "song") {
        window.dispatchEvent(new Event("music-updated"));
      }
    } finally {
      setExcluindoChave(null);
    }
  }

  async function aoClicarGalaxia(modo: GalaxiaModo) {
    if (!podeAcionarGalaxia) return;
    setGalaxiaModoAtivo(modo);
    await buscarGalaxia(termoWeb, modo);
  }

  async function importarDaGalaxia(r: ResultadoBusca, chave: string) {
    if (!podeImportar || itemJaNaEstante(r, estanteHits)) return;
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
          if (itemJaNaEstante(r, prev)) return prev;
          return [...prev, novoItem];
        });
        setFeedbackInline(`“${r.titulo}” na estante.`);
        window.setTimeout(() => setFeedbackInline(null), 3200);
        setEstanteRefreshNonce((n) => n + 1);
      }
    } finally {
      setImportandoChave(null);
    }
  }

  return (
    <>
      <AnimatePresence>
        {isOpen ? (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Busca global"
            className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/60 pt-[15vh] backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) close();
            }}
          >
            <motion.div
              className="flex w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-white/10 bg-zinc-950/80 shadow-[0_0_40px_rgba(0,0,0,0.8),0_0_60px_rgba(34,197,94,0.08)] ring-1 ring-emerald-500/25 backdrop-blur-xl"
              initial={{ opacity: 0, y: -16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="flex items-center border-b border-white/5 bg-zinc-900/50 px-4 py-4 backdrop-blur-md">
                <Search
                  className={`mr-3 h-6 w-6 shrink-0 transition-colors duration-200 ${
                    isLoading || galaxiaLoading
                      ? "text-emerald-400/50 drop-shadow-[0_0_6px_rgba(34,197,94,0.25)]"
                      : "text-emerald-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.45)]"
                  }`}
                  aria-hidden
                />
                <input
                  ref={inputRef}
                  autoFocus
                  type="text"
                  placeholder="O que você procura na sua Estante?"
                  className="flex-1 bg-transparent text-xl text-white outline-none placeholder:text-zinc-600"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="ml-3 flex shrink-0 items-center gap-2">
                  <span className="hidden items-center gap-1 rounded border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500 sm:inline-flex">
                    <Command className="h-3 w-3 text-emerald-500/80" />/
                  </span>
                  <span className="rounded bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    ESC para fechar
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

              {feedbackInline && (
                <p className="border-b border-white/5 bg-emerald-500/10 px-4 py-2 text-center text-sm text-emerald-200/95">
                  {feedbackInline}
                </p>
              )}

              <div className="flex max-h-[min(70vh,640px)] flex-col overflow-y-auto p-2">
                <div className="mb-4 min-h-0 flex-1">
                  <div className="flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
                    <Database className="h-3 w-3 text-emerald-500/70" />
                    Na sua Estante
                  </div>

                  {sessaoBloqueada && (
                    <p className="px-3 py-2 text-sm text-zinc-500">
                      Selecione um Hunter na home para buscar na sua estante (sessão
                      privada).
                    </p>
                  )}

                  {!sessaoBloqueada && searchTerm.trim().length > 0 && searchTerm.trim().length < 2 && (
                    <p className="px-3 py-2 text-sm text-zinc-500">
                      Digite pelo menos 2 caracteres para ativar a busca S-Rank.
                    </p>
                  )}

                  {searchError && (
                    <p className="px-3 py-2 text-sm text-red-400/90">{searchError}</p>
                  )}

                  {!isLoading &&
                    podeBuscar &&
                    !searchError &&
                    estanteHits.length === 0 && (
                      <p className="px-3 py-2 text-sm text-zinc-500">
                        Nenhum resultado na estante para esse termo.
                      </p>
                    )}

                  {hitsPorTipo.length > 0 && (
                    <motion.div
                      className="flex flex-col gap-5 px-1"
                      variants={categoriasContainer}
                      initial="hidden"
                      animate="show"
                      key={`estante-${searchTerm}-${estanteHits.length}-${searchError ?? ""}-${estanteRefreshNonce}`}
                    >
                      {hitsPorTipo.map(({ tipo, items }) => (
                        <motion.section
                          key={tipo}
                          variants={categoriaBloco}
                          className="flex flex-col gap-2"
                          aria-label={TITULO_SECAO[tipo]}
                        >
                          <motion.h3
                            variants={secaoTituloVariant}
                            className="px-2 text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-500/65"
                          >
                            {TITULO_SECAO[tipo]}
                          </motion.h3>
                          <motion.ul className="flex flex-col gap-1" variants={listContainer}>
                            {items.map((item, idx) => {
                              const capaSrc =
                                (typeof item.capa_url === "string" && item.capa_url.trim()) ||
                                (typeof item.capa === "string" && item.capa.trim()) ||
                                "";
                              const key = chaveEstanteItem(item, idx);
                              const tituloLongo = item.titulo.length > 38;
                              const urlRadio = urlRadioDaEstante(item);
                              const songComLink = item.tipo_obra === "song" && urlRadio;
                              const busyExcluir = excluindoChave === key;
                              return (
                                <motion.li key={key} variants={listItem} layout>
                                  <div className="group flex w-full items-center gap-4 rounded-xl p-3 transition-all hover:bg-white/5">
                                    {capaSrc ? (
                                      <img
                                        src={capaSrc}
                                        alt=""
                                        className="h-14 w-10 shrink-0 rounded object-cover ring-1 ring-white/5"
                                      />
                                    ) : (
                                      <div className="h-14 w-10 shrink-0 rounded bg-zinc-800/90 ring-1 ring-white/5" />
                                    )}
                                    <div className="min-w-0 flex-1 flex-col gap-1">
                                      <span
                                        className={`line-clamp-2 font-medium leading-snug text-white ${
                                          tituloLongo ? "text-sm" : "text-[15px]"
                                        }`}
                                      >
                                        {item.titulo}
                                      </span>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <TipoTagMinimal tipo={item.tipo_obra} />
                                        <span className="text-[10px] tabular-nums text-zinc-500">
                                          {rotuloProgresso(item)}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1.5">
                                      {songComLink ? (
                                        <>
                                          <button
                                            type="button"
                                            className={acaoIconBtn}
                                            title="Tocar no Radio"
                                            aria-label="Tocar no Radio"
                                            onClick={() => dispararRadioPlay(item)}
                                          >
                                            <Play className="h-4 w-4" />
                                          </button>
                                          <button
                                            type="button"
                                            className={acaoIconBtn}
                                            title="Adicionar à fila do Radio"
                                            aria-label="Adicionar à fila do Radio"
                                            onClick={() => dispararRadioFila(item)}
                                          >
                                            <ListPlus className="h-4 w-4" />
                                          </button>
                                        </>
                                      ) : null}
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
                                    </div>
                                  </div>
                                </motion.li>
                              );
                            })}
                          </motion.ul>
                        </motion.section>
                      ))}
                    </motion.div>
                  )}
                </div>

                <div
                  className={`shrink-0 border-t px-2 py-4 transition-colors ${
                    explorarGalaxiaEmDestaque
                      ? "border-emerald-500/25 bg-emerald-500/[0.06]"
                      : "border-white/5 bg-transparent"
                  }`}
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2 px-2">
                    <Globe
                      className={`h-3.5 w-3.5 shrink-0 ${
                        explorarGalaxiaEmDestaque ? "text-emerald-400/90" : "text-emerald-500/50"
                      }`}
                      aria-hidden
                    />
                    <span
                      className={`text-[10px] font-bold uppercase tracking-[0.18em] ${
                        explorarGalaxiaEmDestaque ? "text-emerald-400/85" : "text-zinc-500"
                      }`}
                    >
                      Explorar Galáxia
                    </span>
                    {explorarGalaxiaEmDestaque && (
                      <span className="text-[10px] font-medium normal-case tracking-normal text-zinc-400">
                        — busca integrada no app
                      </span>
                    )}
                  </div>
                  <p className="mb-2.5 px-2 text-[11px] leading-relaxed text-zinc-500">
                    AniList, TMDB e YouTube: resultados abaixo, sem abrir outra aba.
                  </p>
                  <div className="mb-3 flex flex-wrap gap-2 px-1">
                    <button
                      type="button"
                      disabled={!podeAcionarGalaxia || galaxiaLoading}
                      onClick={() => void aoClicarGalaxia("anilist")}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-left text-[11px] font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40 ${
                        galaxiaModoAtivo === "anilist"
                          ? "border-emerald-500/50 bg-emerald-500/15 text-white"
                          : "border-white/10 bg-zinc-900/80 text-zinc-300 hover:border-emerald-500/30 hover:bg-zinc-800/90 hover:text-white"
                      }`}
                    >
                      <Compass className="h-3.5 w-3.5 text-emerald-500/80" aria-hidden />
                      AniList
                    </button>
                    <button
                      type="button"
                      disabled={!podeAcionarGalaxia || galaxiaLoading}
                      onClick={() => void aoClicarGalaxia("tmdb")}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-left text-[11px] font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40 ${
                        galaxiaModoAtivo === "tmdb"
                          ? "border-sky-500/45 bg-sky-500/10 text-white"
                          : "border-white/10 bg-zinc-900/80 text-zinc-300 hover:border-sky-500/25 hover:bg-zinc-800/90 hover:text-white"
                      }`}
                    >
                      <Globe className="h-3.5 w-3.5 text-sky-400/85" aria-hidden />
                      TMDB
                    </button>
                    <button
                      type="button"
                      disabled={!podeAcionarGalaxia || galaxiaLoading}
                      onClick={() => void aoClicarGalaxia("youtube")}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-left text-[11px] font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40 ${
                        galaxiaModoAtivo === "youtube"
                          ? "border-red-500/35 bg-red-500/10 text-white"
                          : "border-white/10 bg-zinc-900/80 text-zinc-300 hover:border-red-500/25 hover:bg-zinc-800/90 hover:text-white"
                      }`}
                    >
                      <Youtube className="h-3.5 w-3.5 text-red-400/85" aria-hidden />
                      YouTube
                    </button>
                  </div>

                  {galaxiaLoading && (
                    <p className="px-2 pb-2 text-center text-[10px] font-bold uppercase tracking-widest text-emerald-500/80 animate-pulse">
                      Sincronizando com a galáxia…
                    </p>
                  )}

                  {galaxiaHits.length > 0 && (
                    <ul className="mt-1 flex max-h-56 flex-col gap-1 overflow-y-auto px-1">
                      {galaxiaHits.map((r, idx) => {
                        const chave = chaveResultadoGalaxia(r, idx);
                        const naEstante =
                          itemJaNaEstante(r, estanteHits) || galaxiaImportadas.has(chave);
                        const busy = importandoChave === chave || salvando;
                        return (
                          <li key={chave}>
                            <div className="group flex w-full items-center gap-4 rounded-xl p-3 transition-all hover:bg-white/5">
                              {r.capa ? (
                                <img
                                  src={r.capa}
                                  alt=""
                                  className="h-14 w-10 shrink-0 rounded object-cover ring-1 ring-white/5"
                                />
                              ) : (
                                <div className="h-14 w-10 shrink-0 rounded bg-zinc-800 ring-1 ring-white/5" />
                              )}
                              <div className="min-w-0 flex-1 flex-col gap-1">
                                <span className="line-clamp-2 text-left text-sm font-medium leading-snug text-white">
                                  {r.titulo}
                                </span>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                                    {r.fonte}
                                  </span>
                                  <TipoTagMinimal tipo={r.tipoCatalogo} />
                                </div>
                              </div>
                              <div className="flex shrink-0 items-center">
                                {naEstante ? (
                                  <div
                                    className={`${acaoIconBtn} pointer-events-none border-emerald-500/30 text-emerald-400`}
                                    title="Já na estante"
                                    aria-label="Já na estante"
                                  >
                                    <Check className="h-4 w-4" />
                                  </div>
                                ) : (
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
                                )}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
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
