"use client";
import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { API_DB_PATH, limparSenhaMestreNaSessao, obterSenhaMestreRevelada } from "@/lib/dbClient";
import { anilistExternalToProviders, type WatchProvider } from "@/lib/watchProviders";
import WatchProviderStrip from "./WatchProviderStrip";
import { aplicarEconomiaPosAdicaoEstante } from "@/app/guilda/guildaRankEconomia";

// ==========================================
// 📦 SESSÃO 1: INTERFACES
// ==========================================
interface ResultadoBusca {
  id: number | string;
  titulo: string;
  capa: string;
  total: number;
  sinopse: string;
  fonte: "AniList" | "MyAnimeList" | "TMDB" | "Google Books" | "RAWG" | "Apple Music";
  providers?: WatchProvider[];
  /** Minutos por episódio (anime), vindo da API quando disponível. */
  duracao_episodio_minutos?: number;
}

interface AddMangaModalProps {
  estaAberto: boolean;
  fechar: () => void;
  usuarioAtual: string;
  abaPrincipal: "MANGA" | "ANIME" | "FILME" | "LIVRO" | "SERIE" | "JOGO" | "MUSICA";
  aoSalvar: (novoManga: any) => void;
  solicitarSenhaMestre?: () => Promise<string | null>;
  /** Toasts na home após economia de estante / rank (opcional). */
  mostrarFeedback?: (mensagem: string, tipo?: "sucesso" | "erro" | "aviso" | "anilist") => void;
  /** Token OAuth AniList do perfil ativo (opcional; senão tenta localStorage `anilist_token`). */
  anilistToken?: string | null;
}

