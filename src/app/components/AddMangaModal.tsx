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
  abaPrincipal: "MANGA" | "ANIME" | "FILME" | "LIVRO";
  aoSalvar: (novoManga: any) => void;
}

export default function AddMangaModal({ estaAberto, fechar, usuarioAtual, abaPrincipal, aoSalvar }: AddMangaModalProps) {
  // ==========================================
  // 🔐 SESSÃO 2: ESTADOS DO MODAL
  // ==========================================
  const [termoAnilist, setTermoAnilist] = useState("");
  const [resultados, setResultados] = useState<ResultadoBusca[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [traduzindo, setTraduzindo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  
  const [novoManga, setNovoManga] = useState({ 
    titulo: "", capa: "", capitulo_atual: 0, total_capitulos: 0, status: "Planejo Ler", sinopse: "" 
  });

  useEffect(() => {
    if (!estaAberto) {
      setTermoAnilist("");
      setResultados([]);
      setNovoManga({ titulo: "", capa: "", capitulo_atual: 0, total_capitulos: 0, status: "Planejo Ler", sinopse: "" });
    }
  }, [estaAberto]);

  // ==========================================
  // 🧠 SESSÃO 3: MOTOR DE BUSCA (ACIONADO POR BOTAO/ENTER)
  // ==========================================
  async function executarBusca() {
    if (termoAnilist.length < 3) return;
    
    setBuscando(true);
    setResultados([]); // Limpa resultados anteriores

    try {
      let termoFinal = termoAnilist;

      // 🛑 IGNORAMOS A IA PARA FILMES E LIVROS
      if (abaPrincipal !== "FILME" && abaPrincipal !== "LIVRO") {
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

      // ==========================================
      // 3.1 SUBTÍTULO: MOTOR TMDB (FILMES)
      // ==========================================
      if (abaPrincipal === "FILME") {
        const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY; 
        
        if (!TMDB_API_KEY) {
          alert("⚠️ Hunter, a API Key do TMDB está faltando no cofre (.env.local)!");
          setBuscando(false);
          return;
        }

        try {
          const resTmdb = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&language=pt-BR&query=${encodeURIComponent(termoFinal)}`);
          if (!resTmdb.ok) throw new Error("Falha ao comunicar com TMDB.");
          const jsonTmdb = await resTmdb.json();
          
          if (jsonTmdb.results && jsonTmdb.results.length > 0) {
            setResultados(jsonTmdb.results.slice(0, 5).map((m: any): ResultadoBusca => ({
              id: m.id, 
              titulo: m.title, 
              capa: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : "https://placehold.co/400x600/1f1f22/52525b.png?text=SEM+CAPA",
              total: 1, 
              sinopse: m.overview || "Sem sinopse em português.", 
              fonte: "TMDB"
            })));
          }
        } catch (error) {
          console.error("Erro no TMDB:", error);
        }

      // ==========================================
      // 3.2 SUBTÍTULO: MOTOR GOOGLE BOOKS + OPEN LIBRARY
      // ==========================================
      } else if (abaPrincipal === "LIVRO") {
        const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY; // 🔒 Puxado do Cofre Seguro
        
        // Se a chave existir, usa ela. Se não, tenta a sorte no modo anônimo como plano de fuga.
        const urlBusca = GOOGLE_API_KEY 
          ? `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(termoFinal)}&maxResults=5&langRestrict=pt&key=${GOOGLE_API_KEY}`
          : `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(termoFinal)}&maxResults=5&langRestrict=pt`;

        try {
          const resBooks = await fetch(urlBusca);
          if (resBooks.status === 429) {
            alert("⚠️ O Google bloqueou a busca por excesso de acessos. Verifique se a sua Chave de API está correta no .env.local!");
            setBuscando(false);
            return;
          }
          
          const jsonBooks = await resBooks.json();
          
          if (jsonBooks.items && jsonBooks.items.length > 0) {
            setResultados(jsonBooks.items.map((m: any): ResultadoBusca => {
              const links = m.volumeInfo?.imageLinks;
              let imagemLivro = links?.thumbnail || links?.smallThumbnail;
              
              if (!imagemLivro) {
                const isbns = m.volumeInfo?.industryIdentifiers;
                const isbnObj = isbns?.find((id: any) => id.type === "ISBN_13" || id.type === "ISBN_10");
                
                if (isbnObj) {
                  imagemLivro = `https://covers.openlibrary.org/b/isbn/${isbnObj.identifier}-L.jpg`;
                } else {
                  imagemLivro = "https://placehold.co/400x600/1f1f22/52525b.png?text=SEM+CAPA";
                }
              } else {
                imagemLivro = imagemLivro.replace('http:', 'https:').replace('&edge=curl', '');
              }

              return {
                id: m.id, 
                titulo: m.volumeInfo?.title || "Sem Título", 
                capa: imagemLivro,
                total: m.volumeInfo?.pageCount || 1, 
                sinopse: m.volumeInfo?.description || "Sem sinopse em português.", 
                fonte: "Google Books"
              };
            }));
          } else {
             setResultados([]); // Limpa se não achar nada
          }
        } catch (error) {
          console.error("Erro no Google Books:", error);
        }

      // ==========================================
      // 3.3 SUBTÍTULO: MOTOR ANILIST / MYANIMELIST
      // ==========================================
      } else {
        try {
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
        } catch (error) {
          console.error("Erro no AniList/MAL:", error);
        }
      }

    } catch (err) { console.error("Erro na busca geral:", err); } finally { setBuscando(false); }
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
      const textoTraduzido = json[0].map((item: any) => item[0]).join('');
      setNovoManga(prev => ({ ...prev, sinopse: textoTraduzido }));
    } catch { 
      alert("Erro na tradução."); 
    } finally { 
      setTraduzindo(false); 
    }
  }

  async function salvarObraFinal() {
    if (!usuarioAtual) return;
    setSalvando(true);
    
    const tabelaDb = abaPrincipal === "MANGA" ? "mangas" : abaPrincipal === "ANIME" ? "animes" : abaPrincipal === "FILME" ? "filmes" : "livros";
    
    const { error } = await supabase.from(tabelaDb).insert([{ ...novoManga, usuario: usuarioAtual, ultima_leitura: new Date().toISOString() }]);
    if (!error) { aoSalvar(novoManga); fechar(); }
    setSalvando(false);
  }

  // ==========================================
  // 🖥️ SESSÃO 5: RENDERIZAÇÃO
  // ==========================================
  if (!estaAberto) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#111114] w-full max-w-2xl p-8 rounded-[2rem] border border-zinc-700 shadow-2xl relative">
        <button onClick={fechar} className="absolute top-6 right-6 text-zinc-500 hover:text-white p-2">✕</button>
        {!novoManga.titulo ? (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-green-500 uppercase italic tracking-tighter">Hunter Search S+</h3>
            
            {/* ✅ FIX: NOVA BARRA DE PESQUISA COM BOTÃO */}
            <div className="flex gap-3">
              <input 
                autoFocus 
                type="text" 
                className="flex-1 bg-zinc-950 p-5 rounded-2xl border border-zinc-800 outline-none text-white text-lg font-bold placeholder:text-zinc-700" 
                placeholder="Digite a obra e aperte ENTER..." 
                value={termoAnilist} 
                onChange={(e) => setTermoAnilist(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && executarBusca()} 
              />
              <button 
                onClick={executarBusca}
                disabled={buscando}
                className="px-8 bg-green-600 hover:bg-green-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-black font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg active:scale-95"
              >
                {buscando ? "..." : "Buscar"}
              </button>
            </div>

            <div className="mt-4 max-h-64 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {resultados.map((m: ResultadoBusca) => (
                <div key={m.id} onClick={() => setNovoManga({ titulo: m.titulo, capa: m.capa, capitulo_atual: 0, total_capitulos: m.total, status: "Planejo Ler", sinopse: m.sinopse })} className="p-4 bg-zinc-900/50 rounded-2xl hover:bg-zinc-800 cursor-pointer flex gap-4 items-center border border-zinc-800 transition-all group">
                  <div className="relative"><img src={m.capa} className="w-12 h-16 object-cover rounded-xl" /><span className="absolute -top-2 -left-2 bg-black text-[6px] px-2 py-1 rounded-md border border-zinc-700 text-zinc-500 font-black">{m.fonte}</span></div>
                  <p className="font-bold text-sm group-hover:text-green-500">{m.titulo}</p>
                </div>
              ))}
              {buscando && <div className="text-center p-4 text-green-500 animate-pulse font-black text-[10px] uppercase tracking-widest">Vasculhando a rede...</div>}
              {!buscando && termoAnilist.length >= 3 && resultados.length === 0 && (
                <div className="text-center p-4 text-zinc-600 font-black text-[10px] uppercase tracking-widest">Nenhum resultado. Aperte ENTER para buscar.</div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-500">
            <div className="flex gap-6 p-6 bg-zinc-900/50 rounded-3xl border border-zinc-800">
              <img src={novoManga.capa} className="w-28 h-40 object-cover rounded-2xl shadow-2xl" />
              <div className="flex-1">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Obra Selecionada</p>
                <h2 className="text-2xl font-bold text-white mb-2 leading-tight italic">{novoManga.titulo}</h2>
                <button 
                  onClick={traduzirSinopse} 
                  disabled={traduzindo}
                  className="text-[9px] font-black uppercase text-green-500 hover:text-white transition-colors"
                >
                  {traduzindo ? "Traduzindo..." : "🌐 Traduzir Sinopse"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-bold text-zinc-500 uppercase mb-3 ml-1 tracking-widest">
                  Aonde parou? ({abaPrincipal === "MANGA" ? "Capítulo" : abaPrincipal === "ANIME" ? "Episódio" : abaPrincipal === "LIVRO" ? "Página" : "Parte"})
                </p>
                <input type="number" className="w-full bg-zinc-950 p-5 rounded-2xl border border-zinc-800 outline-none text-2xl font-bold text-green-500" value={novoManga.capitulo_atual} onChange={e => setNovoManga({...novoManga, capitulo_atual: parseInt(e.target.value) || 0})} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-zinc-500 uppercase mb-3 ml-1 tracking-widest">Status Inicial</p>
                <select value={novoManga.status} onChange={(e) => setNovoManga({...novoManga, status: e.target.value})} className="w-full bg-zinc-950 p-5 rounded-2xl border border-zinc-800 text-sm font-bold text-white uppercase cursor-pointer">
                  <option value="Lendo">{abaPrincipal === "ANIME" || abaPrincipal === "FILME" ? "Assistindo" : "Lendo"}</option>
                  <option value="Planejo Ler">{abaPrincipal === "ANIME" || abaPrincipal === "FILME" ? "Planejo Assistir" : "Planejo Ler"}</option>
                  <option value="Completos">Completos</option>
                  <option value="Pausados">Pausados</option>
                  <option value="Dropados">Dropados</option>
                </select>
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setNovoManga({titulo:"", capa:"", capitulo_atual:0, total_capitulos:0, status:"Planejo Ler", sinopse:""})} className="flex-1 py-5 bg-zinc-800 text-zinc-400 rounded-2xl font-bold uppercase text-xs">Voltar</button>
              <button onClick={salvarObraFinal} disabled={salvando} className="flex-[2] py-5 bg-green-600 text-white rounded-2xl font-bold uppercase text-xs shadow-lg shadow-green-600/20">{salvando ? "Salvando..." : "Salvar na Estante"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}