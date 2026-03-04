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
// [SESSÃO 2] - CATÁLOGO DA LOJA (COSMÉTICOS E EFEITOS)
// =============================================================================
const LOJA_ITENS = [
  // MOLDURAS
  { id: "moldura_ouro", nome: "Anel de Ouro", tipo: "moldura", preco: 150, icone: "👑", desc: "Moldura dourada brilhante." },
  { id: "moldura_neon", nome: "Glitch Neon", tipo: "moldura", preco: 250, icone: "👾", desc: "Pulso cibernético rosa." },
  { id: "moldura_choque", nome: "Raio Elétrico", tipo: "moldura", preco: 350, icone: "⚡", desc: "Borda animada com alta voltagem azul." },
  { id: "moldura_esmeralda", nome: "Pulso Esmeralda", tipo: "moldura", preco: 300, icone: "💎", desc: "Respiração radiante em tons de verde." },
  { id: "moldura_sombria", nome: "Fumaça Sombria", tipo: "moldura", preco: 400, icone: "🌑", desc: "Aura negra e roxa vazando do avatar." },
  { id: "moldura_gelo", nome: "Cristal de Gelo", tipo: "moldura", preco: 350, icone: "❄️", desc: "Brilho estático e congelante." },
  { id: "moldura_magma", nome: "Magma Escorrendo", tipo: "moldura", preco: 500, icone: "🌋", desc: "Animação de chamas correndo pela borda." },
  { id: "moldura_celestial", nome: "Anel Divino", tipo: "moldura", preco: 800, icone: "👼", desc: "Avatar flutuante com brilho purificador." },
  
  // PARTÍCULAS
  { id: "particula_primavera", nome: "Brisas de Primavera", tipo: "particula", preco: 400, icone: "🍃", desc: "Folhas verdes flutuando com o vento." },
  { id: "particula_verao", nome: "Vagalumes de Verão", tipo: "particula", preco: 400, icone: "☀️", desc: "Orbes de luz flutuando preguiçosamente." },
  { id: "particula_outono", nome: "Folhas de Outono", tipo: "particula", preco: 400, icone: "🍁", desc: "Folhas alaranjadas caindo calmamente." },
  { id: "particula_inverno", nome: "Inverno Rigoroso", tipo: "particula", preco: 450, icone: "⛄", desc: "Neve densa caindo sobre a tela." },
  { id: "particula_fogo", nome: "Aura de Fogo", tipo: "particula", preco: 300, icone: "🔥", desc: "Fagulhas de chamas subindo animadas." },
  { id: "particula_petalas", nome: "Chuva de Pétalas", tipo: "particula", preco: 300, icone: "🌸", desc: "Pétalas caindo com física de vento." },
  { id: "particula_estrelas", nome: "Céu Estrelado", tipo: "particula", preco: 450, icone: "✨", desc: "Fundo com estrelas cintilantes." },
  { id: "particula_chuva", nome: "Tempestade", tipo: "particula", preco: 350, icone: "🌧️", desc: "Chuva rápida atravessando a tela." },
  { id: "particula_bolhas", nome: "Subaquático", tipo: "particula", preco: 350, icone: "🫧", desc: "Bolhas translúcidas subindo." },
  { id: "particula_matrix", nome: "Código Matrix", tipo: "particula", preco: 600, icone: "📟", desc: "Letras verdes caindo como dados." },
  { id: "particula_confete", nome: "Festa de Vitória", tipo: "particula", preco: 700, icone: "🎊", desc: "Confetes coloridos girando na queda." },
  { id: "particula_morcegos", nome: "Noite Sombria", tipo: "particula", preco: 500, icone: "🦇", desc: "Sombras voadoras passando rápido." },
  
  // TÍTULOS
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
  // =============================================================================
  // [SESSÃO 3] - ESTADOS GERAIS (AUTH, UI E DADOS)
  // =============================================================================
  const [usuarioAtivo, setUsuarioAtivo] = useState<string | null>(null);
  const [abaAtiva, setAbaAtiva] = useState("STATUS");
  const [telaCheia, setTelaCheia] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [fazendoUpload, setFazendoUpload] = useState(false);
  const [animacoesAtivas, setAnimacoesAtivas] = useState(true);

  const [esmolas, setEsmolas] = useState(0);
  const [missoesProgresso, setMissoesProgresso] = useState<boolean[]>([false, false, false, false, false]);
  const [condicoesMissoes, setCondicoesMissoes] = useState<boolean[]>([true, false, false, false, false]); 

  const [inventario, setInventario] = useState<string[]>([]);
  const [equipados, setEquipados] = useState<Record<string, string>>({ moldura: "", particula: "", titulo: "" });

  const [dadosPerfil, setDadosPerfil] = useState({ nome: "", avatar: "", bio: "", tema: "azul", custom_color: "#3b82f6", pin: "", anilist_token: "" });
  const [obrasUsuario, setObrasUsuario] = useState<any[]>([]);
  const [stats, setStats] = useState({ obras: 0, caps: 0, finais: 0, horasVida: 0, favs: 0, filmes: 0, livros: 0 });
  const [elo, setElo] = useState({ tier: "BRONZE", cor: "from-orange-800 to-orange-500", glow: "shadow-orange-900/40", efeito: "" });

  // =============================================================================
  // [SESSÃO 4] - LÓGICA CORE E SINCRONIZAÇÃO
  // =============================================================================
  useEffect(() => {
    const hunter = sessionStorage.getItem("hunter_ativo");
    if (!hunter) { window.location.href = '/'; return; }
    setUsuarioAtivo(hunter);
    setAnimacoesAtivas(localStorage.getItem("hunter_animacoes") !== "false");
  }, []);

  useEffect(() => {
    if (!usuarioAtivo) return;
    
    // --- SUB-SESSÃO 4.1: VERIFICAÇÃO DE RETORNO ANI-SYNC ---
    const params = new URLSearchParams(window.location.search);
    if (params.get("sync") === "success") {
       alert("✅ Conta AniList conectada com sucesso!");
       window.history.replaceState(null, '', window.location.pathname);
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
        obras: all.length, caps: all.reduce((acc, o) => acc + (o.capitulo_atual || 0), 0), finais: all.filter(o => o.status === "Completos").length,
        horasVida: Math.floor(((epsVistos * 23) + minFilmesVistos) / 60), favs: all.filter(o => o.favorito === true || o.favorito === "true").length,
        filmes: (filmes || []).length, livros: (livros || []).length
      });

      const dataHoje = new Date().toISOString().split('T')[0];
      const leuHj = [...(mangas || []), ...(livros || [])].some(o => o.ultima_leitura?.startsWith(dataHoje));
      const assistiuHj = [...(animes || []), ...(filmes || [])].some(o => o.ultima_leitura?.startsWith(dataHoje));
      const interagiu3 = all.filter(o => o.ultima_leitura?.startsWith(dataHoje)).length >= 3;
      const tem5Favs = all.filter(o => o.favorito === true || o.favorito === "true").length >= 5;

      setCondicoesMissoes([true, leuHj, assistiuHj, interagiu3, tem5Favs]);

      const t = all.length;
      if (t >= 1000) setElo({ tier: "DIVINDADE", cor: "from-white via-cyan-200 to-white", glow: "shadow-white/60 shadow-[0_0_40px_rgba(255,255,255,0.3)]", efeito: "animate-pulse" });
      else if (t >= 500) setElo({ tier: "DESAFIANTE", cor: "from-red-600 via-purple-600 to-blue-600", glow: "shadow-purple-500/40", efeito: "" });
      else if (t >= 200) setElo({ tier: "MESTRE", cor: "from-purple-400 to-purple-900", glow: "shadow-purple-500/30", efeito: "" });
      else if (t >= 100) setElo({ tier: "DIAMANTE", cor: "from-blue-400 to-indigo-600", glow: "shadow-blue-500/20", efeito: "" });
      else setElo({ tier: "BRONZE", cor: "from-orange-800 to-orange-500", glow: "shadow-orange-900/20", efeito: "" });
    }

    if (perfil) {
      setDadosPerfil({
        nome: perfil.nome_exibicao || usuarioAtivo!, avatar: perfil.avatar || "https://i.imgur.com/8Km9t4S.png", bio: perfil.bio || "",
        tema: perfil.cor_tema || "azul", custom_color: perfil.custom_color || "#3b82f6", pin: perfil.pin || "", anilist_token: perfil.anilist_token || "" 
      });

      setEsmolas(perfil.esmolas || 0);
      const cosmeticosDb = perfil.cosmeticos || { comprados: [], ativos: {} };
      setInventario(cosmeticosDb.comprados || []);
      setEquipados(cosmeticosDb.ativos || { moldura: "", particula: "", titulo: "" });

      const dataHojeStr = new Date().toISOString().split('T')[0];
      let progressoAtual = perfil.missoes_progresso || [false, false, false, false, false];
      if (perfil.missoes_data !== dataHojeStr) {
        progressoAtual = [false, false, false, false, false];
        await supabase.from("perfis").update({ missoes_data: dataHojeStr, missoes_progresso: progressoAtual }).eq("nome_original", usuarioAtivo);
      }
      setMissoesProgresso(progressoAtual);
    }
    setCarregando(false);
  }

  // =============================================================================
  // [SESSÃO 5] - AÇÕES DE JOGO (MISSÕES, COMPRAS E EQUIPAMENTOS)
  // =============================================================================
  async function completarMissao(index: number, recompensa: number) {
    if (missoesProgresso[index]) return; 
    const novoProgresso = [...missoesProgresso]; novoProgresso[index] = true; const novoSaldo = esmolas + recompensa;
    setMissoesProgresso(novoProgresso); setEsmolas(novoSaldo);
    await supabase.from("perfis").update({ missoes_progresso: novoProgresso, esmolas: novoSaldo }).eq("nome_original", usuarioAtivo);
  }

  async function comprarCosmetico(item: any) {
    if (esmolas < item.preco) return alert("❌ Esmolas insuficientes!");
    if (confirm(`Comprar ${item.nome} por ${item.preco} Esmolas?`)) {
      const novoSaldo = esmolas - item.preco; const novoInventario = [...inventario, item.id];
      setEsmolas(novoSaldo); setInventario(novoInventario);
      await supabase.from("perfis").update({ esmolas: novoSaldo, cosmeticos: { comprados: novoInventario, ativos: equipados } }).eq("nome_original", usuarioAtivo);
    }
  }

  async function equiparCosmetico(item: any) {
    const novosEquipados = { ...equipados };
    if (novosEquipados[item.tipo] === item.id) novosEquipados[item.tipo] = ""; else novosEquipados[item.tipo] = item.id;
    setEquipados(novosEquipados);
    await supabase.from("perfis").update({ cosmeticos: { comprados: inventario, ativos: novosEquipados } }).eq("nome_original", usuarioAtivo);
  }

  async function atualizarPerfil() {
    setSalvando(true);
    try {
      const { error } = await supabase.from("perfis").update({
        nome_exibicao: dadosPerfil.nome, avatar: dadosPerfil.avatar, bio: dadosPerfil.bio, cor_tema: dadosPerfil.tema, custom_color: dadosPerfil.custom_color, pin: dadosPerfil.pin, anilist_token: dadosPerfil.anilist_token 
      }).eq("nome_original", usuarioAtivo);
      if (error) throw error;
      alert("✨ Hunter Sincronizado!");
    } catch (err: any) { alert("Erro: " + err.message); } finally { setSalvando(false); }
  }

  async function fazerUploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      setFazendoUpload(true);
      if (!event.target.files || event.target.files.length === 0) throw new Error('Selecione uma imagem.');
      const file = event.target.files[0];
      const filePath = `${usuarioAtivo}-${Math.random()}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setDadosPerfil(prev => ({ ...prev, avatar: data.publicUrl }));
      alert('Upload concluído! Clique em "Sincronizar Hunter" para salvar as alterações.');
    } catch (error: any) { alert('Erro no upload: ' + error.message); } finally { setFazendoUpload(false); }
  }

  function toggleAnimacoes() {
    const novo = !animacoesAtivas;
    setAnimacoesAtivas(novo);
    localStorage.setItem("hunter_animacoes", novo ? "true" : "false");
    window.dispatchEvent(new Event("hunter_animacoes_toggle"));
  }

  async function exportarBiblioteca() {
    try {
      const backup = { hunter: dadosPerfil.nome, biblioteca: { mangas: [], animes: [], filmes: [], livros: [] } };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = `backup_${usuarioAtivo}.json`; link.click();
    } catch { alert("Erro ao exportar."); }
  }

  // =============================================================================
  // [SESSÃO 6] - CSS DE MOLDURAS E ESTILOS DINÂMICOS
  // =============================================================================
  const aura = dadosPerfil.tema === "custom" ? TEMAS.custom : (TEMAS[dadosPerfil.tema as keyof typeof TEMAS] || TEMAS.azul);

  let molduraAvatar = aura.border; let sombraAvatar = elo.glow; let cssExtraMoldura = "";
  switch (equipados.moldura) {
    case "moldura_ouro": molduraAvatar = "border-yellow-500"; sombraAvatar = "shadow-[0_0_30px_rgba(234,179,8,0.5)]"; break;
    case "moldura_neon": molduraAvatar = "border-fuchsia-500"; sombraAvatar = "shadow-[0_0_30px_rgba(217,70,239,0.5)]"; cssExtraMoldura = "animate-pulse"; break;
    case "moldura_choque": cssExtraMoldura = "moldura-choque"; break;
    case "moldura_esmeralda": cssExtraMoldura = "moldura-esmeralda"; break;
    case "moldura_sombria": cssExtraMoldura = "moldura-sombria"; break;
    case "moldura_gelo": cssExtraMoldura = "moldura-gelo"; break;
    case "moldura_magma": cssExtraMoldura = "moldura-magma"; break;
    case "moldura_celestial": cssExtraMoldura = "moldura-celestial"; break;
  }

  const objTitulo = LOJA_ITENS.find(i => i.id === equipados.titulo);
  const textoTitulo = objTitulo ? objTitulo.nome.replace("Título: ", "") : "";
  let cssTitulo = "text-[10px] font-black uppercase tracking-[0.3em] mb-2 drop-shadow-md relative z-10 transition-all ";
  switch (equipados.titulo) {
    case "titulo_arcoiris": cssTitulo += "titulo-arcoiris"; break;
    case "titulo_hacker": cssTitulo += "titulo-glitch text-[var(--aura)]"; break;
    case "titulo_sangue": cssTitulo += "titulo-sangue"; break;
    case "titulo_fantasma": cssTitulo += "titulo-fantasma"; break;
    case "titulo_deus": cssTitulo += "titulo-deus"; break;
    case "titulo_sombra": cssTitulo += "titulo-sombra"; break;
    default: cssTitulo += "text-yellow-500"; break; 
  }

  // --- SUB-SESSÃO 6.1: CONSTRUÇÃO DOS TROFÉUS (85 ITENS) ---
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
      const nivelFilme = id - 50; nome = `Cineasta Nv. ${nivelFilme}`; desc = `Bloqueado: Requer ${nivelFilme * 5} filmes na estante.`;
      if (id === 51) { nome = "Primeiro Ingresso"; desc = "Adicionou 1 filme"; check = stats.filmes >= 1; }
      else { check = stats.filmes >= (nivelFilme * 5); }
    } else {
      const nivelLivro = id - 70; nome = `Letrado Nv. ${nivelLivro}`; desc = `Bloqueado: Requer ${nivelLivro * 5} livros na estante.`;
      if (id === 71) { nome = "Primeira Página"; desc = "Adicionou 1 livro"; check = stats.livros >= 1; }
      else { check = stats.livros >= (nivelLivro * 5); }
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

  // =============================================================================
  // [SESSÃO 7] - ESTRUTURA DE RENDERIZAÇÃO (JSX)
  // =============================================================================
  return (
    <main className="min-h-screen bg-[#040405] flex flex-col items-center justify-center p-6 transition-all duration-500 relative overflow-hidden" style={{ "--aura": dadosPerfil.custom_color } as any}>
      <EfeitosVisuais particula={equipados.particula} />

      <style>{`
        @keyframes raioEletrico { 0%, 100% { box-shadow: 0 0 10px #3b82f6, inset 0 0 10px #3b82f6; border-color: #60a5fa; } 50% { box-shadow: 0 0 30px #60a5fa, inset 0 0 20px #60a5fa; border-color: #fff; } }
        @keyframes pulsoEsmeralda { 0%, 100% { box-shadow: 0 0 15px #10b981; border-color: #059669; } 50% { box-shadow: 0 0 40px #34d399, inset 0 0 15px #34d399; border-color: #a7f3d0; } }
        @keyframes fumacaSombria { 0%, 100% { box-shadow: 0 0 20px #4c1d95, -5px 5px 30px #000; border-color: #4c1d95; } 50% { box-shadow: 5px -5px 40px #7c3aed, 0 0 20px #000; border-color: #6d28d9; } }
        @keyframes brilhoGelo { 0%, 100% { box-shadow: 0 0 10px #7dd3fc; border-color: #bae6fd; } 50% { box-shadow: 0 0 30px #38bdf8, inset 0 0 20px #e0f2fe; border-color: #fff; } }
        @keyframes animarMagma { 0% { border-color: #ef4444; box-shadow: 0 5px 20px #ef4444; } 50% { border-color: #f97316; box-shadow: 0 -5px 25px #f97316; } 100% { border-color: #ef4444; box-shadow: 0 5px 20px #ef4444; } }
        @keyframes celestialFlutua { 0%, 100% { transform: translateY(0); box-shadow: 0 0 20px #fff, 0 20px 30px rgba(255,255,255,0.2); border-color: #fff; } 50% { transform: translateY(-10px); box-shadow: 0 0 40px #fef08a, 0 30px 40px rgba(255,255,255,0.1); border-color: #fef08a; } }
        @keyframes arcoirisBg { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes glitchTxt { 0% { transform: translate(0); text-shadow: none; } 20% { transform: translate(-2px, 2px); text-shadow: 2px 0 red, -2px 0 blue; } 40% { transform: translate(-2px, -2px); text-shadow: none; } 60% { transform: translate(2px, 2px); text-shadow: -2px 0 red, 2px 0 blue; } 80% { transform: translate(2px, -2px); text-shadow: none; } 100% { transform: translate(0); } }
        @keyframes bloodPulse { 0%, 100% { color: #dc2626; text-shadow: 0 0 5px #991b1b; } 50% { color: #f87171; text-shadow: 0 0 20px #ef4444, 0 5px 5px #7f1d1d; } }
        @keyframes ghostAnim { 0%, 100% { opacity: 0.3; filter: blur(2px); transform: translateY(0); } 50% { opacity: 0.9; filter: blur(0px); transform: translateY(-2px); text-shadow: 0 0 10px #cbd5e1; } }
        @keyframes sombraCaminha { 0%, 100% { text-shadow: 5px 5px 10px #000, 10px 10px 20px rgba(0,0,0,0.5); } 50% { text-shadow: -5px 5px 15px #000, -10px 10px 25px rgba(0,0,0,0.8); } }
        .moldura-choque { animation: raioEletrico 1.5s infinite; } .moldura-esmeralda { animation: pulsoEsmeralda 2s infinite; } .moldura-sombria { animation: fumacaSombria 3s infinite; } .moldura-gelo { animation: brilhoGelo 2s infinite; } .moldura-magma { animation: animarMagma 2.5s infinite; } .moldura-celestial { animation: celestialFlutua 3s ease-in-out infinite; border-width: 3px; }
        .titulo-arcoiris { background: linear-gradient(270deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3); background-size: 400% 400%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: arcoirisBg 4s ease infinite; } .titulo-glitch { animation: glitchTxt 1.5s infinite; } .titulo-sangue { animation: bloodPulse 2s infinite; } .titulo-fantasma { animation: ghostAnim 3s infinite; color: #cbd5e1; } .titulo-deus { color: #fbbf24; text-shadow: 0 0 10px #f59e0b, 0 0 20px #f59e0b; animation: piscarEstrela 2s infinite; } .titulo-sombra { color: #3f3f46; animation: sombraCaminha 4s infinite alternate; }
      `}</style>

      {/* --- SUB-SESSÃO 7.1: BARRA SUPERIOR (HEADER FIXO) --- */}
      <div className="fixed top-0 left-0 w-full p-6 md:p-10 flex justify-between items-center z-[110] pointer-events-none">
        <div className="flex-1 flex justify-start"><Link href="/" className="pointer-events-auto text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-white transition-colors bg-black/50 px-4 py-2 rounded-xl backdrop-blur-md border border-white/5">← Voltar</Link></div>
        <div className="pointer-events-auto bg-black/60 px-4 py-2 rounded-xl backdrop-blur-md border border-yellow-500/30 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(234,179,8,0.1)] absolute left-1/2 -translate-x-1/2">
          <span className="text-yellow-500 text-lg drop-shadow-md">🪙</span><span className="text-white font-black text-sm">{esmolas}</span><span className="text-[8px] font-black text-yellow-500 uppercase tracking-widest hidden md:inline ml-1">Esmolas</span>
        </div>
        <div className="flex-1 flex justify-end"><button onClick={() => setTelaCheia(!telaCheia)} className="pointer-events-auto text-[10px] font-black uppercase tracking-widest bg-zinc-900/90 backdrop-blur-md px-4 py-2 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white transition-all shadow-xl">{telaCheia ? "⊙ Vista Central" : "⛶ Ecrã Inteiro"}</button></div>
      </div>

      {/* --- SUB-SESSÃO 7.2: CONTAINER PRINCIPAL DO PERFIL --- */}
      <div className={`bg-[#0e0e11]/90 backdrop-blur-xl rounded-[3.5rem] p-12 mt-16 md:mt-0 border border-white/5 relative flex flex-col items-center shadow-2xl transition-all duration-700 ring-1 ring-white/10 z-10 ${telaCheia ? 'w-full max-w-6xl' : 'w-full max-w-[550px]'}`}>
        
        <div className={`w-28 h-28 bg-zinc-950 rounded-[2.5rem] overflow-hidden border-2 transition-all duration-500 flex items-center justify-center relative z-10 ${molduraAvatar} ${sombraAvatar} ${cssExtraMoldura}`}>
          {dadosPerfil.avatar?.startsWith('http') ? <img src={dadosPerfil.avatar} className="w-full h-full object-cover" /> : <span className="text-5xl">{dadosPerfil.avatar || "👤"}</span>}
        </div>

        <h1 className="text-3xl font-black text-white uppercase tracking-tighter mt-6 mb-1 italic relative z-10">{dadosPerfil.nome}</h1>
        {textoTitulo && <p className={cssTitulo}>« {textoTitulo} »</p>}
        <p className={`text-[10px] font-black bg-gradient-to-r ${elo.cor} bg-clip-text text-transparent uppercase tracking-[0.5em] mb-10 relative z-10`}>RANK: {elo.tier}</p>

        {/* --- SUB-SESSÃO 7.3: MENU DE ABAS --- */}
        <div className="flex flex-wrap gap-4 md:gap-8 border-b border-white/5 w-full justify-center pb-6 mb-10 relative z-20">
          {["STATUS", "MISSÕES", "TROFÉUS", "LOJA", "CONFIG"].map(aba => (
            <button key={aba} onClick={() => setAbaAtiva(aba)} className={`text-[9px] font-black uppercase tracking-[0.2em] transition-all ${abaAtiva === aba ? aura.text + " scale-110 drop-shadow-[0_0_8px_currentColor]" : 'text-zinc-600 hover:text-zinc-400'}`}>
              {aba === "LOJA" ? "🛒 LOJA" : aba}
            </button>
          ))}
        </div>

        {/* --- SUB-SESSÃO 7.4: CONTEÚDO DINÂMICO --- */}
        <div className="w-full h-[320px] overflow-y-auto custom-scrollbar px-2 relative z-20">
          
          {/* ABA STATUS */}
          {abaAtiva === "STATUS" && (
            <div className="grid grid-cols-2 gap-4 animate-in fade-in zoom-in-95">
              <div className="bg-black/40 border border-white/5 p-6 rounded-3xl flex flex-col items-center"><span className="text-3xl font-black text-white italic">{stats.obras}</span><span className="text-[7px] font-black text-zinc-600 uppercase mt-2">Obras Totais</span></div>
              <div className="bg-black/40 border border-white/5 p-6 rounded-3xl flex flex-col items-center"><span className="text-3xl font-black text-white italic">{stats.caps}</span><span className="text-[7px] font-black text-zinc-600 uppercase mt-2">Progresso</span></div>
              <div className="col-span-2 bg-gradient-to-r from-zinc-900 to-black p-6 rounded-3xl border border-white/5 flex flex-col justify-between group mb-2 relative overflow-hidden">
                 <div className="flex justify-between items-center z-10">
                   <div><span className="text-2xl font-black text-white italic tracking-tighter">{stats.horasVida} HORAS</span><p className="text-[7px] font-black text-zinc-500 uppercase mt-1 tracking-widest italic">Vida gasta assistindo</p></div>
                   <span className="text-4xl opacity-20 group-hover:opacity-100 group-hover:scale-110 transition-all">⏳</span>
                 </div>
                 <a 
                   href={`/api/auth/anilist?hunter=${usuarioAtivo}`} 
                   className="mt-6 w-full py-3 bg-blue-600/10 border border-blue-500/30 text-blue-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all text-center z-10"
                 >
                   {dadosPerfil.anilist_token ? "✅ AniList Conectado (Sincronizar Novamente)" : "🔗 Conectar com AniList"}
                 </a>
              </div>
            </div>
          )}

          {/* ABA MISSÕES */}
          {abaAtiva === "MISSÕES" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-left-4 pb-10">
              {listaMissoes.map((m, i) => {
                const podeReivindicar = condicoesMissoes[i]; const jaReivindicada = missoesProgresso[i]; const isDisabled = jaReivindicada || !podeReivindicar;
                return (
                  <div key={i} className={`p-5 rounded-3xl border flex items-center justify-between group transition-all relative overflow-hidden ${jaReivindicada ? 'bg-black/40 border-green-500/20' : podeReivindicar ? 'bg-zinc-900 border-yellow-500/40 shadow-[0_0_15px_rgba(234,179,8,0.1)]' : 'bg-zinc-900/50 border-zinc-800'}`}>
                     {jaReivindicada && <div className="absolute inset-0 bg-green-500/5 pointer-events-none" />}
                     {!jaReivindicada && podeReivindicar && <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 to-transparent pointer-events-none animate-pulse" />}
                     <div className="flex items-center gap-4 z-10">
                       <span className={`text-3xl ${jaReivindicada || podeReivindicar ? 'opacity-100 grayscale-0' : 'opacity-40 grayscale'}`}>{m.icone}</span>
                       <div><p className={`font-bold uppercase text-[10px] tracking-widest ${jaReivindicada ? 'text-green-500' : podeReivindicar ? 'text-yellow-500' : 'text-zinc-400'}`}>{m.titulo}</p><p className="text-[8px] text-zinc-500 uppercase mt-1">{m.desc}</p></div>
                     </div>
                     <div className="flex items-center gap-4 z-10">
                       <div className="text-center hidden sm:block"><span className={`${podeReivindicar && !jaReivindicada ? 'text-yellow-400' : 'text-zinc-600'} font-black text-sm transition-colors`}>+{m.recompensa}</span><p className="text-[6px] text-zinc-600 uppercase font-black">Esmolas</p></div>
                       <button onClick={() => completarMissao(i, m.recompensa)} disabled={isDisabled} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${jaReivindicada ? 'bg-green-500/10 border-green-500/30 text-green-500 cursor-not-allowed' : podeReivindicar ? 'bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500 hover:text-black border-yellow-500/50 shadow-lg cursor-pointer' : 'bg-zinc-950 border-zinc-800 text-zinc-600 cursor-not-allowed'}`}>
                         {jaReivindicada ? "Feito ✅" : podeReivindicar ? "Reivindicar" : "Incompleta 🔒"}
                       </button>
                     </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ABA TROFÉUS */}
          {abaAtiva === "TROFÉUS" && (
            <div className="grid grid-cols-5 gap-y-10 gap-x-2 justify-items-center animate-in fade-in slide-in-from-right-4 pb-10">
              {listaTrofeus.map(t => (
                <div key={t.id} className="flex flex-col items-center group relative">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border-2 transition-all duration-700 ${t.check ? aura.border + " " + aura.glow + " bg-black/40" : "border-zinc-800 opacity-10 grayscale blur-[1px]"}`}>{t.icone}</div>
                  <div className="absolute -top-12 bg-black border border-white/10 px-3 py-2 rounded-xl text-[8px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap shadow-2xl pointer-events-none">
                    <p className={`${t.check ? aura.text : 'text-zinc-600'} uppercase mb-1 font-black`}>{t.nome}</p>
                    {t.desc}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ABA LOJA */}
          {abaAtiva === "LOJA" && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 pb-10">
              <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-2xl text-center mb-6">
                <p className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">Loja de Frufru S+</p>
                <p className="text-[8px] text-yellow-500/60 uppercase mt-1">Efeitos visuais renderizados no site inteiro.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {LOJA_ITENS.map(item => {
                  const comprado = inventario.includes(item.id); const equipado = equipados[item.tipo] === item.id;
                  return (
                    <div key={item.id} className={`p-4 rounded-3xl border flex flex-col gap-4 transition-all ${comprado ? 'bg-zinc-900 border-zinc-700' : 'bg-black/50 border-zinc-800'}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl bg-zinc-950 p-3 rounded-2xl border border-white/5">{item.icone}</span>
                        <div><p className="font-bold uppercase text-[10px] tracking-widest text-white">{item.nome}</p><p className="text-[7px] text-zinc-500 uppercase mt-1">{item.tipo}</p></div>
                      </div>
                      <p className="text-[9px] text-zinc-400 leading-relaxed min-h-[30px]">{item.desc}</p>
                      {!comprado ? <button onClick={() => comprarCosmetico(item)} className="w-full py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 hover:bg-yellow-500 hover:text-black font-black uppercase text-[9px] tracking-widest">Comprar ({item.preco} 🪙)</button>
                      : <button onClick={() => equiparCosmetico(item)} className={`w-full py-3 rounded-xl font-black uppercase text-[9px] tracking-widest border ${equipado ? 'bg-green-500/20 text-green-500 border-green-500/50' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700 hover:text-white transition-all'}`}>{equipado ? "Equipado ✅" : "Equipar"}</button>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ABA CONFIG */}
          {abaAtiva === "CONFIG" && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 pb-10">
              <button onClick={atualizarPerfil} className={`w-full py-5 rounded-xl font-black text-[12px] uppercase tracking-widest shadow-xl sticky top-0 z-50 backdrop-blur-md ${aura.btn}`}>💾 Sincronizar Hunter</button>
              <button onClick={toggleAnimacoes} className={`w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border ${animacoesAtivas ? 'bg-green-500/10 text-green-500 border-green-500/30 hover:bg-green-500 hover:text-black' : 'bg-red-500/10 text-red-500 border-red-500/30 hover:bg-red-500 hover:text-white'}`}>
                {animacoesAtivas ? "✨ Efeitos Visuais: LIGADOS" : "❌ Efeitos Visuais: DESLIGADOS"}
              </button>
              <input type="text" placeholder="Nome Hunter" className="w-full bg-black border border-white/5 p-4 rounded-xl text-white font-bold outline-none" value={dadosPerfil.nome} onChange={e => setDadosPerfil({...dadosPerfil, nome: e.target.value})} />
              <div className="grid grid-cols-1 gap-2">
                <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest ml-1">Avatar (URL ou Enviar do PC)</label>
                <div className="flex gap-3 items-center">
                  <input type="text" placeholder="Cole a URL ou faça upload..." className="flex-1 bg-black border border-white/5 p-4 rounded-xl text-white text-xs outline-none focus:border-white/20" value={dadosPerfil.avatar} onChange={e => setDadosPerfil({...dadosPerfil, avatar: e.target.value})} />
                  <label className={`px-6 py-4 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center ${fazendoUpload ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'hover:bg-white/10 text-white'}`}>
                    {fazendoUpload ? "⏳..." : "📁 PC"}<input type="file" accept="image/*" className="hidden" onChange={fazerUploadAvatar} disabled={fazendoUpload} />
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <select className="w-full bg-black border border-white/5 p-4 rounded-xl text-white text-[10px] font-bold uppercase outline-none" value={dadosPerfil.tema} onChange={e => setDadosPerfil({...dadosPerfil, tema: e.target.value})}>
                  <option value="azul">Azul Neon</option> <option value="verde">Verde Hacker</option> <option value="roxo">Roxo Galático</option> <option value="laranja">Laranja Fogo</option> <option value="custom">Personalizada</option>
                </select>
                <input type="password" placeholder="PIN" maxLength={4} className="w-full bg-black border border-white/5 p-4 rounded-xl text-white font-bold text-center tracking-[1em]" value={dadosPerfil.pin} onChange={e => setDadosPerfil({...dadosPerfil, pin: e.target.value})} />
              </div>
            </div>
          )}
        </div>

        {/* --- SUB-SESSÃO 7.5: BACKUP E LOGOUT --- */}
        <div className="w-full flex flex-col gap-3 mt-8 relative z-20">
          <div className="grid grid-cols-2 gap-3">
            <button onClick={exportarBiblioteca} className="py-4 rounded-xl border border-zinc-800 text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-all">💾 Exportar</button>
            <label className="py-4 rounded-xl border border-zinc-800 text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer">
              📥 Importar <input type="file" accept=".json" className="hidden" />
            </label>
          </div>
          <button onClick={() => { sessionStorage.removeItem('hunter_ativo'); window.location.href = '/'; }} className="w-full py-3 text-[8px] font-black text-zinc-700 hover:text-red-500 uppercase tracking-[0.3em] transition-all">Encerrar Sessão</button>
        </div>
      </div>
    </main>
  );
}