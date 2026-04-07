"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal } from "lucide-react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
  type RefObject,
} from "react";
import MangaCard from "@/components/ui/MangaCard";
import type { AbaPrincipal, Manga } from "@/types/hunter_registry";
import { anexarTipo, type ObraComTipo } from "./soraUtils";

type NavMode = "HOME" | "ESTANTE";

export type SoraHomeViewProps = {
  navMode: NavMode;
  abaFiltro: AbaPrincipal | null;
  mangas: Manga[];
  animes: Manga[];
  filmes: Manga[];
  series: Manga[];
  jogos: Manga[];
  musicas: Manga[];
  livros: Manga[];
  aura: { text: string; bg: string; border?: string };
  onAbrirObra: (obra: ObraComTipo) => void;
  atualizarCapitulo: (manga: Manga, novo: number) => Promise<void>;
  deletarManga: (id: number) => Promise<void>;
  mudarStatusManual: (id: number, status: string) => Promise<void>;
};

const STATUS_CAROUSEL_LIMIT = 15;
const DRAG_SCROLL_THRESHOLD_PX = 5;
const DRAG_SCROLL_SPEED_MULT = 1.5;

function capaSrc(m: Manga): string {
  return m.capa_url?.trim() || m.capa || "";
}

type ChipProp = {
  id: string;
  label: string;
  active: boolean;
  onClick: () => void;
};

