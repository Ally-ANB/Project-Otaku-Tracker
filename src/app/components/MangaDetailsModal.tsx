"use client";

import { useEffect, useState } from "react";
import { Pencil, Save, X } from "lucide-react";
import { dbClient, definirSenhaMestreNaSessao } from "@/lib/dbClient";
import { mergeManualLinkAndProviders } from "@/lib/watchProviders";
import WatchProviderStrip from "./WatchProviderStrip";

interface Manga {
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
  provider_data?: unknown;
}

interface MangaDetailsModalProps {
  manga: Manga;
  tabelaObra: string;
  abaPrincipal: "MANGA" | "ANIME" | "FILME" | "LIVRO" | "SERIE" | "JOGO" | "MUSICA";
  podeEditarPrivilegiado: boolean;
  solicitarSenhaMestre: () => Promise<string | null>;
  aoFechar: () => void;
  aoAtualizarCapitulo: (manga: Manga, novo: number) => void;
  aoAtualizarDados: (id: number, campos: Record<string, unknown>) => void;
  aoDeletar: (id: number) => void;
  aoTraduzir: () => void;
  aoEdicaoSalva: (campos: Partial<Manga>) => void;
  mostrarFeedback: (mensagem: string, tipo: "sucesso" | "erro" | "aviso" | "anilist") => void;
}

