"use client";

// ==========================================
// 📦 [SESSÃO 1] - IMPORTAÇÕES E TEMAS
// ==========================================
import { supabase } from "../supabase";
import { useEffect, useState } from "react";
import Link from "next/link";

const TEMAS = {
  verde: { bg: "bg-green-500", text: "text-green-500", border: "border-green-500", glow: "shadow-green-500/20", btn: "bg-green-500/10 border-green-500/50 hover:bg-green-500 hover:text-black" },
  azul: { bg: "bg-blue-500", text: "text-blue-500", border: "border-blue-500", glow: "shadow-blue-500/20", btn: "bg-blue-500/10 border-blue-500/50 hover:bg-blue-500 hover:text-black" },
  roxo: { bg: "bg-purple-500", text: "text-purple-500", border: "border-purple-500", glow: "shadow-purple-500/20", btn: "bg-purple-500/10 border-purple-500/50 hover:bg-purple-500 hover:text-black" },
  laranja: { bg: "bg-orange-500", text: "text-orange-500", border: "border-orange-500", glow: "shadow-orange-500/20", btn: "bg-orange-500/10 border-orange-500/50 hover:bg-orange-500 hover:text-black" },
  custom: { bg: "bg-[var(--aura)]", text: "text-[var(--aura)]", border: "border-[var(--aura)]", glow: "shadow-[var(--aura)]/20", btn: "bg-[var(--aura)]/10 border-[var(--aura)]/50 hover:bg-[var(--aura)] hover:text-black" }
};

