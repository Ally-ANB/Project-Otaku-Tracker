"use client";

// =============================================================================
// [SESSÃO 1] - IMPORTAÇÕES E CONFIGURAÇÕES DE TEMAS
// =============================================================================
import { supabase } from "../supabase";
import { useEffect, useState } from "react";
import Link from "next/link";
import EfeitosVisuais from "../components/EfeitosVisuais";

const TEMAS = {
  verde: { bg: "bg-green-500", text: "text-green-500", border: "border-green-500", glow: "shadow-green-500/20", btn: "bg-green-500/10 border-green-500/50 hover:bg-green-500 hover:text-black" },
  azul: { bg: "bg-blue-500", text: "text-blue-500", border: "border-blue-500", glow: "shadow-blue-500/20", btn: "bg-blue-500/10 border-blue-500/50 hover:bg-blue-500 hover:text-black" },
  roxo: { bg: "bg-purple-500", text: "text-purple-500", border: "border-purple-500", glow: "shadow-purple-500/20", btn: "bg-purple-500/10 border-purple-500/50 hover:bg-purple-500 hover:text-black" },
  laranja: { bg: "bg-orange-500", text: "text-orange-500", border: "border-orange-500", glow: "shadow-orange-500/20", btn: "bg-orange-500/10 border-orange-500/50 hover:bg-orange-500 hover:text-black" },
  custom: { bg: "bg-[var(--aura)]", text: "text-[var(--aura)]", border: "border-[var(--aura)]", glow: "shadow-[var(--aura)]/20", btn: "bg-[var(--aura)]/10 border-[var(--aura)]/50 hover:bg-[var(--aura)] hover:text-black" }
};

// =============================================================================
// [SESSÃO 2] - CATÁLOGO DA LOJA (O DESPERTAR DO VFX E COSMÉTICOS)
// =============================================================================
const LOJA_ITENS = [
  // --- RECOMPENSAS VFX DE ELITE (VÍDEOS MP4) ---
  { id: "particula_fogo_vfx", nome: "Chamas Infernais", tipo: "particula", preco: 1200, icone: "♨️", desc: "Fogo real gravado em alta definição em loop." },
  { id: "particula_dispersao_dark", nome: "Desintegração S+", tipo: "particula", preco: 1500, icone: "🫠", desc: "Partículas reais se dissipando no ar negro." },
  { id: "particula_chuva_janela", nome: "Caçador Melancólico", tipo: "particula", preco: 1000, icone: "🌧️", desc: "Chuva escorrendo pelo vidro da tela." },
  { id: "particula_areia_deserto", nome: "Tempestade de Areia", tipo: "particula", preco: 1100, icone: "🏜️", desc: "Partículas de areia real cruzando o ecrã." },
  { id: "particula_fogo_cinematic", nome: "Ta pegando fogo", tipo: "particula", preco: 1800, icone: "🔥", desc: "Fogueira real cinematográfica em loop." },

  // --- MOLDURAS ---
  { id: "moldura_ouro", nome: "Anel de Ouro", tipo: "moldura", preco: 150, icone: "👑", desc: "Moldura dourada brilhante." },
  { id: "moldura_neon", nome: "Glitch Neon", tipo: "moldura", preco: 250, icone: "👾", desc: "Pulso cibernético rosa." },
  { id: "moldura_choque", nome: "Raio Elétrico", tipo: "moldura", preco: 350, icone: "⚡", desc: "Borda animada com alta voltagem azul." },
  { id: "moldura_esmeralda", nome: "Pulso Esmeralda", tipo: "moldura", preco: 300, icone: "💎", desc: "Respiração radiante em tons de verde." },
  { id: "moldura_sombria", nome: "Fumaça Sombria", tipo: "moldura", preco: 400, icone: "🌑", desc: "Aura negra e roxa vazando do avatar." },
  { id: "moldura_gelo", nome: "Cristal de Gelo", tipo: "moldura", preco: 350, icone: "❄️", desc: "Brilho estático e congelante." },
  { id: "moldura_magma", nome: "Magma Escorrendo", tipo: "moldura", preco: 500, icone: "🌋", desc: "Animação de chamas correndo pela borda." },
  { id: "moldura_celestial", nome: "Anel Divino", tipo: "moldura", preco: 800, icone: "👼", desc: "Avatar flutuante com brilho purificador." },

  // --- TÍTULOS ---
  { id: "titulo_sabio", nome: "Título: O Sábio", tipo: "titulo", preco: 400, icone: "🦉", desc: "Clássico título dourado." },
  { id: "titulo_lenda", nome: "Título: A Lenda Viva", tipo: "titulo", preco: 500, icone: "📜", desc: "Clássico título dourado." },
  { id: "titulo_deus", nome: "Divindade Ancestral", tipo: "titulo", preco: 1000, icone: "🔱", desc: "Texto animado brilhando como o sol." },
  { id: "titulo_sombra", nome: "A Sombra que Caminha", tipo: "titulo", preco: 600, icone: "🥷", desc: "Texto com sombra escura fantasmagórica." },
  { id: "titulo_hacker", nome: "Cyber Hunter", tipo: "titulo", preco: 800, icone: "💻", desc: "Efeito de texto tremendo (Glitch) constante." },
  { id: "titulo_arcoiris", nome: "Mestre das Cores", tipo: "titulo", preco: 900, icone: "🌈", desc: "Texto com gradiente animado fluindo." },
  { id: "titulo_sangue", nome: "Ceifador Carmesim", tipo: "titulo", preco: 750, icone: "🩸", desc: "Texto pulsando em vermelho sangue." },
  { id: "titulo_fantasma", nome: "Espectro Inominável", tipo: "titulo", preco: 650, icone: "👻", desc: "Texto translúcido flutuando no vazio." }
];