export default function MangaDetailsModal({
  manga,
  tabelaObra,
  abaPrincipal,
  podeEditarPrivilegiado,
  solicitarSenhaMestre,
  aoFechar,
  aoAtualizarCapitulo,
  aoAtualizarDados,
  aoDeletar,
  aoTraduzir,
  aoEdicaoSalva,
  mostrarFeedback,
}: MangaDetailsModalProps) {
  const [modoEdicao, setModoEdicao] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [draftCap, setDraftCap] = useState(manga.capitulo_atual);
  const [draftNota, setDraftNota] = useState(manga.nota_pessoal || 0);
  const [draftLink, setDraftLink] = useState(manga.link_url?.trim() ?? "");

  useEffect(() => {
    setModoEdicao(false);
    setDraftCap(manga.capitulo_atual);
    setDraftNota(manga.nota_pessoal || 0);
    setDraftLink(manga.link_url?.trim() ?? "");
  }, [manga.id, manga.capitulo_atual, manga.nota_pessoal, manga.link_url]);

  const ondeVer = mergeManualLinkAndProviders(manga.link_url, manga.provider_data);

  const handleStatusChange = (novoStatus: string) => {
    const campos: Record<string, unknown> = { status: novoStatus };

    if (novoStatus === "Completos" && manga.total_capitulos > 0) {
      aoAtualizarCapitulo(manga, manga.total_capitulos);
    } else {
      aoAtualizarDados(manga.id, campos);
    }
  };

  async function salvarEdicao() {
    let cap = Math.max(0, Math.floor(Number(draftCap) || 0));
    let nota = Math.min(10, Math.max(0, Math.floor(Number(draftNota) || 0)));
    let novoStatus = manga.status;
    if (manga.total_capitulos > 0 && cap >= manga.total_capitulos) novoStatus = "Completos";

    const agora = new Date().toISOString();
    const dados: Record<string, unknown> = {
      capitulo_atual: cap,
      nota_pessoal: nota,
      link_url: draftLink.trim() || null,
      status: novoStatus,
      ultima_leitura: agora,
    };

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
        aoEdicaoSalva({
          capitulo_atual: cap,
          nota_pessoal: nota,
          link_url: draftLink.trim() || null,
          status: novoStatus,
          ultima_leitura: agora,
        });
        mostrarFeedback("Alterações salvas na base.", "sucesso");
        setModoEdicao(false);
      }
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[#0e0e11] w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[3rem] border border-zinc-800 shadow-2xl custom-scrollbar relative">
        <div className="relative h-64 md:h-80 w-full overflow-hidden">
          <img src={manga.capa} className="w-full h-full object-cover blur-3xl opacity-20 scale-110" alt="" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e11] to-transparent" />

          <div className="absolute inset-0 p-8 flex flex-col md:flex-row gap-8 items-end">
            <img src={manga.capa} className="w-32 md:w-44 aspect-[2/3] object-cover rounded-2xl shadow-2xl border-4 border-zinc-900" alt="" />
            <div className="flex-1 mb-4 relative">
              <span className="bg-zinc-800 text-zinc-400 text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest mb-3 inline-block">
                {abaPrincipal} • {manga.status}
              </span>

              <button
                onClick={() => aoAtualizarDados(manga.id, { favorito: !manga.favorito })}
                className={`absolute top-0 right-0 w-12 h-12 flex items-center justify-center rounded-xl border border-zinc-800 transition-all ${manga.favorito ? "bg-zinc-800 text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]" : "text-zinc-600 hover:text-white"}`}
              >
                <span className="text-2xl">{manga.favorito ? "⭐" : "☆"}</span>
              </button>

              <h2 className="text-3xl md:text-5xl font-black text-white italic tracking-tighter leading-none pr-14">{manga.titulo}</h2>
            </div>
            <div className="absolute top-8 right-8 flex items-center gap-2">
              {podeEditarPrivilegiado && (
                <button
                  type="button"
                  onClick={() => (modoEdicao ? setModoEdicao(false) : setModoEdicao(true))}
                  className="flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-zinc-950/80 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.25)] transition-all hover:border-cyan-400 hover:shadow-[0_0_22px_rgba(34,211,238,0.45)]"
                >
                  {modoEdicao ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                  {modoEdicao ? "Fechar edição" : "Editar"}
                </button>
              )}
              <button type="button" onClick={aoFechar} className="text-zinc-600 hover:text-white transition-colors text-2xl font-black p-2">
                ✕
              </button>
            </div>
          </div>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="space-y-8">
            <div className="bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800 group hover:border-zinc-700 transition-all">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">Progresso Atual</p>
              {modoEdicao ? (
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setDraftCap((c) => Math.max(0, c - 1))}
                    className="w-10 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-all font-black text-xl"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    className="w-24 text-center bg-black/60 border border-zinc-800 rounded-xl py-2 text-4xl font-black text-white outline-none focus:border-cyan-500/50 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    value={draftCap}
                    onChange={(e) => setDraftCap(parseInt(e.target.value, 10) || 0)}
                  />
                  <button
                    type="button"
                    onClick={() => setDraftCap((c) => c + 1)}
                    className="w-10 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-all font-black text-xl"
                  >
                    +
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-4">
                  <span className="text-5xl font-black text-white tabular-nums">{manga.capitulo_atual}</span>
                  <span className="text-sm font-bold text-zinc-600">/ {manga.total_capitulos || "?"}</span>
                </div>
              )}
              <p className="text-center text-[10px] text-zinc-700 mt-2 font-bold uppercase tracking-widest italic">Meta Final: {manga.total_capitulos || "?"}</p>
            </div>

            <div className="bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800 group hover:border-zinc-700 transition-all">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">Sua Avaliação (0-10)</p>
              {modoEdicao ? (
                <input
                  type="number"
                  max={10}
                  min={0}
                  className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-3xl font-black text-yellow-500 text-center outline-none focus:border-cyan-500/40 transition-all"
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
                <p className="text-center text-4xl font-black text-yellow-500">{manga.nota_pessoal ?? 0}</p>
              )}
            </div>

            <div className="bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">Estado da Jornada</p>
              <select
                value={manga.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-sm font-bold text-white uppercase cursor-pointer outline-none focus:border-white/20 transition-all appearance-none"
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
            </div>

            {modoEdicao && (
              <div className="bg-zinc-900/50 p-6 rounded-3xl border border-cyan-500/20 shadow-[0_0_18px_rgba(34,211,238,0.12)]">
                <p className="text-[10px] font-black text-cyan-500/80 uppercase tracking-[0.2em] mb-4">Link manual (link_url)</p>
                <input
                  type="url"
                  placeholder="https://..."
                  className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-xs text-zinc-200 outline-none focus:border-cyan-500/50 transition-all"
                  value={draftLink}
                  onChange={(e) => setDraftLink(e.target.value)}
                />
                <button
                  type="button"
                  disabled={salvando}
                  onClick={salvarEdicao}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-400/50 bg-cyan-500/10 py-4 text-[10px] font-black uppercase tracking-widest text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all hover:border-cyan-300 hover:shadow-[0_0_28px_rgba(34,211,238,0.4)] disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {salvando ? "Salvando…" : "Salvar alterações"}
                </button>
              </div>
            )}
          </div>

          <div className="md:col-span-2 space-y-8">
            {ondeVer.length > 0 && (
              <div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">Onde ver</p>
                <div className="rounded-[2rem] border border-zinc-800/80 bg-zinc-950/40 p-5">
                  <WatchProviderStrip providers={ondeVer} size="md" className="gap-2" />
                </div>
              </div>
            )}

            <div>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">Arquivos de Dados / Sinopse</p>
              <div className="relative group bg-zinc-950/50 p-6 rounded-[2rem] border border-zinc-800/50">
                <p className="text-zinc-400 text-sm leading-relaxed max-h-60 overflow-y-auto pr-4 custom-scrollbar italic">
                  {manga.sinopse || "Sem descrição disponível nos bancos de dados Hunter."}
                </p>
                <button
                  onClick={aoTraduzir}
                  className="mt-6 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-blue-500 hover:text-white transition-all bg-blue-500/5 px-4 py-2 rounded-lg border border-blue-500/20"
                >
                  🌐 Traduzir Relatório
                </button>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">Notas de Campo</p>
              <textarea
                className="w-full bg-zinc-950/50 border border-zinc-800 p-6 rounded-[2rem] text-zinc-300 text-sm outline-none focus:border-zinc-600 transition-all min-h-[120px] resize-none custom-scrollbar"
                placeholder="Escreva suas anotações sobre esta obra..."
                value={manga.comentarios || ""}
                onChange={(e) => aoAtualizarDados(manga.id, { comentarios: e.target.value })}
              />
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => aoDeletar(manga.id)}
                className="px-8 py-4 rounded-2xl border border-red-500/20 text-red-500 text-[10px] font-black uppercase hover:bg-red-500 hover:text-white hover:shadow-[0_0_20px_rgba(239,68,68,0.2)] transition-all"
              >
                Eliminar Registro da Estante
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
