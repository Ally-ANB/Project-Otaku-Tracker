"use client";

import dynamic from "next/dynamic";
import {
  AnimatePresence,
  motion,
  Reorder,
  useDragControls,
} from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  Check,
  GripVertical,
  Library,
  ListMusic,
  Maximize2,
  Minimize2,
  Pause,
  Pencil,
  Play,
  PlayCircle,
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

type RadioQueueReorderRowProps = {
  item: RadioQueueItem;
  index: number;
  queueLength: number;
  isCurrent: boolean;
  onPlayAt: (index: number) => void;
  onRemove: (index: number) => void;
};

const PLAY_ROW_CLICK_MAX_MOVE_PX = 8;

function RadioQueueReorderRow({
  item,
  index,
  queueLength,
  isCurrent,
  onPlayAt,
  onRemove,
}: RadioQueueReorderRowProps) {
  const reorderDrag = useDragControls();
  const thumbUrl = capaYoutubeDeUrl(item.url);
  const playPointerRef = useRef<{ id: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const limparGestorPlay = () => {
      playPointerRef.current = null;
    };
    window.addEventListener("pointerup", limparGestorPlay);
    window.addEventListener("pointercancel", limparGestorPlay);
    return () => {
      window.removeEventListener("pointerup", limparGestorPlay);
      window.removeEventListener("pointercancel", limparGestorPlay);
    };
  }, []);

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={reorderDrag}
      className={`rounded-lg border p-2 select-none min-w-0 ${
        isCurrent ? "bg-cyan-500/15 border-cyan-400/40" : "bg-white/5 border-white/10"
      }`}
    >
      <div className="flex items-center gap-2 w-full min-w-0">
        <div className="w-8 shrink-0 flex items-center justify-center">
          <button
            type="button"
            title="Arrastar para reordenar"
            aria-label="Arrastar para reordenar"
            onPointerDown={(e) => reorderDrag.start(e)}
            className="flex h-8 w-8 items-center justify-center rounded-md bg-white/5 border border-white/10 text-zinc-400 hover:text-zinc-200 cursor-grab active:cursor-grabbing touch-none shrink-0"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
        </div>
        <button
          type="button"
          className="min-w-0 flex-1 flex items-center gap-2 text-left rounded-md px-1 py-0.5 cursor-pointer hover:bg-white/5 transition-colors"
          title="Tocar esta faixa"
          onPointerDown={(e) => {
            playPointerRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
          }}
          onPointerUp={(e) => {
            const start = playPointerRef.current;
            if (!start || start.id !== e.pointerId) return;
            const dx = e.clientX - start.x;
            const dy = e.clientY - start.y;
            if (Math.hypot(dx, dy) > PLAY_ROW_CLICK_MAX_MOVE_PX) return;
            onPlayAt(index);
          }}
          onPointerCancel={() => {
            playPointerRef.current = null;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onPlayAt(index);
            }
          }}
        >
          {thumbUrl ? (
            <img
              src={thumbUrl}
              alt=""
              className="w-10 h-7 object-cover rounded shrink-0 pointer-events-none"
            />
          ) : (
            <div className="w-10 h-7 rounded bg-zinc-800 shrink-0 pointer-events-none" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-bold text-white/90 truncate" title={item.titulo}>
              {item.titulo}
            </p>
            <p className="text-[8px] text-zinc-500 tabular-nums">
              {index + 1} / {queueLength}
              {isCurrent ? " · tocando" : ""}
            </p>
          </div>
        </button>
        <button
          type="button"
          title="Remover da fila"
          className="shrink-0 p-1.5 rounded-md bg-red-500/15 border border-red-400/35 text-red-300 hover:bg-red-500/25"
          aria-label="Remover da fila"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(index);
          }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </Reorder.Item>
  );
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
  const [queueFilter, setQueueFilter] = useState("");
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

  const queue = playlists[activePlaylistName] ?? [];
  const queueFilterTrim = queueFilter.trim();
  const queueFiltrada = useMemo(() => {
    if (!queueFilterTrim) return queue;
    const q = queueFilterTrim.toLowerCase();
    return queue.filter(
      (item) =>
        item.titulo.toLowerCase().includes(q) || item.url.toLowerCase().includes(q)
    );
  }, [queue, queueFilterTrim]);

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
  const [modalGerirPlaylists, setModalGerirPlaylists] = useState(false);
  const [renomeandoPlaylist, setRenomeandoPlaylist] = useState<string | null>(null);
  const [renomeDraft, setRenomeDraft] = useState("");

  const playerRef = useRef<HTMLElement | null>(null);
  const previewItemRef = useRef<RadioPreviewItem | null>(null);
  const queueRef = useRef<RadioQueueItem[]>(queue);
  const playlistsRef = useRef<RadioPlaylistsMap>(playlists);
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
    playlistsRef.current = playlists;
  }, [playlists]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    previewItemRef.current = previewItem;
  }, [previewItem]);

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
      setModalGerirPlaylists(false);
    } else {
      setShowMiniVolume(false);
    }
  }, [isExpanded]);

  useEffect(() => {
    if (!modalGerirPlaylists) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalGerirPlaylists(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalGerirPlaylists]);

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
    setCurrentIndex((i) => {
      const q = queueRef.current;
      if (q.length === 0) return 0;
      const max = q.length - 1;
      return i >= max ? i : i + 1;
    });
  }, []);

  const playNext = useCallback(() => {
    setPreviewItem(null);
    setCurrentIndex((i) => {
      const q = queueRef.current;
      if (q.length === 0) return 0;
      const max = q.length - 1;
      return i >= max ? i : i + 1;
    });
  }, []);

  const playPrev = useCallback(() => {
    setPreviewItem(null);
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, []);

  const handleReorder = useCallback(
    (newOrder: RadioQueueItem[]) => {
      const playingUid = queueRef.current[currentIndexRef.current]?.uid;
      queueRef.current = newOrder;
      setPlaylists((prev) => ({
        ...prev,
        [activePlaylistName]: newOrder,
      }));
      const ni = newOrder.findIndex((x) => x.uid === playingUid);
      setCurrentIndex(ni >= 0 ? ni : 0);
    },
    [activePlaylistName]
  );

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

  const criarNovaPlaylist = useCallback(() => {
    const raw = typeof window !== "undefined" ? window.prompt("Nome da nova playlist") : null;
    const nome = raw?.trim();
    if (!nome) return;
    if (playlistsRef.current[nome]) {
      mostrarToast("Já existe uma playlist com esse nome.", "erro");
      return;
    }
    setPreviewItem(null);
    setPlaylists((prev) => ({ ...prev, [nome]: [] }));
    setActivePlaylistName(nome);
    setCurrentIndex(0);
  }, [mostrarToast]);

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

  function confirmarRenomearPlaylist(antigo: string) {
    if (antigo === DEFAULT_PLAYLIST_NAME) {
      mostrarToast(`A playlist "${DEFAULT_PLAYLIST_NAME}" não pode ser renomeada.`, "erro");
      return;
    }
    const novo = renomeDraft.trim();
    if (!novo) {
      mostrarToast("Nome inválido.", "erro");
      return;
    }
    if (novo === antigo) {
      setRenomeandoPlaylist(null);
      return;
    }
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
    setRenomeandoPlaylist(null);
    setRenomeDraft("");
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
    if (renomeandoPlaylist === nome) {
      setRenomeandoPlaylist(null);
      setRenomeDraft("");
    }
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

  const urlAtual = previewItem?.url ?? queue[currentIndex]?.url ?? "";
  const playerKey = previewItem ? `preview-${previewItem.url}` : `${currentIndex}-${urlAtual}`;
  const tituloExibicao = faixa?.title || "Sintonizando…";
  const tituloLongo = tituloExibicao.length > 28;
  const seekDisabled = !Number.isFinite(durationSec) || durationSec <= 0;
  const posFila =
    previewItem != null
      ? "prévia"
      : queue.length > 0
        ? `${currentIndex + 1} / ${queue.length}`
        : "—";
  const navNextDisabled = !previewItem && (queue.length === 0 || currentIndex >= queue.length - 1);
  const navPrevDisabled = !previewItem && currentIndex <= 0;

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
                    title="Salvar playlists no perfil"
                    onClick={salvarPlaylistNoPerfil}
                    disabled={salvandoPlaylist}
                    className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-100 hover:bg-amber-500/30 disabled:opacity-40"
                  >
                    Salvar playlist
                  </button>
                </div>
                <div className="flex flex-wrap items-end gap-2 mb-2">
                  <label className="flex-1 min-w-[9rem] flex flex-col gap-0.5">
                    <span className="text-[8px] font-bold uppercase tracking-wider text-amber-100/70">
                      Playlist ativa
                    </span>
                    <select
                      value={activePlaylistName}
                      onChange={(e) => {
                        setPreviewItem(null);
                        setActivePlaylistName(e.target.value);
                        setCurrentIndex(0);
                        setQueueFilter("");
                      }}
                      className="rounded-lg bg-black/40 border border-amber-400/30 px-2 py-1.5 text-[10px] text-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-400/50"
                    >
                      {nomesPlaylistsOrdenados.map((nome) => (
                        <option key={nome} value={nome}>
                          {nome}
                          {(playlists[nome]?.length ?? 0) === 0 ? " (vazia)" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    title="Criar nova playlist"
                    onClick={criarNovaPlaylist}
                    className="shrink-0 text-[9px] font-bold uppercase tracking-wider px-2 py-1.5 rounded-lg bg-amber-500/15 border border-amber-400/35 text-amber-100 hover:bg-amber-500/25"
                  >
                    Nova playlist
                  </button>
                  <button
                    type="button"
                    title="Renomear ou remover playlists"
                    onClick={() => setModalGerirPlaylists(true)}
                    className="shrink-0 p-1.5 rounded-lg bg-amber-500/15 border border-amber-400/35 text-amber-100 hover:bg-amber-500/25"
                    aria-label="Gerenciar playlists"
                  >
                    <Library className="w-4 h-4" />
                  </button>
                </div>
                <input
                  type="search"
                  value={queueFilter}
                  onChange={(e) => setQueueFilter(e.target.value)}
                  placeholder="Filtrar músicas nesta playlist…"
                  className="w-full mb-2 rounded-lg bg-black/40 border border-white/10 px-2.5 py-1.5 text-[10px] text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-400/40"
                  aria-label="Filtrar fila"
                />
                {queueFilterTrim ? (
                  <p className="text-[8px] text-zinc-500 mb-1">
                    Arrastar para reordenar fica desativado enquanto o filtro estiver ativo.
                  </p>
                ) : null}
                {queueFilterTrim ? (
                  <ul className="flex flex-col gap-1 max-h-52 overflow-y-auto pr-0.5">
                    {queueFiltrada.length === 0 ? (
                      <li className="text-[9px] text-zinc-500 py-2 text-center">Nenhuma faixa combina com o filtro.</li>
                    ) : (
                      queueFiltrada.map((item) => {
                        const realIndex = queue.findIndex((x) => x.uid === item.uid);
                        const isCurrent = !previewItem && realIndex === currentIndex;
                        return (
                          <li
                            key={item.uid}
                            className={`rounded-lg border p-2 flex items-center gap-2 ${
                              isCurrent ? "bg-cyan-500/15 border-cyan-400/40" : "bg-white/5 border-white/10"
                            }`}
                          >
                            <button
                              type="button"
                              className="min-w-0 flex-1 text-left"
                              title="Tocar esta faixa"
                              onClick={() => playAtIndex(realIndex)}
                            >
                              <p className="text-[9px] font-bold text-white/90 truncate" title={item.titulo}>
                                {item.titulo}
                              </p>
                              <p className="text-[8px] text-zinc-500 tabular-nums">
                                {realIndex >= 0 ? realIndex + 1 : "—"} / {queue.length}
                                {isCurrent ? " · tocando" : ""}
                              </p>
                            </button>
                            <button
                              type="button"
                              title="Remover da fila"
                              className="shrink-0 p-1.5 rounded-md bg-red-500/15 border border-red-400/35 text-red-300 hover:bg-red-500/25"
                              aria-label="Remover da fila"
                              onClick={() => realIndex >= 0 && removeFromQueue(realIndex)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </li>
                        );
                      })
                    )}
                  </ul>
                ) : (
                  <Reorder.Group
                    axis="y"
                    values={queue}
                    onReorder={handleReorder}
                    className="flex flex-col gap-1 max-h-52 overflow-y-auto pr-0.5"
                  >
                    {queue.map((item, index) => (
                      <RadioQueueReorderRow
                        key={item.uid}
                        item={item}
                        index={index}
                        queueLength={queue.length}
                        isCurrent={!previewItem && index === currentIndex}
                        onPlayAt={playAtIndex}
                        onRemove={removeFromQueue}
                      />
                    ))}
                  </Reorder.Group>
                )}
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
                title="Mover o player"
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
                      ( {posFila} )
                    </p>
                  </div>
                ) : (
                  <p className="text-[10px] font-bold text-white/90 truncate mt-0.5" title={tituloExibicao}>
                    {tituloExibicao}{" "}
                    <span className="text-[9px] font-semibold text-zinc-500 tabular-nums">
                      ( {posFila} )
                    </span>
                  </p>
                )}
                {!isExpanded && !tituloLongo && (
                  <p className="text-[9px] font-semibold text-zinc-500 tabular-nums mt-0.5">
                    ( {posFila} )
                  </p>
                )}
              </div>

              <div
                className={`flex items-center gap-0.5 sm:gap-1 shrink-0 justify-end ${
                  isExpanded ? "flex-nowrap" : "flex-wrap"
                }`}
              >
                {!isExpanded && (
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      title={showMiniVolume ? "Fechar controle de volume" : "Volume"}
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
                {isExpanded ? (
                  <>
                    <div
                      className="flex items-center gap-0.5 rounded-full bg-violet-500/10 border border-violet-400/25 px-0.5 py-0.5"
                      role="group"
                      aria-label="Navegação da faixa"
                    >
                      <button
                        type="button"
                        title="Faixa anterior"
                        onClick={playPrev}
                        disabled={navPrevDisabled}
                        className="p-2 rounded-full bg-violet-500/15 border border-violet-400/40 text-violet-300 hover:bg-violet-500/25 disabled:opacity-30"
                        aria-label="Faixa anterior"
                      >
                        <SkipBack className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        title={isPlaying ? "Pausar" : "Tocar"}
                        onClick={() => setIsPlaying((v) => !v)}
                        className="p-2.5 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 hover:bg-cyan-500/25 hover:shadow-[0_0_12px_rgba(34,211,238,0.35)] transition-all"
                        aria-label={isPlaying ? "Pausar" : "Tocar"}
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 pl-0.5" />}
                      </button>
                      <button
                        type="button"
                        title="Próxima faixa"
                        onClick={playNext}
                        disabled={navNextDisabled}
                        className="p-2 rounded-full bg-violet-500/15 border border-violet-400/40 text-violet-300 hover:bg-violet-500/25 disabled:opacity-30"
                        aria-label="Próxima faixa"
                      >
                        <SkipForward className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1 px-1" title="Volume">
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

                    <div
                      className="flex items-center gap-0.5 rounded-full bg-white/[0.06] border border-white/10 px-0.5 py-0.5"
                      role="group"
                      aria-label="Busca e fila"
                    >
                      <button
                        type="button"
                        data-radio-search-toggle
                        title={isSearching ? "Fechar busca" : "Pesquisar música"}
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
                      <button
                        type="button"
                        data-radio-queue-toggle
                        title={isQueueOpen ? "Fechar fila" : "Minha fila"}
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
                    </div>

                    <div className="w-px h-7 shrink-0 bg-white/20 mx-0.5" aria-hidden />

                    <motion.button
                      type="button"
                      title="Adicionar à Estante"
                      onClick={capturarParaEstante}
                      disabled={capturando}
                      animate={
                        capturaConfirmadaUi
                          ? { scale: [1, 1.12, 1], boxShadow: ["0 0 0 0 rgba(52,211,153,0.5)", "0 0 16px 2px rgba(52,211,153,0.45)", "0 0 0 0 rgba(52,211,153,0)"] }
                          : { scale: 1 }
                      }
                      transition={{ duration: 0.45 }}
                      className="p-2 rounded-full bg-emerald-500/20 border-2 border-emerald-400/55 text-emerald-200 hover:bg-emerald-500/30 hover:shadow-[0_0_14px_rgba(52,211,153,0.45)] transition-colors disabled:opacity-40 ring-1 ring-emerald-400/30"
                      aria-label="Capturar para a estante"
                    >
                      {capturaConfirmadaUi ? (
                        <Check className="w-4 h-4 text-emerald-300" strokeWidth={2.5} />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                    </motion.button>
                  </>
                ) : (
                  <button
                    type="button"
                    title={isPlaying ? "Pausar" : "Tocar"}
                    onClick={() => setIsPlaying((v) => !v)}
                    className="p-2.5 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 hover:bg-cyan-500/25 hover:shadow-[0_0_12px_rgba(34,211,238,0.35)] transition-all"
                    aria-label={isPlaying ? "Pausar" : "Tocar"}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 pl-0.5" />}
                  </button>
                )}

                <button
                  type="button"
                  title={isExpanded ? "Modo compacto" : "Expandir controles"}
                  onClick={() => setIsExpanded((v) => !v)}
                  className="p-2 rounded-full bg-white/5 border border-white/15 text-zinc-200 hover:bg-white/10"
                  aria-label={isExpanded ? "Modo compacto" : "Expandir controles"}
                >
                  {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
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
              onEnded={handlePlayerEnded}
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

      {modalGerirPlaylists && (
        <div
          className="fixed inset-0 z-[1002] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm pointer-events-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="radio-gerir-playlists-titulo"
          onClick={() => {
            setModalGerirPlaylists(false);
            setRenomeandoPlaylist(null);
            setRenomeDraft("");
          }}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-amber-500/35 bg-[#0e0e11] p-4 shadow-[0_0_32px_rgba(0,0,0,0.85)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="radio-gerir-playlists-titulo"
              className="text-[11px] font-black uppercase tracking-widest text-amber-200 mb-3"
            >
              Gerenciar playlists
            </h2>
            <ul className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
              {nomesPlaylistsOrdenados.map((nome) => (
                <li
                  key={nome}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-2"
                >
                  {renomeandoPlaylist === nome ? (
                    <>
                      <input
                        value={renomeDraft}
                        onChange={(e) => setRenomeDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") confirmarRenomearPlaylist(nome);
                          if (e.key === "Escape") {
                            setRenomeandoPlaylist(null);
                            setRenomeDraft("");
                          }
                        }}
                        className="flex-1 min-w-[6rem] rounded-md bg-black/40 border border-amber-400/30 px-2 py-1 text-[11px] text-white focus:outline-none focus:ring-1 focus:ring-amber-400/50"
                        autoFocus
                        aria-label="Novo nome da playlist"
                      />
                      <button
                        type="button"
                        onClick={() => confirmarRenomearPlaylist(nome)}
                        className="text-[9px] font-bold uppercase px-2 py-1 rounded-md bg-emerald-500/20 border border-emerald-400/40 text-emerald-200"
                      >
                        OK
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRenomeandoPlaylist(null);
                          setRenomeDraft("");
                        }}
                        className="text-[9px] font-bold uppercase px-2 py-1 rounded-md bg-white/10 text-zinc-300"
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 min-w-0 truncate text-[11px] font-bold text-white/90" title={nome}>
                        {nome}
                        {nome === DEFAULT_PLAYLIST_NAME ? (
                          <span className="ml-1 text-[9px] font-semibold text-zinc-500">(fixa)</span>
                        ) : null}
                      </span>
                      <button
                        type="button"
                        title="Renomear"
                        disabled={nome === DEFAULT_PLAYLIST_NAME}
                        onClick={() => {
                          if (nome === DEFAULT_PLAYLIST_NAME) return;
                          setRenomeandoPlaylist(nome);
                          setRenomeDraft(nome);
                        }}
                        className="shrink-0 p-1.5 rounded-md bg-amber-500/15 border border-amber-400/35 text-amber-200 hover:bg-amber-500/25 disabled:opacity-30 disabled:pointer-events-none"
                        aria-label={`Renomear ${nome}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        title={
                          nome === DEFAULT_PLAYLIST_NAME
                            ? "A playlist Padrão não pode ser removida"
                            : "Remover playlist"
                        }
                        disabled={nome === DEFAULT_PLAYLIST_NAME}
                        onClick={() => removerPlaylist(nome)}
                        className="shrink-0 p-1.5 rounded-md bg-red-500/15 border border-red-400/35 text-red-300 hover:bg-red-500/25 disabled:opacity-30 disabled:pointer-events-none"
                        aria-label={`Remover ${nome}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="mt-3 w-full text-[10px] font-bold uppercase tracking-wider py-2 rounded-xl bg-white/10 border border-white/15 text-zinc-200 hover:bg-white/15"
              onClick={() => {
                setModalGerirPlaylists(false);
                setRenomeandoPlaylist(null);
                setRenomeDraft("");
              }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {modalSenhaMestra}
    </>
  );
}
