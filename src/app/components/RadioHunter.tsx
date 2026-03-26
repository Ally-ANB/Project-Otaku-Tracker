"use client";

import dynamic from "next/dynamic";
import {
  AnimatePresence,
  motion,
  Reorder,
  useDragControls,
} from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  GripVertical,
  ListMusic,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Plus,
  Search,
  SkipBack,
  SkipForward,
  Trash2,
  Volume2,
} from "lucide-react";
import { supabase } from "../supabase";
import { requisicaoDbApi, obterSenhaMestreRevelada } from "@/lib/dbClient";
import { useSenhaMestraInterativa } from "../hooks/useSenhaMestraInterativa";
import { aplicarEconomiaPosAdicaoEstante } from "../guilda/guildaRankEconomia";

const ReactPlayer = dynamic(() => import("react-player"), { ssr: false });

const DEFAULT_PLAYLIST =
  "https://www.youtube.com/playlist?list=PLMC9KNkIncKvYin_USF1qoJSbryR0NOot";

function newUid(): string {
  return crypto.randomUUID();
}

function playlistUrlEfetiva(raw: string | undefined | null): string {
  const t = (raw || "").trim();
  return t.length > 0 ? t : DEFAULT_PLAYLIST;
}

function capaYoutubeDeUrl(videoUrl: string): string {
  const m = videoUrl.match(/(?:v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{11})/);
  return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : "";
}

type YoutubeIframeApi = {
  getVideoUrl?: () => string;
  getVideoData?: () => { title?: string };
  nextVideo?: () => void;
};

function lerYoutubeApi(
  playerRef: React.RefObject<HTMLElement | null>
): YoutubeIframeApi | null {
  const el = playerRef.current as { api?: YoutubeIframeApi } | null;
  const api = el?.api;
  return api && typeof api.getVideoUrl === "function" ? api : null;
}

function lerFaixaAtual(playerRef: React.RefObject<HTMLElement | null>): {
  title: string;
  url: string;
} | null {
  const p = lerYoutubeApi(playerRef);
  if (!p || typeof p.getVideoUrl !== "function") return null;
  try {
    const url = p.getVideoUrl() || "";
    if (!url) return null;
    const vd = typeof p.getVideoData === "function" ? p.getVideoData() : undefined;
    const title = (vd?.title || "").trim() || "Faixa sem título";
    return { title, url };
  } catch {
    return null;
  }
}

type RadioQueueItem = { titulo: string; url: string; id: string; uid: string };

type YoutubeSearchHit = {
  titulo: string;
  url: string;
  duracao: string;
  thumbnail: string;
  id: string;
};

function filaParaEstante(item: RadioQueueItem | undefined): { title: string; url: string } | null {
  if (!item?.url?.trim()) return null;
  return { title: (item.titulo || "").trim() || "Faixa sem título", url: item.url };
}

function defaultQueueItem(url: string): RadioQueueItem {
  return { titulo: "Hunter FM", url, id: "default", uid: `default-${newUid()}` };
}

/** react-player v3 expõe o elemento de mídia; seek por fração 0–1. */
function seekMediaToFraction(el: HTMLElement | null, fraction: number) {
  const v = el as HTMLVideoElement | null;
  if (!v || !Number.isFinite(v.duration) || v.duration <= 0) return;
  const t = Math.min(Math.max(0, fraction), 0.999999) * v.duration;
  v.currentTime = Math.min(t, Math.max(0, v.duration - 1e-3));
}

