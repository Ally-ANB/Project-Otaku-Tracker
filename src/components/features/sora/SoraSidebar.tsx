"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Film,
  Gamepad2,
  Home,
  Library,
  LogOut,
  MonitorPlay,
  Moon,
  Music,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Tv,
  User,
  UserCog,
} from "lucide-react";
import type { AbaPrincipal } from "@/types/hunter_registry";
import { OMNISEARCH_OPEN_EVENT } from "@/components/features/OmniSearch";

type NavMode = "HOME" | "ESTANTE";

export type SoraSidebarProps = {
  navMode: NavMode;
  abaPrincipal: AbaPrincipal;
  onHome: () => void;
  onEstante: (aba: AbaPrincipal) => void;
  modoCinema: boolean;
  onToggleCinema: () => void;
  anilistDisponivel: boolean;
  sincronizando: boolean;
  onSyncAnilist: () => void;
};

const BTN_BASE =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-zinc-400 transition-all duration-200 hover:text-cyan-100";

export default function SoraSidebar({
  navMode,
  abaPrincipal,
  onHome,
  onEstante,
  modoCinema,
  onToggleCinema,
  anilistDisponivel,
  sincronizando,
  onSyncAnilist,
}: SoraSidebarProps) {
  const [menuAberto, setMenuAberto] = useState(false);
  const menuWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuAberto) return;
    const fechar = (e: MouseEvent) => {
      if (menuWrapRef.current && !menuWrapRef.current.contains(e.target as Node)) {
        setMenuAberto(false);
      }
    };
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, [menuAberto]);

  const encerrarSessao = () => {
    sessionStorage.removeItem("hunter_ativo");
    window.location.href = "/";
  };

  const shelfActive = navMode === "ESTANTE";

  const estanteBtn = (aba: AbaPrincipal, Icon: typeof BookOpen) => {
    const ativo = shelfActive && abaPrincipal === aba;
    return (
      <button
        key={aba}
        type="button"
        title={aba}
        aria-label={`Estante ${aba}`}
        aria-pressed={ativo}
        onClick={() => onEstante(aba)}
        className={`${BTN_BASE} border-cyan-500/15 bg-cyan-500/[0.04] hover:border-cyan-400/35 hover:bg-cyan-500/10 hover:shadow-[0_0_14px_rgba(34,211,238,0.2)] ${
          ativo
            ? "border-cyan-400/55 text-cyan-200 shadow-[0_0_16px_rgba(34,211,238,0.35)]"
            : ""
        }`}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={2.25} aria-hidden />
      </button>
    );
  };

  return (
    <aside
      className="sticky top-3 flex w-[3.25rem] shrink-0 flex-col items-center gap-3 self-start rounded-2xl border border-cyan-500/20 bg-[#08080a]/75 py-2 shadow-[0_0_24px_rgba(34,211,238,0.08)] backdrop-blur-xl"
      aria-label="Navegação principal"
    >
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          title="Início"
          aria-label="Início"
          aria-pressed={navMode === "HOME"}
          onClick={onHome}
          className={`${BTN_BASE} ${
            navMode === "HOME"
              ? "border-cyan-400/70 bg-cyan-500/25 text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.55)] ring-1 ring-cyan-400/30"
              : "border-white/10 bg-white/[0.04] hover:border-cyan-500/40"
          }`}
        >
          <Home className="h-[18px] w-[18px]" strokeWidth={2.25} aria-hidden />
        </button>
        <button
          type="button"
          title="OmniSearch"
          aria-label="Abrir OmniSearch"
          onClick={() => window.dispatchEvent(new CustomEvent(OMNISEARCH_OPEN_EVENT))}
          className={`${BTN_BASE} border-white/10 bg-white/[0.04] hover:border-cyan-500/40`}
        >
          <Search className="h-[18px] w-[18px]" strokeWidth={2.25} aria-hidden />
        </button>
      </div>

      <div
        className="my-1 h-px w-6 bg-gradient-to-r from-transparent via-cyan-500/35 to-transparent"
        aria-hidden
      />

      <div className="flex flex-col items-center gap-3">
        {estanteBtn("MANGA", BookOpen)}
        {estanteBtn("ANIME", Tv)}
        {estanteBtn("FILME", Film)}
        {estanteBtn("SERIE", MonitorPlay)}
        {estanteBtn("JOGO", Gamepad2)}
        {estanteBtn("MUSICA", Music)}
        {estanteBtn("LIVRO", Library)}
      </div>

      <div className="mt-auto flex flex-col items-center gap-3 pt-1">
        <div
          className="mb-0.5 h-px w-6 bg-gradient-to-r from-transparent via-cyan-500/25 to-transparent"
          aria-hidden
        />
        <Link
          href="/guilda"
          title="Guilda"
          aria-label="Guilda"
          className={`${BTN_BASE} border-white/10 bg-white/[0.04] hover:border-violet-400/35 hover:text-violet-200`}
        >
          <Shield className="h-[18px] w-[18px]" strokeWidth={2.25} aria-hidden />
        </Link>
        <button
          type="button"
          title={
            anilistDisponivel
              ? "Sincronizar AniList"
              : "AniList: conecte na estante Mangá ou Anime"
          }
          aria-label="Sincronizar AniList"
          disabled={!anilistDisponivel || sincronizando}
          onClick={onSyncAnilist}
          className={`${BTN_BASE} border-white/10 bg-white/[0.04] hover:border-sky-400/35 hover:text-sky-200 disabled:pointer-events-none disabled:opacity-35 ${
            sincronizando ? "animate-spin" : ""
          }`}
        >
          <RefreshCw className="h-[18px] w-[18px]" strokeWidth={2.25} aria-hidden />
        </button>
        <button
          type="button"
          title="Filtro de luz azul"
          aria-label="Alternar filtro de luz azul"
          aria-pressed={modoCinema}
          onClick={onToggleCinema}
          className={`${BTN_BASE} ${
            modoCinema
              ? "border-sky-500/50 bg-sky-600/35 text-sky-100 shadow-[0_0_14px_rgba(56,189,248,0.35)]"
              : "border-white/10 bg-white/[0.04] hover:border-sky-400/35"
          }`}
        >
          <Moon className="h-[18px] w-[18px]" strokeWidth={2.25} aria-hidden />
        </button>
        <Link
          href="/perfil"
          title="Perfil"
          aria-label="Perfil"
          className={`${BTN_BASE} border-white/10 bg-white/[0.04] hover:border-cyan-400/35`}
        >
          <User className="h-[18px] w-[18px]" strokeWidth={2.25} aria-hidden />
        </Link>
        <div className="relative flex flex-col items-center" ref={menuWrapRef}>
          <button
            type="button"
            title="Menu de configurações"
            aria-label="Menu de configurações"
            aria-expanded={menuAberto}
            aria-haspopup="menu"
            onClick={() => setMenuAberto((v) => !v)}
            className={`${BTN_BASE} border-white/10 bg-white/[0.04] hover:border-cyan-400/35 ${
              menuAberto ? "border-cyan-400/45 text-cyan-200 shadow-[0_0_14px_rgba(34,211,238,0.25)]" : ""
            }`}
          >
            <Settings className="h-[18px] w-[18px]" strokeWidth={2.25} aria-hidden />
          </button>
          {menuAberto ? (
            <div
              role="menu"
              className="absolute bottom-full left-1/2 z-50 mb-2 w-max min-w-[11.5rem] -translate-x-1/2 rounded-xl border border-cyan-500/25 bg-[#060607]/95 py-1 shadow-[0_0_20px_rgba(34,211,238,0.12)] backdrop-blur-xl"
            >
              <Link
                href="/perfil?aba=config"
                role="menuitem"
                className="flex items-center gap-2 px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-zinc-300 transition-colors hover:bg-cyan-500/10 hover:text-cyan-100"
                onClick={() => setMenuAberto(false)}
              >
                <UserCog className="h-3.5 w-3.5 shrink-0 text-cyan-400/90" aria-hidden />
                Configurações de Perfil
              </Link>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-300 transition-colors hover:bg-red-500/10 hover:text-red-300"
                onClick={() => {
                  setMenuAberto(false);
                  encerrarSessao();
                }}
              >
                <LogOut className="h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden />
                Encerrar Sessão
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