function NeonChips({ chips }: { chips: ChipProp[] }) {
  return (
    <div className="mb-3 flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={c.onClick}
          aria-pressed={c.active}
          className={`rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-widest transition-all ${
            c.active
              ? "border-cyan-400/60 bg-cyan-500/20 text-cyan-100 shadow-[0_0_12px_rgba(34,211,238,0.35)]"
              : "border-white/10 bg-white/[0.04] text-zinc-500 hover:border-cyan-500/35 hover:text-cyan-200/90"
          }`}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

function SectionHeader({
  title,
  onPrev,
  onNext,
  trailing,
}: {
  title: string;
  onPrev: () => void;
  onNext: () => void;
  trailing?: ReactNode;
}) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <h2 className="min-w-0 shrink text-[10px] font-black uppercase tracking-[0.2em] text-zinc-200">
        {title}
      </h2>
      <div className="flex shrink-0 items-center gap-1.5">
        {trailing}
        <button
          type="button"
          onClick={onPrev}
          className="rounded-lg border border-cyan-500/25 bg-white/[0.04] p-1.5 text-cyan-200/90 transition-colors hover:border-cyan-400/45 hover:bg-cyan-500/10"
          aria-label={`Anterior: ${title}`}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onNext}
          className="rounded-lg border border-cyan-500/25 bg-white/[0.04] p-1.5 text-cyan-200/90 transition-colors hover:border-cyan-400/45 hover:bg-cyan-500/10"
          aria-label={`Próximo: ${title}`}
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

function useHorizontalScroll(amount = 300) {
  const ref = useRef<HTMLDivElement>(null);
  const prev = useCallback(() => {
    ref.current?.scrollBy({ left: -amount, behavior: "smooth" });
  }, [amount]);
  const next = useCallback(() => {
    ref.current?.scrollBy({ left: amount, behavior: "smooth" });
  }, [amount]);
  return { ref, prev, next };
}

function SpotlightCarousel({
  obras,
  onPick,
  scrollRef,
}: {
  obras: ObraComTipo[];
  onPick: (o: ObraComTipo) => void;
  scrollRef: RefObject<HTMLDivElement | null>;
}) {
  const [focus, setFocus] = useState(0);
  const innerRef = useRef<HTMLDivElement>(null);
  const suppressClickFav = useRef(false);
  const isDraggingFav = useRef(false);
  const dragRefFav = useRef<{
    startX: number;
    startScroll: number;
    hasDragged: boolean;
  } | null>(null);

  const endDragFav = useCallback(() => {
    if (!isDraggingFav.current) return;
    isDraggingFav.current = false;
    const d = dragRefFav.current;
    dragRefFav.current = null;
    if (d?.hasDragged) suppressClickFav.current = true;
  }, []);

  const onFavMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const el = innerRef.current;
    if (!el) return;
    suppressClickFav.current = false;
    isDraggingFav.current = true;
    dragRefFav.current = {
      startX: e.pageX,
      startScroll: el.scrollLeft,
      hasDragged: false,
    };
  };

  const onFavMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = innerRef.current;
    const d = dragRefFav.current;
    if (!el || !d || !isDraggingFav.current) return;
    const walk = (e.pageX - d.startX) * DRAG_SCROLL_SPEED_MULT;
    if (Math.abs(walk) > DRAG_SCROLL_THRESHOLD_PX) {
      d.hasDragged = true;
      e.preventDefault();
      e.stopPropagation();
    }
    el.scrollLeft = d.startScroll - walk;
  };

  const onFavMouseUp = () => {
    endDragFav();
  };

  const onFavMouseLeave = () => {
    endDragFav();
  };

  const onFavClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!suppressClickFav.current) return;
    e.preventDefault();
    e.stopPropagation();
    suppressClickFav.current = false;
  };

  const onFavDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const setFavScrollRefs = (node: HTMLDivElement | null) => {
    innerRef.current = node;
    mergeRefs(node, scrollRef);
  };

  const recalcFocus = useCallback(() => {
    const el = scrollRef.current;
    if (!el || obras.length === 0) return;
    const cx = el.getBoundingClientRect().left + el.clientWidth / 2;
    let best = 0;
    let bestD = Infinity;
    Array.from(el.children).forEach((child, i) => {
      const r = (child as HTMLElement).getBoundingClientRect();
      const mid = r.left + r.width / 2;
      const d = Math.abs(mid - cx);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    setFocus(best);
  }, [scrollRef, obras.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", recalcFocus, { passive: true });
    recalcFocus();
    return () => el.removeEventListener("scroll", recalcFocus);
  }, [scrollRef, recalcFocus, obras.length]);

  if (obras.length === 0) {
    return (
      <p className="rounded-xl border border-white/10 bg-white/[0.03] py-8 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-600">
        Nenhuma obra favorita ainda
      </p>
    );
  }

  return (
    <div
      ref={setFavScrollRefs}
      onMouseDown={onFavMouseDown}
      onMouseMove={onFavMouseMove}
      onMouseUp={onFavMouseUp}
      onMouseLeave={onFavMouseLeave}
      onClickCapture={onFavClickCapture}
      onDragStart={onFavDragStart}
      onDragStartCapture={onFavDragStart}
      className="flex cursor-grab select-none gap-4 overflow-x-auto pb-2 active:cursor-grabbing [-ms-overflow-style:none] [scrollbar-width:none] [&_*]:select-none [&::-webkit-scrollbar]:hidden"
      style={{ scrollSnapType: "x mandatory" }}
    >
      {obras.map((obra, i) => {
        const central = i === focus;
        const dist = Math.abs(i - focus);
        const scale = central ? 1.06 : Math.max(0.82, 0.94 - dist * 0.05);
        const opacity = central ? 1 : Math.max(0.35, 0.72 - dist * 0.12);
        return (
          <button
            key={`${obra.tipoObra}-${obra.id}`}
            type="button"
            onClick={() => onPick(obra)}
            style={{
              scrollSnapAlign: "center",
              transform: `scale(${scale})`,
              opacity,
            }}
            className={`group relative mt-2 mb-4 w-[min(42vw,11rem)] shrink-0 origin-center transition-[transform,opacity] duration-300 ease-out ${
              central
                ? "z-10 shadow-[0_0_32px_rgba(34,211,238,0.35)] ring-2 ring-cyan-400/60"
                : "ring-1 ring-white/10"
            } rounded-2xl`}
          >
            <div
              className={`overflow-hidden rounded-2xl border ${
                central ? "border-cyan-400/50" : "border-white/10"
              } bg-black/40 backdrop-blur-sm`}
            >
              <img
                src={capaSrc(obra)}
                alt=""
                className="aspect-[2/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </div>
            {central ? (
              <div
                className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-t from-cyan-500/10 via-transparent to-cyan-400/5"
                aria-hidden
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function mergeRefs<T>(node: T | null, a: React.Ref<T> | null | undefined) {
  if (typeof a === "function") a(node);
  else if (a && "current" in a) (a as MutableRefObject<T | null>).current = node;
}

const StatusMangaCarousel = forwardRef<
  HTMLDivElement,
  {
    obras: ObraComTipo[];
    aura: SoraHomeViewProps["aura"];
    atualizarCapitulo: SoraHomeViewProps["atualizarCapitulo"];
    deletarManga: SoraHomeViewProps["deletarManga"];
    mudarStatusManual: SoraHomeViewProps["mudarStatusManual"];
    onAbrirObra: (obra: ObraComTipo) => void;
  }
>(function StatusMangaCarousel(
  { obras, aura, atualizarCapitulo, deletarManga, mudarStatusManual, onAbrirObra },
  ref
) {
  const innerRef = useRef<HTMLDivElement>(null);
  const suppressClick = useRef(false);
  const isDragging = useRef(false);
  const dragRef = useRef<{
    startX: number;
    startScroll: number;
    hasDragged: boolean;
  } | null>(null);

  const endDrag = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const d = dragRef.current;
    dragRef.current = null;
    if (d?.hasDragged) suppressClick.current = true;
  }, []);

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const el = innerRef.current;
    if (!el) return;
    suppressClick.current = false;
    isDragging.current = true;
    dragRef.current = {
      startX: e.pageX,
      startScroll: el.scrollLeft,
      hasDragged: false,
    };
  };

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = innerRef.current;
    const d = dragRef.current;
    if (!el || !d || !isDragging.current) return;
    const walk = (e.pageX - d.startX) * DRAG_SCROLL_SPEED_MULT;
    if (Math.abs(walk) > DRAG_SCROLL_THRESHOLD_PX) {
      d.hasDragged = true;
      e.preventDefault();
      e.stopPropagation();
    }
    el.scrollLeft = d.startScroll - walk;
  };

  const onMouseUp = () => {
    endDrag();
  };

  const onMouseLeave = () => {
    endDrag();
  };

  const onClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!suppressClick.current) return;
    e.preventDefault();
    e.stopPropagation();
    suppressClick.current = false;
  };

  const onDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const setRefs = (node: HTMLDivElement | null) => {
    innerRef.current = node;
    mergeRefs(node, ref);
  };

  if (obras.length === 0) {
    return (
      <p className="rounded-xl border border-white/10 bg-white/[0.03] py-6 text-center text-[9px] font-bold uppercase tracking-widest text-zinc-600">
        Vazio
      </p>
    );
  }

  return (
    <div className="overflow-visible pb-6">
      <div
        ref={setRefs}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onClickCapture={onClickCapture}
        onDragStart={onDragStart}
        onDragStartCapture={onDragStart}
        className="flex cursor-grab select-none gap-4 overflow-x-auto overflow-y-visible pb-2 active:cursor-grabbing [-ms-overflow-style:none] [scrollbar-width:none] [&_*]:select-none [&::-webkit-scrollbar]:hidden"
      >
        {obras.map((obra) => (
          <div
            key={`${obra.tipoObra}-${obra.id}`}
            className="w-[min(42vw,11rem)] shrink-0 overflow-visible sm:w-[11.25rem]"
          >
            <MangaCard
              manga={obra}
              aura={aura}
              abaPrincipal={obra.tipoObra}
              atualizarCapitulo={atualizarCapitulo}
              deletarManga={deletarManga}
              mudarStatusManual={mudarStatusManual}
              abrirDetalhes={() => onAbrirObra(obra)}
            />
          </div>
        ))}
      </div>
    </div>
  );
});

function CarouselSection({
  title,
  chips,
  children,
  scrollPrev,
  scrollNext,
  sectionClassName = "",
  headerTrailing,
}: {
  title: string;
  chips?: ReactNode;
  children: ReactNode;
  scrollPrev: () => void;
  scrollNext: () => void;
  sectionClassName?: string;
  headerTrailing?: ReactNode;
}) {
  return (
    <motion.section
      layout
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className={`rounded-2xl border border-cyan-500/10 bg-[#060607]/80 p-4 shadow-[inset_0_1px_0_rgba(34,211,238,0.06)] backdrop-blur-md ${sectionClassName}`}
    >
      <SectionHeader title={title} onPrev={scrollPrev} onNext={scrollNext} trailing={headerTrailing} />
      {chips}
      {children}
    </motion.section>
  );
}

function filtrarPorTipo(lista: ObraComTipo[], tipo: AbaPrincipal | null): ObraComTipo[] {
  if (!tipo) return lista;
  return lista.filter((o) => o.tipoObra === tipo);
}

type FiltroFormatoId = "todos" | "tv" | "filme" | "ova" | "webtoon" | "manga" | "livro";

function textoObraParaHeuristica(o: ObraComTipo): string {
  return `${o.sinopse ?? ""} ${o.titulo ?? ""}`.toLowerCase();
}

function obraPassaFiltroFormato(o: ObraComTipo, formato: FiltroFormatoId): boolean {
  if (formato === "todos") return true;
  const t = o.tipoObra;
  const s = textoObraParaHeuristica(o);
  switch (formato) {
    case "tv":
      return t === "ANIME" || t === "SERIE";
    case "filme":
      return t === "FILME";
    case "ova":
      return t === "ANIME" && /\bova\b|original video animation/i.test(s);
    case "webtoon":
      return (
        t === "MANGA" &&
        /webtoon|manhwa|manhua|web comic|webcomic/i.test(s)
      );
    case "manga":
      return (
        t === "MANGA" &&
        !/webtoon|manhwa|manhua|web comic|webcomic/i.test(s)
      );
    case "livro":
      return t === "LIVRO";
    default:
      return true;
  }
}

type FiltroOrdenacaoId = "recentes" | "alfabetica" | "maior_nota" | "maior_progresso";

function progressoFracao(o: Manga): number {
  const total = Math.max(o.total_capitulos ?? 0, 1);
  return o.capitulo_atual / total;
}

function ordenarObras(lista: ObraComTipo[], ord: FiltroOrdenacaoId): ObraComTipo[] {
  const out = [...lista];
  switch (ord) {
    case "recentes":
      out.sort((a, b) => {
        const ta = Date.parse(a.ultima_leitura) || 0;
        const tb = Date.parse(b.ultima_leitura) || 0;
        if (tb !== ta) return tb - ta;
        return b.id - a.id;
      });
      break;
    case "alfabetica":
      out.sort((a, b) => a.titulo.localeCompare(b.titulo, "pt", { sensitivity: "base" }));
      break;
    case "maior_nota":
      out.sort((a, b) => (b.nota_pessoal ?? 0) - (a.nota_pessoal ?? 0));
      break;
    case "maior_progresso":
      out.sort((a, b) => progressoFracao(b) - progressoFracao(a));
      break;
    default:
      break;
  }
  return out;
}

type StatusTabId = "TODOS" | "PROGRESSO" | "COMPLETOS" | "PLANEJO" | "PAUSADOS" | "DROPADOS";

function labelAbaProgresso(aba: AbaPrincipal | null): string {
  if (!aba) return "LENDO";
  if (aba === "MANGA" || aba === "LIVRO") return "LENDO";
  if (aba === "ANIME" || aba === "FILME" || aba === "SERIE") return "ASSISTINDO";
  if (aba === "JOGO") return "JOGANDO";
  return "OUVINDO";
}

export default function SoraHomeView({
  navMode,
  abaFiltro,
  mangas,
  animes,
  filmes,
  series,
  jogos,
  musicas,
  livros,
  aura,
  onAbrirObra,
  atualizarCapitulo,
  deletarManga,
  mudarStatusManual,
}: SoraHomeViewProps) {
  const universo = useMemo(() => {
    return [
      ...anexarTipo(mangas, "MANGA"),
      ...anexarTipo(animes, "ANIME"),
      ...anexarTipo(filmes, "FILME"),
      ...anexarTipo(series, "SERIE"),
      ...anexarTipo(jogos, "JOGO"),
      ...anexarTipo(musicas, "MUSICA"),
      ...anexarTipo(livros, "LIVRO"),
    ];
  }, [mangas, animes, filmes, series, jogos, musicas, livros]);

  const escopo = useMemo(
    () => filtrarPorTipo(universo, navMode === "HOME" ? null : abaFiltro),
    [universo, navMode, abaFiltro]
  );

  const [statusTab, setStatusTab] = useState<StatusTabId>("TODOS");
  const [isGridExpanded, setIsGridExpanded] = useState(false);
  const [buscaEstante, setBuscaEstante] = useState("");
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [filtroOrdenacao, setFiltroOrdenacao] =
    useState<FiltroOrdenacaoId>("recentes");
  const [filtroFormato, setFiltroFormato] = useState<FiltroFormatoId>("todos");

  const escopoFiltradoBusca = useMemo(() => {
    const q = buscaEstante.trim().toLowerCase();
    if (!q) return escopo;
    return escopo.filter((o) => o.titulo.toLowerCase().includes(q));
  }, [escopo, buscaEstante]);

  const escopoComFiltrosGlobais = useMemo(() => {
    return escopoFiltradoBusca.filter((o) => obraPassaFiltroFormato(o, filtroFormato));
  }, [escopoFiltradoBusca, filtroFormato]);

  const favoritas = useMemo(
    () =>
      ordenarObras(
        escopoComFiltrosGlobais.filter((o) => o.favorito),
        filtroOrdenacao
      ),
    [escopoComFiltrosGlobais, filtroOrdenacao]
  );

  const progressoLabel = labelAbaProgresso(navMode === "HOME" ? null : abaFiltro);

  const obrasPorStatusTab = useMemo(() => {
    const base = escopoComFiltrosGlobais;
    let filtrado: ObraComTipo[];
    switch (statusTab) {
      case "TODOS":
        filtrado = base;
        break;
      case "PROGRESSO":
        filtrado = base.filter((o) => o.status === "Lendo");
        break;
      case "COMPLETOS":
        filtrado = base.filter((o) => o.status === "Completos");
        break;
      case "PLANEJO":
        filtrado = base.filter((o) => o.status === "Planejo Ler");
        break;
      case "PAUSADOS":
        filtrado = base.filter((o) => o.status === "Pausados");
        break;
      case "DROPADOS":
        filtrado = base.filter((o) => o.status === "Dropados");
        break;
      default:
        filtrado = base;
    }
    return ordenarObras(filtrado, filtroOrdenacao);
  }, [escopoComFiltrosGlobais, statusTab, filtroOrdenacao]);

  const obrasStatusCarousel = useMemo(
    () => obrasPorStatusTab.slice(0, STATUS_CAROUSEL_LIMIT),
    [obrasPorStatusTab]
  );
  const obrasStatusGridRest = useMemo(
    () => obrasPorStatusTab.slice(STATUS_CAROUSEL_LIMIT),
    [obrasPorStatusTab]
  );
  const mostrarBotaoExpandir = obrasPorStatusTab.length > STATUS_CAROUSEL_LIMIT;

  useEffect(() => {
    if (!mostrarBotaoExpandir) setIsGridExpanded(false);
  }, [mostrarBotaoExpandir]);

  useEffect(() => {
    if (isGridExpanded && obrasStatusGridRest.length === 0) setIsGridExpanded(false);
  }, [isGridExpanded, obrasStatusGridRest.length, statusTab]);

  const botaoBusca = (
    <button
      type="button"
      title="Pesquisar na estante"
      aria-label="Pesquisar na estante"
      aria-expanded={buscaAberta}
      onClick={() => setBuscaAberta((v) => !v)}
      className={`rounded-lg border p-1.5 transition-all ${
        buscaAberta
          ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-100 shadow-[0_0_12px_rgba(34,211,238,0.25)]"
          : "border-cyan-500/25 bg-white/[0.04] text-cyan-200/90 hover:border-cyan-400/45 hover:bg-cyan-500/10"
      }`}
    >
      <Search className="h-4 w-4" strokeWidth={2.25} aria-hidden />
    </button>
  );

  const filtrosAtivos =
    filtroOrdenacao !== "recentes" || filtroFormato !== "todos";

  const limparFiltros = useCallback(() => {
    setFiltroOrdenacao("recentes");
    setFiltroFormato("todos");
  }, []);

  const opcoesOrdenacao: { id: FiltroOrdenacaoId; label: string }[] = [
    { id: "recentes", label: "Recentes" },
    { id: "alfabetica", label: "Ordem Alfabética" },
    { id: "maior_nota", label: "Maior Nota" },
    { id: "maior_progresso", label: "Maior Progresso" },
  ];

  const opcoesFormato: { id: FiltroFormatoId; label: string }[] = [
    { id: "tv", label: "TV" },
    { id: "filme", label: "Filme" },
    { id: "ova", label: "OVA" },
    { id: "webtoon", label: "Webtoon" },
    { id: "manga", label: "Mangá" },
    { id: "livro", label: "Livro" },
  ];

  const favScroll = useHorizontalScroll(340);
  const statusScroll = useHorizontalScroll(280);

  return (
    <motion.div
      layout
      className="grid grid-cols-1 gap-5 xl:grid-cols-4 2xl:grid-cols-6"
    >
      <motion.div layout className="xl:col-span-4 2xl:col-span-6">
        <CarouselSection
          title="SUAS OBRAS FAVORITAS"
          headerTrailing={botaoBusca}
          scrollPrev={favScroll.prev}
          scrollNext={favScroll.next}
        >
          <SpotlightCarousel
            scrollRef={favScroll.ref}
            obras={favoritas}
            onPick={onAbrirObra}
          />
        </CarouselSection>
      </motion.div>

      {buscaAberta ? (
        <motion.div layout className="col-span-full xl:col-span-4 2xl:col-span-6">
          <div className="flex items-stretch gap-2">
            <input
              type="search"
              value={buscaEstante}
              onChange={(e) => setBuscaEstante(e.target.value)}
              placeholder="Filtrar por título…"
              autoFocus
              className="min-w-0 flex-1 rounded-xl border border-cyan-500/30 bg-black/40 px-3 py-2.5 text-[11px] font-semibold text-zinc-200 shadow-[inset_0_1px_0_rgba(34,211,238,0.08)] outline-none backdrop-blur-md transition-all placeholder:text-zinc-600 focus:border-cyan-400/50 focus:bg-black/50 focus:shadow-[0_0_16px_rgba(34,211,238,0.12)]"
            />
            <div className="relative shrink-0 self-stretch">
              <button
                type="button"
                title="Filtros"
                aria-label="Abrir ou fechar painel de filtros"
                aria-expanded={isFiltersOpen}
                onClick={() => setIsFiltersOpen((v) => !v)}
                className="flex h-full items-center justify-center rounded-xl border border-cyan-500/25 bg-white/[0.04] px-3 text-cyan-200/90 transition-all hover:border-cyan-400/45 hover:bg-cyan-500/10"
              >
                <SlidersHorizontal className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              </button>
              {filtrosAtivos ? (
                <span
                  className="pointer-events-none absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.95)]"
                  aria-hidden
                />
              ) : null}
            </div>
          </div>

          <AnimatePresence initial={false}>
            {isFiltersOpen ? (
              <motion.div
                key="sora-filtros-globais"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="mt-2 w-full space-y-4 rounded-xl border border-cyan-900/30 bg-[#08080a]/80 p-4 shadow-[inset_0_1px_0_rgba(34,211,238,0.06)] backdrop-blur-md">
                  <div>
                    <p className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">
                      Ordenação
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {opcoesOrdenacao.map((op) => {
                        const ativo = filtroOrdenacao === op.id;
                        return (
                          <button
                            key={op.id}
                            type="button"
                            aria-pressed={ativo}
                            onClick={() => setFiltroOrdenacao(op.id)}
                            className={`rounded-lg border px-3 py-2 text-[10px] font-bold uppercase tracking-widest transition-all ${
                              ativo
                                ? "border-cyan-400/70 bg-cyan-500/20 text-cyan-100 shadow-[0_0_14px_rgba(34,211,238,0.35)]"
                                : "border-white/10 bg-white/[0.04] text-zinc-500 hover:border-cyan-500/35 hover:text-cyan-200/90"
                            }`}
                          >
                            {op.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">
                      Formato
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {opcoesFormato.map((op) => {
                        const ativo = filtroFormato === op.id;
                        return (
                          <button
                            key={op.id}
                            type="button"
                            aria-pressed={ativo}
                            onClick={() =>
                              setFiltroFormato((f) => (f === op.id ? "todos" : op.id))
                            }
                            className={`rounded-lg border px-3 py-2 text-[10px] font-bold uppercase tracking-widest transition-all ${
                              ativo
                                ? "border-cyan-400/70 bg-cyan-500/20 text-cyan-100 shadow-[0_0_14px_rgba(34,211,238,0.35)]"
                                : "border-white/10 bg-white/[0.04] text-zinc-500 hover:border-cyan-500/35 hover:text-cyan-200/90"
                            }`}
                          >
                            {op.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-end border-t border-white/5 pt-3">
                    <button
                      type="button"
                      onClick={limparFiltros}
                      className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 transition-colors hover:text-cyan-300/90"
                    >
                      Limpar filtros
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      ) : null}

      <motion.div layout className="xl:col-span-4 2xl:col-span-6">
        <CarouselSection
          title="STATUS"
          sectionClassName="overflow-visible"
          headerTrailing={botaoBusca}
          scrollPrev={statusScroll.prev}
          scrollNext={statusScroll.next}
          chips={
            <NeonChips
              chips={[
                {
                  id: "todos",
                  label: "TODOS",
                  active: statusTab === "TODOS",
                  onClick: () => setStatusTab("TODOS"),
                },
                {
                  id: "prog",
                  label: progressoLabel,
                  active: statusTab === "PROGRESSO",
                  onClick: () => setStatusTab("PROGRESSO"),
                },
                {
                  id: "comp",
                  label: "COMPLETOS",
                  active: statusTab === "COMPLETOS",
                  onClick: () => setStatusTab("COMPLETOS"),
                },
                {
                  id: "pl",
                  label: "PLANEJO LER",
                  active: statusTab === "PLANEJO",
                  onClick: () => setStatusTab("PLANEJO"),
                },
                {
                  id: "paus",
                  label: "PAUSADOS",
                  active: statusTab === "PAUSADOS",
                  onClick: () => setStatusTab("PAUSADOS"),
                },
                {
                  id: "drop",
                  label: "DROPADOS",
                  active: statusTab === "DROPADOS",
                  onClick: () => setStatusTab("DROPADOS"),
                },
              ]}
            />
          }
        >
          <StatusMangaCarousel
            ref={statusScroll.ref}
            obras={obrasStatusCarousel}
            aura={aura}
            atualizarCapitulo={atualizarCapitulo}
            deletarManga={deletarManga}
            mudarStatusManual={mudarStatusManual}
            onAbrirObra={onAbrirObra}
          />
        </CarouselSection>
      </motion.div>

      {mostrarBotaoExpandir ? (
        <motion.div layout className="xl:col-span-4 2xl:col-span-6">
          <motion.section
            layout
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="rounded-2xl border border-cyan-500/10 bg-[#060607]/50 p-3 shadow-[inset_0_1px_0_rgba(34,211,238,0.04)] backdrop-blur-sm"
          >
            <button
              type="button"
              onClick={() => setIsGridExpanded((v) => !v)}
              aria-expanded={isGridExpanded}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 transition-all hover:border-cyan-500/25 hover:text-cyan-200/90"
            >
              <span>Visualizar Todas as Obras</span>
              <ChevronRight
                className={`h-4 w-4 shrink-0 text-cyan-500/60 transition-transform ${isGridExpanded ? "rotate-90" : ""}`}
                aria-hidden
              />
            </button>
          </motion.section>
        </motion.div>
      ) : null}

      <AnimatePresence initial={false} mode="popLayout">
        {isGridExpanded && obrasStatusGridRest.length > 0 ? (
          <motion.div
            key="sora-status-grid-extra"
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1], layout: { type: "spring", stiffness: 380, damping: 34 } }}
            className="col-span-full overflow-hidden xl:col-span-4 2xl:col-span-6"
          >
            <motion.div
              layout
              className="grid grid-cols-2 gap-6 overflow-visible pt-1 pb-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-6"
            >
              {obrasStatusGridRest.map((obra) => (
                <motion.div
                  key={`${obra.tipoObra}-${obra.id}`}
                  layout
                  transition={{ type: "spring", stiffness: 380, damping: 34 }}
                  className="overflow-visible"
                >
                  <MangaCard
                    manga={obra}
                    aura={aura}
                    abaPrincipal={obra.tipoObra}
                    atualizarCapitulo={atualizarCapitulo}
                    deletarManga={deletarManga}
                    mudarStatusManual={mudarStatusManual}
                    abrirDetalhes={() => onAbrirObra(obra)}
                  />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
