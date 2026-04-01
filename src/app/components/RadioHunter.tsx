"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion, Reorder, useDragControls } from "framer-motion";
import type { ComponentProps } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  ArrowLeft,
  Check,
  GripVertical,
  Library,
  Link,
  ListMusic,
  Loader2,
  Maximize2,
  Minimize2,
  Music,
  Pause,
  PenLine,
  Play,
  PlayCircle,
  Plus,
  Repeat,
  Save,
  Search,
  Shuffle,
  SkipBack,
  SkipForward,
  Trash2,
  Volume2,
  VolumeX,
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

/** URLs com `list=` são tocadas pelo iframe como playlist inteira; não avançar índice da fila no `ended` entre faixas. */
function isYoutubeSrcComLista(url: string): boolean {
  return /list=/i.test(url) && /youtube\.com|youtu\.be/i.test(url);
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

const DEFAULT_PLAYLIST_NAME = "Padrão";

type RadioPlaylistsMap = Record<string, RadioQueueItem[]>;

function normalizarLinhasRadio(rows: unknown[]): RadioQueueItem[] {
  const normalized: RadioQueueItem[] = [];
  for (const row of rows) {
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
        id: typeof (row as { id?: string }).id === "string" ? (row as { id: string }).id : u,
        uid: typeof uidRaw === "string" && uidRaw.trim() ? uidRaw : newUid(),
      });
    }
  }
  return normalized;
}

type YoutubeSearchHit = {
  titulo: string;
  url: string;
  duracao: string;
  thumbnail: string;
  id: string;
};

type RadioPreviewItem = { titulo: string; url: string };

function filaParaEstante(item: RadioQueueItem | undefined): { title: string; url: string } | null {
  if (!item?.url?.trim()) return null;
  return { title: (item.titulo || "").trim() || "Faixa sem título", url: item.url };
}

function defaultQueueItem(url: string): RadioQueueItem {
  return { titulo: "Hunter FM", url, id: "default", uid: `default-${newUid()}` };
}

type RadioFilaReorderRowProps = {
  item: RadioQueueItem;
  index: number;
  queueLength: number;
  isCurrent: boolean;
  thumbUrl: string;
  tocandoAqui: boolean;
  onPlayOrPause: () => void;
  onRemove: () => void;
};

