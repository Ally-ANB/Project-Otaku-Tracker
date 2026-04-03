"use client";

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import type { AbaPrincipal, Manga } from "@/types/hunter_registry";
import {
  anexarTipo,
  extractAnoDaSinopse,
  type ObraComTipo,
  sinopseContemGenero,
} from "./soraUtils";

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
};

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
}: {
  title: string;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-200">
        {title}
      </h2>
      <div className="flex shrink-0 items-center gap-1">
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
      ref={scrollRef}
      className="flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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

const PosterStrip = forwardRef<
  HTMLDivElement,
  {
    obras: ObraComTipo[];
    showMeta: boolean;
    onPick: (o: ObraComTipo) => void;
  }
>(function PosterStrip({ obras, showMeta, onPick }, ref) {
  if (obras.length === 0) {
    return (
      <p className="rounded-xl border border-white/10 bg-white/[0.03] py-6 text-center text-[9px] font-bold uppercase tracking-widest text-zinc-600">
        Vazio
      </p>
    );
  }
  return (
    <div
      ref={ref}
      className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {obras.map((obra) => {
        const ano = extractAnoDaSinopse(obra.sinopse || "");
        return (
          <button
            key={`${obra.tipoObra}-${obra.id}`}
            type="button"
            onClick={() => onPick(obra)}
            className="group w-[6.25rem] shrink-0 text-left sm:w-[7rem]"
          >
            <div className="overflow-hidden rounded-xl border border-white/10 bg-black/30 shadow-lg transition-all group-hover:border-cyan-500/35 group-hover:shadow-[0_0_18px_rgba(34,211,238,0.2)]">
              <img
                src={capaSrc(obra)}
                alt=""
                className="aspect-[2/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
            </div>
            {showMeta ? (
              <div className="mt-2 space-y-0.5 px-0.5">
                <p className="line-clamp-2 text-[9px] font-bold uppercase leading-tight tracking-tight text-zinc-200">
                  {obra.titulo}
                </p>
                <p className="text-[8px] font-semibold tabular-nums text-zinc-500">
                  {ano ?? "—"}
                </p>
              </div>
            ) : null}
          </button>
        );
      })}
    </div>
  );
});

function CarouselSection({
  title,
  chips,
  children,
  scrollPrev,
  scrollNext,
}: {
  title: string;
  chips?: ReactNode;
  children: ReactNode;
  scrollPrev: () => void;
  scrollNext: () => void;
}) {
  return (
    <motion.section
      layout
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className="rounded-2xl border border-cyan-500/10 bg-[#060607]/80 p-4 shadow-[inset_0_1px_0_rgba(34,211,238,0.06)] backdrop-blur-md"
    >
      <SectionHeader title={title} onPrev={scrollPrev} onNext={scrollNext} />
      {chips}
      {children}
    </motion.section>
  );
}

function filtrarPorTipo(lista: ObraComTipo[], tipo: AbaPrincipal | null): ObraComTipo[] {
  if (!tipo) return lista;
  return lista.filter((o) => o.tipoObra === tipo);
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
  aura: _aura,
  onAbrirObra,
}: SoraHomeViewProps) {
  void _aura;
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

  const favoritas = useMemo(
    () => escopo.filter((o) => o.favorito).sort((a, b) => (a.titulo > b.titulo ? 1 : -1)),
    [escopo]
  );

  const [chipProgresso, setChipProgresso] = useState<"TODOS" | "LENDO" | "ASSISTINDO" | "JOGANDO">(
    "TODOS"
  );

  const emProgresso = useMemo(() => {
    let base = escopo.filter((o) => o.status === "Lendo");
    if (chipProgresso === "LENDO") {
      base = base.filter((o) => o.tipoObra === "MANGA" || o.tipoObra === "LIVRO");
    } else if (chipProgresso === "ASSISTINDO") {
      base = base.filter((o) =>
        ["ANIME", "FILME", "SERIE"].includes(o.tipoObra)
      );
    } else if (chipProgresso === "JOGANDO") {
      base = base.filter((o) => o.tipoObra === "JOGO");
    }
    return base;
  }, [escopo, chipProgresso]);

  const [chipPlanejoA, setChipPlanejoA] = useState<"PLANEJO_LER" | "PLANEJO_ASSISTIR">(
    "PLANEJO_LER"
  );
  const planejoA = useMemo(() => {
    return escopo.filter((o) =>
      chipPlanejoA === "PLANEJO_LER"
        ? (o.tipoObra === "MANGA" || o.tipoObra === "LIVRO") && o.status === "Planejo Ler"
        : ["ANIME", "FILME", "SERIE"].includes(o.tipoObra) && o.status === "Planejo Ler"
    );
  }, [escopo, chipPlanejoA]);

  const [chipPlanejoB, setChipPlanejoB] = useState<"PLANEJO_LER" | "SERIE" | "COMEDY">(
    "PLANEJO_LER"
  );
  const planejoB = useMemo(() => {
    if (chipPlanejoB === "PLANEJO_LER") {
      return escopo.filter((o) => o.status === "Planejo Ler");
    }
    if (chipPlanejoB === "SERIE") {
      return escopo.filter((o) => o.tipoObra === "SERIE" && o.status === "Planejo Ler");
    }
    return escopo.filter(
      (o) => o.status === "Planejo Ler" && sinopseContemGenero(o.sinopse || "", "comedy")
    );
  }, [escopo, chipPlanejoB]);

  const generos = ["Todos", "Ação", "Drama", "Comedy"] as const;
  const [generoConcluidos, setGeneroConcluidos] = useState<(typeof generos)[number]>("Todos");
  const [generoPausados, setGeneroPausados] = useState<(typeof generos)[number]>("Todos");
  const [generoDropados, setGeneroDropados] = useState<(typeof generos)[number]>("Todos");

  const filtroGenero = (obra: ObraComTipo, g: (typeof generos)[number]) => {
    if (g === "Todos") return true;
    return sinopseContemGenero(obra.sinopse || "", g);
  };

  const concluidos = useMemo(() => {
    return escopo
      .filter((o) => o.status === "Completos")
      .filter((o) => filtroGenero(o, generoConcluidos));
  }, [escopo, generoConcluidos]);

  const pausados = useMemo(() => {
    return escopo
      .filter((o) => o.status === "Pausados")
      .filter((o) => filtroGenero(o, generoPausados));
  }, [escopo, generoPausados]);

  const dropados = useMemo(() => {
    return escopo
      .filter((o) => o.status === "Dropados")
      .filter((o) => filtroGenero(o, generoDropados));
  }, [escopo, generoDropados]);

  const favScroll = useHorizontalScroll(340);
  const progScroll = useHorizontalScroll(280);
  const pAscroll = useHorizontalScroll(280);
  const pBscroll = useHorizontalScroll(280);
  const concScroll = useHorizontalScroll(280);
  const pausScroll = useHorizontalScroll(280);
  const dropScroll = useHorizontalScroll(280);

  return (
    <motion.div
      layout
      className="grid grid-cols-1 gap-5 xl:grid-cols-4 2xl:grid-cols-6"
    >
      <motion.div layout className="xl:col-span-4 2xl:col-span-6">
        <CarouselSection
          title="Suas obras favoritas"
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

      <motion.div layout className="xl:col-span-4 2xl:col-span-6">
        <CarouselSection
          title="Em progresso"
          scrollPrev={progScroll.prev}
          scrollNext={progScroll.next}
          chips={
            <NeonChips
              chips={[
                {
                  id: "t",
                  label: "Todos",
                  active: chipProgresso === "TODOS",
                  onClick: () => setChipProgresso("TODOS"),
                },
                {
                  id: "l",
                  label: "Lendo",
                  active: chipProgresso === "LENDO",
                  onClick: () => setChipProgresso("LENDO"),
                },
                {
                  id: "a",
                  label: "Assistindo",
                  active: chipProgresso === "ASSISTINDO",
                  onClick: () => setChipProgresso("ASSISTINDO"),
                },
                {
                  id: "j",
                  label: "Jogando",
                  active: chipProgresso === "JOGANDO",
                  onClick: () => setChipProgresso("JOGANDO"),
                },
              ]}
            />
          }
        >
          <PosterStrip ref={progScroll.ref} obras={emProgresso} showMeta onPick={onAbrirObra} />
        </CarouselSection>
      </motion.div>

      <motion.div layout className="xl:col-span-2 2xl:col-span-3">
        <CarouselSection
          title="Planejo ler / assistir"
          scrollPrev={pAscroll.prev}
          scrollNext={pAscroll.next}
          chips={
            <NeonChips
              chips={[
                {
                  id: "pl",
                  label: "Planejo ler",
                  active: chipPlanejoA === "PLANEJO_LER",
                  onClick: () => setChipPlanejoA("PLANEJO_LER"),
                },
                {
                  id: "pa",
                  label: "Planejo assistir",
                  active: chipPlanejoA === "PLANEJO_ASSISTIR",
                  onClick: () => setChipPlanejoA("PLANEJO_ASSISTIR"),
                },
              ]}
            />
          }
        >
          <PosterStrip ref={pAscroll.ref} obras={planejoA} showMeta={false} onPick={onAbrirObra} />
        </CarouselSection>
      </motion.div>

      <motion.div layout className="xl:col-span-2 2xl:col-span-3">
        <CarouselSection
          title="Planejamentos"
          scrollPrev={pBscroll.prev}
          scrollNext={pBscroll.next}
          chips={
            <NeonChips
              chips={[
                {
                  id: "pl",
                  label: "Planejo ler",
                  active: chipPlanejoB === "PLANEJO_LER",
                  onClick: () => setChipPlanejoB("PLANEJO_LER"),
                },
                {
                  id: "sr",
                  label: "Série",
                  active: chipPlanejoB === "SERIE",
                  onClick: () => setChipPlanejoB("SERIE"),
                },
                {
                  id: "co",
                  label: "Comedy",
                  active: chipPlanejoB === "COMEDY",
                  onClick: () => setChipPlanejoB("COMEDY"),
                },
              ]}
            />
          }
        >
          <PosterStrip ref={pBscroll.ref} obras={planejoB} showMeta={false} onPick={onAbrirObra} />
        </CarouselSection>
      </motion.div>

      <motion.div layout className="xl:col-span-4 2xl:col-span-6">
        <CarouselSection
          title="Concluídos"
          scrollPrev={concScroll.prev}
          scrollNext={concScroll.next}
          chips={
            <NeonChips
              chips={generos.map((g) => ({
                id: g,
                label: g,
                active: generoConcluidos === g,
                onClick: () => setGeneroConcluidos(g),
              }))}
            />
          }
        >
          <PosterStrip ref={concScroll.ref} obras={concluidos} showMeta onPick={onAbrirObra} />
        </CarouselSection>
      </motion.div>

      <motion.div layout className="xl:col-span-2 2xl:col-span-3">
        <CarouselSection
          title="Pausados"
          scrollPrev={pausScroll.prev}
          scrollNext={pausScroll.next}
          chips={
            <NeonChips
              chips={generos.map((g) => ({
                id: g,
                label: g,
                active: generoPausados === g,
                onClick: () => setGeneroPausados(g),
              }))}
            />
          }
        >
          <PosterStrip ref={pausScroll.ref} obras={pausados} showMeta onPick={onAbrirObra} />
        </CarouselSection>
      </motion.div>

      <motion.div layout className="xl:col-span-2 2xl:col-span-3">
        <CarouselSection
          title="Dropados"
          scrollPrev={dropScroll.prev}
          scrollNext={dropScroll.next}
          chips={
            <NeonChips
              chips={generos.map((g) => ({
                id: g,
                label: g,
                active: generoDropados === g,
                onClick: () => setGeneroDropados(g),
              }))}
            />
          }
        >
          <PosterStrip ref={dropScroll.ref} obras={dropados} showMeta onPick={onAbrirObra} />
        </CarouselSection>
      </motion.div>
    </motion.div>
  );
}
