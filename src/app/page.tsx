"use client";

// ==========================================
// 📦 [SESSÃO 1] - IMPORTAÇÕES E INTERFACES
// ==========================================
import AcessoMestre from "./components/AcessoMestre";
import { supabase } from "./supabase";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import MangaCard from "./components/MangaCard";
import AddMangaModal from "./components/AddMangaModal";
import MangaDetailsModal from "./components/MangaDetailsModal";
import AdminPanel from "./components/AdminPanel";
import ProfileSelection from "./components/ProfileSelection";

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
}

// ==========================================
// 🎨 [SESSÃO 2] - TEMAS E ESTILOS (AURAS)
// ==========================================
const TEMAS = {
  verde: { nome: "Verde Néon", bg: "bg-green-500", bgActive: "bg-green-600", text: "text-green-500", border: "border-green-500", shadow: "shadow-[0_0_20px_rgba(34,197,94,0.3)]", focus: "focus:border-green-500" },
  azul: { nome: "Azul Elétrico", bg: "bg-blue-500", bgActive: "bg-blue-600", text: "text-blue-500", border: "border-blue-500", shadow: "shadow-[0_0_20px_rgba(59,130,246,0.3)]", focus: "focus:border-blue-500" },
  roxo: { nome: "Roxo Carmesim", bg: "bg-purple-500", bgActive: "bg-purple-600", text: "text-purple-500", border: "border-purple-500", shadow: "shadow-[0_0_20px_rgba(168,85,247,0.3)]", focus: "focus:border-purple-500" },
  laranja: { nome: "Laranja Outono", bg: "bg-orange-500", bgActive: "bg-orange-600", text: "text-orange-500", border: "border-orange-500", shadow: "shadow-[0_0_20px_rgba(249,115,22,0.3)]", focus: "focus:border-orange-500" },
  admin: { nome: "Admin", bg: "bg-yellow-500", bgActive: "bg-yellow-600", text: "text-yellow-500", border: "border-yellow-500", shadow: "shadow-[0_0_20px_rgba(234,179,8,0.3)]", focus: "focus:border-yellow-500" },
  custom: { nome: "Cor Livre", bg: "bg-[var(--aura)]", bgActive: "bg-[var(--aura)] brightness-110", text: "text-[var(--aura)]", border: "border-[var(--aura)]", shadow: "shadow-[0_0_15px_var(--aura)]", focus: "focus:border-[var(--aura)]" }
};

