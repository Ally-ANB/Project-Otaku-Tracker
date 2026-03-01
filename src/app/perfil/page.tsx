"use client";

// ==========================================
// [SESSÃO 1] - IMPORTAÇÕES E TEMAS (AURA GLOBAL)
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
  // [SESSÃO 2] - ESTADOS
  // ==========================================
  const [usuarioAtivo, setUsuarioAtivo] = useState<string | null>(null);
  const [abaAtiva, setAbaAtiva] = useState("STATUS");
  const [telaCheia, setTelaCheia] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // ✅ Token do AniList adicionado aos estados
  const [dadosPerfil, setDadosPerfil] = useState({ 
    nome: "", avatar: "", bio: "", tema: "azul", custom_color: "#3b82f6", pin: "", anilist_token: "" 
  });
  
  const [obrasUsuario, setObrasUsuario] = useState<any[]>([]);
  const [stats, setStats] = useState({ 
    obras: 0, caps: 0, finais: 0, horasVida: 0, favs: 0 
  });

  const [elo, setElo] = useState({ tier: "BRONZE", cor: "from-orange-800 to-orange-500", glow: "shadow-orange-900/40", efeito: "" });

  // ==========================================
  // [SESSÃO 3] - CORE LOGIC (SEGURANÇA E DADOS)
  // ==========================================
  useEffect(() => {
    const hunter = sessionStorage.getItem("hunter_ativo");
    if (!hunter) { window.location.href = '/'; return; }
    setUsuarioAtivo(hunter);
  }, []);

  useEffect(() => { if (usuarioAtivo) carregarDados(); }, [usuarioAtivo]);

  async function carregarDados() {
    const { data: mangas } = await supabase.from("mangas").select("*").eq("usuario", usuarioAtivo);
    const { data: animes } = await supabase.from("animes").select("*").eq("usuario", usuarioAtivo);
    const { data: perfil } = await supabase.from("perfis").select("*").eq("nome_original", usuarioAtivo).single();

    if (mangas || animes) {
      const all = [...(mangas || []), ...(animes || [])];
      const epsVistos = (animes || []).reduce((acc, a) => acc + (a.capitulo_atual || 0), 0);
      
      setObrasUsuario(all);
      setStats({
        obras: all.length,
        caps: all.reduce((acc, o) => acc + (o.capitulo_atual || 0), 0),
        finais: all.filter(o => o.status === "Completos").length,
        horasVida: Math.floor((epsVistos * 23) / 60),
        favs: all.filter(o => o.favorito === true || o.favorito === "true").length
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
        anilist_token: perfil.anilist_token || "" // ✅ Token carregado
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
        anilist_token: dadosPerfil.anilist_token // ✅ Token salvo
      }).eq("nome_original", usuarioAtivo);
      if (error) throw error;
      alert("✨ Hunter Sincronizado!");
      window.location.reload(); 
    } catch (err: any) { alert("Erro: " + err.message); } finally { setSalvando(false); }
  }

  async function exportarBiblioteca() {
    try {
      const { data: m } = await supabase.from("mangas").select("*").eq("usuario", usuarioAtivo);
      const { data: a } = await supabase.from("animes").select("*").eq("usuario", usuarioAtivo);
      const backup = { hunter: dadosPerfil.nome, biblioteca: { mangas: m || [], animes: a || [] } };
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
      await supabase.from("mangas").insert(content.biblioteca.mangas.map(format));
      await supabase.from("animes").insert(content.biblioteca.animes.map(format));
      alert("Importação Concluída!"); carregarDados();
    };
    reader.readAsText(file);
  }

  // ==========================================
  // [SESSÃO 4] - 50 TROFÉUS ÚNICOS (GRID 5x10)
  // ==========================================
  const aura = dadosPerfil.tema === "custom" ? TEMAS.custom : (TEMAS[dadosPerfil.tema as keyof typeof TEMAS] || TEMAS.azul);

  const iconesTrofeus = [
    "🌱","📖","🔥","🏃","⏳","💎","🦉","🧭","🏆","⚔️",
    "☕","📚","📦","🌟","🖋️","⚡","❤️","🧘","💾","👑",
    "🐦","🎯","🌐","🎨","🎖️","🏮","⛩️","🐉","🌋","🌌",
    "🔮","🧿","🧸","🃏","🎭","🩰","🧶","🧵","🧹","🧺",
    "🧷","🧼","🧽","🧴","🗝️","⚙️","🧪","🛰️","🔭","🔱"
  ];

  const listaTrofeus = Array.from({ length: 50 }, (_, i) => {
    const id = i + 1;
    let check = false;
    let nome = `Troféu Hunter ${id}`;
    let desc = `Bloqueado: Requer Nível ${id * 2} de progresso.`;

    if (id === 1) { nome = "Semente"; desc = "Adicionou 1 obra"; check = stats.obras >= 1; }
    else if (id === 2) { nome = "Viciado"; desc = "Adicionou 10 obras"; check = stats.obras >= 10; }
    else if (id === 3) { nome = "Maratonista"; desc = "Leu 100 capítulos"; check = stats.caps >= 100; }
    else if (id === 4) { nome = "Sem Tempo"; desc = "10 Horas assistidas"; check = stats.horasVida >= 10; }
    else if (id === 5) { nome = "Curador"; desc = "Marcou 5 favoritos"; check = stats.favs >= 5; }
    else { check = stats.obras >= (id * 3); }
    
    return { id, nome, desc, icone: iconesTrofeus[i], check };
  });

  // Recompensas Funcionais
  const listaMissoes = [
    { id: 1, titulo: "Segurança Máxima", obj: "Fazer 1 Backup Local", prog: 1, meta: 1, rec: "🔓 Aura Pulsante" },
    { id: 2, titulo: "Vida Eterna", obj: "500 Horas Assistidas", prog: stats.horasVida, meta: 500, rec: "🎥 Filtro Cinema" },
    { id: 3, titulo: "Alpha Hunter", obj: "50 Séries Completas", prog: stats.finais, meta: 50, rec: "✨ Nome Dourado" }
  ];

  if (carregando) return <div className="min-h-screen bg-[#040405] flex items-center justify-center text-white font-black italic animate-pulse">CARREGANDO HUB...</div>;

  return (
    <main className="min-h-screen bg-[#040405] flex flex-col items-center justify-center p-6 transition-all duration-500 relative overflow-hidden" style={{ "--aura": dadosPerfil.custom_color } as any}>
      
      {/* BOTÕES SUPERIORES */}
      <div className="fixed top-0 left-0 w-full p-6 md:p-10 flex justify-between items-center z-[110] pointer-events-none">
        <Link href="/" className="pointer-events-auto text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-white transition-colors bg-black/50 px-4 py-2 rounded-xl backdrop-blur-md border border-white/5">← Voltar</Link>
        <button onClick={() => setTelaCheia(!telaCheia)} className="pointer-events-auto text-[10px] font-black uppercase tracking-widest bg-zinc-900/90 backdrop-blur-md px-4 py-2 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white transition-all shadow-xl">
          {telaCheia ? "⊙ Vista Central" : "⛶ Tela Cheia"}
        </button>
      </div>

      {/* CARD PRINCIPAL - ELO DITA O BRILHO */}
      <div className={`bg-[#0e0e11]/90 backdrop-blur-xl rounded-[3.5rem] p-12 mt-12 md:mt-0 border border-white/5 relative flex flex-col items-center shadow-2xl transition-all duration-700 ${elo.glow} ring-1 ring-white/10 ${elo.efeito} ${telaCheia ? 'w-full max-w-6xl' : 'w-full max-w-[550px]'}`}>
        
        {/* AVATAR INTELIGENTE */}
        <div className={`w-28 h-28 bg-zinc-950 rounded-[2.5rem] overflow-hidden border-2 transition-all duration-500 ${aura.border} ${elo.glow} flex items-center justify-center`}>
          {dadosPerfil.avatar?.startsWith('http') ? (
            <img src={dadosPerfil.avatar} className="w-full h-full object-cover" alt="" onError={(e) => (e.target as HTMLImageElement).src = "https://i.imgur.com/8Km9t4S.png"} />
          ) : (
            <span className="text-5xl">{dadosPerfil.avatar || "👤"}</span>
          )}
        </div>

        <h1 className="text-3xl font-black text-white uppercase tracking-tighter mt-6 mb-1 italic">{dadosPerfil.nome}</h1>
        
        {/* RANK/ELO */}
        <p className={`text-[10px] font-black bg-gradient-to-r ${elo.cor} bg-clip-text text-transparent uppercase tracking-[0.5em] mb-10`}>RANK: {elo.tier}</p>

        {/* NAVEGAÇÃO */}
        <div className="flex flex-wrap gap-6 md:gap-8 border-b border-white/5 w-full justify-center pb-6 mb-10 relative z-20">
          {["STATUS", "TROFÉUS", "MISSÕES", "CONFIG"].map(aba => (
            <button key={aba} onClick={() => setAbaAtiva(aba)} className={`text-[9px] font-black uppercase tracking-[0.2em] transition-all ${abaAtiva === aba ? aura.text + " scale-110 drop-shadow-[0_0_8px_currentColor]" : 'text-zinc-600 hover:text-zinc-400'}`}>
              {aba}
            </button>
          ))}
        </div>

        {/* ÁREA DE CONTEÚDO */}
        <div className="w-full h-[320px] overflow-y-auto custom-scrollbar px-2">
          
          {abaAtiva === "STATUS" && (
            <div className="grid grid-cols-2 gap-4 animate-in fade-in zoom-in-95">
              <div className="bg-black/40 border border-white/5 p-6 rounded-3xl flex flex-col items-center group hover:border-white/10 transition-all">
                <span className="text-3xl font-black text-white italic">{stats.obras}</span>
                <span className="text-[7px] font-black text-zinc-600 uppercase mt-2">Obras</span>
              </div>
              <div className="bg-black/40 border border-white/5 p-6 rounded-3xl flex flex-col items-center group hover:border-white/10 transition-all">
                <span className="text-3xl font-black text-white italic">{stats.caps}</span>
                <span className="text-[7px] font-black text-zinc-600 uppercase mt-2">Progresso</span>
              </div>
              <div className="col-span-2 bg-gradient-to-r from-zinc-900 to-black p-6 rounded-3xl border border-white/5 flex items-center justify-between group">
                 <div>
                   <span className="text-2xl font-black text-white italic tracking-tighter">{stats.horasVida} HORAS</span>
                   <p className="text-[7px] font-black text-zinc-500 uppercase mt-1 tracking-widest italic">Vida gasta assistindo</p>
                 </div>
                 <span className="text-4xl opacity-20 group-hover:opacity-100 group-hover:scale-110 transition-all">⏳</span>
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

          {abaAtiva === "MISSÕES" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-left-4">
              {listaMissoes.map(m => (
                <div key={m.id} className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5 relative group">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-xs font-black text-white uppercase italic">{m.titulo}</h4>
                      <p className="text-[8px] text-zinc-500 uppercase mt-1">{m.obj}</p>
                    </div>
                    <span className={`text-[9px] font-black ${aura.text}`}>🎁 {m.rec}</span>
                  </div>
                  <div className="w-full h-1 bg-black rounded-full overflow-hidden">
                    <div className={`h-full ${aura.bg} transition-all duration-1000`} style={{ width: `${Math.min((m.prog/m.meta)*100, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {abaAtiva === "CONFIG" && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 pb-10">
              <input type="text" placeholder="Nome Hunter" className="w-full bg-black border border-white/5 p-4 rounded-xl text-white font-bold outline-none" value={dadosPerfil.nome} onChange={e => setDadosPerfil({...dadosPerfil, nome: e.target.value})} />
              <input type="text" placeholder="URL Imagem Avatar" className="w-full bg-black border border-white/5 p-4 rounded-xl text-white text-xs outline-none" value={dadosPerfil.avatar} onChange={e => setDadosPerfil({...dadosPerfil, avatar: e.target.value})} />
              
              <div className="grid grid-cols-1 gap-4">
                <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest ml-1">Código PIN (4 Dígitos)</label>
                <input type="password" maxLength={4} className="w-full bg-black border border-white/5 p-4 rounded-xl text-white font-bold tracking-[1em] text-center" value={dadosPerfil.pin} onChange={e => setDadosPerfil({...dadosPerfil, pin: e.target.value})} />
              </div>

              {/* ✅ INPUT DO ANILIST RESTAURADO */}
              <div className="grid grid-cols-1 gap-4">
                <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest ml-1">Token de Sincronização AniList</label>
                <input 
                  type="password" 
                  placeholder="Cole seu Token do AniList aqui..." 
                  className="w-full bg-black border border-white/5 p-4 rounded-xl text-white text-xs font-mono outline-none focus:border-white/20 transition-all" 
                  value={dadosPerfil.anilist_token} 
                  onChange={e => setDadosPerfil({...dadosPerfil, anilist_token: e.target.value})} 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <select className="w-full bg-black border border-white/5 p-4 rounded-xl text-white text-[10px] font-bold uppercase" value={dadosPerfil.tema} onChange={e => setDadosPerfil({...dadosPerfil, tema: e.target.value})}>
                  <option value="azul">Azul Neon</option> <option value="verde">Verde Hacker</option> <option value="roxo">Roxo Galático</option> <option value="laranja">Laranja Fogo</option> <option value="custom">Personalizada</option>
                </select>
                {dadosPerfil.tema === "custom" && <input type="color" className="w-full h-12 bg-black border border-white/5 rounded-xl cursor-pointer" value={dadosPerfil.custom_color} onChange={e => setDadosPerfil({...dadosPerfil, custom_color: e.target.value})} />}
              </div>
              <button onClick={atualizarPerfil} disabled={salvando} className={`w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${aura.btn}`}>
                {salvando ? "Sincronizando..." : "Sincronizar Hunter"}
              </button>
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