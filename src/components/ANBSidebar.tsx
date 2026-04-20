"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  BookOpen,
  CalendarDays,
  Film,
  Gamepad2,
  Home,
  Library,
  MonitorPlay,
  Moon,
  Music,
  PlayCircle,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Tv,
  User,
} from "lucide-react";
import type { AbaPrincipal } from "@/types/hunter_registry";
import { OMNISEARCH_OPEN_EVENT } from "@/components/features/OmniSearch";
import { LocalPlayerModal } from "@/components/features/LocalPlayerModal";
import { isTauriEnvironment } from "@/utils/isTauri";

type NavMode = "HOME" | "ESTANTE";

export type ANBMainView = "home" | "calendar";

export type ANBSidebarProps = {
  navMode: NavMode;
  abaPrincipal: AbaPrincipal;
  activeView: ANBMainView;
  onViewChange: (view: ANBMainView) => void;
  onHome: () => void;
  onEstante: (aba: AbaPrincipal) => void;
  modoCinema: boolean;
  onToggleCinema: () => void;
  anilistDisponivel: boolean;
  sincronizando: boolean;
  onSyncAnilist: () => void;
  /** Reservado: atalho ao painel admin (conta de sistema usa e-mail em env, não a estante). */
  mostrarAtalhoPainelAdmin?: boolean;
  onAbrirPainelAdmin?: () => void;
};

const BTN_BASE =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-zinc-400 transition-all duration-200 hover:text-cyan-100";

const MENU_ITEM_CLASS =
  "w-full py-3 text-left whitespace-nowrap text-zinc-300 transition-colors hover:text-white";

export default function ANBSidebar({
  navMode,
  abaPrincipal,
  activeView,
  onViewChange,
  onHome,
  onEstante,
  modoCinema,
  onToggleCinema,
  anilistDisponivel,
  sincronizando,
  onSyncAnilist,
  mostrarAtalhoPainelAdmin = false,
  onAbrirPainelAdmin,
}: ANBSidebarProps) {
  const router = useRouter();
  const [menuAberto, setMenuAberto] = useState(false);
  const [isLocalPlayerOpen, setIsLocalPlayerOpen] = useState(false);
  const [showLocalPlayerButton, setShowLocalPlayerButton] = useState(false);

  useEffect(() => {
    if (isTauriEnvironment()) {
      // Botão só após montagem: evita divergência SSR e garante __TAURI* disponível
      setShowLocalPlayerButton(true); // eslint-disable-line react-hooks/set-state-in-effect -- detecção pós-mount (Tauri)
    }
  }, []);

  const encerrarSessao = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    try {
      sessionStorage.clear();
      localStorage.clear();
    } catch {
      /* ignore */
    }
    router.push("/login");
    router.refresh();
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
    <>
    <aside
      className="sticky top-3 flex w-[3.25rem] shrink-0 flex-col items-center gap-3 self-start rounded-2xl border border-cyan-500/20 bg-[#08080a]/75 py-2 shadow-[0_0_24px_rgba(34,211,238,0.08)] backdrop-blur-xl"
      aria-label="Navegação principal"
    >
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          title="Início"
          aria-label="Início"
          aria-pressed={activeView === "home" && navMode === "HOME"}
          onClick={() => {
            onViewChange("home");
            onHome();
          }}
          className={`${BTN_BASE} ${
            activeView === "home" && navMode === "HOME"
              ? "border-cyan-400/70 bg-cyan-500/25 text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.55)] ring-1 ring-cyan-400/30"
              : "border-white/10 bg-white/[0.04] hover:border-cyan-500/40"
          }`}
        >
          <Home className="h-[18px] w-[18px]" strokeWidth={2.25} aria-hidden />
        </button>
        <button
          type="button"
          title="Calendário de lançamentos"
          aria-label="Calendário de lançamentos"
          aria-pressed={activeView === "calendar"}
          onClick={() => onViewChange("calendar")}
          className={`${BTN_BASE} ${
            activeView === "calendar"
              ? "border-cyan-400/70 bg-cyan-500/25 text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.55)] ring-1 ring-cyan-400/30"
              : "border-white/10 bg-white/[0.04] hover:border-cyan-500/40"
          }`}
        >
          <CalendarDays className="h-[18px] w-[18px]" strokeWidth={2.25} aria-hidden />
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
        {showLocalPlayerButton ? (
          <button
            type="button"
            title="Player Local"
            aria-label="Player Local"
            onClick={() => setIsLocalPlayerOpen(true)}
            className={`${BTN_BASE} border-white/10 bg-white/[0.04] hover:border-emerald-500/40 hover:text-emerald-100`}
          >
            <MonitorPlay className="h-[18px] w-[18px]" strokeWidth={2.25} aria-hidden />
          </button>
        ) : null}
      </div>

      <div
        className="my-1 h-px w-6 bg-gradient-to-r from-transparent via-cyan-500/35 to-transparent"
        aria-hidden
      />

      <div className="flex flex-col items-center gap-3">
        {estanteBtn("MANGA", BookOpen)}
        {estanteBtn("ANIME", Tv)}
        {estanteBtn("FILME", Film)}
        {estanteBtn("SERIE", PlayCircle)}
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
        <div className="flex flex-col items-center">
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
        </div>
      </div>
    </aside>

    {showLocalPlayerButton ? (
      <LocalPlayerModal
        isOpen={isLocalPlayerOpen}
        onClose={() => setIsLocalPlayerOpen(false)}
      />
    ) : null}

    {menuAberto ? (
      <div
        className="fixed inset-0 z-[9998]"
        aria-hidden
        onClick={() => setMenuAberto(false)}
      >
        <div
          role="menu"
          className="fixed bottom-24 left-1/2 z-[9999] flex w-max min-w-[240px] -translate-x-1/2 flex-col rounded-xl border border-white/10 bg-black/60 px-6 py-2 shadow-2xl backdrop-blur-xl md:bottom-20 md:left-20 md:translate-x-0"
          onClick={(e) => e.stopPropagation()}
        >
          <Link
            href="/perfil?aba=config"
            role="menuitem"
            className={MENU_ITEM_CLASS}
            onClick={() => setMenuAberto(false)}
          >
            Configurações Dinâmicas
          </Link>
          {mostrarAtalhoPainelAdmin && onAbrirPainelAdmin ? (
            <button
              type="button"
              role="menuitem"
              className={MENU_ITEM_CLASS}
              onClick={() => {
                setMenuAberto(false);
                onAbrirPainelAdmin();
              }}
            >
              Painel Admin
            </button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className={MENU_ITEM_CLASS}
            onClick={() => {
              setMenuAberto(false);
              void encerrarSessao();
            }}
          >
            Encerrar Sessão
          </button>
        </div>
      </div>
    ) : null}
    </>
  );
}