export default function PerfilPage() {
  const [usuarioAtivo, setUsuarioAtivo] = useState<string | null>(null);
  const [abaAtiva, setAbaAtiva] = useState("STATUS");
  const [telaCheia, setTelaCheia] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [fazendoUpload, setFazendoUpload] = useState(false);
  const [esmolas, setEsmolas] = useState(0);
  const [missoesProgresso, setMissoesProgresso] = useState<boolean[]>([false, false, false, false, false]);
  const [condicoesMissoes, setCondicoesMissoes] = useState<boolean[]>([true, false, false, false, false]); 
  const [inventario, setInventario] = useState<string[]>([]);
  const [equipados, setEquipados] = useState<Record<string, string>>({ moldura: "", particula: "", titulo: "" });
  const [dadosPerfil, setDadosPerfil] = useState({ nome: "", avatar: "", bio: "", tema: "azul", custom_color: "#3b82f6", pin: "", anilist_token: "" });
  const [stats, setStats] = useState({ obras: 0, caps: 0, finais: 0, horasVida: 0, favs: 0, filmes: 0, livros: 0 });
  const [elo, setElo] = useState({ tier: "BRONZE", cor: "from-orange-800 to-orange-500", glow: "shadow-orange-900/40" });

  useEffect(() => {
    const hunter = sessionStorage.getItem("hunter_ativo");
    if (!hunter) { window.location.href = '/'; return; }
    setUsuarioAtivo(hunter);
  }, []);

  useEffect(() => {
    if (usuarioAtivo) carregarDados();
  }, [usuarioAtivo]);

  async function carregarDados() {
    const { data: m } = await supabase.from("mangas").select("*").eq("usuario", usuarioAtivo);
    const { data: a } = await supabase.from("animes").select("*").eq("usuario", usuarioAtivo);
    const { data: f } = await supabase.from("filmes").select("*").eq("usuario", usuarioAtivo); 
    const { data: l } = await supabase.from("livros").select("*").eq("usuario", usuarioAtivo); 
    const { data: p } = await supabase.from("perfis").select("*").eq("nome_original", usuarioAtivo).single();

    if (m || a || f || l) {
      const all = [...(m || []), ...(a || []), ...(f || []), ...(l || [])];
      const epsVistos = (a || []).reduce((acc, obj) => acc + (obj.capitulo_atual || 0), 0);
      const minFilmes = (f || []).filter(obj => obj.status === "Completos").length * 120;
      setStats({
        obras: all.length, caps: all.reduce((acc, obj) => acc + (obj.capitulo_atual || 0), 0), finais: all.filter(obj => obj.status === "Completos").length,
        horasVida: Math.floor(((epsVistos * 23) + minFilmes) / 60), favs: all.filter(o => o.favorito).length, filmes: (f || []).length, livros: (l || []).length
      });
      const t = all.length;
      if (t >= 1000) setElo({ tier: "DIVINDADE", cor: "from-white via-cyan-200 to-white", glow: "shadow-white/60 shadow-[0_0_40px_white]" });
      else if (t >= 500) setElo({ tier: "DESAFIANTE", cor: "from-red-600 via-purple-600 to-blue-600", glow: "shadow-purple-500/40" });
      else if (t >= 200) setElo({ tier: "MESTRE", cor: "from-purple-400 to-purple-900", glow: "shadow-purple-500/30" });
      else if (t >= 100) setElo({ tier: "DIAMANTE", cor: "from-blue-400 to-indigo-600", glow: "shadow-blue-500/20" });
      else setElo({ tier: "BRONZE", cor: "from-orange-800 to-orange-500", glow: "shadow-orange-900/20" });

      const hoje = new Date().toISOString().split('T')[0];
      setCondicoesMissoes([true, all.some(o => o.ultima_leitura?.startsWith(hoje)), (a || []).some(o => o.ultima_leitura?.startsWith(hoje)), all.filter(o => o.ultima_leitura?.startsWith(hoje)).length >= 3, all.filter(o => o.favorito).length >= 5]);
    }

    if (p) {
      setDadosPerfil({ nome: p.nome_exibicao || usuarioAtivo!, avatar: p.avatar || "👤", bio: p.bio || "", tema: p.cor_tema || "azul", custom_color: p.custom_color || "#3b82f6", pin: p.pin || "", anilist_token: p.anilist_token || "" });
      setEsmolas(p.esmolas || 0);
      setInventario(p.cosmeticos?.comprados || []);
      setEquipados(p.cosmeticos?.ativos || { moldura: "", particula: "", titulo: "" });
      setMissoesProgresso(p.missoes_progresso || [false, false, false, false, false]);
    }
    setCarregando(false);
  }

  // ==========================================
  // [AÇÕES DE JOGO] - MISSÕES E COSMÉTICOS
  // ==========================================
  async function completarMissao(index: number, recompensa: number) {
    if (missoesProgresso[index]) return; 
    const nProg = [...missoesProgresso]; nProg[index] = true; const nSaldo = esmolas + recompensa;
    setMissoesProgresso(nProg); setEsmolas(nSaldo);
    await supabase.from("perfis").update({ missoes_progresso: nProg, esmolas: nSaldo }).eq("nome_original", usuarioAtivo);
  }

  async function comprarCosmetico(item: any) {
    if (esmolas < item.preco) return alert("❌ Esmolas insuficientes!");
    if (confirm(`Comprar ${item.nome}?`)) {
      const nSaldo = esmolas - item.preco; const nInv = [...inventario, item.id];
      await supabase.from("perfis").update({ esmolas: nSaldo, cosmeticos: { comprados: nInv, ativos: equipados } }).eq("nome_original", usuarioAtivo);
      setEsmolas(nSaldo); setInventario(nInv);
    }
  }

  async function equiparCosmetico(item: any) {
    const nEquip = { ...equipados, [item.tipo]: equipados[item.tipo] === item.id ? "" : item.id };
    await supabase.from("perfis").update({ cosmeticos: { comprados: inventario, ativos: nEquip } }).eq("nome_original", usuarioAtivo);
    setEquipados(nEquip);
  }

  async function atualizarPerfil() {
    await supabase.from("perfis").update({ nome_exibicao: dadosPerfil.nome, avatar: dadosPerfil.avatar, cor_tema: dadosPerfil.tema, custom_color: dadosPerfil.custom_color, pin: dadosPerfil.pin }).eq("nome_original", usuarioAtivo);
    alert("✨ Hunter Sincronizado!");
  }

  function exportarBiblioteca() {
    const backup = { hunter: dadosPerfil.nome, stats: stats };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `backup_${usuarioAtivo}.json`; a.click();
  }

  async function importarJSON(e: any) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        alert(`Backup de ${json.hunter} detectado!`);
      } catch { alert("Erro ao ler JSON."); }
    };
    reader.readAsText(file);
  }

  // ==========================================
  // [SESSÃO 3] - GERADOR DE TROFÉUS (85 ITENS)
  // ==========================================
  const iconesTrofeus = [ "🌱","📖","🔥","🏃","⏳","💎","🦉","🧭","🏆","⚔️","☕","📚","📦","🌟","🖋️","⚡","❤️","🧘","💾","👑","🐦","🎯","🌐","🎨","🎖️","🏮","⛩️","🐉","🌋","🌌","🔮","🧿","🧸","🃏","🎭","🩰","🧶","🧵","🧹","🧺","🧷","🧼","🧽","🧴","🗝️","⚙️","🧪","🛰️","🔭","🔱","🎬","🍿","🎟️","📽️","🎞️","📼","🎫","📺","🎥","🧛","🦸","🧙","🧟","👽","🕵️","🥷","🧑‍🚀","REX","🦈","🛸","📜","✒️","🕯️","🪶","📚","🔖","📓","📙","📗","📘","📔","📃","📰","🗺️","🏛️" ];
  const listaTrofeus = Array.from({ length: 85 }, (_, i) => {
    const id = i + 1; let check = false; let nome = `Troféu Hunter ${id}`; let desc = `Bloqueado: Requer Nível ${id * 2} de progresso.`;
    if (id <= 50) {
      if (id === 1) { nome = "Semente"; desc = "Adicionou 1 obra"; check = stats.obras >= 1; }
      else if (id === 2) { nome = "Viciado"; desc = "Adicionou 10 obras"; check = stats.obras >= 10; }
      else if (id === 3) { nome = "Maratonista"; desc = "Leu 100 capítulos"; check = stats.caps >= 100; }
      else if (id === 4) { nome = "Sem Tempo"; desc = "10 Horas assistidas"; check = stats.horasVida >= 10; }
      else if (id === 5) { nome = "Curador"; desc = "Marcou 5 favoritos"; check = stats.favs >= 5; }
      else { check = stats.obras >= (id * 3); }
    } else if (id <= 70) {
      const nivelFilme = id - 50; nome = `Cineasta Nv. ${nivelFilme}`; desc = `Requer ${nivelFilme * 5} filmes na estante.`;
      check = stats.filmes >= (nivelFilme * 5);
    } else {
      const nivelLivro = id - 70; nome = `Letrado Nv. ${nivelLivro}`; desc = `Requer ${nivelLivro * 5} livros na estante.`;
      check = stats.livros >= (nivelLivro * 5);
    }
    return { id, nome, desc, icone: iconesTrofeus[i], check };
  });

  const listaMissoes = [
    { titulo: "Check-in Diário", desc: "Aceda à guilda hoje", recompensa: 10, icone: "👋" },
    { titulo: "Leitor Assíduo", desc: "Leia/Atualize 1 manga ou livro hoje", recompensa: 20, icone: "📚" },
    { titulo: "Sétima Arte", desc: "Assista/Atualize 1 anime ou filme hoje", recompensa: 20, icone: "🎬" },
    { titulo: "Caçador Ativo", desc: "Interaja com 3 obras diferentes hoje", recompensa: 25, icone: "🎯" },
    { titulo: "Curador", desc: "Mantenha pelo menos 5 obras favoritas", recompensa: 15, icone: "✨" },
  ];

  const aura = dadosPerfil.tema === "custom" ? TEMAS.custom : (TEMAS[dadosPerfil.tema as keyof typeof TEMAS] || TEMAS.azul);

  if (carregando) return <div className="min-h-screen bg-[#040405] flex items-center justify-center text-white italic animate-pulse">SINCRONIZANDO HUB...</div>;

  return (
    <main className="min-h-screen bg-[#040405] flex flex-col items-center justify-center p-6 relative overflow-hidden" style={{ "--aura": dadosPerfil.custom_color } as any}>
      <EfeitosVisuais particula={equipados.particula} />

      <div className="fixed top-0 left-0 w-full p-10 flex justify-between items-center z-[110] pointer-events-none">
        <Link href="/" className="pointer-events-auto bg-black/50 px-6 py-3 rounded-2xl border border-white/5 text-[10px] font-black uppercase text-zinc-500">← Voltar</Link>
        <div className="bg-black/80 px-6 py-3 rounded-2xl border border-yellow-500/30 flex items-center gap-3 shadow-xl"><span className="text-xl">🪙</span><span className="text-white font-black">{esmolas}</span></div>
        <button onClick={() => setTelaCheia(!telaCheia)} className="pointer-events-auto text-[10px] font-black uppercase bg-zinc-900/90 px-4 py-2 rounded-xl border border-zinc-800 text-zinc-400">{telaCheia ? "⊙ Central" : "⛶ Tela Cheia"}</button>
      </div>

      <div className={`bg-[#0e0e11]/95 backdrop-blur-2xl rounded-[3.5rem] p-12 border border-white/5 relative flex flex-col items-center shadow-2xl transition-all duration-700 z-10 ${telaCheia ? 'w-full max-w-6xl' : 'w-full max-w-[550px]'}`}>
        
        <div className={`w-28 h-28 bg-zinc-950 rounded-[2.5rem] overflow-hidden border-2 flex items-center justify-center relative z-10 ${aura.border} ${elo.glow} ${equipados.moldura}`}>
          {dadosPerfil.avatar?.startsWith('http') ? <img src={dadosPerfil.avatar} className="w-full h-full object-cover" /> : <span className="text-5xl">{dadosPerfil.avatar}</span>}
        </div>

        <h1 className="text-3xl font-black text-white uppercase italic mt-6 mb-1">{dadosPerfil.nome}</h1>
        {equipados.titulo && <p className={`text-[10px] font-black uppercase tracking-[0.3em] mb-2 drop-shadow-md ${equipados.titulo}`}>« {LOJA_ITENS.find(i => i.id === equipados.titulo)?.nome.replace("Título: ", "")} »</p>}
        <p className={`text-[10px] font-black bg-gradient-to-r ${elo.cor} bg-clip-text text-transparent uppercase tracking-[0.5em] mb-10`}>RANK: {elo.tier}</p>

        <div className="flex gap-4 md:gap-8 border-b border-white/5 w-full justify-center pb-6 mb-10">
          {["STATUS", "MISSÕES", "TROFÉUS", "LOJA", "CONFIG"].map(aba => (
            <button key={aba} onClick={() => setAbaAtiva(aba)} className={`text-[9px] font-black uppercase tracking-widest ${abaAtiva === aba ? aura.text : 'text-zinc-600'}`}>{aba}</button>
          ))}
        </div>

        <div className="w-full h-[320px] overflow-y-auto custom-scrollbar px-2">
          {abaAtiva === "STATUS" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/40 border border-white/5 p-6 rounded-3xl flex flex-col items-center"><span className="text-3xl font-black text-white italic">{stats.obras}</span><span className="text-[7px] font-black text-zinc-600 uppercase mt-2">Obras Totais</span></div>
              <div className="bg-black/40 border border-white/5 p-6 rounded-3xl flex flex-col items-center"><span className="text-3xl font-black text-white italic">{stats.caps}</span><span className="text-[7px] font-black text-zinc-600 uppercase mt-2">Capítulos</span></div>
              <div className="col-span-2 bg-gradient-to-r from-zinc-900 to-black p-6 rounded-3xl border border-white/5 flex flex-col items-center overflow-hidden">
                <span className="text-2xl font-black text-white italic">{stats.horasVida} HORAS</span>
                <p className="text-[7px] font-black text-zinc-500 uppercase tracking-widest italic mt-1">Tempo de Vida Consumido</p>
              </div>
            </div>
          )}

          {abaAtiva === "MISSÕES" && (
            <div className="space-y-4 pb-10">
              {listaMissoes.map((m, i) => (
                <div key={i} className={`p-5 rounded-3xl border flex items-center justify-between transition-all ${missoesProgresso[i] ? 'bg-black/40 border-green-500/20' : condicoesMissoes[i] ? 'bg-zinc-900 border-yellow-500/40 shadow-lg' : 'bg-zinc-900/50 border-zinc-800'}`}>
                  <div className="flex items-center gap-4"><span className="text-3xl">{m.icone}</span><div><p className={`font-bold uppercase text-[10px] ${missoesProgresso[i] ? 'text-green-500' : 'text-white'}`}>{m.titulo}</p><p className="text-[8px] text-zinc-500 uppercase mt-1">{m.desc}</p></div></div>
                  <button onClick={() => completarMissao(i, m.recompensa)} disabled={missoesProgresso[i] || !condicoesMissoes[i]} className={`px-4 py-2 rounded-xl text-[9px] font-black border ${missoesProgresso[i] ? 'bg-green-500/10 border-green-500/30 text-green-500' : condicoesMissoes[i] ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-500' : 'bg-zinc-950 border-zinc-800 text-zinc-600'}`}>{missoesProgresso[i] ? "Feito" : "💰"}</button>
                </div>
              ))}
            </div>
          )}

          {abaAtiva === "TROFÉUS" && (
            <div className="grid grid-cols-5 gap-y-10 pb-10">
              {listaTrofeus.map(t => (
                <div key={t.id} className="flex flex-col items-center group relative">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border-2 transition-all ${t.check ? aura.border + " bg-black/40" : "border-zinc-800 opacity-10 grayscale"}`}>{t.icone}</div>
                  <div className="absolute -top-12 bg-black border border-white/10 px-3 py-2 rounded-xl text-[8px] font-bold text-white opacity-0 group-hover:opacity-100 z-50 whitespace-nowrap pointer-events-none">
                    <p className={`${t.check ? aura.text : 'text-zinc-600'} uppercase mb-1 font-black`}>{t.nome}</p>{t.desc}
                  </div>
                </div>
              ))}
            </div>
          )}

          {abaAtiva === "LOJA" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-10">
              {LOJA_ITENS.map(item => {
                const comprado = inventario.includes(item.id); const equipado = equipados[item.tipo] === item.id;
                return (
                  <div key={item.id} className={`p-4 rounded-3xl border flex flex-col gap-4 ${comprado ? 'bg-zinc-900 border-zinc-700' : 'bg-black/50 border-zinc-800'}`}>
                    <div className="flex items-center gap-4"><span className="text-3xl bg-zinc-950 p-4 rounded-2xl border border-white/5">{item.icone}</span><div><p className="font-black uppercase text-[10px] text-white">{item.nome}</p><p className="text-[7px] text-zinc-500 uppercase">{item.tipo}</p></div></div>
                    {!comprado ? <button onClick={() => comprarCosmetico(item)} className="w-full py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 font-black text-[9px] uppercase">Comprar ({item.preco} 🪙)</button>
                    : <button onClick={() => equiparCosmetico(item)} className={`w-full py-3 rounded-xl font-black text-[9px] border ${equipado ? 'bg-green-500/20 text-green-500 border-green-500' : 'bg-zinc-800 text-zinc-400'}`}>{equipado ? "Equipado" : "Equipar"}</button>}
                  </div>
                );
              })}
            </div>
          )}

          {abaAtiva === "CONFIG" && (
            <div className="space-y-6 pb-10">
              <button onClick={atualizarPerfil} className={`w-full py-5 rounded-xl font-black text-[12px] uppercase shadow-xl ${aura.btn}`}>💾 Sincronizar Hunter</button>
              <input type="text" placeholder="Nome Hunter" className="w-full bg-black border border-white/5 p-4 rounded-xl text-white font-bold outline-none" value={dadosPerfil.nome} onChange={e => setDadosPerfil({...dadosPerfil, nome: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <select className="bg-black border border-white/5 p-4 rounded-xl text-white font-bold uppercase text-[10px]" value={dadosPerfil.tema} onChange={e => setDadosPerfil({...dadosPerfil, tema: e.target.value})}>
                   <option value="azul">Azul Néon</option><option value="verde">Verde Hacker</option><option value="roxo">Roxo Galático</option><option value="laranja">Laranja Fogo</option><option value="custom">Personalizada</option>
                </select>
                <input type="password" placeholder="PIN Hunter (4 dígitos)" maxLength={4} className="bg-black border border-white/5 p-4 rounded-xl text-white font-bold text-center tracking-[0.5em]" value={dadosPerfil.pin} onChange={e => setDadosPerfil({...dadosPerfil, pin: e.target.value})} />
              </div>
            </div>
          )}
        </div>

        <div className="w-full flex flex-col gap-3 mt-8 relative z-20">
          <div className="grid grid-cols-2 gap-3">
             <button onClick={exportarBiblioteca} className="py-4 rounded-xl border border-zinc-800 text-[9px] font-black uppercase text-zinc-500 hover:text-white transition-all">💾 Exportar</button>
             <label className="py-4 rounded-xl border border-zinc-800 text-[9px] font-black uppercase text-zinc-500 flex items-center justify-center cursor-pointer hover:text-white transition-all">📥 Importar <input type="file" accept=".json" className="hidden" onChange={importarJSON} /></label>
          </div>
          <button onClick={() => { sessionStorage.removeItem('hunter_ativo'); window.location.href = '/'; }} className="w-full py-3 text-[8px] font-black text-zinc-700 hover:text-red-500 uppercase tracking-[0.3em] transition-all">Encerrar Sessão</button>
        </div>
      </div>
    </main>
  );
}