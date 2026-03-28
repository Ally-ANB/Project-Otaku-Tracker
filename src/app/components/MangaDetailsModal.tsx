"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Layers,
  Lock,
  Maximize2,
  Minimize2,
  PenLine,
  Pencil,
  PlaySquare,
  Save,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { dbClient, definirSenhaMestreNaSessao } from "@/lib/dbClient";
import {
  faviconForUrl,
  mergeManualLinkAndProviders,
  parseProviderData,
  type WatchProvider,
} from "@/lib/watchProviders";
import WatchProviderStrip from "./WatchProviderStrip";

export interface Manga {
  id: number;
  titulo: string;
  capa: string;
  capitulo_atual: number;
  total_capitulos: number;
  status: string;
  sinopse: string;
  nota_pessoal: number;
  nota_amigos: number;
  comentarios: string;
  usuario: string;
  ultima_leitura: string;
  favorito: boolean;
  link_url?: string | null;
  capa_url?: string | null;
  provider_data?: unknown;
  temporadas_assistidas?: number | null;
  temporadas_totais?: number | null;
}

/** Defina `NEXT_PUBLIC_SUPABASE_HAS_CAPA_URL=true` no .env quando a coluna `capa_url` existir nas tabelas de obras. */
const TEM_COLUNA_CAPA_URL_NO_SUPABASE =
  process.env.NEXT_PUBLIC_SUPABASE_HAS_CAPA_URL === "true";

function rascunhoCapaInicial(m: Manga): string {
  if (TEM_COLUNA_CAPA_URL_NO_SUPABASE) return m.capa_url?.trim() ?? "";
  return m.capa_url?.trim() ?? m.capa?.trim() ?? "";
}

function capaExibicao(m: Manga): string {
  const manual = m.capa_url?.trim();
  return manual || m.capa || "";
}

function intProgressoManga(v: unknown, fallback = 0): number {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.max(0, n) : fallback;
}

interface MangaDetailsModalProps {
  manga: Manga;
  tabelaObra: string;
  abaPrincipal: "MANGA" | "ANIME" | "FILME" | "LIVRO" | "SERIE" | "JOGO" | "MUSICA";
  podeEditarPrivilegiado: boolean;
  /** Quando true, oculta ações de escrita (favorito, edição, status, comentários, exclusão). */
  somenteLeitura?: boolean;
  solicitarSenhaMestre: () => Promise<string | null>;
  aoFechar: () => void;
  aoAtualizarCapitulo: (manga: Manga, novo: number) => void;
  aoAtualizarDados: (id: number, campos: Record<string, unknown>) => void;
  aoDeletar: (id: number) => void;
  aoTraduzir: () => void;
  aoEdicaoSalva: (campos: Partial<Manga>) => void;
  mostrarFeedback: (mensagem: string, tipo: "sucesso" | "erro" | "aviso" | "anilist") => void;
}

function cloneProviders(raw: unknown): WatchProvider[] {
  return parseProviderData(raw).map((p) => ({ ...p }));
}

function normalizeProvidersForDb(list: WatchProvider[]): WatchProvider[] {
  return list
    .filter((p) => p.link.trim().length > 0)
    .map((p) => {
      const link = p.link.trim();
      const name = p.name.trim() || "Plataforma";
      const logo = p.logo?.trim() || faviconForUrl(link);
      return {
        name,
        link,
        logo,
        ...(p.source ? { source: p.source } : {}),
      };
    });
}

function jsonProvidersIgualManga(draft: WatchProvider[], manga: Manga): boolean {
  const a = normalizeProvidersForDb(draft.map((p) => ({ ...p })));
  const b = normalizeProvidersForDb(cloneProviders(manga.provider_data));
  return JSON.stringify(a) === JSON.stringify(b);
}