export default function PerfilPage() {
  // ==========================================
  // 🔐 [SESSÃO 2] - ESTADOS GERAIS
  // ==========================================
  const [usuarioAtivo, setUsuarioAtivo] = useState<string | null>(null);
  const [abaAtiva, setAbaAtiva] = useState("STATUS");
  const [telaCheia, setTelaCheia] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [fazendoUpload, setFazendoUpload] = useState(false);

  const [dadosPerfil, setDadosPerfil] = useState({ 
    nome: "", avatar: "", bio: "", tema: "azul", custom_color: "#3b82f6", pin: "", anilist_token: "" 
  });
  
  const [obrasUsuario, setObrasUsuario] = useState<any[]>([]);
  const [stats, setStats] = useState({ 
    obras: 0, caps: 0, finais: 0, horasVida: 0, favs: 0, filmes: 0, livros: 0 
  });

  const [elo, setElo] = useState({ tier: "BRONZE", cor: "from-orange-800 to-orange-500", glow: "shadow-orange-900/40", efeito: "" });

  // ==========================================
  // 🧠 [SESSÃO 3] - CORE LOGIC E AUTOMAÇÃO
  // ==========================================
  useEffect(() => {
    const hunter = sessionStorage.getItem("hunter_ativo");
    if (!hunter) { window.location.href = '/'; return; }
    setUsuarioAtivo(hunter);
  }, []);

  useEffect(() => {
    if (!usuarioAtivo) return;

    const hash = window.location.hash;
    if (hash.includes("access_token")) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get("access_token");

      if (token) {
        const salvarTokenAuto = async () => {
          setSalvando(true);
          const { error } = await supabase.from("perfis").update({ anilist_token: token }).eq("nome_original", usuarioAtivo);
          if (!error) {
            setDadosPerfil(prev => ({ ...prev, anilist_token: token }));
            alert("✅ Conta AniList conectada com sucesso!");
            window.history.replaceState(null, '', window.location.pathname);
          } else {
            alert("Erro ao conectar AniList: " + error.message);
          }
          setSalvando(false);
        };
        salvarTokenAuto();
      }
    }
    carregarDados();
  }, [usuarioAtivo]);

  async function carregarDados() {
    const { data: mangas } = await supabase.from("mangas").select("*").eq("usuario", usuarioAtivo);
    const { data: animes } = await supabase.from("animes").select("*").eq("usuario", usuarioAtivo);
    const { data: filmes } = await supabase.from("filmes").select("*").eq("usuario", usuarioAtivo); 
    const { data: livros } = await supabase.from("livros").select("*").eq("usuario", usuarioAtivo); 
    const { data: perfil } = await supabase.from("perfis").select("*").eq("nome_original", usuarioAtivo).single();

    if (mangas || animes || filmes || livros) {
      const all = [...(mangas || []), ...(animes || []), ...(filmes || []), ...(livros || [])];
      
      const epsVistos = (animes || []).reduce((acc, a) => acc + (a.capitulo_atual || 0), 0);
      const minFilmesVistos = (filmes || []).filter(f => f.status === "Completos").length * 120; 
      
      setObrasUsuario(all);
      setStats({
        obras: all.length,
        caps: all.reduce((acc, o) => acc + (o.capitulo_atual || 0), 0),
        finais: all.filter(o => o.status === "Completos").length,
        horasVida: Math.floor(((epsVistos * 23) + minFilmesVistos) / 60), 
        favs: all.filter(o => o.favorito === true || o.favorito === "true").length,
        filmes: (filmes || []).length,
        livros: (livros || []).length
      });

      const t = all.length;
      if (t >= 1000) setElo({ tier: "DIVINDADE", cor: "from-white via-cyan-200 to-white", glow: "shadow-white/60 shadow-[0_0_40px_rgba(255,255,255,0.3)]", efeito: "animate-pulse" });
      else if (t >= 500) setElo({ tier: "DESAFIANTE", cor: "from-red-600 via-purple-600 to-blue-600", glow: "shadow-purple-500/40", efeito: "" });
      else if (t >= 200) setElo({ tier: "MESTRE", cor: "from-purple-400 to-purple-900", glow: "shadow-purple-500/30", efeito: "" });
      else if (t >= 100) setElo({ tier: "DIAMANTE", cor: "from-blue-400 to-indigo-600", glow: "shadow-blue-500/20", efeito: "" });
      else setElo({ tier: "BRONZE", cor: "from-orange-800 to-orange-500", glow: "shadow-orange-900/20", efeito: "" });
    }

    if (perfil) {
      setDadosPerfil({
        nome: perfil.nome_exibicao || usuarioAtivo!,
        avatar: perfil.avatar || "https://i.imgur.com/8Km9t4S.png",
        bio: perfil.bio || "",
        tema: perfil.cor_tema || "azul",
        custom_color: perfil.custom_color || "#3b82f6",
        pin: perfil.pin || "",
        anilist_token: perfil.anilist_token || "" 
      });
    }
    setCarregando(false);
  }

  async function atualizarPerfil() {
    setSalvando(true);
    try {
      const { error } = await supabase.from("perfis").update({
        nome_exibicao: dadosPerfil.nome,
        avatar: dadosPerfil.avatar,
        cor_tema: dadosPerfil.tema,
        custom_color: dadosPerfil.custom_color,
        pin: dadosPerfil.pin,
        anilist_token: dadosPerfil.anilist_token 
      }).eq("nome_original", usuarioAtivo);
      if (error) throw error;
      alert("✨ Hunter Sincronizado!");
      window.location.reload(); 
    } catch (err: any) { alert("Erro: " + err.message); } finally { setSalvando(false); }
  }

  async function fazerUploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      setFazendoUpload(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Você deve selecionar uma imagem primeiro.');
      }
      
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${usuarioAtivo}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      setDadosPerfil(prev => ({ ...prev, avatar: publicUrl }));
      alert('Upload concluído! Clique em "Sincronizar Hunter" para salvar as alterações.');

    } catch (error: any) {
      alert('Erro no upload: Certifique-se de que o Bucket "avatars" é público e possui as políticas (RLS) configuradas. Detalhes: ' + error.message);
    } finally {
      setFazendoUpload(false);
    }
  }

  async function exportarBiblioteca() {
    try {
      const { data: m } = await supabase.from("mangas").select("*").eq("usuario", usuarioAtivo);
      const { data: a } = await supabase.from("animes").select("*").eq("usuario", usuarioAtivo);
      const { data: f } = await supabase.from("filmes").select("*").eq("usuario", usuarioAtivo);
      const { data: l } = await supabase.from("livros").select("*").eq("usuario", usuarioAtivo);
      const backup = { hunter: dadosPerfil.nome, biblioteca: { mangas: m || [], animes: a || [], filmes: f || [], livros: l || [] } };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `backup_${usuarioAtivo}.json`;
      link.click();
    } catch { alert("Erro ao exportar."); }
  }

  async function importarBiblioteca(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = JSON.parse(event.target?.result as string);
      const format = (o: any) => { const { id, ...r } = o; return { ...r, usuario: usuarioAtivo }; };
      if (content.biblioteca.mangas) await supabase.from("mangas").insert(content.biblioteca.mangas.map(format));
      if (content.biblioteca.animes) await supabase.from("animes").insert(content.biblioteca.animes.map(format));
      if (content.biblioteca.filmes) await supabase.from("filmes").insert(content.biblioteca.filmes.map(format));
      if (content.biblioteca.livros) await supabase.from("livros").insert(content.biblioteca.livros.map(format));
      alert("Importação Concluída!"); carregarDados();
    };
    reader.readAsText(file);
  }

  // ==========================================
  // 🏆 [SESSÃO 4] - RENDERIZAÇÃO E INTERFACE
  // ==========================================
  const aura = dadosPerfil.tema === "custom" ? TEMAS.custom : (TEMAS[dadosPerfil.tema as keyof typeof TEMAS] || TEMAS.azul);

  const iconesTrofeus = [
    "🌱","📖","🔥","🏃","⏳","💎","🦉","🧭","🏆","⚔️",
    "☕","📚","📦","🌟","🖋️","⚡","❤️","🧘","💾","👑",
    "🐦","🎯","🌐","🎨","🎖️","🏮","⛩️","🐉","🌋","🌌",
    "🔮","🧿","🧸","🃏","🎭","🩰","🧶","🧵","🧹","🧺",
    "🧷","🧼","🧽","🧴","🗝️","⚙️","🧪","🛰️","🔭","🔱",
    "🎬","🍿","🎟️","📽️","🎞️","📼","🎫","📺","🎥","🧛",
    "🦸","🧙","🧟","👽","🕵️","🥷","🧑‍🚀","🦖","🦈","🛸",
    /* Novos 15 Ícones de Livros (71 ao 85) */
    "📜","✒️","🕯️","🪶","📚","🔖","📓","📙","📗","📘",
    "📔","📃","📰","🗺️","🏛️"
  ];

  const listaTrofeus = Array.from({ length: 85 }, (_, i) => {
    const id = i + 1;
    let check = false; let nome = `Troféu Hunter ${id}`; let desc = `Bloqueado: Requer Nível ${id * 2} de progresso.`;

    if (id <= 50) {
      if (id === 1) { nome = "Semente"; desc = "Adicionou 1 obra"; check = stats.obras >= 1; }
      else if (id === 2) { nome = "Viciado"; desc = "Adicionou 10 obras"; check = stats.obras >= 10; }
      else if (id === 3) { nome = "Maratonista"; desc = "Leu 100 capítulos"; check = stats.caps >= 100; }
      else if (id === 4) { nome = "Sem Tempo"; desc = "10 Horas assistidas"; check = stats.horasVida >= 10; }
      else if (id === 5) { nome = "Curador"; desc = "Marcou 5 favoritos"; check = stats.favs >= 5; }
      else { check = stats.obras >= (id * 3); }
    } else if (id <= 70) {
      const nivelFilme = id - 50; 
      nome = `Cineasta Nv. ${nivelFilme}`;
      desc = `Bloqueado: Requer ${nivelFilme * 5} filmes na estante.`;
      
      if (id === 51) { nome = "Primeiro Ingresso"; desc = "Adicionou 1 filme"; check = stats.filmes >= 1; }
      else if (id === 52) { nome = "Pipoca Doce"; desc = "Adicionou 5 filmes"; check = stats.filmes >= 5; }
      else if (id === 53) { nome = "Crítico de Sofá"; desc = "Adicionou 10 filmes"; check = stats.filmes >= 10; }
      else if (id === 54) { nome = "Cinéfilo"; desc = "Adicionou 25 filmes"; check = stats.filmes >= 25; }
      else if (id === 55) { nome = "Diretor Mestre"; desc = "Adicionou 50 filmes"; check = stats.filmes >= 50; }
      else { check = stats.filmes >= (nivelFilme * 5); }
    } else {
      // 📚 NOVO SUBTÍTULO: TROFÉUS DA ESTANTE DE LIVROS (71 ao 85)
      const nivelLivro = id - 70;
      nome = `Letrado Nv. ${nivelLivro}`;
      desc = `Bloqueado: Requer ${nivelLivro * 5} livros na estante.`;

      if (id === 71) { nome = "Primeira Página"; desc = "Adicionou 1 livro"; check = stats.livros >= 1; }
      else if (id === 72) { nome = "Traça de Livro"; desc = "Adicionou 5 livros"; check = stats.livros >= 5; }
      else if (id === 73) { nome = "Rato de Biblioteca"; desc = "Adicionou 10 livros"; check = stats.livros >= 10; }
      else if (id === 74) { nome = "Curador Literário"; desc = "Adicionou 25 livros"; check = stats.livros >= 25; }
      else if (id === 75) { nome = "Bibliotecário Chefe"; desc = "Adicionou 50 livros"; check = stats.livros >= 50; }
      else { check = stats.livros >= (nivelLivro * 5); }
    }
    
    return { id, nome, desc, icone: iconesTrofeus[i], check };
  });

  if (carregando) return <div className="min-h-screen bg-[#040405] flex items-center justify-center text-white font-black italic animate-pulse">CARREGANDO HUB...</div>;

  return (
    <main className="min-h-screen bg-[#040405] flex flex-col items-center justify-center p-6 transition-all duration-500 relative overflow-hidden" style={{ "--aura": dadosPerfil.custom_color } as any}>
      
      <div className="fixed top-0 left-0 w-full p-6 md:p-10 flex justify-between items-center z-[110] pointer-events-none">
        <Link href="/" className="pointer-events-auto text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-white transition-colors bg-black/50 px-4 py-2 rounded-xl backdrop-blur-md border border-white/5">← Voltar</Link>
        <button onClick={() => setTelaCheia(!telaCheia)} className="pointer-events-auto text-[10px] font-black uppercase tracking-widest bg-zinc-900/90 backdrop-blur-md px-4 py-2 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white transition-all shadow-xl">
          {telaCheia ? "⊙ Vista Central" : "⛶ Tela Cheia"}
        </button>
      </div>

      <div className={`bg-[#0e0e11]/90 backdrop-blur-xl rounded-[3.5rem] p-12 mt-12 md:mt-0 border border-white/5 relative flex flex-col items-center shadow-2xl transition-all duration-700 ${elo.glow} ring-1 ring-white/10 ${elo.efeito} ${telaCheia ? 'w-full max-w-6xl' : 'w-full max-w-[550px]'}`}>
        
        <div className={`w-28 h-28 bg-zinc-950 rounded-[2.5rem] overflow-hidden border-2 transition-all duration-500 ${aura.border} ${elo.glow} flex items-center justify-center`}>
          {dadosPerfil.avatar?.startsWith('http') ? (
            <img src={dadosPerfil.avatar} className="w-full h-full object-cover" alt="" onError={(e) => (e.target as HTMLImageElement).src = "https://i.imgur.com/8Km9t4S.png"} />
          ) : (
            <span className="text-5xl">{dadosPerfil.avatar || "👤"}</span>
          )}
        </div>

        <h1 className="text-3xl font-black text-white uppercase tracking-tighter mt-6 mb-1 italic">{dadosPerfil.nome}</h1>
        <p className={`text-[10px] font-black bg-gradient-to-r ${elo.cor} bg-clip-text text-transparent uppercase tracking-[0.5em] mb-10`}>RANK: {elo.tier}</p>

        {/* ✅ FIX: ABA "MISSÕES" ADICIONADA DE VOLTA */}
        <div className="flex flex-wrap gap-4 md:gap-8 border-b border-white/5 w-full justify-center pb-6 mb-10 relative z-20">
          {["STATUS", "MISSÕES", "TROFÉUS", "CONFIG"].map(aba => (
            <button key={aba} onClick={() => setAbaAtiva(aba)} className={`text-[9px] font-black uppercase tracking-[0.2em] transition-all ${abaAtiva === aba ? aura.text + " scale-110 drop-shadow-[0_0_8px_currentColor]" : 'text-zinc-600 hover:text-zinc-400'}`}>
              {aba}
            </button>
          ))}
        </div>

        <div className="w-full h-[320px] overflow-y-auto custom-scrollbar px-2 relative">
          
          {abaAtiva === "STATUS" && (
            <div className="grid grid-cols-2 gap-4 animate-in fade-in zoom-in-95">
              <div className="bg-black/40 border border-white/5 p-6 rounded-3xl flex flex-col items-center group hover:border-white/10 transition-all">
                <span className="text-3xl font-black text-white italic">{stats.obras}</span>
                <span className="text-[7px] font-black text-zinc-600 uppercase mt-2">Obras Totais</span>
              </div>
              <div className="bg-black/40 border border-white/5 p-6 rounded-3xl flex flex-col items-center group hover:border-white/10 transition-all">
                <span className="text-3xl font-black text-white italic">{stats.caps}</span>
                <span className="text-[7px] font-black text-zinc-600 uppercase mt-2">Progresso Geral</span>
              </div>
              
              <div className="col-span-2 bg-gradient-to-r from-zinc-900 to-black p-6 rounded-3xl border border-white/5 flex flex-col justify-between group mb-2 relative overflow-hidden">
                 <div className="flex justify-between items-center z-10">
                   <div>
                     <span className="text-2xl font-black text-white italic tracking-tighter">{stats.horasVida} HORAS</span>
                     <p className="text-[7px] font-black text-zinc-500 uppercase mt-1 tracking-widest italic">Vida gasta assistindo</p>
                   </div>
                   <span className="text-4xl opacity-20 group-hover:opacity-100 group-hover:scale-110 transition-all">⏳</span>
                 </div>
                 
                 {/* ✅ FIX: BOTÃO DE SINCRONIZAR ANILIST RESTAURADO (Com proteção de chave .env) */}
                 <a 
                   href={`https://anilist.co/api/v2/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_ANILIST_CLIENT_ID}&response_type=token`}
                   className="mt-6 w-full py-3 bg-blue-600/10 border border-blue-500/30 text-blue-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all text-center z-10"
                 >
                   {dadosPerfil.anilist_token ? "✅ AniList Conectado (Sincronizar Novamente)" : "🔗 Conectar com AniList"}
                 </a>
              </div>
            </div>
          )}

          {/* ✅ FIX: CONTEÚDO DA ABA MISSÕES RESTAURADO */}
          {abaAtiva === "MISSÕES" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-left-4 pb-10">
              <div className="bg-zinc-900/50 p-5 rounded-3xl border border-zinc-800 flex items-center justify-between group hover:border-zinc-600 transition-all">
                 <div>
                   <p className="font-bold text-white uppercase text-[10px] tracking-widest">Leitor Assíduo</p>
                   <p className="text-[8px] text-zinc-500 uppercase mt-1">Atualize 5 capítulos de mangá hoje</p>
                 </div>
                 <span className="text-2xl opacity-50 group-hover:opacity-100 transition-opacity">📚</span>
              </div>
              <div className="bg-zinc-900/50 p-5 rounded-3xl border border-zinc-800 flex items-center justify-between group hover:border-zinc-600 transition-all">
                 <div>
                   <p className="font-bold text-white uppercase text-[10px] tracking-widest">Sétima Arte</p>
                   <p className="text-[8px] text-zinc-500 uppercase mt-1">Adicione 1 filme novo na sua estante</p>
                 </div>
                 <span className="text-2xl opacity-50 group-hover:opacity-100 transition-opacity">🎬</span>
              </div>
              <div className="bg-zinc-900/50 p-5 rounded-3xl border border-zinc-800 flex items-center justify-between group hover:border-zinc-600 transition-all">
                 <div>
                   <p className="font-bold text-white uppercase text-[10px] tracking-widest">Rato de Biblioteca</p>
                   <p className="text-[8px] text-zinc-500 uppercase mt-1">Leia seu primeiro Livro</p>
                 </div>
                 <span className="text-2xl opacity-50 group-hover:opacity-100 transition-opacity">📖</span>
              </div>
            </div>
          )}

          {abaAtiva === "TROFÉUS" && (
            <div className="grid grid-cols-5 gap-y-10 gap-x-2 justify-items-center animate-in fade-in slide-in-from-right-4 pb-10">
              {listaTrofeus.map(t => (
                <div key={t.id} className="flex flex-col items-center group relative">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border-2 transition-all duration-700 
                    ${t.check ? aura.border + " " + aura.glow + " bg-black/40" : "border-zinc-800 opacity-10 grayscale blur-[1px]"}`}>
                    {t.icone}
                  </div>
                  <div className="absolute -top-12 bg-black border border-white/10 px-3 py-2 rounded-xl text-[8px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap shadow-2xl pointer-events-none">
                    <p className={`${t.check ? aura.text : 'text-zinc-600'} uppercase mb-1 font-black`}>{t.nome}</p>
                    {t.desc}
                  </div>
                </div>
              ))}
            </div>
          )}

          {abaAtiva === "CONFIG" && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 pb-10">
              
              {/* ✅ FIX: BOTÃO DE SINCRONIZAR MOVIDO PARA O TOPO E DESTAQUE MÁXIMO */}
              <button 
                onClick={atualizarPerfil} 
                disabled={salvando || fazendoUpload} 
                className={`w-full py-5 rounded-xl font-black text-[12px] uppercase tracking-widest transition-all shadow-xl sticky top-0 z-50 backdrop-blur-md ${aura.btn}`}
              >
                {salvando ? "Sincronizando..." : "💾 Sincronizar Hunter"}
              </button>

              <input type="text" placeholder="Nome Hunter" className="w-full bg-black border border-white/5 p-4 rounded-xl text-white font-bold outline-none" value={dadosPerfil.nome} onChange={e => setDadosPerfil({...dadosPerfil, nome: e.target.value})} />
              
              <div className="grid grid-cols-1 gap-2">
                <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest ml-1">Avatar (URL ou Enviar do PC)</label>
                <div className="flex gap-3 items-center">
                  <input type="text" placeholder="Cole a URL ou faça upload..." className="flex-1 bg-black border border-white/5 p-4 rounded-xl text-white text-xs outline-none focus:border-white/20" value={dadosPerfil.avatar} onChange={e => setDadosPerfil({...dadosPerfil, avatar: e.target.value})} />
                  
                  <label className={`px-6 py-4 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center ${fazendoUpload ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'hover:bg-white/10 text-white'}`}>
                    {fazendoUpload ? "⏳ Enviando..." : "📁 PC"}
                    <input type="file" accept="image/*" className="hidden" onChange={fazerUploadAvatar} disabled={fazendoUpload} />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest ml-1">Código PIN (4 Dígitos)</label>
                <input type="password" maxLength={4} className="w-full bg-black border border-white/5 p-4 rounded-xl text-white font-bold tracking-[1em] text-center outline-none focus:border-white/20" value={dadosPerfil.pin} onChange={e => setDadosPerfil({...dadosPerfil, pin: e.target.value.replace(/\D/g, '')})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <select className="w-full bg-black border border-white/5 p-4 rounded-xl text-white text-[10px] font-bold uppercase outline-none" value={dadosPerfil.tema} onChange={e => setDadosPerfil({...dadosPerfil, tema: e.target.value})}>
                  <option value="azul">Azul Neon</option> <option value="verde">Verde Hacker</option> <option value="roxo">Roxo Galático</option> <option value="laranja">Laranja Fogo</option> <option value="custom">Personalizada</option>
                </select>
                {dadosPerfil.tema === "custom" && <input type="color" className="w-full h-12 bg-black border border-white/5 rounded-xl cursor-pointer" value={dadosPerfil.custom_color} onChange={e => setDadosPerfil({...dadosPerfil, custom_color: e.target.value})} />}
              </div>
            </div>
          )}
        </div>

        {/* BACKUP E LOGOUT */}
        <div className="w-full flex flex-col gap-3 mt-8">
          <div className="grid grid-cols-2 gap-3">
            <button onClick={exportarBiblioteca} className="py-4 rounded-xl border border-zinc-800 text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-all">💾 Exportar</button>
            <label className="py-4 rounded-xl border border-zinc-800 text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer">
              📥 Importar <input type="file" accept=".json" onChange={importarBiblioteca} className="hidden" />
            </label>
          </div>
          <button onClick={() => { sessionStorage.removeItem('hunter_ativo'); window.location.href = '/'; }} className="w-full py-3 text-[8px] font-black text-zinc-700 hover:text-red-500 uppercase tracking-[0.3em] transition-all">Encerrar Sessão</button>
        </div>

      </div>
    </main>
  );
}