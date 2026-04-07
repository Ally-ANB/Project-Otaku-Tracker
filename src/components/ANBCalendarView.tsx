"use client";

import {
  fetchSeasonalAnime,
  fetchWeeklySchedule,
  getCurrentAnimeSeason,
  scheduleLocalDayOfWeek,
  tituloMedia,
  type AnilistAiringScheduleEntry,
  type AnilistScheduleMedia,
} from "@/lib/anilistSchedule";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  CalendarDays,
  ChevronsUpDown,
  Clock,
  Eye,
  EyeOff,
  Film,
  Info,
  Languages,
  Play,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const DIAS_SEMANA = [
  { id: 0, label: "Dom" },
  { id: 1, label: "Seg" },
  { id: 2, label: "Ter" },
  { id: 3, label: "Qua" },
  { id: 4, label: "Qui" },
  { id: 5, label: "Sex" },
  { id: 6, label: "Sab" },
] as const;

const SYNOPSIS_COLLAPSE_MAX_PX = 96;

type ModoExibicao = "semanal" | "temporada";

type ObraDetalheState = {
  media: AnilistScheduleMedia;
  episode?: number;
  airingAt?: number;
};

function horaLocal(airingAt: number): string {
  return new Date(airingAt * 1000).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function descricaoExibicao(raw?: string | null): string {
  const t = raw?.trim();
  if (!t) return "Sinopse indisponível.";
  return t;
}

function trailerYoutubeUrl(trailer: AnilistScheduleMedia["trailer"]): string | null {
  const id = trailer?.id?.trim();
  const site = trailer?.site?.trim().toLowerCase();
  if (!id || site !== "youtube") return null;
  return `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
}

type AnimeCardProps = {
  media: AnilistScheduleMedia;
  showNsfwGlobal: boolean;
  nsfwRevelados: number[];
  onRevealNsfw: (mediaId: number) => void;
  onOpenDetail: () => void;
  episode?: number;
  airingAt?: number;
};

function AnimeCard({
  media,
  showNsfwGlobal,
  nsfwRevelados,
  onRevealNsfw,
  onOpenDetail,
  episode,
  airingAt,
}: AnimeCardProps) {
  const capa = media.coverImage?.large?.trim();
  const titulo = tituloMedia(media);
  const adult = Boolean(media.isAdult);
  const bloqueado =
    adult && !showNsfwGlobal && !nsfwRevelados.includes(media.id);

  const handleClick = () => {
    if (bloqueado) {
      onRevealNsfw(media.id);
      return;
    }
    onOpenDetail();
  };

  const showAgenda = episode != null && airingAt != null;

  return (
    <button
      type="button"
      onClick={handleClick}
      className="group relative w-full overflow-hidden rounded-xl border border-cyan-500/15 bg-zinc-950 text-left shadow-[0_0_20px_rgba(0,0,0,0.45)] transition-transform duration-300 hover:z-[1] hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden">
        {capa ? (
          <img
            src={capa}
            alt=""
            className={`absolute inset-0 h-full w-full object-cover transition-all duration-500 group-hover:scale-[1.04] ${
              bloqueado ? "blur-xl saturate-50" : ""
            }`}
            loading="lazy"
          />
        ) : (
          <div
            className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950"
            aria-hidden
          />
        )}
        {bloqueado ? (
          <div
            className="absolute inset-0 z-[2] flex flex-col items-center justify-center gap-2 bg-black/40 px-3"
            aria-hidden
          >
            <EyeOff className="h-8 w-8 text-zinc-200" strokeWidth={2} />
            <span className="text-center text-[9px] font-black uppercase tracking-[0.2em] text-zinc-100">
              Conteúdo +18
            </span>
          </div>
        ) : null}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent"
          aria-hidden
        />
        {showAgenda && !bloqueado ? (
          <div className="absolute top-2 left-2 z-[1] flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-md border border-cyan-500/35 bg-black/55 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-cyan-100 backdrop-blur-sm">
              <Clock className="h-3 w-3 shrink-0" strokeWidth={2.5} aria-hidden />
              {horaLocal(airingAt)}
            </span>
            <span className="rounded-md border border-white/20 bg-black/50 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-white backdrop-blur-sm">
              Ep {episode}
            </span>
          </div>
        ) : null}
        {!showAgenda && media.format && !bloqueado ? (
          <div className="absolute top-2 left-2 z-[1]">
            <span className="rounded-md border border-white/20 bg-black/50 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-white/90 backdrop-blur-sm">
              {media.format}
            </span>
          </div>
        ) : null}
        <div className="absolute right-0 bottom-0 left-0 z-[1] p-2.5 pt-8">
          <h3
            className="line-clamp-1 text-[10px] font-bold leading-tight text-white drop-shadow-md md:text-[11px]"
            title={titulo}
          >
            {titulo}
          </h3>
        </div>
      </div>
    </button>
  );
}

export default function ANBCalendarView() {
  const [modoExibicao, setModoExibicao] = useState<ModoExibicao>("semanal");
  const [scheduleData, setScheduleData] = useState<AnilistAiringScheduleEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchOk, setFetchOk] = useState(true);
  const [diaSelecionado, setDiaSelecionado] = useState(() => new Date().getDay());

  const [seasonalData, setSeasonalData] = useState<AnilistScheduleMedia[]>([]);
  const [seasonalLoading, setSeasonalLoading] = useState(false);
  const [seasonalOk, setSeasonalOk] = useState(true);

  const [obraDetalhe, setObraDetalhe] = useState<ObraDetalheState | null>(null);
  const [nsfwRevelados, setNsfwRevelados] = useState<number[]>([]);

  const [showNsfwGlobal, setShowNsfwGlobal] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("anb_show_nsfw") === "true";
  });

  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);
  const [synopsisTranslated, setSynopsisTranslated] = useState<string | null>(null);
  const [synopsisPreferTranslated, setSynopsisPreferTranslated] = useState(false);
  const [translateLoading, setTranslateLoading] = useState(false);

  const synopsisMeasureRef = useRef<HTMLParagraphElement>(null);
  const [synopsisNeedsReadMore, setSynopsisNeedsReadMore] = useState(false);

  const indiceHoje = new Date().getDay();

  useEffect(() => {
    localStorage.setItem("anb_show_nsfw", showNsfwGlobal ? "true" : "false");
  }, [showNsfwGlobal]);

  useEffect(() => {
    setNsfwRevelados([]);
  }, [modoExibicao, diaSelecionado]);

  useEffect(() => {
    if (obraDetalhe === null) {
      setIsSynopsisExpanded(false);
      setSynopsisTranslated(null);
      setSynopsisPreferTranslated(false);
      setTranslateLoading(false);
      setSynopsisNeedsReadMore(false);
    }
  }, [obraDetalhe]);

  useEffect(() => {
    const id = obraDetalhe?.media.id;
    if (id == null) return;
    setIsSynopsisExpanded(false);
    setSynopsisTranslated(null);
    setSynopsisPreferTranslated(false);
    setTranslateLoading(false);
    setSynopsisNeedsReadMore(false);
  }, [obraDetalhe?.media.id]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    void fetchWeeklySchedule().then((result) => {
      if (cancelled) return;
      setScheduleData(result.schedules);
      setFetchOk(result.ok);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (modoExibicao !== "temporada") return;
    let cancelled = false;
    setSeasonalLoading(true);
    const { season, year } = getCurrentAnimeSeason();
    void fetchSeasonalAnime(season, year).then((result) => {
      if (cancelled) return;
      setSeasonalData(result.media);
      setSeasonalOk(result.ok);
      setSeasonalLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [modoExibicao]);

  const porDia = useMemo(() => {
    const map = new Map<number, AnilistAiringScheduleEntry[]>();
    for (const d of DIAS_SEMANA) {
      map.set(d.id, []);
    }
    for (const row of scheduleData) {
      const dow = scheduleLocalDayOfWeek(row.airingAt);
      const bucket = map.get(dow);
      if (bucket) bucket.push(row);
    }
    for (const d of DIAS_SEMANA) {
      const arr = map.get(d.id);
      if (arr) arr.sort((a, b) => a.airingAt - b.airingAt);
    }
    return map;
  }, [scheduleData]);

  const itensDia = porDia.get(diaSelecionado) ?? [];

  const revealNsfw = useCallback((mediaId: number) => {
    setNsfwRevelados((prev) => (prev.includes(mediaId) ? prev : [...prev, mediaId]));
  }, []);

  const fecharModal = useCallback(() => setObraDetalhe(null), []);

  const displayedSynopsis = useMemo(() => {
    if (!obraDetalhe) return "";
    if (synopsisPreferTranslated && synopsisTranslated != null) {
      return synopsisTranslated;
    }
    return descricaoExibicao(obraDetalhe.media.description);
  }, [obraDetalhe, synopsisPreferTranslated, synopsisTranslated]);

  const rawSynopsisTrim = obraDetalhe?.media.description?.trim() ?? "";
  const canTranslateSynopsis = rawSynopsisTrim.length > 0;

  useLayoutEffect(() => {
    if (!obraDetalhe) return;
    const el = synopsisMeasureRef.current;
    if (!el) return;
    setSynopsisNeedsReadMore(el.scrollHeight > SYNOPSIS_COLLAPSE_MAX_PX);
  }, [obraDetalhe, displayedSynopsis]);

  const handleTraduzirSinopse = useCallback(async () => {
    if (!obraDetalhe || !canTranslateSynopsis) return;
    if (synopsisTranslated === null) {
      setTranslateLoading(true);
      try {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: rawSynopsisTrim }),
        });
        const data = (await res.json()) as { translatedText?: string };
        if (res.ok && typeof data.translatedText === "string") {
          setSynopsisTranslated(data.translatedText);
          setSynopsisPreferTranslated(true);
        }
      } catch {
        /* silencioso */
      } finally {
        setTranslateLoading(false);
      }
    } else {
      setSynopsisPreferTranslated((v) => !v);
    }
  }, [obraDetalhe, canTranslateSynopsis, synopsisTranslated, rawSynopsisTrim]);

  useEffect(() => {
    if (!obraDetalhe) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") fecharModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [obraDetalhe, fecharModal]);

  const trailerUrl = obraDetalhe ? trailerYoutubeUrl(obraDetalhe.media.trailer) : null;

  return (
    <div className="flex flex-col gap-5">
      <section
        className="rounded-2xl border border-cyan-500/10 bg-[#060607]/80 p-5 shadow-[inset_0_1px_0_rgba(34,211,238,0.06)] backdrop-blur-md"
        aria-labelledby="anb-calendario-titulo"
      >
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-500/25 bg-cyan-500/10 text-cyan-200 shadow-[0_0_18px_rgba(34,211,238,0.2)]">
            <CalendarDays className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="anb-calendario-titulo"
              className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-200 md:text-xs"
            >
              Calendário de Lançamentos
            </h2>
            <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-zinc-600">
              AniList · semana local ou temporada em exibição
            </p>
          </div>
        </div>

        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
          <div
            role="tablist"
            aria-label="Modo de exibição"
            className="flex min-w-0 flex-1 flex-wrap gap-2 rounded-2xl border border-cyan-500/15 bg-black/25 p-1.5 backdrop-blur-sm lg:max-w-2xl"
          >
            <button
              type="button"
              role="tab"
              aria-selected={modoExibicao === "semanal"}
              onClick={() => setModoExibicao("semanal")}
              className={`min-w-0 flex-1 rounded-xl px-3 py-2.5 text-[9px] font-black uppercase tracking-widest transition-all sm:flex-none sm:px-5 ${
                modoExibicao === "semanal"
                  ? "border border-cyan-400/50 bg-cyan-500/20 text-cyan-100 shadow-[0_0_14px_rgba(34,211,238,0.25)]"
                  : "border border-transparent text-zinc-500 hover:text-cyan-200/90"
              }`}
            >
              Calendário Semanal
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={modoExibicao === "temporada"}
              onClick={() => setModoExibicao("temporada")}
              className={`min-w-0 flex-1 rounded-xl px-3 py-2.5 text-[9px] font-black uppercase tracking-widest transition-all sm:flex-none sm:px-5 ${
                modoExibicao === "temporada"
                  ? "border border-cyan-400/50 bg-cyan-500/20 text-cyan-100 shadow-[0_0_14px_rgba(34,211,238,0.25)]"
                  : "border border-transparent text-zinc-500 hover:text-cyan-200/90"
              }`}
            >
              Programação da Temporada
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowNsfwGlobal((v) => !v)}
            aria-pressed={showNsfwGlobal}
            className={`inline-flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-2.5 text-[9px] font-black uppercase tracking-widest transition-all ${
              showNsfwGlobal
                ? "border-cyan-400/55 bg-cyan-500/15 text-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.35)]"
                : "border-white/10 bg-white/[0.04] text-zinc-500 hover:border-cyan-500/30 hover:text-cyan-200/85"
            }`}
          >
            {showNsfwGlobal ? (
              <Eye className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden />
            ) : (
              <EyeOff className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden />
            )}
            Mostrar +18
          </button>
        </div>

        {modoExibicao === "semanal" ? (
          <div
            role="tablist"
            aria-label="Dias da semana"
            className="-mx-1 mb-6 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {DIAS_SEMANA.map((d) => {
              const ativo = diaSelecionado === d.id;
              const ehHoje = indiceHoje === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  role="tab"
                  aria-selected={ativo}
                  onClick={() => setDiaSelecionado(d.id)}
                  className={`shrink-0 rounded-xl border px-3 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                    ativo
                      ? "border-cyan-400/70 bg-cyan-500/20 text-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.45)] ring-1 ring-cyan-400/35"
                      : ehHoje
                        ? "border-cyan-400/40 bg-cyan-500/[0.08] text-cyan-200/90 hover:border-cyan-400/55"
                        : "border-white/10 bg-white/[0.04] text-zinc-500 hover:border-cyan-500/30 hover:text-cyan-200/80"
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="min-h-[220px]" aria-live="polite">
          {modoExibicao === "semanal" ? (
            <>
              {isLoading ? (
                <div className="grid min-h-[220px] place-items-center rounded-xl border border-dashed border-cyan-500/15 bg-black/30 p-8 backdrop-blur-sm">
                  <p className="max-w-sm text-center text-[10px] font-semibold uppercase tracking-[0.25em] text-zinc-500">
                    Buscando lançamentos da semana...
                  </p>
                </div>
              ) : !fetchOk ? (
                <div className="grid min-h-[220px] place-items-center rounded-xl border border-white/10 bg-white/[0.02] p-8">
                  <div className="flex max-w-md flex-col items-center gap-3 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-700/60 bg-zinc-900/50 text-zinc-500">
                      <Film className="h-6 w-6" strokeWidth={2} aria-hidden />
                    </div>
                    <p className="text-[11px] font-semibold leading-relaxed text-zinc-400">
                      Não foi possível carregar os lançamentos. Verifique sua conexão e tente de novo
                      em instantes.
                    </p>
                  </div>
                </div>
              ) : itensDia.length === 0 ? (
                <div className="grid min-h-[220px] place-items-center rounded-xl border border-white/10 bg-white/[0.02] p-8">
                  <p className="max-w-sm text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Nenhum episódio agendado neste dia na fonte pública.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4 lg:grid-cols-5">
                  {itensDia.map((entry) => (
                    <AnimeCard
                      key={entry.id}
                      media={entry.media}
                      showNsfwGlobal={showNsfwGlobal}
                      episode={entry.episode}
                      airingAt={entry.airingAt}
                      nsfwRevelados={nsfwRevelados}
                      onRevealNsfw={revealNsfw}
                      onOpenDetail={() =>
                        setObraDetalhe({
                          media: entry.media,
                          episode: entry.episode,
                          airingAt: entry.airingAt,
                        })
                      }
                    />
                  ))}
                </div>
              )}
            </>
          ) : seasonalLoading ? (
            <div className="grid min-h-[220px] place-items-center rounded-xl border border-dashed border-cyan-500/15 bg-black/30 p-8 backdrop-blur-sm">
              <p className="max-w-sm text-center text-[10px] font-semibold uppercase tracking-[0.25em] text-zinc-500">
                Carregando temporada...
              </p>
            </div>
          ) : !seasonalOk ? (
            <div className="grid min-h-[220px] place-items-center rounded-xl border border-white/10 bg-white/[0.02] p-8">
              <div className="flex max-w-md flex-col items-center gap-3 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-700/60 bg-zinc-900/50 text-zinc-500">
                  <Film className="h-6 w-6" strokeWidth={2} aria-hidden />
                </div>
                <p className="text-[11px] font-semibold leading-relaxed text-zinc-400">
                  Não foi possível carregar a temporada. Tente novamente em instantes.
                </p>
              </div>
            </div>
          ) : seasonalData.length === 0 ? (
            <div className="grid min-h-[220px] place-items-center rounded-xl border border-white/10 bg-white/[0.02] p-8">
              <p className="max-w-sm text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Nenhum título encontrado para esta temporada.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4 lg:grid-cols-5">
              {seasonalData.map((media) => (
                <AnimeCard
                  key={media.id}
                  media={media}
                  showNsfwGlobal={showNsfwGlobal}
                  nsfwRevelados={nsfwRevelados}
                  onRevealNsfw={revealNsfw}
                  onOpenDetail={() => setObraDetalhe({ media })}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <AnimatePresence>
        {obraDetalhe ? (
          <motion.div
            key="anb-cal-modal"
            role="presentation"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <button
              type="button"
              aria-label="Fechar"
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={fecharModal}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="anb-cal-modal-titulo"
              className="relative z-[1] max-h-[min(90vh,720px)] w-full max-w-3xl overflow-hidden rounded-2xl border border-cyan-500/20 bg-[#08080a]/90 shadow-[0_0_40px_rgba(34,211,238,0.12)] backdrop-blur-xl"
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={fecharModal}
                className="absolute top-3 right-3 z-[2] flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-zinc-300 transition-colors hover:border-cyan-500/40 hover:text-cyan-100"
                aria-label="Fechar detalhes"
              >
                <X className="h-4 w-4" strokeWidth={2.5} aria-hidden />
              </button>

              <div className="max-h-[min(90vh,720px)] overflow-y-auto p-5 sm:p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:gap-6">
                  <div className="mx-auto w-[min(100%,11rem)] shrink-0 sm:mx-0">
                    <div className="overflow-hidden rounded-xl border border-cyan-500/20 bg-zinc-950 shadow-lg">
                      {obraDetalhe.media.coverImage?.large?.trim() ? (
                        <img
                          src={obraDetalhe.media.coverImage.large.trim()}
                          alt=""
                          className="aspect-[2/3] w-full object-cover"
                        />
                      ) : (
                        <div className="flex aspect-[2/3] w-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950 text-zinc-600">
                          <Film className="h-10 w-10" strokeWidth={1.5} aria-hidden />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1 space-y-4">
                    <div>
                      <h3
                        id="anb-cal-modal-titulo"
                        className="pr-10 text-lg font-black leading-tight tracking-tight text-zinc-100 md:text-xl"
                      >
                        {tituloMedia(obraDetalhe.media)}
                      </h3>
                      {obraDetalhe.episode != null && obraDetalhe.airingAt != null ? (
                        <p className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                          <span className="inline-flex items-center gap-1 text-cyan-400/90">
                            <Clock className="h-3.5 w-3.5" aria-hidden />
                            {horaLocal(obraDetalhe.airingAt)}
                          </span>
                          <span className="text-zinc-600">·</span>
                          <span>Episódio {obraDetalhe.episode}</span>
                        </p>
                      ) : null}
                    </div>

                    {(obraDetalhe.media.genres?.length ?? 0) > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {(obraDetalhe.media.genres ?? []).filter(Boolean).map((g) => (
                          <span
                            key={g}
                            className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-cyan-100/95"
                          >
                            {g}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-sm">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">
                          <Info className="h-3.5 w-3.5 shrink-0 text-cyan-500/80" aria-hidden />
                          Sinopse
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleTraduzirSinopse()}
                          disabled={!canTranslateSynopsis || translateLoading}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest text-cyan-100/95 transition-colors hover:border-cyan-400/45 hover:bg-cyan-500/15 disabled:pointer-events-none disabled:opacity-40"
                        >
                          <Languages className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
                          <Bot className="h-3 w-3 shrink-0 opacity-70" strokeWidth={2.25} aria-hidden />
                          {translateLoading
                            ? "…"
                            : synopsisTranslated != null && synopsisPreferTranslated
                              ? "Original"
                              : synopsisTranslated != null
                                ? "Tradução"
                                : "Traduzir"}
                        </button>
                      </div>

                      <div className="relative">
                        <p
                          ref={synopsisMeasureRef}
                          className="pointer-events-none invisible absolute top-0 left-0 -z-10 w-full text-[11px] leading-relaxed break-words whitespace-pre-wrap text-zinc-400"
                          aria-hidden
                        >
                          {displayedSynopsis}
                        </p>
                        <p
                          className={`text-[11px] leading-relaxed text-zinc-400 ${
                            synopsisNeedsReadMore && !isSynopsisExpanded ? "line-clamp-4" : ""
                          }`}
                        >
                          {displayedSynopsis}
                        </p>
                        {synopsisNeedsReadMore ? (
                          <button
                            type="button"
                            onClick={() => setIsSynopsisExpanded((v) => !v)}
                            className="mt-2 inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-cyan-400/90 transition-colors hover:text-cyan-200"
                          >
                            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
                            {isSynopsisExpanded ? "Ler menos" : "Ler mais"}
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {trailerUrl ? (
                      <a
                        href={trailerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/35 bg-cyan-500/15 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-cyan-100 transition-colors hover:border-cyan-400/55 hover:bg-cyan-500/25"
                      >
                        <Play className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden />
                        Ver Trailer
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
