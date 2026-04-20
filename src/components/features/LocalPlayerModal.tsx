"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type SyntheticEvent,
} from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { readDir } from "@tauri-apps/plugin-fs";
import { convertFileSrc } from "@tauri-apps/api/core";
import { basename, join } from "@tauri-apps/api/path";
import {
  CheckCircle2,
  Edit2,
  FastForward,
  FolderOpen,
  FolderPlus,
  Link2,
  Link as LinkIcon,
  Loader2,
  RefreshCw,
  Rewind,
  Subtitles,
  Trash,
  Unlink,
  X,
} from "lucide-react";
import { getApiUrl } from "@/utils/api";
import { parseMediaFilename } from "@/utils/mediaParser";
import {
  TIPO_OBRA_LABEL_SECAO,
  TIPO_OBRA_TABELA_DB,
  type EstanteItem,
  type TipoObra,
} from "@/types/hunter_registry";
import { createClient } from "@/utils/supabase/client";

export type LocalPlayerModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export type LocalLib = {
  id: string;
  name: string;
  path: string;
  obraId?: string | number;
  obraTitulo?: string;
  /** URL da capa salva no vínculo (confirmação visual ao atualizar progresso). */
  obraImagem?: string;
  /** Tipo na estante (tabela) para o vínculo; necessário para identificar a obra. */
  tipoObra?: TipoObra;
  /** Último progresso conhecido na estante (cache ao vincular; o prompt pode atualizar via Supabase). */
  capituloAtual?: number;
};

type StoredLibsPayload = {
  libraries: LocalLib[];
  lastActiveLibraryId: string | null;
};

const MEDIA_EXT_RE = /\.(mp4|mkv|webm|pdf)$/i;

/** Progresso mínimo para considerar episódio “assistido” e exibir o prompt de conclusão. */
const COMPLETION_THRESHOLD = 0.9;

/**
 * Extrai o número do episódio do nome do arquivo (ignora pastas e ruído técnico).
 */
function extrairEpisodioDoArquivo(caminhoArquivo: string): number | null {
  if (!caminhoArquivo) return null;
  const nomeArquivo = caminhoArquivo.split(/[/\\]/).pop() || "";
  const nomeLimpo = nomeArquivo.replace(
    /(1080p|720p|480p|2160p|4k|x265|x264|h264|8bit|10bit)/gi,
    ""
  );
  const matchExato = nomeLimpo.match(
    /(?:-\s*|ep\s*|e\s*|epis[oó]dio\s*)(\d{1,4})/i
  );
  if (matchExato) return Number.parseInt(matchExato[1], 10);
  const numeros = nomeLimpo.match(/\d+/g);
  return numeros
    ? Number.parseInt(numeros[numeros.length - 1], 10)
    : null;
}

export type PlaylistItem = {
  name: string;
  path: string;
  parsedTitle: string;
  parsedEpisode: string | null;
  /** Query de vínculo: título só, ou título + ano se for filme (sem episódio). */
  searchQuery: string;
};

type LeftTab = "libraries" | "files";

function loadPerfilAtivoId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem("hunter_ativo");
  } catch {
    return null;
  }
}

type TmdbLinkHit = {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  subtitle: string;
};

