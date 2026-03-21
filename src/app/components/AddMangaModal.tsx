"use client";
import { useState, useEffect } from "react";
import { supabase } from "../supabase";

// ==========================================
// 📦 SESSÃO 1: INTERFACES
// ==========================================
interface ResultadoBusca {
  id: number | string;
  titulo: string;
  capa: string;
  total: number;
  sinopse: string;
  fonte: "AniList" | "MyAnimeList" | "TMDB" | "Google Books";
}

interface AddMangaModalProps {
  estaAberto: boolean;
  fechar: () => void;
  usuarioAtual: string;
  abaPrincipal: "MANGA" | "ANIME" | "FILME" | "LIVRO" | "SERIE" | "JOGO" | "MUSICA";
  aoSalvar: (novoManga: any) => void;
}

export default function AddMangaModal({ estaAberto, fechar, usuarioAtual, abaPrincipal, aoSalvar }: AddMangaModalProps) {
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
    titulo: "", capa: "", capitulo_atual: 0, total_capitulos: 0, status: "Planejo Ler", sinopse: "", favorito: false 
  });

  useEffect(() => {
    if (!estaAberto) {
      setModoManual(false);
      setTermoAnilist("");
      setResultados([]);
      setNovoManga({ titulo: "", capa: "", capitulo_atual: 0, total_capitulos: 0, status: "Planejo Ler", sinopse: "", favorito: false });
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
              await supabase.from('search_cache').insert([{ termo_original: termoAnilist, resultado_ia: termoFinal }]);
            }
          }
        }
      }

      // 🎬 Motor TMDB (Restaurado)
      if (abaPrincipal === "FILME") {
        const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY; 
        if (!TMDB_API_KEY) {
          alert("⚠️ Hunter, a API Key do TMDB está faltando!");
          setBuscando(false);
          return;
        }
        const resTmdb = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&language=pt-BR&query=${encodeURIComponent(termoFinal)}`);
        const jsonTmdb = await resTmdb.json();
        if (jsonTmdb.results) {
          setResultados(jsonTmdb.results.slice(0, 5).map((m: any): ResultadoBusca => ({
            id: m.id, titulo: m.title, 
            capa: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : "https://placehold.co/400x600/1f1f22/52525b.png?text=SEM+CAPA",
            total: 1, sinopse: m.overview || "Sem sinopse.", fonte: "TMDB"
          })));
        }

      // 📺 Séries (TMDB TV)
      } else if (abaPrincipal === "SERIE") {
        const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
        if (!TMDB_API_KEY) {
          alert("⚠️ Hunter, a API Key do TMDB está faltando!");
          setBuscando(false);
          return;
        }
        const resTmdb = await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&language=pt-BR&query=${encodeURIComponent(termoFinal)}`);
        const jsonTmdb = await resTmdb.json();
        if (jsonTmdb.results) {
          setResultados(jsonTmdb.results.slice(0, 5).map((m: any): ResultadoBusca => ({
            id: m.id,
            titulo: m.name || m.original_name || "Sem Título",
            capa: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : "https://placehold.co/400x600/1f1f22/52525b.png?text=SEM+CAPA",
            total: m.number_of_episodes || 1,
            sinopse: m.overview || "Sem sinopse.",
            fonte: "TMDB"
          })));
        }

      // 📖 Motor Google Books + Open Library (Restaurado)
      } else if (abaPrincipal === "LIVRO") {
        const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY;
        const urlBusca = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(termoFinal)}&maxResults=5&langRestrict=pt${GOOGLE_API_KEY ? `&key=${GOOGLE_API_KEY}` : ''}`;
        const resBooks = await fetch(urlBusca);
        const jsonBooks = await resBooks.json();
        
        if (jsonBooks.items) {
          setResultados(jsonBooks.items.map((m: any): ResultadoBusca => {
            const links = m.volumeInfo?.imageLinks;
            const isbns = m.volumeInfo?.industryIdentifiers;
            const isbn13 = isbns?.find((id: any) => id.type === "ISBN_13")?.identifier;
            
            return {
              id: m.id, titulo: m.volumeInfo?.title || "Sem Título", 
              capa: links?.thumbnail?.replace('http:', 'https:') || (isbn13 ? `https://covers.openlibrary.org/b/isbn/${isbn13}-L.jpg` : "https://placehold.co/400x600/1f1f22/52525b.png?text=SEM+CAPA"),
              total: m.volumeInfo?.pageCount || 1, sinopse: m.volumeInfo?.description || "Sem sinopse.", fonte: "Google Books"
            };
          }));
        }

      // 🇯🇵 Motor AniList / MyAnimeList (Restaurado)
      } else if (abaPrincipal === "MANGA" || abaPrincipal === "ANIME") {
        const resAni = await fetch("https://graphql.anilist.co", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            query: `query ($search: String, $type: MediaType) { Page(perPage: 5) { media(search: $search, type: $type) { id title { romaji english } coverImage { large } chapters episodes description } } }`,
            variables: { search: termoFinal, type: abaPrincipal }
          })
        });
        const jsonAni = await resAni.json();
        const listaAni = jsonAni.data?.Page?.media || [];

        if (listaAni.length > 0) {
          setResultados(listaAni.map((m: any): ResultadoBusca => ({
            id: m.id, titulo: m.title.romaji || m.title.english, capa: m.coverImage.large,
            total: abaPrincipal === "MANGA" ? (m.chapters || 0) : (m.episodes || 0),
            sinopse: m.description || "", fonte: "AniList"
          })));
        } else {
          const resMal = await fetch(`https://api.jikan.moe/v4/${abaPrincipal === "MANGA" ? "manga" : "anime"}?q=${encodeURIComponent(termoFinal)}&limit=5`);
          const jsonMal = await resMal.json();
          setResultados(jsonMal.data?.map((m: any): ResultadoBusca => ({
            id: m.mal_id, titulo: m.title, capa: m.images.jpg.large_image_url,
            total: abaPrincipal === "MANGA" ? (m.chapters || 0) : (m.episodes || 0),
            sinopse: m.synopsis || "", fonte: "MyAnimeList"
          })) || []);
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

    const obraParaSalvar = { ...novoManga, capitulo_atual: progressoFinal, usuario: usuarioAtual, ultima_leitura: new Date().toISOString() };
    const { error } = await supabase.from(tabelaDb).insert([obraParaSalvar]);
    
    if (!error) { aoSalvar(obraParaSalvar); fechar(); }
    else { alert("Erro ao salvar: " + error.message); }
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

            <div className="mt-4 max-h-64 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {resultados.map((m) => (
                <div key={m.id} onClick={() => setNovoManga({ ...novoManga, titulo: m.titulo, capa: m.capa, total_capitulos: m.total, sinopse: m.sinopse })} className="p-4 bg-zinc-900/50 rounded-2xl hover:bg-zinc-800 cursor-pointer flex gap-4 items-center border border-zinc-800 group transition-all">
                  <div className="relative"><img src={m.capa} className="w-12 h-16 object-cover rounded-xl" /><span className="absolute -top-2 -left-2 bg-black text-[6px] px-2 py-1 rounded-md border border-zinc-700 text-zinc-500 font-black">{m.fonte}</span></div>
                  <p className="font-bold text-sm group-hover:text-green-500">{m.titulo}</p>
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
              <img src={novoManga.capa || "https://placehold.co/400x600/1f1f22/52525b.png?text=SEM+CAPA"} className="w-28 h-40 object-cover rounded-2xl shadow-2xl" />
              <div className="flex-1">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Confirmar Entrada</p>
                <h2 className="text-2xl font-bold text-white mb-2 italic leading-tight">{novoManga.titulo}</h2>
                <button onClick={traduzirSinopse} disabled={traduzindo} className="text-[9px] font-black uppercase text-green-500 hover:text-white transition-colors">
                  {traduzindo ? "Traduzindo..." : "🌐 Traduzir Sinopse"}
                </button>
              </div>
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
              <button onClick={() => setNovoManga({titulo:"", capa:"", capitulo_atual:0, total_capitulos:0, status:"Planejo Ler", sinopse:"", favorito: false})} className="flex-1 py-5 bg-zinc-800 text-zinc-400 rounded-2xl font-bold uppercase text-xs hover:bg-zinc-700 transition-colors">Cancelar</button>
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