export default function MangaDetailsModal({
  manga,
  tabelaObra,
  abaPrincipal,
  podeEditarPrivilegiado,
  somenteLeitura = false,
  solicitarSenhaMestre,
  aoFechar,
  aoAtualizarCapitulo,
  aoAtualizarDados,
  aoDeletar,
  aoTraduzir,
  aoEdicaoSalva,
  mostrarFeedback,
}: MangaDetailsModalProps) {
  const progressoAnimeOuSerie = abaPrincipal === "ANIME" || abaPrincipal === "SERIE";
  const [isExpanded, setIsExpanded] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<"STATUS" | "ARQUIVOS" | "REGISTROS">("STATUS");
  const [salvando, setSalvando] = useState(false);
  const [draftCap, setDraftCap] = useState(manga.capitulo_atual);
  const [draftTempAssist, setDraftTempAssist] = useState(() => intProgressoManga(manga.temporadas_assistidas));
  const [draftTempTotais, setDraftTempTotais] = useState(() => intProgressoManga(manga.temporadas_totais));
  const [draftNota, setDraftNota] = useState(manga.nota_pessoal || 0);
  const [draftLink, setDraftLink] = useState(manga.link_url?.trim() ?? "");
  const [draftCapaUrl, setDraftCapaUrl] = useState(() => rascunhoCapaInicial(manga));
  const [draftProviders, setDraftProviders] = useState<WatchProvider[]>(() => cloneProviders(manga.provider_data));

  function aplicarMangaNosDrafts() {
    setDraftCap(manga.capitulo_atual);
    setDraftTempAssist(intProgressoManga(manga.temporadas_assistidas));
    setDraftTempTotais(intProgressoManga(manga.temporadas_totais));
    setDraftNota(manga.nota_pessoal || 0);
    setDraftLink(manga.link_url?.trim() ?? "");
    setDraftCapaUrl(rascunhoCapaInicial(manga));
    setDraftProviders(cloneProviders(manga.provider_data));
  }

  useEffect(() => {
    setModoEdicao(false);
    setIsExpanded(false);
  }, [manga.id]);

  useEffect(() => {
    if (somenteLeitura) setModoEdicao(false);
  }, [somenteLeitura, manga.id]);

  useEffect(() => {
    if (modoEdicao) return;
    setDraftCap(manga.capitulo_atual);
    setDraftTempAssist(intProgressoManga(manga.temporadas_assistidas));
    setDraftTempTotais(intProgressoManga(manga.temporadas_totais));
    setDraftNota(manga.nota_pessoal || 0);
    setDraftLink(manga.link_url?.trim() ?? "");
    setDraftCapaUrl(rascunhoCapaInicial(manga));
    setDraftProviders(cloneProviders(manga.provider_data));
  }, [
    modoEdicao,
    manga.id,
    manga.capitulo_atual,
    manga.temporadas_assistidas,
    manga.temporadas_totais,
    manga.nota_pessoal,
    manga.link_url,
    manga.capa_url,
    manga.capa,
    manga.provider_data,
  ]);

  const capaMostrada = modoEdicao
    ? draftCapaUrl.trim() || manga.capa_url?.trim() || manga.capa || ""
    : capaExibicao(manga);

  const ondeVer = useMemo(
    () => mergeManualLinkAndProviders(manga.link_url, manga.provider_data),
    [manga.link_url, manga.provider_data]
  );

  const ondeVerPreviewEdicao = useMemo(
    () => mergeManualLinkAndProviders(draftLink || null, draftProviders),
    [draftLink, draftProviders]
  );

  const handleStatusChange = (novoStatus: string) => {
    if (somenteLeitura) return;
    const campos: Record<string, unknown> = { status: novoStatus };

    if (novoStatus === "Completos" && manga.total_capitulos > 0) {
      aoAtualizarCapitulo(manga, manga.total_capitulos);
    } else {
      aoAtualizarDados(manga.id, campos);
    }
  };

  function entrarModoEdicao() {
    aplicarMangaNosDrafts();
    setModoEdicao(true);
  }

  function temEdicaoPendente(): boolean {
    const cap = Math.max(0, Math.floor(Number(draftCap) || 0));
    const nota = Math.min(10, Math.max(0, Math.floor(Number(draftNota) || 0)));
    if (cap !== manga.capitulo_atual) return true;
    if (progressoAnimeOuSerie) {
      if (intProgressoManga(draftTempAssist) !== intProgressoManga(manga.temporadas_assistidas)) return true;
      if (intProgressoManga(draftTempTotais) !== intProgressoManga(manga.temporadas_totais)) return true;
    }
    if (nota !== (manga.nota_pessoal || 0)) return true;
    if ((draftLink.trim() || "") !== (manga.link_url?.trim() || "")) return true;
    if (TEM_COLUNA_CAPA_URL_NO_SUPABASE) {
      if ((draftCapaUrl.trim() || "") !== (manga.capa_url?.trim() || "")) return true;
    } else if ((draftCapaUrl.trim() || "") !== (manga.capa?.trim() || "")) return true;
    if (!jsonProvidersIgualManga(draftProviders, manga)) return true;
    return false;
  }

  /** Fechar edição: se houve mudanças, grava no Supabase (mesmo fluxo do botão Salvar). */
  async function sairModoEdicaoComPersistencia() {
    if (salvando) return;
    if (!temEdicaoPendente()) {
      aplicarMangaNosDrafts();
      setModoEdicao(false);
      return;
    }
    await salvarAlteracoes();
  }

  function atualizarProvider(index: number, patch: Partial<WatchProvider>) {
    setDraftProviders((prev) =>
      prev.map((p, i) => (i === index ? { ...p, ...patch } : p))
    );
  }

  function removerProvider(index: number) {
    setDraftProviders((prev) => prev.filter((_, i) => i !== index));
  }

  /** Persiste rascunhos (incl. `editProviderData`) no Supabase e sincroniza o estado global. */
  async function salvarAlteracoes(): Promise<boolean> {
    let cap = Math.max(0, Math.floor(Number(draftCap) || 0));
    let nota = Math.min(10, Math.max(0, Math.floor(Number(draftNota) || 0)));
    const tempAssist = intProgressoManga(draftTempAssist);
    const tempTotais = intProgressoManga(draftTempTotais);
    let novoStatus = manga.status;
    if (manga.total_capitulos > 0 && cap >= manga.total_capitulos) novoStatus = "Completos";

    const agora = new Date().toISOString();
    const capaUrlVal = draftCapaUrl.trim() || null;

    const editProviderData: WatchProvider[] = draftProviders.map((p) => ({ ...p }));
    const normalizedProviderData = normalizeProvidersForDb(editProviderData);

    const dados: Record<string, unknown> = {
      capitulo_atual: cap,
      nota_pessoal: nota,
      link_url: draftLink.trim() || null,
      provider_data: normalizedProviderData.length ? normalizedProviderData : [],
      status: novoStatus,
      ultima_leitura: agora,
    };
    if (progressoAnimeOuSerie) {
      dados.temporadas_assistidas = tempAssist;
      dados.temporadas_totais = tempTotais;
    }
    if (TEM_COLUNA_CAPA_URL_NO_SUPABASE) {
      dados.capa_url = capaUrlVal;
    } else {
      const capaDraft = draftCapaUrl.trim();
      if (capaDraft && capaDraft !== (manga.capa?.trim() || "")) {
        dados.capa = capaDraft;
      }
    }

    console.log("[MangaDetailsModal] Payload antes de dbClient.update", {
      tabelaObra,
      id: manga.id,
      editProviderData,
      normalizedProviderData,
      dados,
    });

    setSalvando(true);
    const executar = async (): Promise<boolean> => {
      const res = await dbClient.update(tabelaObra, manga.id, dados);
      if (res.success) return true;
      if ("precisaSenhaMestre" in res && res.precisaSenhaMestre) {
        const s = await solicitarSenhaMestre();
        if (!s) return false;
        definirSenhaMestreNaSessao(s);
        return executar();
      }
      mostrarFeedback(res.error || "Erro ao salvar alterações.", "erro");
      return false;
    };

    try {
      if (await executar()) {
        const camposSalvos: Partial<Manga> = {
          capitulo_atual: cap,
          nota_pessoal: nota,
          link_url: draftLink.trim() || null,
          provider_data: normalizedProviderData.length ? normalizedProviderData : [],
          status: novoStatus,
          ultima_leitura: agora,
          ...(progressoAnimeOuSerie
            ? { temporadas_assistidas: tempAssist, temporadas_totais: tempTotais }
            : {}),
        };
        if (TEM_COLUNA_CAPA_URL_NO_SUPABASE) {
          camposSalvos.capa_url = capaUrlVal;
        } else {
          const capaDraft = draftCapaUrl.trim();
          if (capaDraft && capaDraft !== (manga.capa?.trim() || "")) {
            camposSalvos.capa = capaDraft;
          }
        }
        aoEdicaoSalva(camposSalvos);
        setModoEdicao(false);
        setDraftProviders(
          normalizedProviderData.length ? normalizedProviderData.map((p) => ({ ...p })) : []
        );
        setDraftCap(cap);
        if (progressoAnimeOuSerie) {
          setDraftTempAssist(tempAssist);
          setDraftTempTotais(tempTotais);
        }
        setDraftNota(nota);
        setDraftLink(draftLink.trim());
        setDraftCapaUrl(
          TEM_COLUNA_CAPA_URL_NO_SUPABASE ? capaUrlVal ?? "" : draftCapaUrl.trim()
        );
        mostrarFeedback("Alterações salvas na base.", "sucesso");
        return true;
      }
      return false;
    } finally {
      setSalvando(false);
    }
  }

  const shellLayout = isExpanded
    ? "items-stretch justify-stretch p-2 sm:p-3 min-h-0"
    : "items-center justify-center p-4";
  const panelClass = isExpanded
    ? "flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl"
    : "flex max-h-[90vh] min-h-0 w-full max-w-4xl flex-col overflow-hidden rounded-[3rem]";
  const bannerClass = isExpanded
    ? "relative h-52 w-full shrink-0 overflow-hidden sm:h-56 md:h-60 lg:h-64"
    : "relative h-64 w-full shrink-0 overflow-hidden md:h-80";
  const bodyShell = "flex min-h-0 flex-1 flex-col overflow-hidden";
  const bodyScroll =
    "min-h-0 flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar";
  const gridClass = isExpanded
    ? "grid grid-cols-1 gap-6 p-6 lg:grid-cols-12 lg:gap-6"
    : "grid grid-cols-1 gap-6 p-6 md:grid-cols-3";
  const colMain = isExpanded ? "space-y-4 lg:col-span-5 xl:col-span-5" : "space-y-4";
  const colWide = isExpanded ? "space-y-4 lg:col-span-7 xl:col-span-7" : "md:col-span-2 space-y-4";
  const tituloProgressoUnico =
    abaPrincipal === "MANGA" || abaPrincipal === "LIVRO" ? "Capítulos" : "Progresso";

  return (
    <div
      className={`fixed inset-0 z-[150] flex min-h-0 bg-black/90 backdrop-blur-md animate-in fade-in duration-300 ${shellLayout}`}
    >
      <div
        className={`relative min-h-0 border border-zinc-800 bg-[#0e0e11] shadow-2xl ${panelClass}`}
      >
        <div className={bannerClass}>
          <img src={capaMostrada} className="h-full w-full scale-110 object-cover opacity-20 blur-3xl" alt="" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e11] to-transparent" />

          <div
            className={`absolute inset-0 flex gap-4 p-4 md:flex-row md:items-end md:gap-6 md:p-6 lg:p-8 ${
              isExpanded ? "flex-row items-end" : "flex-col items-end md:flex-row"
            }`}
          >
            <img
              src={capaMostrada}
              className={`aspect-[2/3] shrink-0 rounded-2xl border-4 border-zinc-900 object-cover object-top shadow-2xl ${
                isExpanded
                  ? "h-[calc(100%-1rem)] max-h-[min(100%,220px)] w-auto sm:max-h-[min(100%,248px)] md:max-h-[min(100%,280px)]"
                  : "w-28 md:w-44"
              }`}
              alt=""
            />
            <div className="relative mb-2 min-w-0 flex-1 md:mb-4">
              <span className="mb-3 inline-block rounded-full bg-zinc-800 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                {abaPrincipal} • {manga.status}
              </span>

              {!somenteLeitura && (
                <button
                  type="button"
                  onClick={() => aoAtualizarDados(manga.id, { favorito: !manga.favorito })}
                  className={`absolute right-0 top-0 flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-800 transition-all ${manga.favorito ? "bg-zinc-800 text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]" : "text-zinc-600 hover:text-white"}`}
                >
                  <span className="text-2xl">{manga.favorito ? "⭐" : "☆"}</span>
                </button>
              )}

              <h2
                className={`text-2xl font-black italic leading-none tracking-tighter text-white md:text-4xl xl:text-5xl ${somenteLeitura ? "" : "pr-14"}`}
              >
                {manga.titulo}
              </h2>
            </div>
            <div className="absolute right-4 top-4 flex items-center gap-1.5 md:right-8 md:top-8 md:gap-2">
              {podeEditarPrivilegiado && !somenteLeitura && (
                <button
                  type="button"
                  disabled={salvando}
                  onClick={() => {
                    if (modoEdicao) void sairModoEdicaoComPersistencia();
                    else entrarModoEdicao();
                  }}
                  className="flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-zinc-950/80 px-3 py-2 text-[8px] font-black uppercase tracking-widest text-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.25)] transition-all hover:border-cyan-400 hover:shadow-[0_0_22px_rgba(34,211,238,0.45)] enabled:cursor-pointer disabled:opacity-50 md:px-4 md:text-[9px]"
                >
                  {modoEdicao ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">{modoEdicao ? "Fechar edição" : "Editar"}</span>
                </button>
              )}
              <button
                type="button"
                title={isExpanded ? "Restaurar tamanho" : "Maximizar"}
                onClick={() => setIsExpanded((e) => !e)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700/80 text-zinc-400 transition-all hover:border-cyan-500/50 hover:text-cyan-200 hover:shadow-[0_0_16px_rgba(34,211,238,0.35)]"
              >
                {isExpanded ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
              </button>
              <button
                type="button"
                onClick={aoFechar}
                className="p-2 text-2xl font-black text-zinc-600 transition-colors hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        <div className={bodyShell}>
          <div className={bodyScroll}>
            <div className="px-6 pt-4">
              <div className="mb-4 flex justify-center space-x-6 border-b border-white/10 pb-2">
                {(["STATUS", "ARQUIVOS", "REGISTROS"] as const).map((aba) => (
                  <button
                    key={aba}
                    type="button"
                    onClick={() => setAbaAtiva(aba)}
                    className={`border-b-2 pb-2 text-xs font-black uppercase tracking-widest transition-colors ${
                      abaAtiva === aba
                        ? "border-green-500 text-green-500"
                        : "border-transparent text-zinc-500 hover:text-white"
                    }`}
                  >
                    {aba}
                  </button>
                ))}
              </div>
            </div>

            {abaAtiva === "STATUS" && (
              <div className={`${gridClass} min-h-0`}>
                <div className={colMain}>
                  <div className="space-y-4">
                    {progressoAnimeOuSerie ? (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 sm:items-stretch">
                          <div className="flex h-full min-w-0 flex-col items-center justify-center rounded-2xl border border-white/5 border-x-4 border-x-blue-500 bg-black/40 p-5">
                            <p className="mb-3 flex items-center justify-center text-center text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">
                              <Layers className="mr-2 h-4 w-4 shrink-0" aria-hidden />
                              Temporadas
                            </p>
                            {modoEdicao ? (
                              <div className="flex w-full min-w-0 flex-col items-center justify-center gap-3">
                                <div className="flex w-full max-w-full items-center justify-center gap-x-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setDraftTempAssist((t) => Math.max(0, t - 1))}
                                    className="h-10 w-10 shrink-0 rounded-xl bg-zinc-800 text-xl font-black transition-all hover:bg-zinc-700"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min={0}
                                    className="w-20 rounded-xl border border-zinc-800 bg-black/60 py-2 text-center text-3xl font-black text-white outline-none transition-colors [appearance:textfield] focus:border-cyan-500/50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                    value={draftTempAssist}
                                    onChange={(e) => setDraftTempAssist(parseInt(e.target.value, 10) || 0)}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setDraftTempAssist((t) => t + 1)}
                                    className="h-10 w-10 shrink-0 rounded-xl bg-zinc-800 text-xl font-black transition-all hover:bg-zinc-700"
                                  >
                                    +
                                  </button>
                                </div>
                                <div className="flex w-full max-w-full items-center justify-center gap-x-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setDraftTempTotais((t) => Math.max(0, t - 1))}
                                    className="h-10 w-10 shrink-0 rounded-xl bg-zinc-800 text-xl font-black transition-all hover:bg-zinc-700"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min={0}
                                    className="w-20 rounded-xl border border-zinc-800 bg-black/60 py-2 text-center text-3xl font-black text-zinc-300 outline-none transition-colors [appearance:textfield] focus:border-cyan-500/50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                    value={draftTempTotais}
                                    onChange={(e) => setDraftTempTotais(parseInt(e.target.value, 10) || 0)}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setDraftTempTotais((t) => t + 1)}
                                    className="h-10 w-10 shrink-0 rounded-xl bg-zinc-800 text-xl font-black transition-all hover:bg-zinc-700"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-4">
                                <span className="text-4xl font-black tabular-nums text-white">
                                  {intProgressoManga(manga.temporadas_assistidas)}
                                </span>
                                <span className="text-sm font-bold text-zinc-600">
                                  / {manga.temporadas_totais != null && manga.temporadas_totais > 0 ? manga.temporadas_totais : "?"}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex h-full min-w-0 flex-col items-center justify-center rounded-2xl border border-white/5 border-x-4 border-x-emerald-500 bg-black/40 p-5">
                            <p className="mb-3 flex items-center justify-center text-center text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">
                              <PlaySquare className="mr-2 h-4 w-4 shrink-0" aria-hidden />
                              Episódios
                            </p>
                            {modoEdicao ? (
                              <div className="flex w-full max-w-full items-center justify-center gap-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => setDraftCap((c) => Math.max(0, c - 1))}
                                  className="h-10 w-10 shrink-0 rounded-xl bg-zinc-800 text-xl font-black transition-all hover:bg-zinc-700"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  className="w-20 rounded-xl border border-zinc-800 bg-black/60 py-2 text-center text-4xl font-black text-white outline-none transition-colors [appearance:textfield] focus:border-cyan-500/50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                  value={draftCap}
                                  onChange={(e) => setDraftCap(parseInt(e.target.value, 10) || 0)}
                                />
                                <button
                                  type="button"
                                  onClick={() => setDraftCap((c) => c + 1)}
                                  className="h-10 w-10 shrink-0 rounded-xl bg-zinc-800 text-xl font-black transition-all hover:bg-zinc-700"
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-4">
                                <span className="text-5xl font-black tabular-nums text-white">{manga.capitulo_atual}</span>
                                <span className="text-sm font-bold text-zinc-600">/ {manga.total_capitulos || "?"}</span>
                              </div>
                            )}
                            <p className="mt-2 w-full text-center text-[10px] font-bold uppercase italic tracking-widest text-zinc-700">
                              Meta Final (ep.): {manga.total_capitulos || "?"}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="min-w-0 rounded-2xl border border-white/5 border-l-2 border-l-emerald-500 bg-black/40 p-4">
                          <p className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">
                            <span className="shrink-0" aria-hidden>
                              🎬
                            </span>
                            {tituloProgressoUnico}
                          </p>
                          {modoEdicao ? (
                            <div className="flex min-w-0 items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => setDraftCap((c) => Math.max(0, c - 1))}
                                className="h-10 w-10 rounded-xl bg-zinc-800 text-xl font-black transition-all hover:bg-zinc-700"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                className="w-24 rounded-xl border border-zinc-800 bg-black/60 py-2 text-center text-4xl font-black text-white outline-none transition-colors [appearance:textfield] focus:border-cyan-500/50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                value={draftCap}
                                onChange={(e) => setDraftCap(parseInt(e.target.value, 10) || 0)}
                              />
                              <button
                                type="button"
                                onClick={() => setDraftCap((c) => c + 1)}
                                className="h-10 w-10 rounded-xl bg-zinc-800 text-xl font-black transition-all hover:bg-zinc-700"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-4">
                              <span className="text-5xl font-black tabular-nums text-white">{manga.capitulo_atual}</span>
                              <span className="text-sm font-bold text-zinc-600">/ {manga.total_capitulos || "?"}</span>
                            </div>
                          )}
                          <p className="mt-2 text-center text-[10px] font-bold uppercase italic tracking-widest text-zinc-700">
                            Meta Final: {manga.total_capitulos || "?"}
                          </p>
                        </div>
                      )}

                    <div className="flex h-full min-w-0 flex-col items-center justify-center rounded-2xl border border-white/5 border-x-4 border-x-yellow-500 bg-black/40 p-5 text-center transition-all">
                      <p className="mb-3 flex items-center justify-center text-[10px] font-black uppercase tracking-[0.2em] text-yellow-500">
                        <Star
                          className="mr-2 h-4 w-4 shrink-0 fill-yellow-500 text-yellow-500"
                          aria-hidden
                        />
                        Sua Avaliação (0-10)
                      </p>
                      <div className="flex w-full min-w-0 flex-col items-center justify-center">
                        {modoEdicao ? (
                          <input
                            type="number"
                            max={10}
                            min={0}
                            className="w-full max-w-[12rem] rounded-xl border border-zinc-800 bg-black p-3 text-center text-3xl font-black text-yellow-500 outline-none transition-all focus:border-cyan-500/40"
                            value={draftNota}
                            onChange={(e) => {
                              let val = parseInt(e.target.value, 10);
                              if (Number.isNaN(val)) val = 0;
                              if (val > 10) val = 10;
                              if (val < 0) val = 0;
                              setDraftNota(val);
                            }}
                          />
                        ) : (
                          <p className="text-4xl font-black text-yellow-500">{manga.nota_pessoal ?? 0}</p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-4">
                      <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Estado da Jornada</p>
                      {somenteLeitura ? (
                        <p className="rounded-xl border border-zinc-800/80 bg-black/40 px-3 py-3 text-sm font-bold uppercase text-zinc-200">
                          {manga.status}
                        </p>
                      ) : (
                        <select
                          value={manga.status}
                          onChange={(e) => handleStatusChange(e.target.value)}
                          className="w-full cursor-pointer appearance-none rounded-xl border border-zinc-800 bg-black p-3 text-sm font-bold uppercase text-white outline-none transition-all focus:border-white/20"
                        >
                          {abaPrincipal === "MUSICA" ? (
                            <>
                              <option value="Lendo">Ouvindo</option>
                              <option value="Favoritas">Favoritas</option>
                              <option value="Playlist">Playlist</option>
                              <option value="Completos">Completos</option>
                              <option value="Pausados">Pausados</option>
                              <option value="Dropados">Dropados</option>
                            </>
                          ) : (
                            <>
                              <option value="Lendo">
                                {abaPrincipal === "ANIME" || abaPrincipal === "FILME" || abaPrincipal === "SERIE"
                                  ? "Assistindo"
                                  : abaPrincipal === "JOGO"
                                    ? "Jogando"
                                    : "Lendo"}
                              </option>
                              <option value="Planejo Ler">
                                {abaPrincipal === "ANIME" || abaPrincipal === "FILME" || abaPrincipal === "SERIE"
                                  ? "Planejo Assistir"
                                  : abaPrincipal === "JOGO"
                                    ? "Planejo Jogar"
                                    : "Planejo Ler"}
                              </option>
                              <option value="Completos">Completos</option>
                              <option value="Pausados">Pausados</option>
                              <option value="Dropados">Dropados</option>
                            </>
                          )}
                        </select>
                      )}
                    </div>
                  </div>
                </div>

                <div className={colWide}>
                  <div className="space-y-4">
                    <div>
                      <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Arquivos de Dados / Sinopse</p>
                      <div className="relative rounded-[2rem] border border-zinc-800/50 bg-zinc-950/50 p-4 group">
                        <p className="max-h-52 overflow-y-auto pr-3 text-sm italic leading-relaxed text-zinc-400 custom-scrollbar">
                          {manga.sinopse || "Sem descrição disponível nos bancos de dados Hunter."}
                        </p>
                        <button
                          type="button"
                          onClick={aoTraduzir}
                          className="mt-4 flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-blue-500 transition-all hover:text-white"
                        >
                          🌐 Traduzir Relatório
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {abaAtiva === "ARQUIVOS" && (
              <div className={`${gridClass} min-h-0`}>
                <div className={colMain}>
                  <div className="space-y-4">
                    {modoEdicao ? (
                      <div className="rounded-3xl border border-cyan-500/20 bg-zinc-900/50 p-6 shadow-[0_0_18px_rgba(34,211,238,0.12)]">
                        <p className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-500/80">
                          Link da capa personalizada
                          {TEM_COLUNA_CAPA_URL_NO_SUPABASE ? " (coluna capa_url)" : " (coluna capa)"}
                        </p>
                        <input
                          type="text"
                          placeholder="https://…"
                          className="w-full rounded-xl border border-zinc-800 bg-black p-4 text-xs text-zinc-200 outline-none transition-all focus:border-cyan-500/50"
                          value={draftCapaUrl}
                          onChange={(e) => setDraftCapaUrl(e.target.value)}
                        />
                        <p className="mt-2 text-[9px] text-zinc-600">
                          {TEM_COLUNA_CAPA_URL_NO_SUPABASE
                            ? `Opcional. Deixe vazio para usar só a capa padrão (${manga.capa ? "TMDB/AniList" : "—"}).`
                            : "Sem a coluna capa_url no Supabase, o link é gravado no campo capa. Só envia ao banco se você alterar o texto em relação à capa atual."}
                        </p>

                        <p className="mb-3 mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-500/80">Link manual (link_url)</p>
                        <input
                          type="url"
                          placeholder="https://..."
                          className="w-full rounded-xl border border-zinc-800 bg-black p-4 text-xs text-zinc-200 outline-none transition-all focus:border-cyan-500/50"
                          value={draftLink}
                          onChange={(e) => setDraftLink(e.target.value)}
                        />

                        <button
                          type="button"
                          disabled={salvando}
                          onClick={() => void salvarAlteracoes()}
                          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-400/50 bg-cyan-500/10 py-4 text-[10px] font-black uppercase tracking-widest text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all hover:border-cyan-300 hover:shadow-[0_0_28px_rgba(34,211,238,0.4)] disabled:opacity-50"
                        >
                          <Save className="h-4 w-4" />
                          {salvando ? "Salvando…" : "Salvar alterações"}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-2 rounded-2xl border border-white/5 bg-black/40 p-4">
                          <div className="min-w-0 flex-1">
                            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Link da Capa</p>
                            <p className="mt-1 truncate text-xs text-zinc-300">
                              {manga.capa_url?.trim() ? manga.capa_url.trim() : "Padrão da API"}
                            </p>
                          </div>
                          {somenteLeitura ? (
                            <span className="flex items-center text-zinc-600 gap-1">
                              <Lock className="h-3 w-3" aria-hidden /> Leitura
                            </span>
                          ) : (
                            podeEditarPrivilegiado && (
                              <button
                                type="button"
                                onClick={entrarModoEdicao}
                                className="shrink-0 rounded-lg border border-white/10 p-2 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
                                title="Editar links"
                                aria-label="Editar links"
                              >
                                <PenLine className="h-4 w-4" />
                              </button>
                            )
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2 rounded-2xl border border-white/5 bg-black/40 p-4">
                          <div className="min-w-0 flex-1">
                            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Link Manual</p>
                            <p className="mt-1 truncate text-xs text-zinc-300">
                              {manga.link_url?.trim() ? manga.link_url.trim() : "Nenhum"}
                            </p>
                          </div>
                          {somenteLeitura ? (
                            <span className="flex items-center text-zinc-600 gap-1">
                              <Lock className="h-3 w-3" aria-hidden /> Leitura
                            </span>
                          ) : (
                            podeEditarPrivilegiado && (
                              <button
                                type="button"
                                onClick={entrarModoEdicao}
                                className="shrink-0 rounded-lg border border-white/10 p-2 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
                                title="Editar links"
                                aria-label="Editar links"
                              >
                                <PenLine className="h-4 w-4" />
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className={colWide}>
                  <div className="space-y-4">
                    {(modoEdicao || ondeVer.length > 0) && (
                      <div>
                        <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Onde ver</p>
                        {modoEdicao ? (
                          <div className="space-y-4 rounded-[2rem] border border-cyan-500/15 bg-zinc-950/50 p-4">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">
                              Pré-visualização (link manual + provedores)
                            </p>
                            <WatchProviderStrip providers={ondeVerPreviewEdicao} size="md" className="gap-2" />
                            <div className="border-t border-zinc-800/80 pt-4">
                              <p className="mb-3 text-[9px] font-black uppercase tracking-widest text-red-400/90">
                                Provedores (provider_data)
                              </p>
                              {draftProviders.length === 0 ? (
                                <p className="text-xs italic text-zinc-600">Nenhum provedor no JSON — adicione pela busca ou importação.</p>
                              ) : (
                                <ul className="space-y-4">
                                  {draftProviders.map((p, i) => (
                                    <li
                                      key={`${p.name}-${i}`}
                                      className="flex gap-3 rounded-xl border border-zinc-800/90 bg-black/40 p-3"
                                    >
                                      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-red-500/20">
                                        {p.logo ? (
                                          <img src={p.logo} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                          <span className="flex h-full items-center justify-center text-[10px] text-zinc-600">—</span>
                                        )}
                                        <button
                                          type="button"
                                          title="Remover provedor"
                                          onClick={() => removerProvider(i)}
                                          className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border border-red-500/60 bg-zinc-950 text-red-400 shadow-[0_0_10px_rgba(248,113,113,0.45)] transition hover:scale-110 hover:border-red-400 hover:text-red-300"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </button>
                                      </div>
                                      <div className="min-w-0 flex-1 space-y-2">
                                        <input
                                          type="text"
                                          placeholder="Nome da plataforma"
                                          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-bold text-white outline-none focus:border-cyan-500/40"
                                          value={p.name}
                                          onChange={(e) => atualizarProvider(i, { name: e.target.value })}
                                        />
                                        <input
                                          type="url"
                                          placeholder="URL"
                                          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-[11px] text-cyan-100/90 outline-none focus:border-cyan-500/40"
                                          value={p.link}
                                          onChange={(e) => atualizarProvider(i, { link: e.target.value })}
                                          onBlur={() => {
                                            setDraftProviders((prev) => {
                                              const row = prev[i];
                                              if (!row) return prev;
                                              const u = row.link.trim();
                                              if (!u) return prev;
                                              const next = [...prev];
                                              const logoAtual = row.logo?.trim();
                                              next[i] = {
                                                ...row,
                                                logo: logoAtual || faviconForUrl(u),
                                              };
                                              return next;
                                            });
                                          }}
                                        />
                                        <input
                                          type="text"
                                          placeholder="URL do logo (opcional)"
                                          className="w-full rounded-lg border border-zinc-800/80 bg-zinc-950/80 px-3 py-1.5 text-[10px] text-zinc-400 outline-none focus:border-zinc-600"
                                          value={p.logo || ""}
                                          onChange={(e) => atualizarProvider(i, { logo: e.target.value })}
                                        />
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-[2rem] border border-zinc-800/80 bg-zinc-950/40 p-4">
                            <WatchProviderStrip providers={ondeVer} size="md" className="gap-2" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {abaAtiva === "REGISTROS" && (
              <div className="space-y-6 px-8 pb-8">
                <div>
                  <p className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Notas de Campo</p>
                  {somenteLeitura ? (
                    <div className="min-h-[120px] w-full rounded-[2rem] border border-zinc-800/80 bg-zinc-950/50 p-6 text-sm text-zinc-400 custom-scrollbar">
                      {manga.comentarios?.trim() ? manga.comentarios : "—"}
                    </div>
                  ) : (
                    <textarea
                      className="min-h-[120px] w-full resize-none rounded-[2rem] border border-zinc-800 bg-zinc-950/50 p-6 text-sm text-zinc-300 outline-none transition-all focus:border-zinc-600 custom-scrollbar"
                      placeholder="Escreva suas anotações sobre esta obra..."
                      value={manga.comentarios || ""}
                      onChange={(e) => aoAtualizarDados(manga.id, { comentarios: e.target.value })}
                    />
                  )}
                </div>

                {!somenteLeitura && (
                  <div className="flex justify-end pt-4">
                    <button
                      type="button"
                      onClick={() => aoDeletar(manga.id)}
                      className="rounded-2xl border border-red-500/20 px-8 py-4 text-[10px] font-black uppercase text-red-500 transition-all hover:bg-red-500 hover:text-white hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                    >
                      Eliminar Registro da Estante
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