function RadioFilaReorderRow({
  item,
  index,
  queueLength,
  isCurrent,
  thumbUrl,
  tocandoAqui,
  onPlayOrPause,
  onRemove,
}: RadioFilaReorderRowProps) {
  const dragControls = useDragControls();
  return (
    <Reorder.Item
      as="div"
      value={item}
      dragListener={false}
      dragControls={dragControls}
      className={`flex cursor-default items-center gap-3 rounded-lg p-2 transition-colors hover:bg-white/5 group border ${
        isCurrent ? "border-cyan-400/40 bg-cyan-500/15" : "border-white/10 bg-white/5"
      }`}
    >
      <button
        type="button"
        title="Arrastar para reordenar"
        aria-label="Arrastar para reordenar"
        className="shrink-0 cursor-grab touch-none text-zinc-600 opacity-40 transition-opacity hover:text-white group-hover:opacity-100 active:cursor-grabbing"
        onPointerDown={(e) => dragControls.start(e)}
      >
        <GripVertical className="h-4 w-4" aria-hidden />
      </button>
      {thumbUrl ? (
        <img
          src={thumbUrl}
          alt=""
          className="pointer-events-none h-7 w-10 shrink-0 rounded object-cover"
        />
      ) : (
        <div className="pointer-events-none h-7 w-10 shrink-0 rounded bg-zinc-800" />
      )}
      <button
        type="button"
        title={tocandoAqui ? "Pausar" : "Tocar esta faixa"}
        aria-label={tocandoAqui ? "Pausar" : "Tocar esta faixa"}
        onClick={onPlayOrPause}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors ${
          tocandoAqui
            ? "border-cyan-400/50 bg-cyan-500/25 text-cyan-200 hover:border-cyan-300/60 hover:text-cyan-100"
            : "border-white/10 bg-white/5 text-zinc-300 hover:border-green-400/40 hover:text-green-400"
        }`}
      >
        {tocandoAqui ? (
          <Pause className="h-3.5 w-3.5" />
        ) : (
          <Play className="h-3.5 w-3.5 pl-0.5" />
        )}
      </button>
      <button
        type="button"
        className="min-w-0 flex-1 rounded-md px-1 py-0.5 text-left transition-colors hover:bg-white/5"
        title={tocandoAqui ? "Pausar" : "Tocar esta faixa"}
        onClick={onPlayOrPause}
      >
        <p
          className={`truncate text-[9px] font-bold ${isCurrent ? "text-cyan-100/95" : "text-white/90"}`}
          title={item.titulo}
        >
          {item.titulo}
        </p>
        <p className="text-[8px] text-zinc-500 tabular-nums">
          {index + 1} / {queueLength}
          {isCurrent ? " · tocando" : ""}
        </p>
      </button>
      <button
        type="button"
        title="Remover da fila"
        className="shrink-0 rounded-md border border-red-400/35 bg-red-500/15 p-1.5 text-red-300 hover:bg-red-500/25"
        aria-label="Remover da fila"
        onClick={onRemove}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </Reorder.Item>
  );
}

type RadioPlaylistTrackReorderRowProps = {
  item: RadioQueueItem;
  thumbUrl: string;
  onPlay: () => void;
};

function RadioPlaylistTrackReorderRow({ item, thumbUrl, onPlay }: RadioPlaylistTrackReorderRowProps) {
  const dragControls = useDragControls();
  return (
    <Reorder.Item
      as="div"
      value={item}
      dragListener={false}
      dragControls={dragControls}
      className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-2 transition-colors hover:bg-white/[0.07]"
    >
      <button
        type="button"
        title="Arrastar para reordenar"
        aria-label="Arrastar para reordenar"
        className="shrink-0 cursor-grab touch-none text-zinc-600 opacity-70 transition-opacity hover:text-white active:cursor-grabbing"
        onPointerDown={(e) => dragControls.start(e)}
      >
        <GripVertical className="h-4 w-4" aria-hidden />
      </button>
      {thumbUrl ? (
        <img src={thumbUrl} alt="" className="h-8 w-11 shrink-0 rounded object-cover" />
      ) : (
        <div className="h-8 w-11 shrink-0 rounded bg-zinc-800" />
      )}
      <p
        className="min-w-0 flex-1 truncate text-[10px] font-bold text-white/90"
        title={item.titulo}
      >
        {item.titulo}
      </p>
      <button
        type="button"
        title="Tocar esta faixa"
        aria-label={`Tocar ${item.titulo}`}
        onClick={onPlay}
        className="shrink-0 rounded-md border border-green-500/30 bg-green-500/10 p-1.5 text-green-400 transition-colors hover:bg-green-500/20"
      >
        <Play className="h-3 w-3 text-green-500" aria-hidden />
      </button>
    </Reorder.Item>
  );
}

/** Aceita array legado ou objeto { nomePlaylist: [...] }. */
function playlistsDoBanco(
  rp: unknown,
  urlPadrao: string
): { playlists: RadioPlaylistsMap; activeName: string } {
  const fallbackItem = defaultQueueItem(urlPadrao);
  const singleDefault: RadioPlaylistsMap = { [DEFAULT_PLAYLIST_NAME]: [fallbackItem] };

  if (Array.isArray(rp)) {
    const normalized = normalizarLinhasRadio(rp);
    return {
      playlists: {
        [DEFAULT_PLAYLIST_NAME]: normalized.length > 0 ? normalized : [fallbackItem],
      },
      activeName: DEFAULT_PLAYLIST_NAME,
    };
  }

  if (rp && typeof rp === "object" && !Array.isArray(rp)) {
    const obj = rp as Record<string, unknown>;
    const playlists: RadioPlaylistsMap = {};
    for (const [name, val] of Object.entries(obj)) {
      if (!name.trim() || !Array.isArray(val)) continue;
      const normalized = normalizarLinhasRadio(val);
      playlists[name] = normalized.length > 0 ? normalized : [];
    }
    const names = Object.keys(playlists);
    if (names.length === 0) return { playlists: singleDefault, activeName: DEFAULT_PLAYLIST_NAME };
    const activeName = playlists[DEFAULT_PLAYLIST_NAME] !== undefined ? DEFAULT_PLAYLIST_NAME : names[0];
    return { playlists, activeName };
  }

  return { playlists: singleDefault, activeName: DEFAULT_PLAYLIST_NAME };
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
  const [playlists, setPlaylists] = useState<RadioPlaylistsMap>(() => ({
    [DEFAULT_PLAYLIST_NAME]: [defaultQueueItem(DEFAULT_PLAYLIST)],
  }));
  const [activePlaylistName, setActivePlaylistName] = useState(DEFAULT_PLAYLIST_NAME);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<YoutubeSearchHit[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [salvandoPlaylist, setSalvandoPlaylist] = useState(false);
  const [importandoPlaylistYoutube, setImportandoPlaylistYoutube] = useState(false);
  const [mostrarFila, setMostrarFila] = useState(false);
  const [abaFila, setAbaFila] = useState<"FILA" | "PLAYLISTS" | "BUSCA">("FILA");
  const [idPlaylistVisualizando, setIdPlaylistVisualizando] = useState<string | null>(null);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const queue = playlists[activePlaylistName] ?? [];

  const nomesPlaylistsOrdenados = useMemo(() => {
    const k = Object.keys(playlists);
    k.sort((a, b) => {
      if (a === DEFAULT_PLAYLIST_NAME) return -1;
      if (b === DEFAULT_PLAYLIST_NAME) return 1;
      return a.localeCompare(b, "pt-BR");
    });
    return k;
  }, [playlists]);

  const [played, setPlayed] = useState(0);
  const [durationSec, setDurationSec] = useState(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [faixa, setFaixa] = useState<{ title: string; url: string } | null>(null);
  const [toasts, setToasts] = useState<{ id: number; mensagem: string; tipo: "sucesso" | "erro" }[]>(
    []
  );
  const [capturando, setCapturando] = useState(false);
  const [capturaConfirmadaUi, setCapturaConfirmadaUi] = useState(false);
  const [previewItem, setPreviewItem] = useState<RadioPreviewItem | null>(null);
  const [modalPlaylist, setModalPlaylist] = useState<{
    isOpen: boolean;
    tipo: "" | "CRIAR" | "RENOMEAR" | "IMPORTAR_URL";
    valorInicial: string;
    idAlvo: string | null;
  }>({ isOpen: false, tipo: "", valorInicial: "", idAlvo: null });
  const [playlistModalInputKey, setPlaylistModalInputKey] = useState(0);

  const playerRef = useRef<HTMLElement | null>(null);
  const previewItemRef = useRef<RadioPreviewItem | null>(null);
  const isPlayingRef = useRef(false);
  const isShuffleRef = useRef(isShuffle);
  const isRepeatRef = useRef(isRepeat);
  const queueRef = useRef<RadioQueueItem[]>(queue);
  const playlistsRef = useRef<RadioPlaylistsMap>(playlists);
  const currentIndexRef = useRef(currentIndex);
  const activePlaylistNameRef = useRef(activePlaylistName);
  const queuePanelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const constraintsRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const { obterSenhaMestreInterativa, modalSenhaMestra } = useSenhaMestraInterativa();

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    playlistsRef.current = playlists;
  }, [playlists]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    activePlaylistNameRef.current = activePlaylistName;
  }, [activePlaylistName]);

  useEffect(() => {
    previewItemRef.current = previewItem;
  }, [previewItem]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    isShuffleRef.current = isShuffle;
  }, [isShuffle]);

  useEffect(() => {
    isRepeatRef.current = isRepeat;
  }, [isRepeat]);

  useEffect(() => {
    if (idPlaylistVisualizando == null) return;
    if (playlists[idPlaylistVisualizando] === undefined) {
      setIdPlaylistVisualizando(null);
    }
  }, [playlists, idPlaylistVisualizando]);

  useEffect(() => {
    if (!mostrarFila) return;
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (queuePanelRef.current?.contains(target)) return;
      const el = target as HTMLElement;
      if (el.closest?.("[data-radio-fila-toggle]")) return;
      if (el.closest?.("[data-radio-playlists-toggle]")) return;
      if (el.closest?.("[data-radio-busca-youtube-trigger]")) return;
      setMostrarFila(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [mostrarFila]);

  useEffect(() => {
    if (!isExpanded) {
      setMostrarFila(false);
    }
  }, [isExpanded]);

  useEffect(() => {
    if (!modalPlaylist.isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModalPlaylist({ isOpen: false, tipo: "", valorInicial: "", idAlvo: null });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalPlaylist.isOpen]);

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

    const urlPadrao = DEFAULT_PLAYLIST;

    const rp = data?.radio_playlist;
    const { playlists: carregadas, activeName } = playlistsDoBanco(rp, urlPadrao);
    setPlaylists(carregadas);
    setActivePlaylistName(activeName);
    setCurrentIndex(0);
    setPreviewItem(null);
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
      setPlaylists({ [DEFAULT_PLAYLIST_NAME]: [defaultQueueItem(DEFAULT_PLAYLIST)] });
      setActivePlaylistName(DEFAULT_PLAYLIST_NAME);
      setCurrentIndex(0);
      setIsPlaying(false);
      setFaixa(null);
      setPreviewItem(null);
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
    if (previewItem) return;
    const item = queue[currentIndex];
    if (item?.url) {
      setFaixa({ title: item.titulo || "Faixa sem título", url: item.url });
    }
  }, [queue, currentIndex, previewItem]);

  useEffect(() => {
    setCurrentIndex((i) => {
      if (queue.length === 0) return 0;
      return Math.min(i, queue.length - 1);
    });
  }, [queue.length]);

  useEffect(() => {
    setPlayed(0);
    setDurationSec(0);
  }, [currentIndex, queue[currentIndex]?.url, previewItem?.url]);

  const handlePlayerEnded = useCallback(() => {
    if (previewItemRef.current) {
      setPreviewItem(null);
      setIsPlaying(false);
      return;
    }
    const q = queueRef.current;
    const i = currentIndexRef.current;
    const url = q[i]?.url ?? "";
    if (isYoutubeSrcComLista(url)) {
      return;
    }
    if (isRepeatRef.current) {
      requestAnimationFrame(() => {
        seekMediaToFraction(playerRef.current, 0);
        setPlayed(0);
        setIsPlaying(true);
      });
      return;
    }
    setCurrentIndex((idx) => {
      const qq = queueRef.current;
      if (qq.length === 0) return 0;
      if (isShuffleRef.current) {
        return Math.floor(Math.random() * qq.length);
      }
      const max = qq.length - 1;
      return idx >= max ? idx : idx + 1;
    });
  }, []);

  const playNext = useCallback(() => {
    setPreviewItem(null);
    setCurrentIndex((i) => {
      const q = queueRef.current;
      if (q.length === 0) return 0;
      if (isShuffleRef.current) {
        if (q.length === 1) return 0;
        let j = i;
        let guard = 0;
        while (j === i && guard < 16) {
          j = Math.floor(Math.random() * q.length);
          guard += 1;
        }
        return j;
      }
      const max = q.length - 1;
      return i >= max ? i : i + 1;
    });
  }, []);

  const playPrev = useCallback(() => {
    setPreviewItem(null);
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, []);

  const removeFromQueue = useCallback(
    (index: number) => {
      const name = activePlaylistName;
      const holder = { newCi: 0 };
      flushSync(() => {
        setPlaylists((prev) => {
          const prevQ = [...(prev[name] ?? [])];
          const ci = currentIndexRef.current;
          const filtered = prevQ.filter((_, j) => j !== index);
          const final = filtered.length === 0 ? [defaultQueueItem(DEFAULT_PLAYLIST)] : filtered;
          queueRef.current = final;
          let nc = ci;
          if (index < ci) nc = ci - 1;
          else if (index === ci) nc = Math.min(ci, final.length - 1);
          else nc = ci;
          holder.newCi = Math.max(0, Math.min(nc, final.length - 1));
          return { ...prev, [name]: final };
        });
      });
      setCurrentIndex(holder.newCi);
    },
    [activePlaylistName]
  );

  const playAtIndex = useCallback((index: number) => {
    const q = queueRef.current;
    if (index < 0 || index >= q.length) return;
    setPreviewItem(null);
    setCurrentIndex(index);
    setIsPlaying(true);
  }, []);

  const handleReorder = useCallback(
    (newOrder: RadioQueueItem[]) => {
      const name = activePlaylistName;
      const prevQ = queueRef.current;
      const ci = currentIndexRef.current;
      const curUid = previewItem ? null : prevQ[ci]?.uid;
      setPlaylists((prev) => ({ ...prev, [name]: newOrder }));
      if (curUid != null) {
        const ni = newOrder.findIndex((x) => x.uid === curUid);
        if (ni >= 0 && ni !== ci) setCurrentIndex(ni);
      }
    },
    [activePlaylistName, previewItem]
  );

  const handleReorderPlaylistVisualizada = useCallback(
    (newOrder: RadioQueueItem[]) => {
      const pid = idPlaylistVisualizando;
      if (!pid) return;
      const prevQ = playlistsRef.current[pid] ?? [];
      const ci = currentIndexRef.current;
      const curUid =
        !previewItem && activePlaylistName === pid ? prevQ[ci]?.uid : null;
      setPlaylists((prev) => ({ ...prev, [pid]: newOrder }));
      if (curUid != null) {
        const ni = newOrder.findIndex((x) => x.uid === curUid);
        if (ni >= 0 && ni !== ci) setCurrentIndex(ni);
      }
    },
    [idPlaylistVisualizando, activePlaylistName, previewItem]
  );

  const aplicarCriarPlaylist = useCallback(
    (nomeRaw: string) => {
      const nome = nomeRaw.trim();
      if (!nome) return;
      if (playlistsRef.current[nome]) {
        mostrarToast("Já existe uma playlist com esse nome.", "erro");
        return;
      }
      setPreviewItem(null);
      setPlaylists((prev) => ({ ...prev, [nome]: [] }));
      setActivePlaylistName(nome);
      setCurrentIndex(0);
    },
    [mostrarToast]
  );

  const openPlaylistModal = useCallback(
    (args: {
      tipo: "CRIAR" | "RENOMEAR" | "IMPORTAR_URL";
      valorInicial?: string;
      idAlvo?: string | null;
    }) => {
      setPlaylistModalInputKey((k) => k + 1);
      setModalPlaylist({
        isOpen: true,
        tipo: args.tipo,
        valorInicial: args.valorInicial ?? "",
        idAlvo: args.idAlvo ?? null,
      });
    },
    []
  );

  const abrirModalCriarPlaylist = useCallback(() => {
    openPlaylistModal({ tipo: "CRIAR" });
  }, [openPlaylistModal]);

  const importarPlaylistPorLinkYoutubeComUrl = useCallback(
    async (urlRaw: string) => {
    const url = urlRaw.trim();
    if (!url) return;
    if (!url.includes("list=")) {
      mostrarToast("Use uma URL de playlist do YouTube (deve conter list=).", "erro");
      return;
    }
    setImportandoPlaylistYoutube(true);
    try {
      const res = await fetch(`/api/youtube-playlist?url=${encodeURIComponent(url)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        mostrarToast(typeof data.error === "string" ? data.error : "Falha ao ler a playlist.", "erro");
        return;
      }
      type VidRow = { titulo?: string; url?: string; id?: string };
      const videos: VidRow[] = Array.isArray(data.videos) ? data.videos : [];
      if (videos.length === 0) {
        mostrarToast("Nenhum vídeo retornado (playlist vazia ou indisponível).", "erro");
        return;
      }
      const autoBase = `Importada - ${new Date().toLocaleString("pt-BR")}`;
      let nomeFinal = autoBase;
      let suffix = 2;
      while (playlistsRef.current[nomeFinal]) {
        nomeFinal = `${autoBase} (${suffix})`;
        suffix += 1;
      }
      const items: RadioQueueItem[] = videos
        .map((v) => {
          const u = String(v.url ?? "").trim();
          if (!u) return null;
          return {
            titulo: (v.titulo || "").trim() || "Sem título",
            url: u,
            id: typeof v.id === "string" && v.id.trim() ? v.id : u,
            uid: newUid(),
          };
        })
        .filter((x): x is RadioQueueItem => x !== null);
      if (items.length === 0) {
        mostrarToast("Nenhuma URL válida na resposta.", "erro");
        return;
      }
      setPreviewItem(null);
      setPlaylists((prev) => ({ ...prev, [nomeFinal]: items }));
      setActivePlaylistName(nomeFinal);
      setCurrentIndex(0);
      mostrarToast(`Playlist "${nomeFinal}" com ${items.length} faixa(s). Salve no perfil se quiser persistir.`, "sucesso");
    } catch {
      mostrarToast("Erro de rede ao importar a playlist.", "erro");
    } finally {
      setImportandoPlaylistYoutube(false);
    }
  },
    [mostrarToast]
  );

  const abrirModalImportarPlaylistYoutube = useCallback(() => {
    openPlaylistModal({ tipo: "IMPORTAR_URL" });
  }, [openPlaylistModal]);

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
    setPreviewItem(null);
    const name = activePlaylistName;
    setPlaylists((prev) => ({
      ...prev,
      [name]: [
        ...(prev[name] ?? []),
        { titulo: hit.titulo, url: hit.url, id: hit.id || hit.url, uid: newUid() },
      ],
    }));
    mostrarToast("Adicionado à fila", "sucesso");
  }

  /** Prévia temporária: não altera playlists. Mesma URL + clique alterna play/pause. */
  function alternarPreviaDaBusca(hit: YoutubeSearchHit) {
    if (previewItem?.url === hit.url) {
      setIsPlaying((p) => !p);
      return;
    }
    setPreviewItem({ titulo: hit.titulo, url: hit.url });
    setFaixa({ title: hit.titulo, url: hit.url });
    setIsPlaying(true);
  }

  function confirmarRenomearPlaylist(antigo: string, novoRaw: string) {
    if (antigo === DEFAULT_PLAYLIST_NAME) {
      mostrarToast(`A playlist "${DEFAULT_PLAYLIST_NAME}" não pode ser renomeada.`, "erro");
      return;
    }
    const novo = novoRaw.trim();
    if (!novo) {
      mostrarToast("Nome inválido.", "erro");
      return;
    }
    if (novo === antigo) return;
    if (novo === DEFAULT_PLAYLIST_NAME) {
      mostrarToast(`O nome "${DEFAULT_PLAYLIST_NAME}" é reservado.`, "erro");
      return;
    }
    if (playlistsRef.current[novo]) {
      mostrarToast("Já existe uma playlist com esse nome.", "erro");
      return;
    }
    setPlaylists((prev) => {
      const cur = prev[antigo];
      if (!cur) return prev;
      const { [antigo]: _, ...rest } = prev;
      return { ...rest, [novo]: cur };
    });
    if (activePlaylistName === antigo) setActivePlaylistName(novo);
  }

  function removerPlaylist(nome: string) {
    if (nome === DEFAULT_PLAYLIST_NAME) {
      mostrarToast(`A playlist "${DEFAULT_PLAYLIST_NAME}" não pode ser removida.`, "erro");
      return;
    }
    setPlaylists((prev) => {
      const { [nome]: _, ...rest } = prev;
      const keys = Object.keys(rest);
      if (keys.length > 0) return rest;
      const padrao = prev[DEFAULT_PLAYLIST_NAME];
      return {
        [DEFAULT_PLAYLIST_NAME]:
          padrao && padrao.length > 0 ? padrao : [defaultQueueItem(DEFAULT_PLAYLIST)],
      };
    });
    if (activePlaylistName === nome) {
      setActivePlaylistName(DEFAULT_PLAYLIST_NAME);
      setCurrentIndex(0);
    }
  }

  function fecharModalPlaylist() {
    setModalPlaylist({ isOpen: false, tipo: "", valorInicial: "", idAlvo: null });
  }

  function confirmarModalPlaylist() {
    const el = document.getElementById("input-nome-playlist") as HTMLInputElement | null;
    const valor = el?.value ?? "";
    if (modalPlaylist.tipo === "CRIAR") {
      aplicarCriarPlaylist(valor);
    } else if (modalPlaylist.tipo === "RENOMEAR" && modalPlaylist.idAlvo) {
      confirmarRenomearPlaylist(modalPlaylist.idAlvo, valor);
    } else if (modalPlaylist.tipo === "IMPORTAR_URL") {
      void importarPlaylistPorLinkYoutubeComUrl(valor);
    }
    fecharModalPlaylist();
  }

  function selecionarPlaylistParaTocar(nome: string) {
    setPreviewItem(null);
    setActivePlaylistName(nome);
    setCurrentIndex(0);
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
        dados: { radio_playlist: playlists },
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
    const info =
      lerFaixaAtual(playerRef) ??
      (previewItem ? { title: previewItem.titulo, url: previewItem.url } : null) ??
      filaParaEstante(queue[currentIndex]);
    if (!info?.url) {
      mostrarToast("Nenhuma faixa ativa no player.", "erro");
      return;
    }

    setCapturando(true);
    setCapturaConfirmadaUi(false);
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

      window.dispatchEvent(new Event("music-updated"));
      setCapturaConfirmadaUi(true);
      window.setTimeout(() => setCapturaConfirmadaUi(false), 1400);

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

  const handleVolumeSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newVolume = Number(e.target.value);
      setVolume(newVolume);
      if (newVolume > 0 && isMuted) setIsMuted(false);
    },
    [isMuted]
  );

  const urlAtual = previewItem?.url ?? queue[currentIndex]?.url ?? "";
  const playerKey = previewItem ? `preview-${previewItem.url}` : `${currentIndex}-${urlAtual}`;
  const tituloExibicao = faixa?.title || "Sintonizando…";
  const seekDisabled = !Number.isFinite(durationSec) || durationSec <= 0;
  const capaFaixaAtual = urlAtual ? capaYoutubeDeUrl(urlAtual) : "";
  const posFila =
    previewItem != null
      ? "prévia"
      : queue.length > 0
        ? `${currentIndex + 1} / ${queue.length}`
        : "—";
  const navNextDisabled =
    !previewItem &&
    (queue.length === 0 || (!isShuffle && queue.length > 0 && currentIndex >= queue.length - 1));
  const navPrevDisabled = !previewItem && currentIndex <= 0;

  const painelFilaAtivo = mostrarFila && abaFila === "FILA";
  const painelPlaylistsAtivo = mostrarFila && abaFila === "PLAYLISTS";
  const painelBuscaAtivo = mostrarFila && abaFila === "BUSCA";

  const handleAbrirPainelFila = useCallback(() => {
    if (mostrarFila && abaFila === "FILA") {
      setMostrarFila(false);
      return;
    }
    setAbaFila("FILA");
    setMostrarFila(true);
  }, [mostrarFila, abaFila]);

  const handleAbrirPainelPlaylists = useCallback(() => {
    if (mostrarFila && abaFila === "PLAYLISTS") {
      setMostrarFila(false);
      return;
    }
    setIdPlaylistVisualizando(null);
    setAbaFila("PLAYLISTS");
    setMostrarFila(true);
  }, [mostrarFila, abaFila]);

  const faixasPlaylistVisualizada =
    idPlaylistVisualizando != null ? (playlists[idPlaylistVisualizando] ?? []) : [];

  const tocandoTudoPlaylist = useCallback((nome: string) => {
    setPreviewItem(null);
    setActivePlaylistName(nome);
    setCurrentIndex(0);
    setAbaFila("FILA");
    setIsPlaying(true);
  }, []);

  const tocarFaixaNaPlaylistBiblioteca = useCallback((nomePlaylist: string, index: number) => {
    const q = playlistsRef.current[nomePlaylist];
    if (!q || index < 0 || index >= q.length) return;
    setPreviewItem(null);
    setActivePlaylistName(nomePlaylist);
    setCurrentIndex(index);
    setIsPlaying(true);
    setAbaFila("FILA");
  }, []);

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
            {mostrarFila && isExpanded && (
              <motion.div
                key="radio-queue"
                ref={queuePanelRef}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.15 }}
                className="w-[min(100vw-2rem,20rem)] rounded-2xl border border-amber-500/30 bg-[#0e0e11]/95 backdrop-blur-md shadow-[0_0_24px_rgba(251,191,36,0.12)] p-2.5 mb-1"
                onPointerDown={(e) => e.stopPropagation()}
              >
                {abaFila !== "BUSCA" && (
                  <div className="rounded-lg border border-green-500/35 bg-black/50 shadow-[0_0_18px_rgba(34,197,94,0.14)] mb-3 px-2 pt-2 pb-0">
                    <div className="flex items-center gap-4 border-b border-green-500/20 pb-2">
                      <button
                        type="button"
                        onClick={() => setAbaFila("FILA")}
                        className={`text-xs font-black uppercase tracking-widest pb-2 border-b-2 transition-colors ${
                          abaFila === "FILA"
                            ? "border-green-400 text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.35)]"
                            : "border-transparent text-zinc-500 hover:text-white"
                        }`}
                      >
                        Fila Atual
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAbaFila("PLAYLISTS");
                          setIdPlaylistVisualizando(null);
                        }}
                        className={`text-xs font-black uppercase tracking-widest pb-2 border-b-2 transition-colors ${
                          abaFila === "PLAYLISTS"
                            ? "border-green-400 text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.35)]"
                            : "border-transparent text-zinc-500 hover:text-white"
                        }`}
                      >
                        Minhas Playlists
                      </button>
                    </div>
                  </div>
                )}
                <AnimatePresence mode="wait">
                  {abaFila === "BUSCA" ? (
                    <motion.div
                      key="aba-busca"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.15 }}
                    >
                      <button
                        type="button"
                        onClick={() => setAbaFila("FILA")}
                        className="mb-3 flex w-full items-center gap-2 rounded-lg border border-cyan-500/30 bg-black/30 px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-cyan-200/90 transition-colors hover:bg-cyan-500/10 hover:text-cyan-100"
                        aria-label="Voltar para a fila"
                      >
                        <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden />
                        Voltar à fila
                      </button>
                      <div className="mb-1 rounded-xl border border-cyan-500/30 bg-black/25 p-2.5">
                        <p className="text-[8px] font-bold uppercase tracking-wider text-cyan-200/80 mb-2">
                          Buscar no YouTube
                        </p>
                        <form onSubmit={executarBusca} className="flex gap-2">
                          <input
                            id="input-busca-youtube"
                            ref={searchInputRef}
                            type="search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar no YouTube…"
                            className="flex-1 min-w-0 rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-[11px] text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-cyan-400/50"
                          />
                          <button
                            type="submit"
                            title="Executar busca"
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
                              <span className="relative group shrink-0">
                                <button
                                  type="button"
                                  onClick={() => alternarPreviaDaBusca(hit)}
                                  className={`shrink-0 p-1.5 rounded-lg border text-cyan-200 hover:bg-cyan-500/30 ${
                                    previewItem?.url === hit.url
                                      ? "bg-cyan-500/30 border-cyan-300/50"
                                      : "bg-cyan-500/20 border-cyan-400/40"
                                  }`}
                                  aria-label={
                                    previewItem?.url === hit.url && isPlaying
                                      ? "Pausar prévia"
                                      : "Ouvir prévia sem salvar na fila"
                                  }
                                >
                                  {previewItem?.url === hit.url && isPlaying ? (
                                    <Pause className="w-3.5 h-3.5" />
                                  ) : (
                                    <PlayCircle className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <span
                                  className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-30 w-max max-w-[12.5rem] -translate-x-1/2 rounded-lg border border-cyan-500/25 bg-[#0a0a0c]/98 px-2 py-1.5 text-left text-[8px] font-semibold leading-snug text-zinc-200 shadow-lg opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
                                  role="tooltip"
                                >
                                  Ouve só na hora: não entra na playlist. Mesmo vídeo: clique de novo pausa ou retoma.
                                </span>
                              </span>
                              <span className="relative group shrink-0">
                                <button
                                  type="button"
                                  onClick={() => adicionarDaBusca(hit)}
                                  className="shrink-0 p-1.5 rounded-lg bg-violet-500/20 border border-violet-400/40 text-violet-200 hover:bg-violet-500/30"
                                  aria-label="Adicionar à fila da playlist ativa"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                                <span
                                  className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-30 w-max max-w-[12.5rem] -translate-x-1/2 rounded-lg border border-violet-500/25 bg-[#0a0a0c]/98 px-2 py-1.5 text-left text-[8px] font-semibold leading-snug text-zinc-200 shadow-lg opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
                                  role="tooltip"
                                >
                                  Coloca na playlist ativa e salva com &quot;Salvar playlist&quot; se quiser persistir no perfil.
                                </span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  ) : abaFila === "FILA" ? (
                    <motion.div
                      key="aba-fila"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.15 }}
                    >
                    <button
                      type="button"
                      title="Salvar playlists no perfil"
                      onClick={salvarPlaylistNoPerfil}
                      disabled={salvandoPlaylist}
                      className="mb-3 w-full inline-flex items-center justify-center gap-1.5 text-[9px] font-bold uppercase tracking-wider px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-colors disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <Save className="w-3.5 h-3.5 shrink-0" aria-hidden />
                      Salvar playlist
                    </button>
                    <div className="flex max-h-52 flex-col gap-1 overflow-y-auto pr-0.5">
                      {queue.length === 0 ? (
                        <p className="text-[9px] text-zinc-500 py-2 text-center leading-relaxed px-1">
                          A fila está vazia. Use a Lupa para buscar músicas.
                        </p>
                      ) : (
                        <Reorder.Group
                          axis="y"
                          as="div"
                          values={queue}
                          onReorder={handleReorder}
                          className="flex flex-col space-y-2"
                        >
                          {queue.map((item, index) => {
                            const isCurrent = !previewItem && index === currentIndex;
                            const thumbUrl = capaYoutubeDeUrl(item.url);
                            const tocandoAqui = isCurrent && isPlaying;
                            const handlePlayOrPause = () => {
                              if (tocandoAqui) setIsPlaying(false);
                              else playAtIndex(index);
                            };
                            return (
                              <RadioFilaReorderRow
                                key={item.uid}
                                item={item}
                                index={index}
                                queueLength={queue.length}
                                isCurrent={isCurrent}
                                thumbUrl={thumbUrl}
                                tocandoAqui={tocandoAqui}
                                onPlayOrPause={handlePlayOrPause}
                                onRemove={() => removeFromQueue(index)}
                              />
                            );
                          })}
                        </Reorder.Group>
                      )}
                    </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="aba-playlists"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.15 }}
                    >
                      {idPlaylistVisualizando == null ? (
                        <>
                          <div className="flex gap-2 mb-6">
                            <button
                              type="button"
                              onClick={abrirModalCriarPlaylist}
                              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-colors w-full justify-center border border-white/10"
                            >
                              <Plus className="w-4 h-4 shrink-0" aria-hidden />
                              Nova Playlist
                            </button>
                            <button
                              type="button"
                              onClick={abrirModalImportarPlaylistYoutube}
                              disabled={importandoPlaylistYoutube}
                              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-colors w-full justify-center border border-white/10 disabled:opacity-50 disabled:pointer-events-none"
                            >
                              {importandoPlaylistYoutube ? (
                                <Loader2 className="w-4 h-4 shrink-0 animate-spin" aria-hidden />
                              ) : (
                                <Link className="w-4 h-4 shrink-0" aria-hidden />
                              )}
                              Importar URL
                            </button>
                          </div>
                          <ul className="space-y-1 max-h-64 overflow-y-auto pr-0.5">
                            {nomesPlaylistsOrdenados.map((nome) => (
                              <li key={nome}>
                                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 group transition-colors border border-transparent hover:border-white/5">
                                  <button
                                    type="button"
                                    onClick={() => setIdPlaylistVisualizando(nome)}
                                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                                  >
                                    <ListMusic className="w-4 h-4 text-zinc-500 group-hover:text-green-500 transition-colors shrink-0" />
                                    <span className="truncate text-sm text-zinc-300 group-hover:text-white font-medium">
                                      {nome}
                                      {nome === DEFAULT_PLAYLIST_NAME ? (
                                        <span className="ml-1 text-[10px] font-normal text-zinc-500">(fixa)</span>
                                      ) : null}
                                    </span>
                                  </button>
                                  <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                                    <button
                                      type="button"
                                      title="Renomear"
                                      disabled={nome === DEFAULT_PLAYLIST_NAME}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (nome === DEFAULT_PLAYLIST_NAME) return;
                                        openPlaylistModal({
                                          tipo: "RENOMEAR",
                                          valorInicial: nome,
                                          idAlvo: nome,
                                        });
                                      }}
                                      className="p-1.5 hover:bg-blue-500/20 text-zinc-400 hover:text-blue-400 rounded-md transition-colors disabled:opacity-25 disabled:pointer-events-none"
                                      aria-label={`Renomear ${nome}`}
                                    >
                                      <PenLine className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      title={
                                        nome === DEFAULT_PLAYLIST_NAME
                                          ? "A playlist Padrão não pode ser removida"
                                          : "Excluir playlist"
                                      }
                                      disabled={nome === DEFAULT_PLAYLIST_NAME}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removerPlaylist(nome);
                                      }}
                                      className="p-1.5 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 rounded-md transition-colors disabled:opacity-25 disabled:pointer-events-none"
                                      aria-label={`Excluir ${nome}`}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => setIdPlaylistVisualizando(null)}
                            className="mb-4 flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
                          >
                            <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden />
                            Minhas Playlists
                          </button>
                          <h3
                            className="mb-2 truncate text-sm font-bold text-white"
                            title={idPlaylistVisualizando}
                          >
                            {idPlaylistVisualizando}
                          </h3>
                          <button
                            type="button"
                            onClick={() => tocandoTudoPlaylist(idPlaylistVisualizando)}
                            disabled={faixasPlaylistVisualizada.length === 0}
                            className="mb-3 w-full rounded-lg border border-green-500/40 bg-green-500/15 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-green-300 transition-colors hover:bg-green-500/25 disabled:opacity-40 disabled:pointer-events-none"
                          >
                            Tocar tudo
                          </button>
                          <div className="flex max-h-56 flex-col gap-1 overflow-y-auto pr-0.5">
                            {faixasPlaylistVisualizada.length === 0 ? (
                              <p className="py-4 text-center text-[9px] text-zinc-500">Playlist vazia.</p>
                            ) : (
                              <Reorder.Group
                                axis="y"
                                as="div"
                                values={faixasPlaylistVisualizada}
                                onReorder={handleReorderPlaylistVisualizada}
                                className="flex flex-col space-y-2"
                              >
                                {faixasPlaylistVisualizada.map((item, idx) => {
                                  const thumbUrl = capaYoutubeDeUrl(item.url);
                                  return (
                                    <RadioPlaylistTrackReorderRow
                                      key={item.uid}
                                      item={item}
                                      thumbUrl={thumbUrl}
                                      onPlay={() =>
                                        tocarFaixaNaPlaylistBiblioteca(idPlaylistVisualizando, idx)
                                      }
                                    />
                                  );
                                })}
                              </Reorder.Group>
                            )}
                          </div>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            layout
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className={`overflow-hidden box-border ${
              isExpanded
                ? "w-full max-w-[min(100vw-2rem,40rem)] rounded-xl border border-green-500/25 bg-black/90 backdrop-blur-md shadow-[0_0_18px_rgba(34,197,94,0.12)]"
                : "w-full max-w-[min(100vw-2rem,28rem)] min-w-0"
            }`}
          >
            {isExpanded ? (
              <div className="flex flex-col w-full min-w-0">
                <div className="flex items-center justify-between w-full min-h-20 pl-0.5 pr-4 sm:pr-6 py-2.5 gap-2">
                  {/* 1. ESQUERDA: Info */}
                  <div className="flex items-center gap-3 sm:gap-4 w-1/3 min-w-0">
                    <button
                      type="button"
                      title="Mover o player"
                      className="shrink-0 flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-white/5 touch-none cursor-grab active:cursor-grabbing"
                      aria-label="Arrastar rádio"
                      onPointerDown={(e) => dragControls.start(e)}
                    >
                      <GripVertical className="w-4 h-4" />
                    </button>
                    <div className="w-12 h-12 bg-zinc-900 rounded-md flex items-center justify-center border border-white/5 shrink-0 overflow-hidden">
                      {capaFaixaAtual ? (
                        <img
                          src={capaFaixaAtual}
                          alt=""
                          className="h-full w-full object-cover pointer-events-none"
                        />
                      ) : (
                        <Music className="w-6 h-6 text-zinc-500" aria-hidden />
                      )}
                    </div>
                    <div className="min-w-0 flex flex-col flex-1">
                      <span
                        className="text-sm font-bold text-white truncate"
                        title={`${tituloExibicao} (${posFila})`}
                      >
                        {tituloExibicao}
                      </span>
                      <span className="text-xs text-zinc-400 truncate">
                        RadioHunter · {posFila}
                      </span>
                    </div>
                  </div>

                  {/* 2. CENTRO: Controles */}
                  <div className="flex flex-col items-center justify-center w-1/3 max-w-md min-w-0 gap-2">
                    <div className="flex items-center justify-center gap-4 sm:gap-6">
                      <button
                        type="button"
                        title={isShuffle ? "Desativar aleatório" : "Ordem aleatória"}
                        onClick={() => setIsShuffle((v) => !v)}
                        className={`transition-colors ${
                          isShuffle ? "text-green-500" : "text-zinc-400 hover:text-white"
                        }`}
                        aria-label={isShuffle ? "Desativar aleatório" : "Ativar aleatório"}
                        aria-pressed={isShuffle}
                      >
                        <Shuffle className="w-4 h-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        title="Faixa anterior"
                        onClick={playPrev}
                        disabled={navPrevDisabled}
                        className="text-zinc-300 hover:text-white transition-colors disabled:opacity-30 disabled:pointer-events-none"
                        aria-label="Faixa anterior"
                      >
                        <SkipBack className="w-5 h-5 fill-current" aria-hidden />
                      </button>
                      <button
                        type="button"
                        title={isPlaying ? "Pausar" : "Tocar"}
                        onClick={() => setIsPlaying((v) => !v)}
                        className="w-10 h-10 flex items-center justify-center bg-green-500 text-black rounded-full hover:scale-105 transition-transform shadow-[0_0_14px_rgba(34,197,94,0.35)]"
                        aria-label={isPlaying ? "Pausar" : "Tocar"}
                      >
                        {isPlaying ? (
                          <Pause className="w-5 h-5 fill-current" aria-hidden />
                        ) : (
                          <Play className="w-5 h-5 fill-current ml-0.5" aria-hidden />
                        )}
                      </button>
                      <button
                        type="button"
                        title="Próxima faixa"
                        onClick={playNext}
                        disabled={navNextDisabled}
                        className="text-zinc-300 hover:text-white transition-colors disabled:opacity-30 disabled:pointer-events-none"
                        aria-label="Próxima faixa"
                      >
                        <SkipForward className="w-5 h-5 fill-current" aria-hidden />
                      </button>
                      <button
                        type="button"
                        title={isRepeat ? "Desativar repetir faixa" : "Repetir faixa atual"}
                        onClick={() => setIsRepeat((v) => !v)}
                        className={`transition-colors ${
                          isRepeat ? "text-green-500" : "text-zinc-400 hover:text-white"
                        }`}
                        aria-label={isRepeat ? "Desativar repetir" : "Repetir faixa atual"}
                        aria-pressed={isRepeat}
                      >
                        <Repeat className="w-4 h-4" aria-hidden />
                      </button>
                    </div>
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
                      className="box-border h-1 w-full min-w-0 max-w-full cursor-pointer appearance-none rounded-full bg-zinc-800 accent-green-500 disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{
                        background: seekDisabled
                          ? undefined
                          : `linear-gradient(to right, rgb(34 197 94 / 0.9) ${played * 100}%, rgb(39 39 42) ${played * 100}%)`,
                      }}
                      aria-label="Posição da faixa"
                    />
                  </div>

                  {/* 3. DIREITA: Volume + ações */}
                  <div className="flex flex-col items-end justify-center w-1/3 min-w-0 gap-2">
                    <div className="flex items-center justify-end gap-2 sm:gap-3 w-full">
                      <button
                        type="button"
                        data-radio-busca-youtube-trigger
                        title="Pesquisar Músicas"
                        onClick={() => {
                          setMostrarFila(true);
                          setAbaFila("BUSCA");
                          setTimeout(
                            () => document.getElementById("input-busca-youtube")?.focus(),
                            150
                          );
                        }}
                        className={`shrink-0 text-zinc-400 hover:text-white transition-colors mr-4 flex items-center justify-center translate-y-[14px] focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/50 rounded ${
                          painelBuscaAtivo ? "text-cyan-200" : ""
                        }`}
                        aria-label="Pesquisar músicas no YouTube"
                      >
                        <Search className="w-5 h-5" aria-hidden />
                      </button>
                      <button
                        type="button"
                        title={isMuted ? "Desmutar" : "Mutar"}
                        aria-label={isMuted ? "Desmutar" : "Mutar"}
                        onClick={() => setIsMuted((m) => !m)}
                        className="shrink-0 text-zinc-400 hover:text-white transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-green-500/50 rounded"
                      >
                        {isMuted || volume === 0 ? (
                          <VolumeX className="w-5 h-5" aria-hidden />
                        ) : (
                          <Volume2 className="w-5 h-5" aria-hidden />
                        )}
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={volume}
                        onChange={handleVolumeSliderChange}
                        className="h-1 w-20 sm:w-24 min-w-0 cursor-pointer appearance-none rounded-full bg-zinc-800 accent-green-500"
                        aria-label="Volume"
                      />
                    </div>
                    <div
                      className="flex flex-shrink-0 items-center justify-end gap-1 flex-wrap"
                      role="group"
                      aria-label="Ações do rádio"
                    >
                      <button
                        type="button"
                        data-radio-fila-toggle
                        title={painelFilaAtivo ? "Fechar fila" : "Fila atual"}
                        onClick={handleAbrirPainelFila}
                        className={`rounded-full border p-1.5 transition-all ${
                          painelFilaAtivo
                            ? "border-cyan-400/50 bg-cyan-500/25 text-cyan-200"
                            : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
                        }`}
                        aria-label={painelFilaAtivo ? "Fechar fila" : "Abrir fila atual"}
                      >
                        <ListMusic className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        data-radio-playlists-toggle
                        title={painelPlaylistsAtivo ? "Fechar biblioteca" : "Minhas playlists"}
                        onClick={handleAbrirPainelPlaylists}
                        className={`rounded-full border p-1.5 transition-all ${
                          painelPlaylistsAtivo
                            ? "border-violet-400/50 bg-violet-500/25 text-violet-200"
                            : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
                        }`}
                        aria-label="Minhas playlists"
                      >
                        <Library className="h-3.5 w-3.5" />
                      </button>
                      <motion.button
                        type="button"
                        title="Adicionar à Estante"
                        onClick={capturarParaEstante}
                        disabled={capturando}
                        animate={
                          capturaConfirmadaUi
                            ? {
                                scale: [1, 1.12, 1],
                                boxShadow: [
                                  "0 0 0 0 rgba(52,211,153,0.5)",
                                  "0 0 16px 2px rgba(52,211,153,0.45)",
                                  "0 0 0 0 rgba(52,211,153,0)",
                                ],
                              }
                            : { scale: 1 }
                        }
                        transition={{ duration: 0.45 }}
                        className="rounded-full border-2 border-emerald-400/55 bg-emerald-500/20 p-1.5 text-emerald-200 ring-1 ring-emerald-400/30 transition-colors hover:bg-emerald-500/30 hover:shadow-[0_0_14px_rgba(52,211,153,0.45)] disabled:opacity-40"
                        aria-label="Capturar para a estante"
                      >
                        {capturaConfirmadaUi ? (
                          <Check className="h-3.5 w-3.5 text-emerald-300" strokeWidth={2.5} />
                        ) : (
                          <Plus className="h-3.5 w-3.5" />
                        )}
                      </motion.button>
                      <button
                        type="button"
                        title="Modo compacto"
                        onClick={() => setIsExpanded((v) => !v)}
                        className="rounded-full border border-white/15 bg-white/5 p-1.5 text-zinc-200 hover:bg-white/10"
                        aria-label="Modo compacto"
                      >
                        <Minimize2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex w-full min-w-0 items-center bg-black/95 rounded-full border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)] p-2 backdrop-blur-sm">
                <button
                  type="button"
                  title="Mover o player"
                  className="shrink-0 touch-none cursor-grab rounded-md p-0.5 transition-colors hover:bg-white/5 active:cursor-grabbing"
                  aria-label="Arrastar rádio"
                  onPointerDown={(e) => dragControls.start(e)}
                >
                  <GripVertical className="h-4 w-4 text-zinc-600" aria-hidden />
                </button>
                <div className="ml-2 flex min-w-0 flex-1 items-center">
                  <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md border border-white/10 bg-zinc-900">
                    {capaFaixaAtual ? (
                      <img
                        src={capaFaixaAtual}
                        alt=""
                        className="h-full w-full object-cover pointer-events-none"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Music className="h-4 w-4 text-zinc-600" aria-hidden />
                      </div>
                    )}
                  </div>
                  <div className="ml-2 flex min-w-0 flex-1 flex-col">
                    <span
                      className="w-full truncate text-sm font-bold text-white"
                      title={tituloExibicao}
                    >
                      {tituloExibicao}
                    </span>
                    <span className="w-full truncate text-xs text-zinc-400">RadioHunter</span>
                  </div>
                </div>
                <div className="ml-4 flex shrink-0 items-center justify-end gap-3">
                  <button
                    type="button"
                    title="Faixa anterior"
                    onClick={playPrev}
                    disabled={navPrevDisabled}
                    className="text-zinc-400 transition-colors hover:text-white disabled:pointer-events-none disabled:opacity-30"
                    aria-label="Faixa anterior"
                  >
                    <SkipBack className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    title={isPlaying ? "Pausar" : "Tocar"}
                    onClick={() => setIsPlaying((v) => !v)}
                    className="text-white transition-colors hover:text-green-500"
                    aria-label={isPlaying ? "Pausar" : "Tocar"}
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4" aria-hidden />
                    ) : (
                      <Play className="h-4 w-4" aria-hidden />
                    )}
                  </button>
                  <button
                    type="button"
                    title="Próxima faixa"
                    onClick={playNext}
                    disabled={navNextDisabled}
                    className="text-zinc-400 transition-colors hover:text-white disabled:pointer-events-none disabled:opacity-30"
                    aria-label="Próxima faixa"
                  >
                    <SkipForward className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    title={isMuted ? "Desmutar" : "Mutar"}
                    onClick={() => setIsMuted((m) => !m)}
                    className="ml-1 p-1 text-zinc-400 transition-colors hover:text-white"
                    aria-label={isMuted ? "Desmutar" : "Mutar"}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="h-4 w-4 text-red-500" aria-hidden />
                    ) : (
                      <Volume2 className="h-4 w-4" aria-hidden />
                    )}
                  </button>
                  <button
                    type="button"
                    title="Expandir player"
                    onClick={() => setIsExpanded(true)}
                    className="text-green-500 transition-colors hover:text-white"
                    aria-label="Expandir player"
                  >
                    <Maximize2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
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
              muted={isMuted}
              width="0"
              height="0"
              controls={false}
              onReady={sincronizarFaixa}
              onStart={sincronizarFaixa}
              onPlay={sincronizarFaixa}
              onPause={sincronizarFaixa}
              onEnded={handlePlayerEnded}
              onTimeUpdate={onTimeUpdate}
              onLoadedMetadata={onDurationKnown}
              onDurationChange={onDurationKnown}
              onError={() => mostrarToast("Erro ao carregar o stream do YouTube.", "erro")}
              config={
                {
                  rel: 0,
                  disablekb: 1,
                } as ComponentProps<typeof ReactPlayer>["config"]
              }
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

      {modalPlaylist.isOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="radio-modal-playlist-titulo"
          onClick={fecharModalPlaylist}
        >
          <div
            className="bg-zinc-950 border border-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.15)] rounded-2xl p-6 w-full max-w-sm mx-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="radio-modal-playlist-titulo"
              className="text-lg font-black text-white mb-4"
            >
              {modalPlaylist.tipo === "CRIAR"
                ? "Nova Playlist"
                : modalPlaylist.tipo === "RENOMEAR"
                  ? "Renomear Playlist"
                  : "Importar do YouTube"}
            </h3>
            <input
              key={playlistModalInputKey}
              type="text"
              defaultValue={modalPlaylist.valorInicial}
              id="input-nome-playlist"
              className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-green-500 transition-colors mb-6"
              autoFocus
              placeholder={
                modalPlaylist.tipo === "IMPORTAR_URL"
                  ? "Cole a URL da playlist (list=…)"
                  : "Digite o nome…"
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  confirmarModalPlaylist();
                }
              }}
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={fecharModalPlaylist}
                className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarModalPlaylist}
                className="px-4 py-2 bg-green-500 text-black text-xs font-bold uppercase tracking-widest rounded-lg hover:scale-105 transition-transform"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalSenhaMestra}
    </>
  );
}