export default function RadioHunter() {
  const [usuarioAtivo, setUsuarioAtivo] = useState<string | null>(null);
  const [queue, setQueue] = useState<RadioQueueItem[]>([defaultQueueItem(DEFAULT_PLAYLIST)]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<YoutubeSearchHit[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [salvandoPlaylist, setSalvandoPlaylist] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMiniVolume, setShowMiniVolume] = useState(false);

  const [played, setPlayed] = useState(0);
  const [durationSec, setDurationSec] = useState(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [faixa, setFaixa] = useState<{ title: string; url: string } | null>(null);
  const [toasts, setToasts] = useState<{ id: number; mensagem: string; tipo: "sucesso" | "erro" }[]>(
    []
  );
  const [capturando, setCapturando] = useState(false);

  const playerRef = useRef<HTMLElement | null>(null);
  const queueRef = useRef<RadioQueueItem[]>(queue);
  const currentIndexRef = useRef(currentIndex);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const queuePanelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const constraintsRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const { obterSenhaMestreInterativa, modalSenhaMestra } = useSenhaMestraInterativa();

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    if (!isSearching) return;
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (searchContainerRef.current?.contains(target)) return;
      const el = target as HTMLElement;
      if (el.closest?.("[data-radio-search-toggle]")) return;
      setIsSearching(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [isSearching]);

  useEffect(() => {
    if (!isQueueOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (queuePanelRef.current?.contains(target)) return;
      const el = target as HTMLElement;
      if (el.closest?.("[data-radio-queue-toggle]")) return;
      setIsQueueOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [isQueueOpen]);

  useEffect(() => {
    if (isSearching) {
      searchInputRef.current?.focus();
    }
  }, [isSearching]);

  useEffect(() => {
    if (!isExpanded) {
      setIsQueueOpen(false);
      setIsSearching(false);
    } else {
      setShowMiniVolume(false);
    }
  }, [isExpanded]);

  const sincronizarFaixa = useCallback(() => {
    const info = lerFaixaAtual(playerRef);
    if (info) setFaixa(info);
  }, []);

  const mostrarToast = useCallback((mensagem: string, tipo: "sucesso" | "erro" = "sucesso") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, mensagem, tipo }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const carregarRadioEPerfil = useCallback(async (nomeOriginal: string) => {
    const { data } = await supabase
      .from("perfis")
      .select("cosmeticos, radio_playlist")
      .eq("nome_original", nomeOriginal)
      .maybeSingle();

    const rawPlaylist = (data?.cosmeticos as { ativos?: { card_config?: { playlist_url?: string } } } | null)
      ?.ativos?.card_config?.playlist_url;
    const urlPadrao = playlistUrlEfetiva(typeof rawPlaylist === "string" ? rawPlaylist : "");

    const rp = data?.radio_playlist;
    const normalized: RadioQueueItem[] = [];
    if (Array.isArray(rp)) {
      for (const row of rp) {
        if (row && typeof row === "object" && typeof (row as { url?: string }).url === "string") {
          const u = (row as { url: string }).url.trim();
          if (!u) continue;
          const uidRaw = (row as { uid?: string }).uid;
          normalized.push({
            titulo:
              typeof (row as { titulo?: string }).titulo === "string"
                ? (row as { titulo: string }).titulo
                : "Sem título",
            url: u,
            id:
              typeof (row as { id?: string }).id === "string" ? (row as { id: string }).id : u,
            uid: typeof uidRaw === "string" && uidRaw.trim() ? uidRaw : newUid(),
          });
        }
      }
    }

    if (normalized.length > 0) {
      setQueue(normalized);
      setCurrentIndex(0);
    } else {
      setQueue([defaultQueueItem(urlPadrao)]);
      setCurrentIndex(0);
    }
  }, []);

  useEffect(() => {
    const syncHunter = () => {
      const h = sessionStorage.getItem("hunter_ativo");
      setUsuarioAtivo((prev) => (prev === h ? prev : h));
    };
    syncHunter();
    const intervalo = setInterval(syncHunter, 2000);
    window.addEventListener("focus", syncHunter);
    return () => {
      clearInterval(intervalo);
      window.removeEventListener("focus", syncHunter);
    };
  }, []);

  useEffect(() => {
    if (!usuarioAtivo) {
      setQueue([defaultQueueItem(DEFAULT_PLAYLIST)]);
      setCurrentIndex(0);
      setIsPlaying(false);
      setFaixa(null);
      return;
    }
    carregarRadioEPerfil(usuarioAtivo);
  }, [usuarioAtivo, carregarRadioEPerfil]);

  useEffect(() => {
    const onCosmeticos = () => {
      const h = sessionStorage.getItem("hunter_ativo");
      if (h) carregarRadioEPerfil(h);
    };
    window.addEventListener("hunter_cosmeticos_update", onCosmeticos);
    return () => window.removeEventListener("hunter_cosmeticos_update", onCosmeticos);
  }, [carregarRadioEPerfil]);

  useEffect(() => {
    const item = queue[currentIndex];
    if (item?.url) {
      setFaixa({ title: item.titulo || "Faixa sem título", url: item.url });
    }
  }, [queue, currentIndex]);

  useEffect(() => {
    setCurrentIndex((i) => {
      if (queue.length === 0) return 0;
      return Math.min(i, queue.length - 1);
    });
  }, [queue.length]);

  useEffect(() => {
    setPlayed(0);
    setDurationSec(0);
  }, [currentIndex, queue[currentIndex]?.url]);

  const playNext = useCallback(() => {
    setCurrentIndex((i) => {
      const q = queueRef.current;
      if (q.length === 0) return 0;
      const max = q.length - 1;
      return i >= max ? i : i + 1;
    });
  }, []);

  const playPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, []);

  const handleReorder = useCallback((newOrder: RadioQueueItem[]) => {
    const playingUid = queueRef.current[currentIndexRef.current]?.uid;
    queueRef.current = newOrder;
    setQueue(newOrder);
    const ni = newOrder.findIndex((x) => x.uid === playingUid);
    setCurrentIndex(ni >= 0 ? ni : 0);
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    const prev = queueRef.current;
    const ci = currentIndexRef.current;
    const filtered = prev.filter((_, j) => j !== index);
    const final = filtered.length === 0 ? [defaultQueueItem(DEFAULT_PLAYLIST)] : filtered;
    queueRef.current = final;
    let newCi = ci;
    if (index < ci) newCi = ci - 1;
    else if (index > ci) newCi = ci;
    else newCi = Math.min(ci, final.length - 1);
    newCi = Math.max(0, Math.min(newCi, final.length - 1));
    setQueue(final);
    setCurrentIndex(newCi);
  }, []);

  async function executarBusca(e?: React.FormEvent) {
    e?.preventDefault();
    const q = searchQuery.trim();
    if (!q) {
      mostrarToast("Digite um termo para buscar.", "erro");
      return;
    }
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/youtube?q=${encodeURIComponent(q)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        mostrarToast(typeof data.error === "string" ? data.error : "Erro na busca.", "erro");
        setSearchResults([]);
        return;
      }
      const results = Array.isArray(data.results) ? data.results : [];
      setSearchResults(results as YoutubeSearchHit[]);
    } finally {
      setSearchLoading(false);
    }
  }

  function adicionarDaBusca(hit: YoutubeSearchHit) {
    setQueue((prev) => [
      ...prev,
      { titulo: hit.titulo, url: hit.url, id: hit.id || hit.url, uid: newUid() },
    ]);
    mostrarToast("Adicionado à fila", "sucesso");
  }

  async function salvarPlaylistNoPerfil() {
    if (!usuarioAtivo) {
      mostrarToast("Entre com um Hunter para salvar a playlist.", "erro");
      return;
    }
    setSalvandoPlaylist(true);
    try {
      const res = await requisicaoDbApi("POST", {
        tabela: "perfis",
        operacao: "update",
        dados: { radio_playlist: queue },
        nome_original: usuarioAtivo,
      });
      if (!res.ok) {
        mostrarToast(res.data?.error || "Falha ao salvar playlist.", "erro");
        return;
      }
      mostrarToast("Playlist salva no perfil.", "sucesso");
    } finally {
      setSalvandoPlaylist(false);
    }
  }

  async function capturarParaEstante() {
    if (!usuarioAtivo) {
      mostrarToast("Entre com um Hunter para capturar.", "erro");
      return;
    }
    sincronizarFaixa();
    const info = lerFaixaAtual(playerRef) ?? filaParaEstante(queue[currentIndex]);
    if (!info?.url) {
      mostrarToast("Nenhuma faixa ativa no player.", "erro");
      return;
    }

    setCapturando(true);
    try {
      let senhaMestre = obterSenhaMestreRevelada();
      if (!senhaMestre) senhaMestre = await obterSenhaMestreInterativa();
      if (!senhaMestre) {
        mostrarToast("Senha mestra necessária para salvar na estante.", "erro");
        return;
      }

      const capa = capaYoutubeDeUrl(info.url);
      const agora = new Date().toISOString();
      const dados = {
        titulo: info.title,
        capa: capa || "",
        capitulo_atual: 1,
        total_capitulos: 0,
        status: "Lendo",
        sinopse: "",
        favorito: false,
        usuario: usuarioAtivo,
        ultima_leitura: agora,
        link_url: info.url,
        provider_data: null,
      };

      const res = await requisicaoDbApi("POST", {
        tabela: "musicas",
        operacao: "insert",
        dados,
        senhaMestre,
      });

      if (!res.ok) {
        mostrarToast(res.data?.error || "Falha ao salvar na estante.", "erro");
        return;
      }

      try {
        const efeitos = await aplicarEconomiaPosAdicaoEstante(usuarioAtivo);
        efeitos.mensagensToast.forEach((msg) => mostrarToast(msg, "sucesso"));
      } catch {
        /* economia opcional */
      }

      mostrarToast(`Capturado: ${info.title}`, "sucesso");
    } finally {
      setCapturando(false);
    }
  }

  const onTimeUpdate = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const el = e.currentTarget;
    const d = el.duration;
    if (Number.isFinite(d) && d > 0) {
      setPlayed(el.currentTime / d);
    }
  }, []);

  const onDurationKnown = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const d = e.currentTarget.duration;
    if (Number.isFinite(d) && d > 0) setDurationSec(d);
  }, []);

  const urlAtual = queue[currentIndex]?.url ?? "";
  const playerKey = `${currentIndex}-${urlAtual}`;
  const tituloExibicao = faixa?.title || "Sintonizando…";
  const tituloLongo = tituloExibicao.length > 28;
  const seekDisabled = !Number.isFinite(durationSec) || durationSec <= 0;

  if (!usuarioAtivo) return null;

  return (
    <>
      <div
        ref={constraintsRef}
        className="fixed inset-0 z-[998] pointer-events-none"
        aria-hidden
      >
        <motion.div
          className="pointer-events-auto absolute bottom-6 right-6 z-[999] flex flex-col items-end gap-2"
          aria-label="Rádio Global Hunter"
          drag={true}
          dragMomentum={false}
          dragElastic={0}
          dragConstraints={constraintsRef}
          dragControls={dragControls}
          dragListener={false}
        >
        <div className="flex flex-col items-end gap-2">
          <AnimatePresence>
            {isSearching && isExpanded && (
              <motion.div
                key="radio-search"
                ref={searchContainerRef}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.15 }}
                className="w-[min(100vw-2rem,22rem)] rounded-2xl border border-cyan-500/30 bg-[#0e0e11]/95 backdrop-blur-md shadow-[0_0_24px_rgba(34,211,238,0.15)] p-3 mb-1"
                onPointerDownCapture={(e) => e.stopPropagation()}
              >
                <form onSubmit={executarBusca} className="flex gap-2">
                  <input
                    ref={searchInputRef}
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar no YouTube…"
                    className="flex-1 min-w-0 rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-[11px] text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-cyan-400/50"
                  />
                  <button
                    type="submit"
                    disabled={searchLoading}
                    className="shrink-0 px-3 py-2 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 text-[10px] font-black uppercase tracking-wider hover:bg-cyan-500/30 disabled:opacity-40"
                  >
                    {searchLoading ? "…" : "OK"}
                  </button>
                </form>
                <ul className="mt-2 max-h-48 overflow-y-auto space-y-1.5">
                  {searchResults.map((hit) => (
                    <li
                      key={hit.id + hit.url}
                      className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/5 p-1.5 pr-2"
                    >
                      {hit.thumbnail ? (
                        <img
                          src={hit.thumbnail}
                          alt=""
                          className="w-10 h-7 object-cover rounded shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-7 rounded bg-zinc-800 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-bold text-white/90 truncate" title={hit.titulo}>
                          {hit.titulo}
                        </p>
                        <p className="text-[8px] text-zinc-500">{hit.duracao}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => adicionarDaBusca(hit)}
                        className="shrink-0 p-1.5 rounded-lg bg-violet-500/20 border border-violet-400/40 text-violet-200 hover:bg-violet-500/30"
                        aria-label="Adicionar à fila"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isQueueOpen && isExpanded && (
              <motion.div
                key="radio-queue"
                ref={queuePanelRef}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.15 }}
                className="w-[min(100vw-2rem,22rem)] rounded-2xl border border-amber-500/30 bg-[#0e0e11]/95 backdrop-blur-md shadow-[0_0_24px_rgba(251,191,36,0.12)] p-3 mb-1"
                onPointerDownCapture={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-200/90">
                    Fila de reprodução
                  </p>
                  <button
                    type="button"
                    onClick={salvarPlaylistNoPerfil}
                    disabled={salvandoPlaylist}
                    className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-100 hover:bg-amber-500/30 disabled:opacity-40"
                  >
                    Salvar playlist
                  </button>
                </div>
                <Reorder.Group
                  axis="y"
                  values={queue}
                  onReorder={handleReorder}
                  className="flex flex-col gap-1 max-h-52 overflow-y-auto pr-0.5"
                >
                  {queue.map((item, index) => (
                    <Reorder.Item
                      key={item.uid}
                      value={item}
                      className={`rounded-lg border p-2 flex items-center gap-2 cursor-grab active:cursor-grabbing ${
                        index === currentIndex
                          ? "bg-cyan-500/15 border-cyan-400/40"
                          : "bg-white/5 border-white/10"
                      }`}
                    >
                      <div className="min-w-0 flex-1 text-left">
                        <p className="text-[9px] font-bold text-white/90 truncate" title={item.titulo}>
                          {item.titulo}
                        </p>
                        <p className="text-[8px] text-zinc-500 tabular-nums">
                          {index + 1} / {queue.length}
                          {index === currentIndex ? " · tocando" : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="shrink-0 p-1.5 rounded-md bg-red-500/15 border border-red-400/35 text-red-300 hover:bg-red-500/25"
                        aria-label="Remover da fila"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromQueue(index);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            layout
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="bg-[#0e0e11]/90 backdrop-blur-md border border-white/10 rounded-[999px] px-2 py-2 sm:px-3 shadow-[0_0_20px_rgba(0,0,0,0.8)] max-w-[min(100vw-2rem,28rem)]"
          >
            <div className="flex flex-wrap items-center gap-2 justify-end">
              <button
                type="button"
                className="shrink-0 p-1.5 rounded-full text-zinc-500 hover:text-zinc-300 hover:bg-white/5 touch-none cursor-grab active:cursor-grabbing"
                aria-label="Arrastar rádio"
                onPointerDown={(e) => dragControls.start(e)}
              >
                <GripVertical className="w-4 h-4" />
              </button>

              <div
                className={`min-w-0 flex-1 pl-0.5 ${isExpanded ? "basis-[8rem]" : "max-w-[10rem] sm:max-w-[14rem]"}`}
              >
                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-cyan-400/90 drop-shadow-[0_0_8px_rgba(34,211,238,0.35)]">
                  Hunter FM
                </p>
                {!isExpanded && tituloLongo ? (
                  <div className="mt-0.5 max-w-full">
                    <div className="overflow-hidden">
                      <div className="radio-hunter-marquee-track">
                        <span className="text-[10px] font-bold text-white/90 pr-6">
                          {tituloExibicao}
                        </span>
                        <span className="text-[10px] font-bold text-white/90 pr-6" aria-hidden>
                          {tituloExibicao}
                        </span>
                      </div>
                    </div>
                    <p className="text-[9px] font-semibold text-zinc-500 tabular-nums mt-0.5">
                      ( {currentIndex + 1} / {queue.length} )
                    </p>
                  </div>
                ) : (
                  <p className="text-[10px] font-bold text-white/90 truncate mt-0.5" title={tituloExibicao}>
                    {tituloExibicao}{" "}
                    <span className="text-[9px] font-semibold text-zinc-500 tabular-nums">
                      ( {currentIndex + 1} / {queue.length} )
                    </span>
                  </p>
                )}
                {!isExpanded && !tituloLongo && (
                  <p className="text-[9px] font-semibold text-zinc-500 tabular-nums mt-0.5">
                    ( {currentIndex + 1} / {queue.length} )
                  </p>
                )}
              </div>

              <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 flex-wrap justify-end">
                {!isExpanded && (
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowMiniVolume((v) => !v)}
                      className={`p-2 rounded-full border transition-all ${
                        showMiniVolume
                          ? "bg-cyan-500/20 border-cyan-400/45 text-cyan-200"
                          : "bg-white/5 border-white/15 text-zinc-300 hover:bg-white/10"
                      }`}
                      aria-label={showMiniVolume ? "Fechar volume" : "Volume"}
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    {showMiniVolume && (
                      <div className="absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 rounded-lg border border-white/10 bg-[#0a0a0c]/95 px-2 py-1.5 shadow-lg backdrop-blur-sm">
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          value={volume}
                          onChange={(e) => setVolume(Number(e.target.value))}
                          className="h-1 w-[4.5rem] cursor-pointer accent-cyan-400"
                          aria-label="Volume"
                        />
                      </div>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setIsPlaying((v) => !v)}
                  className="p-2.5 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 hover:bg-cyan-500/25 hover:shadow-[0_0_12px_rgba(34,211,238,0.35)] transition-all"
                  aria-label={isPlaying ? "Pausar" : "Tocar"}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 pl-0.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => setIsExpanded((v) => !v)}
                  className="p-2 rounded-full bg-white/5 border border-white/15 text-zinc-200 hover:bg-white/10"
                  aria-label={isExpanded ? "Modo compacto" : "Expandir controles"}
                >
                  {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>

                {isExpanded && (
                  <>
                    <button
                      type="button"
                      data-radio-search-toggle
                      onClick={() => setIsSearching((v) => !v)}
                      className={`p-2 rounded-full border transition-all ${
                        isSearching
                          ? "bg-cyan-500/25 border-cyan-400/50 text-cyan-200"
                          : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10"
                      }`}
                      aria-label={isSearching ? "Fechar busca" : "Buscar"}
                    >
                      <Search className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-1 px-1">
                      <Volume2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" aria-hidden />
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={volume}
                        onChange={(e) => setVolume(Number(e.target.value))}
                        className="w-14 sm:w-20 h-1 accent-cyan-400 cursor-pointer"
                        aria-label="Volume"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={playPrev}
                      disabled={currentIndex <= 0}
                      className="p-2 rounded-full bg-violet-500/15 border border-violet-400/40 text-violet-300 hover:bg-violet-500/25 disabled:opacity-30"
                      aria-label="Faixa anterior"
                    >
                      <SkipBack className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={playNext}
                      disabled={queue.length === 0 || currentIndex >= queue.length - 1}
                      className="p-2 rounded-full bg-violet-500/15 border border-violet-400/40 text-violet-300 hover:bg-violet-500/25 disabled:opacity-30"
                      aria-label="Próxima faixa"
                    >
                      <SkipForward className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      data-radio-queue-toggle
                      onClick={() => setIsQueueOpen((v) => !v)}
                      className={`p-2 rounded-full border transition-all ${
                        isQueueOpen
                          ? "bg-amber-500/25 border-amber-400/50 text-amber-100"
                          : "bg-amber-500/15 border border-amber-400/40 text-amber-200 hover:bg-amber-500/25"
                      }`}
                      aria-label="Fila de reprodução"
                    >
                      <ListMusic className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={capturarParaEstante}
                      disabled={capturando}
                      className="p-2 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/25 hover:shadow-[0_0_12px_rgba(52,211,153,0.35)] transition-all disabled:opacity-40"
                      aria-label="Capturar para a estante"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {isExpanded && (
              <motion.div layout className="mt-2 px-1 pb-0.5">
                <input
                  type="range"
                  min={0}
                  max={0.999999}
                  step="any"
                  value={seekDisabled ? 0 : played}
                  disabled={seekDisabled}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setPlayed(v);
                    seekMediaToFraction(playerRef.current, v);
                  }}
                  className="w-full h-1.5 rounded-full appearance-none bg-cyan-950/80 accent-cyan-400 cursor-pointer disabled:opacity-30 shadow-[0_0_10px_rgba(34,211,238,0.25)]"
                  style={{
                    background: seekDisabled
                      ? undefined
                      : `linear-gradient(to right, rgba(34,211,238,0.85) ${played * 100}%, rgba(24,24,27,0.9) ${played * 100}%)`,
                  }}
                  aria-label="Posição da faixa"
                />
              </motion.div>
            )}
          </motion.div>
        </div>

        <div
          className="fixed left-[-9999px] top-0 w-px h-px overflow-hidden opacity-0 pointer-events-none"
          aria-hidden
        >
          {urlAtual ? (
            <ReactPlayer
              key={playerKey}
              ref={playerRef as React.Ref<HTMLVideoElement>}
              src={urlAtual}
              playing={isPlaying}
              volume={volume}
              width="0"
              height="0"
              controls={false}
              onReady={sincronizarFaixa}
              onStart={sincronizarFaixa}
              onPlay={sincronizarFaixa}
              onPause={sincronizarFaixa}
              onEnded={playNext}
              onTimeUpdate={onTimeUpdate}
              onLoadedMetadata={onDurationKnown}
              onDurationChange={onDurationKnown}
              onError={() => mostrarToast("Erro ao carregar o stream do YouTube.", "erro")}
              config={{
                youtube: {
                  rel: 0,
                },
              }}
            />
          ) : null}
        </div>
        </motion.div>
      </div>

      <div className="fixed bottom-24 right-6 z-[1000] flex flex-col gap-2 pointer-events-none max-w-[min(100vw-2rem,20rem)]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto px-4 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest backdrop-blur-md shadow-xl animate-in slide-in-from-right fade-in duration-300 ${
              t.tipo === "sucesso"
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                : "bg-red-500/15 border-red-500/40 text-red-300"
            }`}
          >
            {t.mensagem}
          </div>
        ))}
      </div>

      {modalSenhaMestra}
    </>
  );
}