export default function AddMangaModal({
  estaAberto,
  fechar,
  usuarioAtual,
  abaPrincipal,
  aoSalvar,
  solicitarSenhaMestre,
  mostrarFeedback,
  anilistToken,
}: AddMangaModalProps) {
  // ==========================================
  // 🔐 SESSÃO 2: ESTADOS DO MODAL
  // ==========================================
  const [modoManual, setModoManual] = useState(false);
  const [termoAnilist, setTermoAnilist] = useState("");
  const [resultados, setResultados] = useState<ResultadoBusca[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [traduzindo, setTraduzindo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  
  const [novoManga, setNovoManga] = useState({
    titulo: "",
    capa: "",
    capitulo_atual: 0,
    total_capitulos: 0,
    status: "Planejo Ler",
    sinopse: "",
    favorito: false,
    link_url: "",
    provider_data: [] as WatchProvider[],
    duracao_episodio_minutos: 0,
  });

  async function obterSenhaMestreCacheada() {
    const senhaEmCache = obterSenhaMestreRevelada();
    if (senhaEmCache) return senhaEmCache;
    if (solicitarSenhaMestre) return await solicitarSenhaMestre();
    return null;
  }

  async function requisicaoDbInsertSegura(tabela: string, dados: any, exigirSenhaMestre = true) {
    const senhaMestre = exigirSenhaMestre ? await obterSenhaMestreCacheada() : undefined;
    if (exigirSenhaMestre && !senhaMestre) return { ok: false, error: "Operação cancelada." };

    const res = await fetch(API_DB_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tabela, operacao: "insert", dados, ...(exigirSenhaMestre ? { senhaMestre } : {}) })
    });

    const data = await res.json();
    if (res.status === 401) limparSenhaMestreNaSessao();

    return { ok: res.ok && !!data?.success, data };
  }

  useEffect(() => {
    if (!estaAberto) {
      setModoManual(false);
      setTermoAnilist("");
      setResultados([]);
      setNovoManga({
        titulo: "",
        capa: "",
        capitulo_atual: 0,
        total_capitulos: 0,
        status: "Planejo Ler",
        sinopse: "",
        favorito: false,
        link_url: "",
        provider_data: [],
        duracao_episodio_minutos: 0,
      });
    }
  }, [estaAberto]);

  // ==========================================
  // 🧠 SESSÃO 3: MOTOR DE BUSCA (COMPLETO)
  // ==========================================
  async function executarBusca() {
    if (termoAnilist.length < 3) return;
    
    setBuscando(true);
    setResultados([]); 

    try {
      const dedupeResultadosBusca = (arr: ResultadoBusca[]) =>
        arr.filter(
          (valor: ResultadoBusca, indice: number, self: ResultadoBusca[]) =>
            indice === self.findIndex((t) => t.id === valor.id && t.fonte === valor.fonte)
        );

      let termoFinal = termoAnilist;

      // 🛑 Lógica de IA e Cache (Restaurada)
      if (abaPrincipal !== "FILME" && abaPrincipal !== "LIVRO" && abaPrincipal !== "JOGO" && abaPrincipal !== "MUSICA") {
        const { data: cacheHit } = await supabase.from('search_cache').select('resultado_ia').ilike('termo_original', termoAnilist).maybeSingle();

        if (cacheHit) {
          termoFinal = cacheHit.resultado_ia;
        } else {
          const resIA = await fetch('/api/tradutor-ia', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ termo: termoAnilist })
          });
          
          if (resIA.ok) {
            const jsonIA = await resIA.json();
            if (jsonIA.resultado && !jsonIA.resultado.includes('⚠️')) {
              termoFinal = jsonIA.resultado;
              await requisicaoDbInsertSegura('search_cache', { termo_original: termoAnilist, resultado_ia: termoFinal }, false);
            }
          }
        }
      }

      // 🎬 Filmes e Séries via TMDB Seguro
      if (abaPrincipal === "FILME" || abaPrincipal === "SERIE") {
        const tipoTmdb = abaPrincipal === "FILME" ? "movie" : "tv";
        const res = await fetch(`/api/tmdb?q=${encodeURIComponent(termoFinal)}&type=${tipoTmdb}`);
        const json = await res.json();
        
        if (json.results) {
          const listaTmdb = json.results.slice(0, 5).map((m: any): ResultadoBusca => ({
            id: m.id,
            titulo: m.title || m.name || m.original_name,
            capa: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : "https://placehold.co/400x600/1f1f22/52525b.png?text=SEM+CAPA",
            total: m.number_of_episodes || 1,
            sinopse: m.overview || "Sem sinopse.",
            fonte: "TMDB",
            providers: Array.isArray(m.providers) ? m.providers : [],
          }));
          setResultados(dedupeResultadosBusca(listaTmdb));
        }

      // 📖 Livros via Google Books Seguro
      } else if (abaPrincipal === "LIVRO") {
        const res = await fetch(`/api/books?q=${encodeURIComponent(termoFinal)}`);
        const json = await res.json();
        
        if (json.items) {
          const listaLivros = json.items.map((m: any): ResultadoBusca => {
            const links = m.volumeInfo?.imageLinks;
            return {
              id: m.id,
              titulo: m.volumeInfo?.title || "Sem Título",
              capa: links?.thumbnail?.replace('http:', 'https:') || "https://placehold.co/400x600/1f1f22/52525b.png?text=SEM+CAPA",
              total: m.volumeInfo?.pageCount || 1,
              sinopse: m.volumeInfo?.description || "Sem sinopse.",
              fonte: "Google Books",
            };
          });
          setResultados(dedupeResultadosBusca(listaLivros));
        }

      // 🎮 Motor RAWG (Jogos) - VIA BACKEND SEGURO
      } else if (abaPrincipal === "JOGO") {
        // Agora chamamos a nossa própria rota blindada
        const resRawg = await fetch(`/api/rawg?q=${encodeURIComponent(termoFinal)}`);
        const jsonRawg = await resRawg.json();
        
        if (jsonRawg.results) {
          const listaRawg = jsonRawg.results.map((g: any): ResultadoBusca => ({
            id: g.id,
            titulo: g.name,
            capa: g.background_image || "https://placehold.co/400x600/1f1f22/52525b.png?text=SEM+CAPA",
            total: 100, // RAWG não fornece total de horas/capítulos na busca simples
            sinopse: "Lançamento: " + (g.released || "Não informada"),
            fonte: "RAWG",
          }));
          setResultados(dedupeResultadosBusca(listaRawg));
        }

      // 🎵 Motor iTunes / Apple Music (Músicas - Álbuns)
      } else if (abaPrincipal === "MUSICA") {
        // API aberta, não precisa de chave. Focando em álbuns para ter a capa quadrada bonita.
        const resItunes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(termoFinal)}&entity=album&limit=5`);
        const jsonItunes = await resItunes.json();

        if (jsonItunes.results) {
          const listaItunes = jsonItunes.results.map((m: any): ResultadoBusca => ({
            id: m.collectionId,
            titulo: `${m.artistName} - ${m.collectionName}`,
            capa: m.artworkUrl100?.replace('100x100bb', '600x600bb') || "https://placehold.co/400x400/1f1f22/52525b.png?text=SEM+CAPA",
            total: m.trackCount || 1,
            sinopse: `Gênero: ${m.primaryGenreName}\nLançamento: ${m.releaseDate?.substring(0, 4) || "N/A"}`,
            fonte: "Apple Music",
          }));
          setResultados(dedupeResultadosBusca(listaItunes));
        }

      // 🇯🇵 Motor AniList / MyAnimeList (Restaurado)
      } else if (abaPrincipal === "MANGA" || abaPrincipal === "ANIME") {
        const resAni = await fetch("https://graphql.anilist.co", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `query ($search: String, $type: MediaType) {
              Page(perPage: 5) {
                media(search: $search, type: $type) {
                  id
                  title { romaji english }
                  coverImage { large }
                  chapters
                  episodes
                  duration
                  description
                  externalLinks { url site type }
                }
              }
            }`,
            variables: { search: termoFinal, type: abaPrincipal },
          }),
        });
        const jsonAni = await resAni.json();
        const listaAni = jsonAni.data?.Page?.media || [];

        if (listaAni.length > 0) {
          const listaMapeada = listaAni.map((m: any): ResultadoBusca => ({
            id: m.id,
            titulo: m.title.romaji || m.title.english,
            capa: m.coverImage.large,
            total: abaPrincipal === "MANGA" ? (m.chapters || 0) : (m.episodes || 0),
            sinopse: m.description || "",
            fonte: "AniList",
            providers: anilistExternalToProviders(m.externalLinks),
            duracao_episodio_minutos:
              abaPrincipal === "ANIME" && typeof m.duration === "number" && m.duration > 0 ? m.duration : undefined,
          }));
          const resultadosUnicos = listaMapeada.filter(
            (valor: ResultadoBusca, indice: number, self: ResultadoBusca[]) =>
              indice === self.findIndex((t) => t.id === valor.id && t.fonte === valor.fonte)
          );
          setResultados(resultadosUnicos);
        } else {
          const resMal = await fetch(`https://api.jikan.moe/v4/${abaPrincipal === "MANGA" ? "manga" : "anime"}?q=${encodeURIComponent(termoFinal)}&limit=5`);
          const jsonMal = await resMal.json();
          const listaMal: ResultadoBusca[] =
            jsonMal.data?.map((m: any): ResultadoBusca => {
              const durStr = abaPrincipal === "ANIME" && typeof m.duration === "string" ? m.duration : "";
              const durMatch = durStr.match(/(\d+)/);
              const durMin = durMatch ? parseInt(durMatch[1], 10) : 0;
              return {
                id: m.mal_id,
                titulo: m.title,
                capa: m.images.jpg.large_image_url,
                total: abaPrincipal === "MANGA" ? (m.chapters || 0) : (m.episodes || 0),
                sinopse: m.synopsis || "",
                fonte: "MyAnimeList",
                duracao_episodio_minutos: durMin > 0 ? durMin : undefined,
              };
            }) || [];
          const resultadosUnicos = listaMal.filter(
            (valor: ResultadoBusca, indice: number, self: ResultadoBusca[]) =>
              indice === self.findIndex((t) => t.id === valor.id && t.fonte === valor.fonte)
          );
          setResultados(resultadosUnicos);
        }
      } else {
        setResultados([]);
      }
    } catch (err) { console.error(err); } finally { setBuscando(false); }
  }

  // ==========================================
  // 🛠️ SESSÃO 4: AÇÕES E SALVAMENTO
  // ==========================================
  async function traduzirSinopse() {
    if (!novoManga.sinopse) return;
    setTraduzindo(true);
    try {
      const textoLimpo = novoManga.sinopse.replace(/<[^>]*>?/gm, '');
      const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=pt-BR&dt=t&q=${encodeURIComponent(textoLimpo)}`);
      const json = await res.json();
      setNovoManga(prev => ({ ...prev, sinopse: json[0].map((item: any) => item[0]).join('') }));
    } catch { alert("Erro na tradução."); } finally { setTraduzindo(false); }
  }

  async function salvarObraFinal() {
    if (!usuarioAtual) return;
    setSalvando(true);
    const tabelaDb = abaPrincipal === "MANGA" ? "mangas" : abaPrincipal === "ANIME" ? "animes" : abaPrincipal === "FILME" ? "filmes" : abaPrincipal === "LIVRO" ? "livros" : abaPrincipal === "SERIE" ? "series" : abaPrincipal === "JOGO" ? "jogos" : "musicas";
    let progressoFinal = novoManga.capitulo_atual;
    if (novoManga.status === "Completos" && novoManga.total_capitulos > 0) progressoFinal = novoManga.total_capitulos;

    const linkTrim = novoManga.link_url?.trim() || "";
    const obraParaSalvar = {
      ...novoManga,
      capitulo_atual: progressoFinal,
      usuario: usuarioAtual,
      ultima_leitura: new Date().toISOString(),
      link_url: linkTrim || null,
      provider_data: novoManga.provider_data?.length ? novoManga.provider_data : null,
    };
    const dadosParaSalvar =
      tabelaDb === "animes"
        ? {
            ...obraParaSalvar,
            duracao_episodio_minutos: novoManga.duracao_episodio_minutos || 0,
            temporadas_totais: 0,
            temporadas_assistidas: 0,
            episodios_assistidos: 0,
          }
        : (() => {
            const { duracao_episodio_minutos: _d, ...rest } = obraParaSalvar;
            return rest;
          })();
    console.log("=== SALVANDO NO SUPABASE ===", dadosParaSalvar);
    const resultado = await requisicaoDbInsertSegura(tabelaDb, dadosParaSalvar, true);
    if (resultado.ok) {
      try {
        const efeitos = await aplicarEconomiaPosAdicaoEstante(usuarioAtual);
        efeitos.mensagensToast.forEach((msg) => mostrarFeedback?.(msg, "sucesso"));
      } catch {
        /* economia opcional — obra já foi salva */
      }
      // --- INÍCIO DA INTEGRAÇÃO COM ANILIST (PUSH NOVO ITEM) ---
      try {
        const token =
          (anilistToken && String(anilistToken).length > 0 ? anilistToken : null) ||
          (typeof window !== "undefined" ? localStorage.getItem("anilist_token") : null);
        if (token && (abaPrincipal === "MANGA" || abaPrincipal === "ANIME")) {
          fetch("/api/anilist/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token,
              usuario: usuarioAtual,
              tipoObra: abaPrincipal,
              acao: "SALVAR",
              titulo: String(obraParaSalvar.titulo ?? "").trim(),
              capitulo: progressoFinal,
              statusLocal: obraParaSalvar.status,
            }),
          }).catch((err) => console.error("Falha silenciosa no sync do AniList:", err));
        }
      } catch (e) {
        console.error("Erro ao tentar sincronizar novo item com AniList:", e);
      }
      // --- FIM DA INTEGRAÇÃO ---
      aoSalvar(obraParaSalvar);
      fechar();
    } else {
      alert("Erro ao salvar: " + (resultado.data?.error || resultado.error || "Falha desconhecida."));
    }
    setSalvando(false);
  }

  // ==========================================
  // 🖥️ SESSÃO 5: RENDERIZAÇÃO (ESTRUTURA HÍBRIDA)
  // ==========================================
  if (!estaAberto) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#111114] w-full max-w-2xl p-8 rounded-[2rem] border border-zinc-700 shadow-2xl relative">
        <button onClick={fechar} className="absolute top-6 right-6 text-zinc-500 hover:text-white p-2">✕</button>
        
        {/* TELA 1: BUSCA INICIAL */}
        {!novoManga.titulo && !modoManual && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <h3 className="text-xl font-bold text-green-500 uppercase italic tracking-tighter">Hunter Search S+</h3>
            <div className="flex gap-3">
              <input 
                autoFocus type="text" value={termoAnilist}
                className="flex-1 bg-zinc-950 p-5 rounded-2xl border border-zinc-800 outline-none text-white text-lg font-bold" 
                placeholder="Pesquisar obra..." 
                onChange={(e) => setTermoAnilist(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && executarBusca()} 
              />
              <button onClick={executarBusca} disabled={buscando} className="px-8 bg-green-600 text-black font-black uppercase rounded-2xl transition-all active:scale-95">
                {buscando ? "..." : "Buscar"}
              </button>
            </div>
            
            <button 
              onClick={() => setModoManual(true)}
              className="w-full py-4 border border-zinc-800 rounded-xl text-[10px] font-black uppercase text-zinc-500 hover:text-white transition-all hover:bg-zinc-900"
            >
              Não encontrou? Registro Manual
            </button>

            <div className="mt-4 max-h-72 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {resultados.map((m, index) => (
                <div
                  key={`${m.fonte}-${m.id}-${index}`}
                  onClick={() =>
                    setNovoManga({
                      ...novoManga,
                      titulo: m.titulo,
                      capa: m.capa,
                      total_capitulos: m.total,
                      sinopse: m.sinopse,
                      link_url: "",
                      provider_data: m.providers || [],
                      duracao_episodio_minutos: m.duracao_episodio_minutos ?? 0,
                    })
                  }
                  className="flex cursor-pointer flex-col gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 transition-all hover:bg-zinc-800 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative shrink-0">
                      <img src={m.capa} className="h-16 w-12 rounded-xl object-cover" alt="" />
                      <span className="absolute -left-2 -top-2 rounded-md border border-zinc-700 bg-black px-2 py-1 text-[6px] font-black text-zinc-500">
                        {m.fonte}
                      </span>
                    </div>
                    <p className="text-sm font-bold group-hover:text-green-500">{m.titulo}</p>
                  </div>
                  {m.providers && m.providers.length > 0 && (
                    <div className="pl-[4.5rem]">
                      <p className="mb-1 text-[7px] font-black uppercase tracking-widest text-zinc-600">Onde assistir / ler</p>
                      <WatchProviderStrip providers={m.providers} size="sm" />
                    </div>
                  )}
                </div>
              ))}
              {buscando && <div className="text-center p-4 text-green-500 animate-pulse font-black text-[10px] uppercase">Rastreando sinal...</div>}
            </div>
          </div>
        )}

        {/* TELA 2: REGISTRO MANUAL */}
        {!novoManga.titulo && modoManual && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <h3 className="text-xl font-bold text-blue-500 uppercase italic tracking-tighter">Registro Manual</h3>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold text-zinc-600 uppercase mb-2 ml-1">Título</p>
                <input type="text" className="w-full bg-zinc-950 p-4 rounded-xl border border-zinc-800 outline-none text-white font-bold" onChange={(e) => setNovoManga({...novoManga, titulo: e.target.value})} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-zinc-600 uppercase mb-2 ml-1">URL da Capa</p>
                <input type="text" className="w-full bg-zinc-950 p-4 rounded-xl border border-zinc-800 outline-none text-white text-xs" onChange={(e) => setNovoManga({...novoManga, capa: e.target.value})} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-zinc-600 uppercase mb-2 ml-1">Sinopse</p>
                <textarea className="w-full bg-zinc-950 p-4 rounded-xl border border-zinc-800 outline-none text-white text-sm h-32 resize-none" onChange={(e) => setNovoManga({...novoManga, sinopse: e.target.value})} />
              </div>
            </div>
            <button onClick={() => setModoManual(false)} className="w-full py-3 text-zinc-600 font-black uppercase text-[10px] hover:text-white transition-colors">Voltar para a Busca</button>
          </div>
        )}

        {/* TELA 3: CONFIRMAÇÃO E PROGRESSO */}
        {novoManga.titulo && (
          <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-500">
            <div className="flex gap-6 p-6 bg-zinc-900/50 rounded-3xl border border-zinc-800">
              <img src={novoManga.capa || "https://placehold.co/400x600/1f1f22/52525b.png?text=SEM+CAPA"} className="w-28 h-40 object-cover rounded-2xl shadow-2xl" alt="" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Confirmar Entrada</p>
                <h2 className="text-2xl font-bold text-white mb-2 italic leading-tight">{novoManga.titulo}</h2>
                <button onClick={traduzirSinopse} disabled={traduzindo} className="text-[9px] font-black uppercase text-green-500 hover:text-white transition-colors">
                  {traduzindo ? "Traduzindo..." : "🌐 Traduzir Sinopse"}
                </button>
                {(novoManga.provider_data?.length ?? 0) > 0 && (
                  <div className="mt-4">
                    <p className="text-[8px] font-black uppercase tracking-widest text-zinc-600 mb-2">Plataformas (salvas na estante)</p>
                    <WatchProviderStrip providers={novoManga.provider_data} size="md" />
                  </div>
                )}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase mb-2 ml-1 tracking-widest">Link manual (opcional — prioridade na estante)</p>
              <input
                type="url"
                placeholder="https://…"
                className="w-full bg-zinc-950 p-4 rounded-2xl border border-zinc-800 outline-none text-white text-xs"
                value={novoManga.link_url}
                onChange={(e) => setNovoManga({ ...novoManga, link_url: e.target.value })}
              />
              <p className="text-[8px] text-zinc-600 mt-2 ml-1 font-bold uppercase tracking-tighter">
                Se preenchido, aparece primeiro nos ícones do card, junto das plataformas automáticas.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-bold text-zinc-500 uppercase mb-3 ml-1 tracking-widest">
                  Parou em: ({abaPrincipal === "MANGA" ? "Cap" : abaPrincipal === "ANIME" || abaPrincipal === "SERIE" ? "Ep" : abaPrincipal === "FILME" || abaPrincipal === "LIVRO" ? "Pág" : abaPrincipal === "JOGO" ? "Prog" : abaPrincipal === "MUSICA" ? "Faixa" : "—"})
                </p>
                <input type="number" className="w-full bg-zinc-950 p-5 rounded-2xl border border-zinc-800 outline-none text-2xl font-bold text-green-500" value={novoManga.capitulo_atual} onChange={e => setNovoManga({...novoManga, capitulo_atual: parseInt(e.target.value) || 0})} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-zinc-500 uppercase mb-3 ml-1 tracking-widest">Status</p>
                <select value={novoManga.status} onChange={(e) => setNovoManga({...novoManga, status: e.target.value})} className="w-full bg-zinc-950 p-5 rounded-2xl border border-zinc-800 text-sm font-bold text-white uppercase cursor-pointer">
                  <option value="Lendo">Lendo / Assistindo</option>
                  <option value="Planejo Ler">Planejo</option>
                  <option value="Completos">Completos</option>
                  <option value="Pausados">Pausados</option>
                  <option value="Dropados">Dropados</option>
                </select>
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setNovoManga({ titulo: "", capa: "", capitulo_atual: 0, total_capitulos: 0, status: "Planejo Ler", sinopse: "", favorito: false, link_url: "", provider_data: [], duracao_episodio_minutos: 0 })} className="flex-1 py-5 bg-zinc-800 text-zinc-400 rounded-2xl font-bold uppercase text-xs hover:bg-zinc-700 transition-colors">Cancelar</button>
              <button onClick={salvarObraFinal} disabled={salvando} className="flex-[2] py-5 bg-green-600 text-white rounded-2xl font-bold uppercase text-xs shadow-lg shadow-green-600/20 active:scale-95 transition-all">
                {salvando ? "Salvando..." : "Sincronizar Estante"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}