export function LocalPlayerModal({ isOpen, onClose }: LocalPlayerModalProps) {
  const [perfilAtivoId, setPerfilAtivoId] = useState<string | null>(null);

  const storageKey = useMemo(
    () => `estante-libs-${perfilAtivoId || "default"}`,
    [perfilAtivoId]
  );

  const [libraries, setLibraries] = useState<LocalLib[]>([]);
  const [activeLibId, setActiveLibId] = useState<string | null>(null);
  const [leftTab, setLeftTab] = useState<LeftTab>("libraries");

  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"video" | "pdf" | null>(null);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [subtitleTrackUrl, setSubtitleTrackUrl] = useState<string | null>(null);

  const [hasWatchedEnough, setHasWatchedEnough] = useState(false);
  const [hasShownCompletionPrompt, setHasShownCompletionPrompt] =
    useState(false);
  const [showCompletionPrompt, setShowCompletionPrompt] = useState(false);
  const [completionSaving, setCompletionSaving] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
  /** `capitulo_atual` lido do Supabase ao abrir o prompt (mais fiel que o cache do vínculo). */
  const [completionPromptCapituloEstande, setCompletionPromptCapituloEstande] =
    useState<number | null>(null);

  const [scanError, setScanError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const [isLinking, setIsLinking] = useState(false);
  const [searchEngine, setSearchEngine] = useState<"local" | "tmdb">("local");
  const [linkSearchQuery, setLinkSearchQuery] = useState("");
  const [linkSearchResults, setLinkSearchResults] = useState<EstanteItem[]>([]);
  const [linkTmdbResults, setLinkTmdbResults] = useState<TmdbLinkHit[]>([]);
  const [linkSearchLoading, setLinkSearchLoading] = useState(false);
  const [linkSearchError, setLinkSearchError] = useState<string | null>(null);
  const [linkFlowNotice, setLinkFlowNotice] = useState<string | null>(null);
  const prevIsLinking = useRef(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  const activeLibrary = useMemo(
    () => libraries.find((l) => l.id === activeLibId) ?? null,
    [libraries, activeLibId]
  );
  const folderPath = activeLibrary?.path ?? null;

  const activePlaylistItem = useMemo(
    () =>
      activePath ? playlist.find((p) => p.path === activePath) ?? null : null,
    [playlist, activePath]
  );

  const episodioDetectadoArquivo = useMemo(() => {
    if (!activePath) return 1;
    return extrairEpisodioDoArquivo(activePath) || 1;
  }, [activePath]);

  const capituloNaEstanteParaModal = useMemo(() => {
    return (
      completionPromptCapituloEstande ?? activeLibrary?.capituloAtual ?? 0
    );
  }, [completionPromptCapituloEstande, activeLibrary?.capituloAtual]);

  const isRewatch = useMemo(() => {
    return episodioDetectadoArquivo <= capituloNaEstanteParaModal;
  }, [episodioDetectadoArquivo, capituloNaEstanteParaModal]);

  useEffect(() => {
    if (!showCompletionPrompt || !activeLibrary?.obraId || !activeLibrary.tipoObra) {
      setCompletionPromptCapituloEstande(null);
      return;
    }

    let cancelled = false;
    const tipo = activeLibrary.tipoObra;
    const obraId = activeLibrary.obraId;
    const idNum =
      typeof obraId === "number"
        ? obraId
        : Number.parseInt(String(obraId).trim(), 10);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      setCompletionPromptCapituloEstande(null);
      return;
    }

    void (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from(TIPO_OBRA_TABELA_DB[tipo])
        .select("capitulo_atual")
        .eq("id", idNum)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        setCompletionPromptCapituloEstande(null);
        return;
      }
      setCompletionPromptCapituloEstande(
        Math.max(0, Number(data?.capitulo_atual) || 0)
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [showCompletionPrompt, activeLibrary?.obraId, activeLibrary?.tipoObra]);

  useEffect(() => {
    if (!isOpen) return;
    setPerfilAtivoId(loadPerfilAtivoId());
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setHasWatchedEnough(false);
      setHasShownCompletionPrompt(false);
      setShowCompletionPrompt(false);
      setCompletionError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    setHasWatchedEnough(false);
    setHasShownCompletionPrompt(false);
  }, [activePath]);

  useEffect(() => {
    if (!isOpen) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setLibraries([]);
        setActiveLibId(null);
        return;
      }
      const parsed = JSON.parse(raw) as Partial<StoredLibsPayload>;
      setLibraries(Array.isArray(parsed.libraries) ? parsed.libraries : []);
      setActiveLibId(
        typeof parsed.lastActiveLibraryId === "string"
          ? parsed.lastActiveLibraryId
          : null
      );
    } catch {
      setLibraries([]);
      setActiveLibId(null);
    }
  }, [isOpen, storageKey]);

  useEffect(() => {
    if (!isOpen) return;
    try {
      const payload: StoredLibsPayload = {
        libraries,
        lastActiveLibraryId: activeLibId,
      };
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  }, [libraries, activeLibId, storageKey, isOpen]);

  const clearPlayback = useCallback(() => {
    setMediaUrl(null);
    setMediaType(null);
    setActivePath(null);
    setSubtitleTrackUrl(null);
  }, []);

  const fecharMediaDireto = useCallback(() => {
    setShowCompletionPrompt(false);
    setCompletionError(null);
    clearPlayback();
  }, [clearPlayback]);

  const handleCloseMedia = useCallback(() => {
    if (hasWatchedEnough && activeLibrary?.obraId != null) {
      setShowCompletionPrompt(true);
    } else {
      fecharMediaDireto();
    }
  }, [hasWatchedEnough, activeLibrary?.obraId, fecharMediaDireto]);

  const handleVideoTimeUpdate = useCallback(
    (event: SyntheticEvent<HTMLVideoElement>) => {
      const videoElement = event.currentTarget;
      const dur = videoElement.duration;
      if (!dur || dur <= 0 || !Number.isFinite(dur)) return;

      const currentProgress = videoElement.currentTime / dur;

      if (currentProgress >= COMPLETION_THRESHOLD) {
        setHasWatchedEnough(true);
      }

      const obraVinculada =
        activeLibrary != null &&
        activeLibrary.obraId != null &&
        activeLibrary.tipoObra != null;

      if (
        obraVinculada &&
        currentProgress >= COMPLETION_THRESHOLD &&
        !hasShownCompletionPrompt &&
        !completionSaving
      ) {
        setHasShownCompletionPrompt(true);
        setShowCompletionPrompt(true);
      }
    },
    [activeLibrary, hasShownCompletionPrompt, completionSaving]
  );

  const handleConfirmCompletion = useCallback(async () => {
    if (!activeLibrary) return;

    const tipo = activeLibrary.tipoObra;
    const obraId = activeLibrary.obraId;
    if (!tipo || obraId === undefined || obraId === null) {
      setCompletionError("Obra ou tipo inválido para atualizar.");
      return;
    }

    const tabela = TIPO_OBRA_TABELA_DB[tipo];
    const idNum =
      typeof obraId === "number"
        ? obraId
        : Number.parseInt(String(obraId).trim(), 10);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      setCompletionError("ID da obra inválido.");
      return;
    }

    try {
      setCompletionSaving(true);
      setCompletionError("");

      const episodioIdentificado =
        extrairEpisodioDoArquivo(activePath ?? "") || 1;

      const supabase = createClient();
      const { data: dbObra, error: fetchError } = await supabase
        .from(tabela)
        .select("capitulo_atual, total_capitulos, status")
        .eq("id", idNum)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!dbObra) throw new Error("Obra não encontrada na estante.");

      const capituloAtualNoBanco = Math.max(
        0,
        Number(dbObra.capitulo_atual) || 0
      );
      const totalCapitulos = Math.max(
        0,
        Number(dbObra.total_capitulos) || 0
      );

      const novoCapitulo = Math.max(
        capituloAtualNoBanco,
        episodioIdentificado
      );

      let novoStatus =
        typeof dbObra.status === "string"
          ? dbObra.status.trim()
          : String(dbObra.status ?? "Lendo");

      if (totalCapitulos > 0 && novoCapitulo >= totalCapitulos) {
        novoStatus = "Completos";
      } else if (novoStatus === "Planejo Ler") {
        novoStatus = "Lendo";
      }

      const agora = new Date().toISOString();
      const { error: updateError } = await supabase
        .from(tabela)
        .update({
          capitulo_atual: novoCapitulo,
          status: novoStatus,
          ultima_leitura: agora,
        })
        .eq("id", idNum);

      if (updateError) throw updateError;

      fecharMediaDireto();
    } catch (err) {
      console.error("Erro ao atualizar estante:", err);
      setCompletionError("Falha ao salvar progresso.");
    } finally {
      setCompletionSaving(false);
    }
  }, [activeLibrary, activePath, fecharMediaDireto]);

  const handleClose = useCallback(() => {
    clearPlayback();
    setShowCompletionPrompt(false);
    setHasShownCompletionPrompt(false);
    setCompletionError(null);
    setPlaylist([]);
    setActiveLibId(null);
    setScanError(null);
    setLeftTab("libraries");
    setIsLinking(false);
    setSearchEngine("local");
    setLinkSearchQuery("");
    setLinkSearchResults([]);
    setLinkTmdbResults([]);
    setLinkSearchError(null);
    setLinkFlowNotice(null);
    onClose();
  }, [clearPlayback, onClose]);

  useEffect(() => {
    if (isLinking && !prevIsLinking.current) {
      const firstItemQuery = playlist[0]?.searchQuery?.trim();
      const folderName = activeLibrary?.name?.trim() ?? "";
      const fallbackQuery = folderName
        ? parseMediaFilename(folderName, folderName).searchQuery.trim()
        : "";
      const q =
        firstItemQuery && firstItemQuery.length > 2
          ? firstItemQuery
          : fallbackQuery;
      setLinkSearchQuery(q);
      setSearchEngine("local");
      setLinkSearchResults([]);
      setLinkTmdbResults([]);
      setLinkSearchError(null);
      setLinkFlowNotice(null);
    }
    prevIsLinking.current = isLinking;
  }, [isLinking, activeLibrary?.name, playlist]);

  useEffect(() => {
    if (!isLinking) {
      setLinkSearchResults([]);
      setLinkTmdbResults([]);
      return;
    }

    const q = linkSearchQuery.trim();
    if (q.length < 2) {
      setLinkSearchResults([]);
      setLinkTmdbResults([]);
      setLinkSearchLoading(false);
      return;
    }

    if (searchEngine === "local" && !perfilAtivoId) {
      setLinkSearchResults([]);
      setLinkTmdbResults([]);
      setLinkSearchLoading(false);
      return;
    }

    const t = window.setTimeout(() => {
      void (async () => {
        setLinkSearchLoading(true);
        setLinkSearchError(null);
        try {
          if (searchEngine === "local") {
            const res = await fetch(getApiUrl("/api/estante/search"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                query: q,
                hunterId: perfilAtivoId as string,
              }),
            });
            const json = (await res.json()) as {
              items?: EstanteItem[];
              error?: string;
            };
            if (!res.ok) {
              setLinkSearchResults([]);
              setLinkSearchError(json.error ?? "Falha na busca.");
              return;
            }
            setLinkSearchResults(Array.isArray(json.items) ? json.items : []);
            setLinkTmdbResults([]);
          } else {
            const [resM, resT] = await Promise.all([
              fetch(getApiUrl(`/api/tmdb?q=${encodeURIComponent(q)}&type=movie`)),
              fetch(getApiUrl(`/api/tmdb?q=${encodeURIComponent(q)}&type=tv`)),
            ]);
            const jM = (await resM.json()) as {
              results?: Record<string, unknown>[];
              error?: string;
            };
            const jT = (await resT.json()) as {
              results?: Record<string, unknown>[];
              error?: string;
            };
            if (!resM.ok || !resT.ok) {
              setLinkTmdbResults([]);
              setLinkSearchError(
                jM.error || jT.error || "Falha na busca no catálogo global."
              );
              return;
            }
            const movieRows: TmdbLinkHit[] = (jM.results ?? []).map((m) => {
              const title =
                (m.title as string) ||
                (m.name as string) ||
                (m.original_title as string) ||
                "";
              const date = (m.release_date as string) || "";
              const y = date ? date.slice(0, 4) : "";
              return {
                id: m.id as number,
                mediaType: "movie" as const,
                title,
                subtitle: y ? `Filme · ${y}` : "Filme",
              };
            });
            const tvRows: TmdbLinkHit[] = (jT.results ?? []).map((m) => {
              const title =
                (m.name as string) ||
                (m.original_name as string) ||
                (m.title as string) ||
                "";
              const date = (m.first_air_date as string) || "";
              const y = date ? date.slice(0, 4) : "";
              return {
                id: m.id as number,
                mediaType: "tv" as const,
                title,
                subtitle: y ? `Série · ${y}` : "Série",
              };
            });
            setLinkTmdbResults([...movieRows, ...tvRows].slice(0, 15));
            setLinkSearchResults([]);
          }
        } catch (e) {
          setLinkSearchResults([]);
          setLinkTmdbResults([]);
          setLinkSearchError(
            e instanceof Error
              ? e.message
              : searchEngine === "local"
                ? "Erro ao buscar na estante."
                : "Erro ao buscar no catálogo global."
          );
        } finally {
          setLinkSearchLoading(false);
        }
      })();
    }, 320);
    return () => window.clearTimeout(t);
  }, [linkSearchQuery, perfilAtivoId, isLinking, searchEngine]);

  const vincularObraSelecionada = useCallback(
    (item: EstanteItem) => {
      if (!activeLibId || item.id === undefined) return;
      const resultado = item as EstanteItem & {
        imagem_url?: string;
        poster_path?: string;
      };
      const capaRaw = item.capa;
      const capaStr =
        typeof capaRaw === "string" && capaRaw.trim()
          ? capaRaw.trim()
          : capaRaw != null && String(capaRaw).trim()
            ? String(capaRaw).trim()
            : "";
      const obraImagem =
        capaStr ||
        (item.capa_url && String(item.capa_url).trim()) ||
        resultado.imagem_url ||
        resultado.poster_path ||
        "";
      setLibraries((prev) =>
        prev.map((l) =>
          l.id === activeLibId
            ? {
                ...l,
                obraId: item.id,
                obraTitulo: item.titulo,
                obraImagem,
                tipoObra: item.tipo_obra,
                capituloAtual: Math.max(0, Math.floor(Number(item.progresso)) || 0),
              }
            : l
        )
      );
      setIsLinking(false);
      setSearchEngine("local");
      setLinkSearchQuery("");
      setLinkSearchResults([]);
      setLinkTmdbResults([]);
      setLinkFlowNotice(null);
    },
    [activeLibId]
  );

  const desvincularObraAtual = useCallback(() => {
    if (!activeLibId) return;
    setLibraries((prev) =>
      prev.map((l) =>
        l.id === activeLibId
          ? {
              ...l,
              obraId: undefined,
              obraTitulo: undefined,
              obraImagem: undefined,
              tipoObra: undefined,
              capituloAtual: undefined,
            }
          : l
      )
    );
  }, [activeLibId]);

  const scanFolder = useCallback(
    async (dirPath: string, folderContextName?: string) => {
      setScanning(true);
      setScanError(null);
      try {
        const dirLabel =
          folderContextName?.trim() || (await basename(dirPath));
        const entries = await readDir(dirPath);
        const files = entries.filter(
          (e) => e.isFile && MEDIA_EXT_RE.test(e.name)
        );
        files.sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
        );
        const items: PlaylistItem[] = await Promise.all(
          files.map(async (e) => {
            const { parsedTitle, parsedEpisode, searchQuery } =
              parseMediaFilename(e.name, dirLabel);
            return {
              name: e.name,
              path: await join(dirPath, e.name),
              parsedTitle,
              parsedEpisode,
              searchQuery,
            };
          })
        );
        setPlaylist(items);
        clearPlayback();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setScanError(msg);
        setPlaylist([]);
        clearPlayback();
      } finally {
        setScanning(false);
      }
    },
    [clearPlayback]
  );

  const salvarNovaPasta = useCallback(
    async (pathDir: string, nomeSugerido: string) => {
      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `lib-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const novo: LocalLib = { id, name: nomeSugerido, path: pathDir };
      setLibraries((prev) => [...prev, novo]);
      setActiveLibId(id);
      return novo;
    },
    []
  );

  const novaBiblioteca = useCallback(async () => {
    const selectedDir = await open({
      directory: true,
      multiple: false,
    });
    if (selectedDir == null || Array.isArray(selectedDir)) return;
    const nomeDefault = await basename(selectedDir);
    await salvarNovaPasta(selectedDir, nomeDefault);
    await scanFolder(selectedDir, nomeDefault);
    setLeftTab("files");
  }, [salvarNovaPasta, scanFolder]);

  const renomearBiblioteca = useCallback((id: string) => {
    const lib = libraries.find((l) => l.id === id);
    if (!lib) return;
    const next = window.prompt("Novo nome da biblioteca", lib.name);
    if (next == null) return;
    const trimmed = next.trim();
    if (!trimmed) return;
    setLibraries((prev) =>
      prev.map((l) => (l.id === id ? { ...l, name: trimmed } : l))
    );
  }, [libraries]);

  const excluirBiblioteca = useCallback(
    (id: string) => {
      if (!window.confirm("Remover esta biblioteca da lista?")) return;
      setLibraries((prev) => prev.filter((l) => l.id !== id));
      if (activeLibId === id) {
        setActiveLibId(null);
        setPlaylist([]);
        clearPlayback();
        setLeftTab("libraries");
      }
    },
    [activeLibId, clearPlayback]
  );

  const selecionarBiblioteca = useCallback(
    async (lib: LocalLib) => {
      setActiveLibId(lib.id);
      await scanFolder(lib.path, lib.name);
      setLeftTab("files");
    },
    [scanFolder]
  );

  const recarregarPastaAtual = useCallback(async () => {
    if (!folderPath) return;
    const nameHint =
      activeLibrary?.path === folderPath
        ? activeLibrary.name
        : await basename(folderPath);
    await scanFolder(folderPath, nameHint);
  }, [folderPath, activeLibrary, scanFolder]);

  const playItem = useCallback((item: PlaylistItem) => {
    setHasShownCompletionPrompt(false);
    const ext = item.name.split(".").pop()?.toLowerCase();
    const nextType: "video" | "pdf" = ext === "pdf" ? "pdf" : "video";
    const assetUrl = convertFileSrc(item.path);
    setMediaUrl(assetUrl);
    setMediaType(nextType);
    setActivePath(item.path);
  }, []);

  const carregarLegenda = useCallback(async () => {
    const picked = await open({
      multiple: false,
      directory: false,
      filters: [{ name: "Legendas", extensions: ["vtt", "srt"] }],
    });
    if (picked == null || Array.isArray(picked)) return;
    setSubtitleTrackUrl(convertFileSrc(picked));
  }, []);

  useEffect(() => {
    setSubtitleTrackUrl(null);
  }, [activePath]);

  if (!isOpen) return null;

  const hasPlaylist = playlist.length > 0;
  const tabBtn =
    "flex-1 rounded-lg px-2 py-2 text-[11px] font-medium uppercase tracking-wide transition-colors";
  const tabActive =
    "border border-cyan-500/35 bg-cyan-500/15 text-cyan-100 shadow-[0_0_12px_rgba(34,211,238,0.15)]";
  const tabIdle =
    "border border-transparent text-zinc-500 hover:border-white/10 hover:bg-white/[0.04] hover:text-zinc-200";

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="local-player-title"
      onClick={handleClose}
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c0f]/80 shadow-2xl backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <h2
            id="local-player-title"
            className="text-sm font-medium tracking-wide text-zinc-100"
          >
            Player local
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-cyan-500/35 hover:text-white"
            >
              Fechar
            </button>
          </div>
        </header>

        <div className="flex min-h-[min(70vh,640px)] flex-1 min-h-0 flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-row">
            <aside
              className="flex w-64 shrink-0 flex-col border-r border-white/10 bg-black/25"
              aria-label="Bibliotecas e playlist"
            >
              <div className="flex gap-1 border-b border-white/10 p-2">
                <button
                  type="button"
                  className={`${tabBtn} ${leftTab === "libraries" ? tabActive : tabIdle}`}
                  onClick={() => setLeftTab("libraries")}
                >
                  Minhas Pastas
                </button>
                <button
                  type="button"
                  className={`${tabBtn} ${leftTab === "files" ? tabActive : tabIdle}`}
                  onClick={() => setLeftTab("files")}
                >
                  Arquivos da Pasta
                </button>
              </div>

              {leftTab === "libraries" ? (
                <div className="flex min-h-0 flex-1 flex-col gap-2 p-2">
                  <button
                    type="button"
                    disabled={scanning}
                    onClick={() => void novaBiblioteca()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-2 py-2 text-xs text-emerald-100 transition-colors hover:border-emerald-400/45 hover:bg-emerald-500/15 disabled:opacity-40"
                  >
                    <FolderPlus className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                    Nova Biblioteca
                  </button>
                  <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto">
                    {libraries.map((lib) => {
                      const ativa = activeLibId === lib.id;
                      return (
                        <li
                          key={lib.id}
                          className={`rounded-lg border px-2 py-2 ${
                            ativa
                              ? "border-cyan-500/40 bg-cyan-500/10"
                              : "border-white/10 bg-white/[0.03]"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => void selecionarBiblioteca(lib)}
                            className="w-full truncate text-left text-xs text-zinc-200"
                            title={lib.path}
                          >
                            {lib.name}
                          </button>
                          <div className="mt-1 flex justify-end gap-1">
                            <button
                              type="button"
                              title="Renomear"
                              aria-label="Renomear biblioteca"
                              onClick={() => renomearBiblioteca(lib.id)}
                              className="rounded-md border border-white/10 p-1 text-zinc-400 transition-colors hover:border-cyan-500/35 hover:text-cyan-100"
                            >
                              <Edit2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                            </button>
                            <button
                              type="button"
                              title="Excluir"
                              aria-label="Excluir biblioteca"
                              onClick={() => excluirBiblioteca(lib.id)}
                              className="rounded-md border border-white/10 p-1 text-zinc-400 transition-colors hover:border-red-500/40 hover:text-red-200"
                            >
                              <Trash className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="border-b border-white/10 px-3 py-2">
                    {folderPath ? (
                      <div className="mb-3 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-2">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                          Status da Biblioteca
                        </p>
                        {activeLibrary?.obraId != null &&
                        (activeLibrary.obraTitulo?.length ?? 0) > 0 ? (
                          <div className="mt-2 flex items-start gap-1">
                            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1.5 text-left text-xs text-emerald-100">
                              <CheckCircle2
                                className="h-3.5 w-3.5 shrink-0 text-emerald-300/90"
                                strokeWidth={2}
                                aria-hidden
                              />
                              <span
                                className="min-w-0 truncate"
                                title={activeLibrary.obraTitulo}
                              >
                                Vinculado: {activeLibrary.obraTitulo}
                              </span>
                            </div>
                            <button
                              type="button"
                              title="Desvincular obra"
                              aria-label="Desvincular obra"
                              onClick={() => desvincularObraAtual()}
                              className="shrink-0 rounded-md border border-white/10 p-1 text-zinc-500 transition-colors hover:border-red-500/35 hover:text-red-300"
                            >
                              <Unlink className="h-3 w-3" strokeWidth={2} aria-hidden />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setIsLinking(true)}
                            className="mt-2 flex w-full items-center justify-start gap-2 text-xs text-zinc-400 transition-colors hover:text-white"
                          >
                            <LinkIcon
                              className="h-3.5 w-3.5 shrink-0"
                              strokeWidth={2}
                              aria-hidden
                            />
                            Vincular Obra
                          </button>
                        )}
                      </div>
                    ) : null}
                    <p className="truncate text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                      Pasta ativa
                    </p>
                    {folderPath ? (
                      <p className="mt-1 truncate text-xs text-zinc-400" title={folderPath}>
                        {activeLibrary?.name ?? folderPath}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-zinc-500">
                        Nenhuma biblioteca selecionada.
                      </p>
                    )}
                    <button
                      type="button"
                      disabled={scanning || !folderPath}
                      onClick={() => void recarregarPastaAtual()}
                      className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-[11px] text-zinc-300 transition-colors hover:border-cyan-500/35 hover:text-white disabled:opacity-40"
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 ${scanning ? "animate-spin" : ""}`}
                        strokeWidth={2.25}
                        aria-hidden
                      />
                      Atualizar lista
                    </button>
                  </div>
                  <ul className="min-h-0 flex-1 overflow-y-auto py-2">
                    {!folderPath ? (
                      <li className="px-3 py-4 text-center text-xs text-zinc-500">
                        Escolha uma pasta em Minhas Pastas.
                      </li>
                    ) : (
                      playlist.map((item) => {
                        const active = activePath === item.path;
                        return (
                          <li key={item.path}>
                            <button
                              type="button"
                              title={item.name}
                              onClick={() => playItem(item)}
                              className={`w-full px-3 py-2 text-left transition-colors ${
                                active
                                  ? "border-l-2 border-cyan-400 bg-cyan-500/15 text-cyan-100"
                                  : "border-l-2 border-transparent text-zinc-300 hover:bg-white/[0.06] hover:text-white"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="line-clamp-2 min-w-0 flex-1 text-[13px] font-medium leading-snug text-zinc-100">
                                  {item.parsedTitle}
                                </span>
                                {item.parsedEpisode ? (
                                  <span className="shrink-0 rounded border border-cyan-500/25 bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-cyan-200/90">
                                    Ep {item.parsedEpisode}
                                  </span>
                                ) : null}
                              </div>
                            </button>
                          </li>
                        );
                      })
                    )}
                  </ul>
                </div>
              )}
            </aside>

            <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-auto p-5">
              {libraries.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12">
                  <button
                    type="button"
                    disabled={scanning}
                    onClick={() => void novaBiblioteca()}
                    className="group flex flex-col items-center gap-3 rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.06] px-10 py-8 shadow-[0_0_24px_rgba(34,211,238,0.08)] transition-all hover:border-cyan-400/40 hover:bg-cyan-500/10 hover:shadow-[0_0_32px_rgba(34,211,238,0.18)] disabled:opacity-50"
                  >
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-500/25 bg-black/30 text-cyan-200 transition-colors group-hover:border-cyan-400/45 group-hover:text-cyan-50">
                      <FolderOpen className="h-7 w-7" strokeWidth={2} aria-hidden />
                    </span>
                    <span className="text-center text-sm font-medium text-zinc-200">
                      Criar primeira biblioteca (pasta)
                    </span>
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-zinc-500">
                      Perfil:{" "}
                      <span className="text-zinc-300">
                        {perfilAtivoId ?? "default"}
                      </span>
                    </p>
                    {mediaUrl && mediaType ? (
                      <button
                        type="button"
                        onClick={handleCloseMedia}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-zinc-200 transition-colors hover:border-red-500/35 hover:text-red-100"
                      >
                        <X className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                        Fechar mídia
                      </button>
                    ) : null}
                  </div>

                  {scanError ? (
                    <p className="text-xs text-red-300/90">{scanError}</p>
                  ) : null}

                  {folderPath && !hasPlaylist ? (
                    <p className="text-center text-sm text-zinc-400">
                      Nenhum arquivo compatível nesta pasta (.mp4, .mkv, .webm,
                      .pdf).
                    </p>
                  ) : null}

                  {folderPath && hasPlaylist && !mediaUrl ? (
                    <p className="text-center text-sm text-zinc-500">
                      Escolha um arquivo na aba Arquivos da Pasta.
                    </p>
                  ) : null}

                  {mediaUrl && mediaType === "video" ? (
                    <div className="space-y-3">
                      <div className="relative overflow-hidden rounded-xl shadow-2xl ring-1 ring-white/10">
                        <video
                          ref={videoRef}
                          key={activePath ?? mediaUrl}
                          src={mediaUrl}
                          controls
                          className="w-full h-auto max-h-[70vh] bg-black"
                          onTimeUpdate={handleVideoTimeUpdate}
                          onEnded={() => handleCloseMedia()}
                        >
                          {subtitleTrackUrl ? (
                            <track
                              src={subtitleTrackUrl}
                              kind="subtitles"
                              srcLang="pt"
                              label="Legenda Externa"
                              default
                            />
                          ) : null}
                        </video>
                        {showCompletionPrompt ? (
                          <div
                            className="absolute inset-0 z-[130] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
                            role="presentation"
                            onClick={() => fecharMediaDireto()}
                          >
                            <div
                              className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0a0a0d]/85 p-5 shadow-2xl backdrop-blur-xl"
                              role="dialog"
                              aria-modal="true"
                              aria-labelledby="completion-prompt-title"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex flex-col gap-4 text-left sm:flex-row items-center sm:items-start">
                                {activeLibrary?.obraImagem ? (
                                  <img
                                    src={activeLibrary.obraImagem}
                                    alt="Capa"
                                    className="h-36 w-24 shrink-0 rounded-md border border-white/10 object-cover shadow-lg"
                                  />
                                ) : null}
                                <div className="flex-1">
                                  <h3
                                    id="completion-prompt-title"
                                    className="mb-2 text-xl font-bold text-white"
                                  >
                                    {isRewatch
                                      ? "Episódio Re-assistido"
                                      : "Episódio Concluído"}
                                  </h3>
                                  <p className="mb-4 text-sm text-zinc-300">
                                    {isRewatch ? (
                                      <>
                                        Você já completou este episódio
                                        anteriormente. Deseja atualizar a data de
                                        última leitura de{" "}
                                        <strong className="text-white">
                                          {activeLibrary?.obraTitulo ??
                                            "esta obra"}
                                        </strong>{" "}
                                        para destacá-la na estante?
                                      </>
                                    ) : (
                                      <>
                                        Deseja atualizar seu progresso em{" "}
                                        <strong className="text-white">
                                          {activeLibrary?.obraTitulo ??
                                            "esta obra"}
                                        </strong>{" "}
                                        para o{" "}
                                        <strong className="text-green-400">
                                          Episódio {episodioDetectadoArquivo}
                                        </strong>
                                        ?
                                      </>
                                    )}
                                  </p>
                                  <div className="mb-4 rounded-lg border border-white/10 bg-zinc-800/50 p-3">
                                    <p className="text-xs font-medium text-zinc-400">
                                      {activeLibrary?.obraTitulo ?? "Obra"}
                                    </p>
                                    {activePlaylistItem ? (
                                      <p className="mt-1 text-xs text-zinc-500">
                                        {activePlaylistItem.parsedTitle}
                                      </p>
                                    ) : null}
                                    <p className="mt-2 text-sm text-white">
                                      {isRewatch
                                        ? "Detectado re-leitura: "
                                        : "Detectado no arquivo: "}
                                      Episódio {episodioDetectadoArquivo}
                                    </p>
                                  </div>
                                  {completionError ? (
                                    <p className="mb-4 text-xs text-red-300/90">
                                      {completionError}
                                    </p>
                                  ) : null}
                                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                                    <button
                                      type="button"
                                      disabled={completionSaving}
                                      onClick={() => fecharMediaDireto()}
                                      className="rounded-xl border border-white/15 bg-transparent px-4 py-2.5 text-xs font-medium text-zinc-200 transition-colors hover:border-white/25 hover:bg-white/[0.06] disabled:opacity-40"
                                    >
                                      Não, apenas fechar
                                    </button>
                                    <button
                                      type="button"
                                      disabled={completionSaving}
                                      onClick={() => void handleConfirmCompletion()}
                                      className="rounded-xl border border-cyan-500/35 bg-cyan-500/15 px-4 py-2.5 text-xs font-medium text-cyan-50 shadow-[0_0_16px_rgba(34,211,238,0.12)] transition-colors hover:border-cyan-400/50 hover:bg-cyan-500/25 disabled:opacity-40"
                                    >
                                      {completionSaving ? (
                                        <span className="inline-flex items-center gap-2">
                                          <Loader2
                                            className="h-3.5 w-3.5 animate-spin"
                                            aria-hidden
                                          />
                                          Processando...
                                        </span>
                                      ) : isRewatch ? (
                                        "Sim, atualizar data"
                                      ) : (
                                        "Sim, atualizar estante"
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 backdrop-blur-md">
                        <button
                          type="button"
                          title="-5 segundos"
                          aria-label="Voltar 5 segundos"
                          onClick={() => {
                            const el = videoRef.current;
                            if (el) el.currentTime = Math.max(0, el.currentTime - 5);
                          }}
                          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-xs text-zinc-100 transition-colors hover:border-cyan-500/35"
                        >
                          <Rewind className="h-4 w-4" strokeWidth={2} aria-hidden />
                          -5s
                        </button>
                        <button
                          type="button"
                          title="+10 segundos"
                          aria-label="Avançar 10 segundos"
                          onClick={() => {
                            const el = videoRef.current;
                            if (el) el.currentTime = el.currentTime + 10;
                          }}
                          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-xs text-zinc-100 transition-colors hover:border-cyan-500/35"
                        >
                          <FastForward className="h-4 w-4" strokeWidth={2} aria-hidden />
                          +10s
                        </button>
                        <button
                          type="button"
                          onClick={() => void carregarLegenda()}
                          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-xs text-zinc-100 transition-colors hover:border-violet-500/35 hover:text-violet-100"
                        >
                          <Subtitles className="h-4 w-4" strokeWidth={2} aria-hidden />
                          Carregar Legenda
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {mediaUrl && mediaType === "pdf" ? (
                    <embed
                      key={activePath ?? mediaUrl}
                      src={mediaUrl}
                      type="application/pdf"
                      className="h-[80vh] w-full rounded-xl shadow-2xl ring-1 ring-white/10"
                    />
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>

        {isLinking ? (
          <div
            className="absolute inset-0 z-[120] flex items-stretch justify-center bg-black/65 p-4 backdrop-blur-md"
            role="presentation"
            onClick={() => setIsLinking(false)}
          >
            <div
              className="my-auto flex w-full max-w-md flex-col rounded-2xl border border-white/10 bg-[#0a0a0d]/80 p-4 shadow-2xl backdrop-blur-xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="link-submodal-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-3">
                <h3
                  id="link-submodal-title"
                  className="text-sm font-medium tracking-wide text-zinc-100"
                >
                  Vincular pasta à Estante
                </h3>
                <button
                  type="button"
                  title="Fechar"
                  aria-label="Fechar"
                  onClick={() => setIsLinking(false)}
                  className="rounded-lg border border-white/10 p-1 text-zinc-400 transition-colors hover:border-white/20 hover:text-white"
                >
                  <X className="h-4 w-4" strokeWidth={2} aria-hidden />
                </button>
              </div>
              <label className="mt-3 block text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                Buscar obra para vincular
              </label>
              <input
                type="search"
                value={linkSearchQuery}
                onChange={(e) => setLinkSearchQuery(e.target.value)}
                placeholder="Digite pelo menos 2 caracteres"
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100 outline-none ring-0 placeholder:text-zinc-600 focus:border-cyan-500/40"
                autoComplete="off"
              />
              <div className="mt-2 flex gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setSearchEngine("local");
                    setLinkFlowNotice(null);
                  }}
                  className={`${tabBtn} ${searchEngine === "local" ? tabActive : tabIdle}`}
                >
                  Minha Estante
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchEngine("tmdb");
                    setLinkFlowNotice(null);
                  }}
                  className={`${tabBtn} ${searchEngine === "tmdb" ? tabActive : tabIdle}`}
                >
                  Catálogo Global
                </button>
              </div>
              {searchEngine === "local" && !perfilAtivoId ? (
                <p className="mt-3 text-xs text-amber-300/90">
                  Nenhum perfil hunter ativo. Escolha um perfil na estante.
                </p>
              ) : null}
              {linkFlowNotice ? (
                <p className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/95">
                  {linkFlowNotice}
                </p>
              ) : null}
              <div className="mt-3 max-h-52 min-h-[4rem] overflow-y-auto rounded-xl border border-white/10 bg-black/25 backdrop-blur-sm">
                {linkSearchLoading ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-xs text-zinc-500">
                    <Loader2
                      className="h-4 w-4 animate-spin text-cyan-400/80"
                      aria-hidden
                    />
                    Buscando
                  </div>
                ) : linkSearchError ? (
                  <p className="p-3 text-xs text-red-300/90">{linkSearchError}</p>
                ) : linkSearchQuery.trim().length < 2 ? (
                  <p className="p-3 text-xs text-zinc-500">
                    {searchEngine === "local"
                      ? "Digite ao menos 2 caracteres para buscar na sua estante."
                      : "Digite ao menos 2 caracteres para buscar no TMDB (filmes e séries)."}
                  </p>
                ) : searchEngine === "local" ? (
                  linkSearchResults.length === 0 ? (
                    <p className="p-3 text-xs text-zinc-500">
                      Nenhuma obra encontrada com esse termo.
                    </p>
                  ) : (
                    <ul className="divide-y divide-white/10 p-1">
                      {linkSearchResults.map((item) => (
                        <li key={`${item.tipo_obra}-${String(item.id ?? "")}`}>
                          <div className="flex items-center justify-between gap-2 px-2 py-2">
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium text-zinc-100">
                                {item.titulo}
                              </p>
                              <p className="mt-0.5 flex items-center gap-1 text-[10px] text-zinc-500">
                                <Link2
                                  className="h-3 w-3 shrink-0 opacity-70"
                                  strokeWidth={2}
                                  aria-hidden
                                />
                                {TIPO_OBRA_LABEL_SECAO[item.tipo_obra]}
                              </p>
                            </div>
                            <button
                              type="button"
                              disabled={item.id === undefined}
                              onClick={() => vincularObraSelecionada(item)}
                              className="shrink-0 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] text-cyan-100 transition-colors hover:border-cyan-400/50 hover:bg-cyan-500/15 disabled:opacity-40"
                            >
                              Vincular
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )
                ) : linkTmdbResults.length === 0 ? (
                  <p className="p-3 text-xs text-zinc-500">
                    Nenhum resultado no catálogo global com esse termo.
                  </p>
                ) : (
                  <ul className="divide-y divide-white/10 p-1">
                    {linkTmdbResults.map((hit) => (
                      <li
                        key={`${hit.mediaType}-${hit.id}`}
                      >
                        <div className="flex items-center justify-between gap-2 px-2 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-zinc-100">
                              {hit.title}
                            </p>
                            <p className="mt-0.5 text-[10px] text-zinc-500">
                              {hit.subtitle}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setLinkFlowNotice(
                                "Por favor, adicione esta obra usando a barra de pesquisa principal do site (Omni-Search) antes de vinculá-la à pasta local."
                              );
                            }}
                            className="shrink-0 rounded-lg border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-[11px] text-violet-100 transition-colors hover:border-violet-400/50 hover:bg-violet-500/15"
                          >
                            Adicionar à Estante
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