export default function Home() {
  // ==========================================
  // 🔐 [SESSÃO 3] - ESTADOS GERAIS DO APP
  // ==========================================
  const [mestreAutorizado, setMestreAutorizado] = useState(false);
  const [usuarioAtual, setUsuarioAtual] = useState<string | null>(null);
  const [perfilAlvoParaBloqueio, setPerfilAlvoParaBloqueio] = useState<string | null>(null);
  const [pinDigitado, setPinDigitado] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  // ✅ ABA LIVRO E ARRAY DE LIVROS ADICIONADOS
  const [abaPrincipal, setAbaPrincipal] = useState<"MANGA" | "ANIME" | "FILME" | "LIVRO">("MANGA"); 
  const [mangas, setMangas] = useState<Manga[]>([]);
  const [animes, setAnimes] = useState<Manga[]>([]); 
  const [filmes, setFilmes] = useState<Manga[]>([]); 
  const [livros, setLivros] = useState<Manga[]>([]); 
  const [perfis, setPerfis] = useState<any[]>([]); 
  
  const [estaAbertoAdd, setEstaAbertoAdd] = useState(false);
  const [mangaDetalhe, setMangaDetalhe] = useState<Manga | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [filtroAtivo, setFiltroAtivo] = useState("Lendo");
  const [pesquisaInterna, setPesquisaInterna] = useState("");
  const [config, setConfig] = useState({ mostrar_busca: true, mostrar_stats: true, mostrar_backup: true });
  const [modoCinema, setModoCinema] = useState(false);

  const [novoHunter, setNovoHunter] = useState({ nome: '', avatar: '👤', pin: '', cor: 'verde' });
  const [editandoNomeOriginal, setEditandoNomeOriginal] = useState<string | null>(null);
  const [mostrandoFormHunter, setMostrandoFormHunter] = useState(false);
  const [pinAdminAberto, setPinAdminAberto] = useState(false);

  // ==========================================
  // 🔔 [SESSÃO 4] - SISTEMA DE NOTIFICAÇÕES
  // ==========================================
  interface ToastMessage {
    id: number;
    mensagem: string;
    tipo: "sucesso" | "erro" | "aviso" | "anilist";
  }
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  function mostrarToast(mensagem: string, tipo: "sucesso" | "erro" | "aviso" | "anilist" = "sucesso") {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, mensagem, tipo }]);
    setTimeout(() => { setToasts(prev => prev.filter(t => t.id !== id)); }, 4000);
  }

  // ==========================================
  // 🔄 [SESSÃO 5] - INICIALIZAÇÃO (USEEFFECTS)
  // ==========================================
  useEffect(() => { 
    const mestre = sessionStorage.getItem("acesso_mestre");
    if (mestre === "true") {
      setMestreAutorizado(true);
      sessionStorage.setItem('estante_acesso', 'true');
    }
    const hunterSalvo = sessionStorage.getItem("hunter_ativo");
    if (hunterSalvo) setUsuarioAtual(hunterSalvo);

    const cinemaSalvo = localStorage.getItem("hunter_modo_cinema");
    if (cinemaSalvo === "true") setModoCinema(true);
    
    const buscarConfigs = async () => {
      const { data } = await supabase.from("site_config").select("*").eq("id", 1).maybeSingle();
      if (data) setConfig(data);
    };

    buscarConfigs();
    buscarPerfis().then(() => setCarregando(false));
  }, []);

  useEffect(() => {
    if (usuarioAtual) {
      setIsAdmin(usuarioAtual === "Admin");
      buscarMangas();
      buscarAnimes();
      buscarFilmes(); 
      buscarLivros(); // ✅ CHAMANDO A BUSCA DE LIVROS
    }
  }, [usuarioAtual]);

  // ==========================================
  // 🛠️ [SESSÃO 6] - COMUNICAÇÃO COM O BANCO
  // ==========================================
  const toggleModoCinema = () => {
    const novoEstado = !modoCinema;
    setModoCinema(novoEstado);
    localStorage.setItem("hunter_modo_cinema", novoEstado.toString());
  };

  function abrirTradutorGoogle(texto: string) {
    if (!texto || texto === "Sem sinopse disponível.") return;
    const url = `https://translate.google.com/?sl=auto&tl=pt&text=${encodeURIComponent(texto)}&op=translate`;
    window.open(url, '_blank');
  }

  async function buscarMangas() {
    if (!usuarioAtual || usuarioAtual === "Admin") return;
    const { data } = await supabase.from("mangas").select("*").eq("usuario", usuarioAtual).order("ultima_leitura", { ascending: false });
    if (data) setMangas(data as Manga[]);
  }

  async function buscarAnimes() {
    if (!usuarioAtual || usuarioAtual === "Admin") return;
    const { data } = await supabase.from("animes").select("*").eq("usuario", usuarioAtual).order("ultima_leitura", { ascending: false });
    if (data) setAnimes(data as Manga[]);
  }

  async function buscarFilmes() {
    if (!usuarioAtual || usuarioAtual === "Admin") return;
    const { data } = await supabase.from("filmes").select("*").eq("usuario", usuarioAtual).order("ultima_leitura", { ascending: false });
    if (data) setFilmes(data as Manga[]);
  }

  // ✅ NOVA BUSCA PARA LIVROS
  async function buscarLivros() {
    if (!usuarioAtual || usuarioAtual === "Admin") return;
    const { data } = await supabase.from("livros").select("*").eq("usuario", usuarioAtual).order("ultima_leitura", { ascending: false });
    if (data) setLivros(data as Manga[]);
  }

  async function buscarPerfis() {
    const { data } = await supabase.from("perfis").select("*");
    if (data) setPerfis(data);
  }

  async function sincronizarComAniList(titulo: string, capitulo: number, statusLocal: string, token: string, acao: "SALVAR" | "DELETAR" = "SALVAR", tipoObra: "MANGA" | "ANIME" | "FILME" | "LIVRO" = "MANGA") {
    if (tipoObra === "FILME" || tipoObra === "LIVRO") return; // Sem Anilist para livros!

    try {
      const res = await fetch('/api/anilist/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo, capitulo, statusLocal, token, acao, tipoObra })
      });
      const data = await res.json();
      if (data.success) {
         mostrarToast(`"${titulo}" sincronizado no AniList!`, "anilist"); 
      }
    } catch (error) { console.error(error); }
  }

  async function puxarProgressoDoAniList() {
    const perfilAtivo = perfis.find(p => p.nome_original === usuarioAtual);
    if (!perfilAtivo?.anilist_token) return mostrarToast("Conecte o AniList primeiro.", "erro");
    mostrarToast(`📡 Sincronizando ${abaPrincipal}...`, "aviso");
  }

  async function atualizarCapitulo(manga: Manga, novo: number) {
    if (novo < 0) return;
    let novoStatus = manga.status;
    if (manga.total_capitulos > 0 && novo >= manga.total_capitulos) novoStatus = "Completos";
    
    // ✅ ROTA DE LIVROS ADICIONADA
    const tabelaDb = abaPrincipal === "MANGA" ? "mangas" : abaPrincipal === "ANIME" ? "animes" : abaPrincipal === "FILME" ? "filmes" : "livros";
    const setLista = abaPrincipal === "MANGA" ? setMangas : abaPrincipal === "ANIME" ? setAnimes : abaPrincipal === "FILME" ? setFilmes : setLivros;
    const agora = new Date().toISOString();

    setLista((prev: Manga[]) => prev.map(m => m.id === manga.id ? { ...m, capitulo_atual: novo, status: novoStatus, ultima_leitura: agora } : m));
    
    if (mangaDetalhe?.id === manga.id) {
      setMangaDetalhe(prev => prev ? { ...prev, capitulo_atual: novo, status: novoStatus, ultima_leitura: agora } : null);
    }

    await supabase.from(tabelaDb).update({ capitulo_atual: novo, status: novoStatus, ultima_leitura: agora }).eq("id", manga.id);
    mostrarToast("Salvo na base de dados.", "sucesso");

    const perfilAtivo = perfis.find(p => p.nome_original === usuarioAtual);
    if (perfilAtivo && perfilAtivo.anilist_token) {
      sincronizarComAniList(manga.titulo, novo, novoStatus, perfilAtivo.anilist_token, "SALVAR", abaPrincipal);
    }
  }

  async function atualizarDados(id: number, campos: any) {
    // ✅ ROTA DE LIVROS ADICIONADA
    const tabelaDb = abaPrincipal === "MANGA" ? "mangas" : abaPrincipal === "ANIME" ? "animes" : abaPrincipal === "FILME" ? "filmes" : "livros";
    const setLista = abaPrincipal === "MANGA" ? setMangas : abaPrincipal === "ANIME" ? setAnimes : abaPrincipal === "FILME" ? setFilmes : setLivros;
    const listaAtual = abaPrincipal === "MANGA" ? mangas : abaPrincipal === "ANIME" ? animes : abaPrincipal === "FILME" ? filmes : livros;

    setLista((prev: Manga[]) => prev.map(m => m.id === id ? { ...m, ...campos } : m));
    
    if (mangaDetalhe?.id === id) {
      setMangaDetalhe(prev => prev ? { ...prev, ...campos } : null);
    }

    await supabase.from(tabelaDb).update(campos).eq("id", id);
    mostrarToast("Configuração salva.", "sucesso");

    if (campos.status || campos.capitulo_atual !== undefined) {
      const mangaAlterado = listaAtual.find(m => m.id === id);
      const perfilAtivo = perfis.find(p => p.nome_original === usuarioAtual);
      if (mangaAlterado && perfilAtivo && perfilAtivo.anilist_token) {
        const progressoEnvio = campos.capitulo_atual !== undefined ? campos.capitulo_atual : mangaAlterado.capitulo_atual;
        const statusEnvio = campos.status || mangaAlterado.status;
        sincronizarComAniList(mangaAlterado.titulo, progressoEnvio, statusEnvio, perfilAtivo.anilist_token, "SALVAR", abaPrincipal);
      }
    }
  }

  async function deletarMangaDaEstante(id: number) {
    // ✅ ROTA DE LIVROS ADICIONADA
    const tabelaDb = abaPrincipal === "MANGA" ? "mangas" : abaPrincipal === "ANIME" ? "animes" : abaPrincipal === "FILME" ? "filmes" : "livros";
    if(confirm(`Remover da estante?`)) {
      await supabase.from(tabelaDb).delete().eq("id", id);
      if (abaPrincipal === "MANGA") buscarMangas();
      else if (abaPrincipal === "ANIME") buscarAnimes();
      else if (abaPrincipal === "FILME") buscarFilmes();
      else buscarLivros();
      mostrarToast("Obra removida.", "aviso");
    }
  }

  // ==========================================
  // 👥 [SESSÃO 7] - GESTÃO DE PERFIS (ADMIN)
  // ==========================================
  async function salvarHunter() {
    if (!novoHunter.nome) return alert("Nome obrigatório!");
    const dados = { nome_exibicao: novoHunter.nome, avatar: novoHunter.avatar, pin: novoHunter.pin, cor_tema: novoHunter.cor };
    if (editandoNomeOriginal) await supabase.from("perfis").update(dados).eq("nome_original", editandoNomeOriginal);
    else await supabase.from("perfis").insert([{ ...dados, nome_original: novoHunter.nome }]);
    fecharFormularioHunter(); buscarPerfis();
  }

  function fecharFormularioHunter() { setMostrandoFormHunter(false); setNovoHunter({ nome: '', avatar: '👤', pin: '', cor: 'verde' }); }
  function prepararEdicao(perfil: any) { setNovoHunter({ nome: perfil.nome_exibicao, avatar: perfil.avatar, pin: perfil.pin || '', cor: perfil.cor_tema }); setEditandoNomeOriginal(perfil.nome_original); setMostrandoFormHunter(true); }

  async function atualizarConfig(chave: string, valor: boolean) {
    setConfig(prev => ({ ...prev, [chave]: valor }));
    await supabase.from("site_config").update({ [chave]: valor }).eq("id", 1);
  }

  async function deletarPerfil(perfil: any) {
    if (perfil.nome_original === "Admin") return alert("Impossível remover Admin.");
    if (confirm(`Remover Hunter "${perfil.nome_exibicao}"?`)) {
      await supabase.from("perfis").delete().eq("nome_original", perfil.nome_original);
      buscarPerfis();
    }
  }

  // ==========================================
  // 🔑 [SESSÃO 8] - LÓGICA DE LOGIN E PIN
  // ==========================================
  async function confirmarPin() {
    if (!perfilAlvoParaBloqueio) return;

    if (perfilAlvoParaBloqueio === "Admin") {
      const { data: adminDb } = await supabase.from("perfis").select("pin").eq("nome_original", "Admin").maybeSingle();
      const pinDeFabrica = process.env.NEXT_PUBLIC_ADMIN_PIN;
      const pinCorreto = adminDb?.pin || pinDeFabrica; 

      if (pinDigitado === pinCorreto) {
        sessionStorage.setItem("hunter_ativo", "Admin");
        setUsuarioAtual("Admin");
        setPerfilAlvoParaBloqueio(null);
      } else {
        mostrarToast("Acesso Negado: PIN de Administrador Incorreto!", "erro");
      }
      return;
    }

    const { data: perfil } = await supabase.from("perfis").select("pin, nome_exibicao").eq("nome_original", perfilAlvoParaBloqueio).single();
    if (perfil?.pin === pinDigitado) {
      sessionStorage.setItem("hunter_ativo", perfilAlvoParaBloqueio);
      setUsuarioAtual(perfilAlvoParaBloqueio);
      setPerfilAlvoParaBloqueio(null);
    } else { mostrarToast("PIN Incorreto!", "erro"); }
  }

  function tentarMudarPerfil(nome: string) {
    if (nome === "Admin") {
      setPerfilAlvoParaBloqueio("Admin");
      setPinDigitado("");
      return;
    }
    const info = perfis.find(p => p.nome_original === nome);
    if (info?.pin) { setPerfilAlvoParaBloqueio(nome); setPinDigitado(""); } 
    else { setUsuarioAtual(nome); sessionStorage.setItem('hunter_ativo', nome); }
  }

  // ==========================================
  // 🖥️ [SESSÃO 9] - RENDERIZAÇÃO E INTERFACE
  // ==========================================
  
  if (!mestreAutorizado) return <AcessoMestre aoAutorizar={() => setMestreAutorizado(true)} />;

  if (!usuarioAtual) return <ProfileSelection perfis={perfis} temas={TEMAS} tentarMudarPerfil={tentarMudarPerfil} perfilAlvoParaBloqueio={perfilAlvoParaBloqueio} pinDigitado={pinDigitado} setPinDigitado={setPinDigitado} confirmarPin={confirmarPin} setPinAdminAberto={setPinAdminAberto} pinAdminAberto={pinAdminAberto} />;

  if (isAdmin) return (
    <AdminPanel 
      perfis={perfis} config={config} mostrandoFormHunter={mostrandoFormHunter} setMostrandoFormHunter={setMostrandoFormHunter} novoHunter={novoHunter} setNovoHunter={setNovoHunter} deletarPerfil={deletarPerfil} setUsuarioAtual={setUsuarioAtual} atualizarConfig={atualizarConfig} salvarHunter={salvarHunter} prepararEdicao={prepararEdicao} editandoNomeOriginal={editandoNomeOriginal} fecharFormularioHunter={fecharFormularioHunter} 
    />
  );

  const perfilAtivo = perfis.find(p => p.nome_original === usuarioAtual) || { nome_exibicao: usuarioAtual, avatar: "👤", cor_tema: "verde" };
  const aura = perfilAtivo.cor_tema?.startsWith('#') ? TEMAS.custom : (TEMAS[perfilAtivo.cor_tema as keyof typeof TEMAS] || TEMAS.verde);
  
  // ✅ RENDERIZANDO A LISTA DE LIVROS E AJUSTANDO FILTROS
  const listaExibicao = abaPrincipal === "MANGA" ? mangas : abaPrincipal === "ANIME" ? animes : abaPrincipal === "FILME" ? filmes : livros;
  const filtrosAtuais = (abaPrincipal === "MANGA" || abaPrincipal === "LIVRO") ? ["Todos", "Lendo", "Completos", "Planejo Ler", "Pausados", "Dropados"] : ["Todos", "Assistindo", "Completos", "Planejo Assistir", "Pausados", "Dropados"];

  const obrasFiltradas = listaExibicao.filter(m => {
    if (filtroAtivo === "Todos") return true;
    if (abaPrincipal === "ANIME" || abaPrincipal === "FILME") {
      if (filtroAtivo === "Assistindo") return m.status === "Lendo";
      if (filtroAtivo === "Planejo Assistir") return m.status === "Planejo Ler";
    }
    return m.status === filtroAtivo;
  }).filter(m => m.titulo.toLowerCase().includes(pesquisaInterna.toLowerCase()));

  return (
    <main className="min-h-screen bg-[#080808] p-6 md:p-12 text-white relative overflow-x-hidden" style={perfilAtivo.cor_tema?.startsWith('#') ? { '--aura': perfilAtivo.cor_tema } as React.CSSProperties : {}}>
      
      <header className="flex flex-col md:flex-row justify-between items-center gap-6 mb-16 border-b border-zinc-800/50 pb-10 relative z-20">
        <div className="text-center md:text-left">
          <h1 className="text-5xl font-black italic tracking-tighter">Hunter<span className={aura.text}>.</span>Tracker</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-500 mt-2">Sincronizado como: {perfilAtivo.nome_exibicao}</p>
        </div>

        <div className="flex items-center gap-4 md:gap-6">
          <button onClick={toggleModoCinema} title={modoCinema ? "Desativar Modo Conforto" : "Ativar Modo Conforto"} className={`w-14 h-14 bg-zinc-900 border-2 rounded-[1.2rem] flex items-center justify-center text-xl transition-all shadow-lg ${modoCinema ? `${aura.border} ${aura.text} ${aura.shadow} scale-110` : 'border-zinc-800 text-zinc-600 hover:text-white'}`}>
            {modoCinema ? "📺" : "👓"}
          </button>

          {perfilAtivo.anilist_token && (
            <button onClick={puxarProgressoDoAniList} className="w-14 h-14 bg-zinc-900 border border-blue-500/30 rounded-[1.2rem] flex items-center justify-center text-xl hover:scale-105 active:scale-95 transition-all shadow-lg text-blue-500">🔄</button>
          )}

          <button onClick={() => setEstaAbertoAdd(true)} className={`px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all hover:scale-105 active:scale-95 bg-zinc-900 border-2 ${aura.border} ${aura.shadow} text-white hover:${aura.text}`}>
            + Adicionar Obra
          </button>

          <div onClick={() => window.location.href = '/perfil'} className="group cursor-pointer flex flex-col items-center gap-2">
            <div className={`w-14 h-14 bg-zinc-900 rounded-[1.2rem] flex items-center justify-center overflow-hidden border-2 ${aura.border} group-hover:scale-110 transition-all shadow-lg`}>
              {perfilAtivo.avatar?.startsWith('http') ? (
                <img src={perfilAtivo.avatar} className="w-full h-full object-cover" alt="" />
              ) : (
                <span className="text-3xl">{perfilAtivo.avatar || "👤"}</span>
              )}
            </div>
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-tighter group-hover:text-white transition-colors">Configurações</span>
          </div>
        </div>
      </header>

      {/* ✅ NOVA ABA DA ESTANTE DE LIVROS */}
      <div className="flex gap-4 md:gap-8 mb-10 border-b border-zinc-800/50 pb-4 overflow-x-auto custom-scrollbar">
        <button onClick={() => { setAbaPrincipal("MANGA"); setFiltroAtivo("Lendo"); }} className={`text-xl md:text-2xl font-black uppercase tracking-widest transition-all whitespace-nowrap ${abaPrincipal === "MANGA" ? `${aura.text} drop-shadow-[0_0_15px_currentColor]` : "text-zinc-600 hover:text-white"}`}>📚 Mangás</button>
        <button onClick={() => { setAbaPrincipal("ANIME"); setFiltroAtivo("Assistindo"); }} className={`text-xl md:text-2xl font-black uppercase tracking-widest transition-all whitespace-nowrap ${abaPrincipal === "ANIME" ? `${aura.text} drop-shadow-[0_0_15px_currentColor]` : "text-zinc-600 hover:text-white"}`}>📺 Animes</button>
        <button onClick={() => { setAbaPrincipal("FILME"); setFiltroAtivo("Assistindo"); }} className={`text-xl md:text-2xl font-black uppercase tracking-widest transition-all whitespace-nowrap ${abaPrincipal === "FILME" ? `${aura.text} drop-shadow-[0_0_15px_currentColor]` : "text-zinc-600 hover:text-white"}`}>🎬 Filmes</button>
        <button onClick={() => { setAbaPrincipal("LIVRO"); setFiltroAtivo("Lendo"); }} className={`text-xl md:text-2xl font-black uppercase tracking-widest transition-all whitespace-nowrap ${abaPrincipal === "LIVRO" ? `${aura.text} drop-shadow-[0_0_15px_currentColor]` : "text-zinc-600 hover:text-white"}`}>📖 Livros</button>
      </div>

      {config.mostrar_busca && (
        <section className="mb-12 flex flex-col md:flex-row gap-6 items-center justify-between">
          <div className="flex bg-zinc-900/50 p-1 rounded-2xl border border-zinc-800 w-full md:w-auto overflow-x-auto">
            {filtrosAtuais.map(f => (
              <button key={f} onClick={() => setFiltroAtivo(f)} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${filtroAtivo === f ? `${aura.bg} text-black` : 'text-zinc-500 hover:text-white'}`}>{f}</button>
            ))}
          </div>
          <input type="text" placeholder="Pesquisar..." className="w-full md:w-80 bg-zinc-900 border border-zinc-800 p-4 rounded-2xl text-xs font-bold uppercase outline-none focus:border-white transition-all" value={pesquisaInterna} onChange={(e) => setPesquisaInterna(e.target.value)} />
        </section>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8">
        {obrasFiltradas.map(m => (
          <MangaCard key={m.id} manga={m} aura={aura} abaPrincipal={abaPrincipal} atualizarCapitulo={atualizarCapitulo} deletarManga={deletarMangaDaEstante} mudarStatusManual={(id, s) => atualizarDados(id, {status: s})} abrirDetalhes={(m) => setMangaDetalhe(m as Manga)} />
        ))}
      </div>

      <AddMangaModal 
        estaAberto={estaAbertoAdd} 
        fechar={() => setEstaAbertoAdd(false)} 
        usuarioAtual={usuarioAtual} 
        abaPrincipal={abaPrincipal} 
        aoSalvar={() => { 
          if (abaPrincipal === "MANGA") buscarMangas();
          else if (abaPrincipal === "ANIME") buscarAnimes();
          else if (abaPrincipal === "FILME") buscarFilmes(); 
          else buscarLivros(); // ✅ Atualiza a lista de livros após salvar
          setEstaAbertoAdd(false); 
        }} 
      />
      
      {mangaDetalhe && (
        <MangaDetailsModal 
          manga={mangaDetalhe} 
          abaPrincipal={abaPrincipal} 
          aoFechar={() => setMangaDetalhe(null)} 
          aoAtualizarCapitulo={atualizarCapitulo} 
          aoAtualizarDados={atualizarDados} 
          aoDeletar={(id) => { setMangaDetalhe(null); deletarMangaDaEstante(id); }} 
          aoTraduzir={() => abrirTradutorGoogle(mangaDetalhe.sinopse)} 
        />
      )} 
      
      {modoCinema && (
        <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03]" style={{ background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))', backgroundSize: '100% 4px, 3px 100%' }} />
          <div className="absolute inset-0 bg-orange-500/5 mix-blend-multiply" />
        </div>
      )}

      <div className="fixed bottom-10 right-10 z-[300] flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => {
          let cores = "";
          let icone = "";
          if (toast.tipo === "sucesso") { cores = "bg-green-500/10 border-green-500/50 text-green-400"; icone = "✅"; }
          else if (toast.tipo === "erro") { cores = "bg-red-500/10 border-red-500/50 text-red-400"; icone = "❌"; }
          else if (toast.tipo === "aviso") { cores = "bg-orange-500/10 border-orange-500/50 text-orange-400"; icone = "⚠️"; }
          else if (toast.tipo === "anilist") { cores = "bg-blue-500/10 border-blue-500/50 text-blue-400"; icone = "🌐"; }

          return (
            <div key={toast.id} className={`flex items-center gap-4 px-6 py-4 rounded-2xl border backdrop-blur-md shadow-2xl animate-in slide-in-from-right-8 fade-in duration-300 ${cores}`}>
              <div className="text-2xl animate-bounce">{icone}</div>
              <span className="text-[10px] font-black uppercase tracking-widest mt-1">{toast.mensagem}</span>
            </div>
          );
        })}
      </div>

    </main>
  );
}