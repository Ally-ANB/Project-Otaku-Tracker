"use client";

import { supabase } from "../supabase";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSenhaMestraInterativa } from "../hooks/useSenhaMestraInterativa";
import { requisicaoDbApi } from "@/lib/dbClient";

const TEMAS = {
  verde: { bg: "bg-green-500", text: "text-green-500", border: "border-green-500", glow: "shadow-green-500/20", btn: "bg-green-500/10 border-green-500/50 hover:bg-green-500 hover:text-black" },
  azul: { bg: "bg-blue-500", text: "text-blue-500", border: "border-blue-500", glow: "shadow-blue-500/20", btn: "bg-blue-500/10 border-blue-500/50 hover:bg-blue-500 hover:text-black" },
  roxo: { bg: "bg-purple-500", text: "text-purple-500", border: "border-purple-500", glow: "shadow-purple-500/20", btn: "bg-purple-500/10 border-purple-500/50 hover:bg-purple-500 hover:text-black" },
  laranja: { bg: "bg-orange-500", text: "text-orange-500", border: "border-orange-500", glow: "shadow-orange-500/20", btn: "bg-orange-500/10 border-orange-500/50 hover:bg-orange-500 hover:text-black" },
  custom: { bg: "bg-[var(--aura)]", text: "text-[var(--aura)]", border: "border-[var(--aura)]", glow: "shadow-[var(--aura)]/20", btn: "bg-[var(--aura)]/10 border-[var(--aura)]/50 hover:bg-[var(--aura)] hover:text-black" }
};

export const MOLDURAS_DISCORD: any = {
  moldura_aries: "ring-4 ring-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.8)] after:content-[''] after:absolute after:-inset-3 after:border-[4px] after:border-t-red-500 after:border-b-orange-500 after:border-transparent after:rounded-[2.5rem] after:animate-spin-slow",
  moldura_touro: "ring-4 ring-green-400 shadow-[0_0_20px_rgba(74,222,128,0.6)] after:content-[''] after:absolute after:-inset-2 after:border-2 after:border-green-300 after:rounded-[2.5rem] after:rotate-45",
  moldura_gemeos: "ring-4 ring-purple-500 shadow-[0_0_25px_rgba(168,85,247,0.7)] after:content-[''] after:absolute after:-inset-4 after:bg-gradient-to-r after:from-cyan-400/20 after:to-purple-500/20 after:rounded-[2.5rem] after:animate-pulse",
  moldura_choque: "ring-2 ring-yellow-400 border-dashed animate-pulse shadow-[0_0_15px_rgba(250,204,21,0.5)]"
};

const LOJA_ITENS_FALLBACK = [
  { id: "particula_fogo_vfx", nome: "Chamas Infernais", tipo: "particula", preco: 1200, icone: "♨️", desc_texto: "Fogo real gravado em alta definição (VFX)." },
  { id: "particula_dispersao_dark", nome: "Desintegração S+", tipo: "particula", preco: 1500, icone: "🫠", desc_texto: "Partículas reais se dissipando (VFX)." },
  { id: "particula_chuva_janela", nome: "Caçador Melancólico", tipo: "particula", preco: 1000, icone: "🌧️", desc_texto: "Chuva real escorrendo pelo vidro (VFX)." },
  { id: "particula_fogo_cinematic", nome: "Fogueira Hunter", tipo: "particula", preco: 1800, icone: "🔥", desc_texto: "Fogueira real cinematográfica (VFX)." }
];

export default function PerfilPage() {
  const [usuarioAtivo, setUsuarioAtivo] = useState<string | null>(null);
  const [abaAtiva, setAbaAtiva] = useState("STATUS");
  const [telaCheia, setTelaCheia] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [fazendoUpload, setFazendoUpload] = useState(false);
  const [esmolas, setEsmolas] = useState(0);
  
  const [missoesProgresso, setMissoesProgresso] = useState<boolean[]>([false, false, false, false, false, false]);
  const [condicoesMissoes, setCondicoesMissoes] = useState<boolean[]>([true, false, false, false, false, false]); 
  
  const [inventario, setInventario] = useState<string[]>([]);
  const [equipados, setEquipados] = useState<Record<string, string>>({ moldura: "", particula: "", titulo: "", chat_cor: "", chat_balao: "" });
  const [dadosPerfil, setDadosPerfil] = useState({ nome: "", avatar: "", bio: "", tema: "azul", custom_color: "#3b82f6", pin: "", anilist_token: "" });
  const [obrasUsuario, setObrasUsuario] = useState<any[]>([]);
  const [stats, setStats] = useState({ obras: 0, caps: 0, finais: 0, horasVida: 0, favs: 0, filmes: 0, livros: 0 });
  const [elo, setElo] = useState({ tier: "BRONZE", cor: "from-orange-800 to-orange-500", glow: "shadow-orange-900/40" });

  const [lojaItens, setLojaItens] = useState<any[]>(LOJA_ITENS_FALLBACK);

  const { obterSenhaMestreInterativa, modalSenhaMestra } = useSenhaMestraInterativa();

  async function requisicaoDb(payload: Record<string, any>, exigirSenhaMestre = false) {
    let senhaMestre: string | undefined;
    if (exigirSenhaMestre) {
      const s = await obterSenhaMestreInterativa();
      if (!s) return { ok: false, data: undefined };
      senhaMestre = s;
    }
    return requisicaoDbApi("POST", {
      ...payload,
      ...(exigirSenhaMestre && senhaMestre ? { senhaMestre } : {}),
    });
  }

  useEffect(() => {
    const hunter = sessionStorage.getItem("hunter_ativo");
    if (!hunter) { 
      window.location.href = '/'; 
      return; 
    }
    setUsuarioAtivo(hunter);
    buscarItensLoja();
  }, []);

  useEffect(() => {
    if (usuarioAtivo) carregarDados();
  }, [usuarioAtivo]);

  async function buscarItensLoja() {
    try {
      const { data, error } = await supabase.from('loja_itens').select('*');
      if (data && data.length > 0) {
        setLojaItens(data);
      }
    } catch (error) {
      console.error("Erro ao buscar itens da loja, usando fallback:", error);
    }
  }

  async function carregarDados() {
    const { data: m } = await supabase.from("mangas").select("*").eq("usuario", usuarioAtivo);
    const { data: a } = await supabase.from("animes").select("*").eq("usuario", usuarioAtivo);
    const { data: f } = await supabase.from("filmes").select("*").eq("usuario", usuarioAtivo); 
    const { data: l } = await supabase.from("livros").select("*").eq("usuario", usuarioAtivo); 
    const { data: s } = await supabase.from("series").select("*").eq("usuario", usuarioAtivo);
    const { data: j } = await supabase.from("jogos").select("*").eq("usuario", usuarioAtivo);
    const { data: mu } = await supabase.from("musicas").select("*").eq("usuario", usuarioAtivo);
    const { data: p } = await supabase.from("perfis").select("*").eq("nome_original", usuarioAtivo).single();

    if (m || a || f || l || s || j || mu) {
      const all = [...(m || []), ...(a || []), ...(f || []), ...(l || []), ...(s || []), ...(j || []), ...(mu || [])];
      setObrasUsuario(all);
      
      const epsVistos = (a || []).reduce((acc, obj) => acc + (obj.capitulo_atual || 0), 0);
      const seriesEps = (s || []).reduce((acc, obj) => acc + (obj.capitulo_atual || 0), 0);
      const jogosHoras = (j || []).reduce((acc, obj) => acc + (obj.capitulo_atual || 0), 0);
      const musicasMinutos = (mu || []).reduce((acc, obj) => acc + (obj.capitulo_atual || 0), 0);
      const minFilmes = (f || []).filter(obj => obj.status === "Completos").length * 120;
      const totalMinutos = (epsVistos * 23) + (seriesEps * 45) + (jogosHoras * 60) + (musicasMinutos * 3) + minFilmes;
      
      setStats({
        obras: all.length, 
        caps: all.reduce((acc, obj) => acc + (obj.capitulo_atual || 0), 0), 
        finais: all.filter(obj => obj.status === "Completos").length,
        horasVida: Math.floor(totalMinutos / 60), 
        favs: all.filter(o => o.favorito).length, 
        filmes: (f || []).length, 
        livros: (l || []).length
      });
      
      const t = all.length;
      if (t >= 1000) setElo({ tier: "DIVINDADE", cor: "from-white via-cyan-200 to-white", glow: "shadow-white/60 shadow-[0_0_40px_white]" });
      else if (t >= 500) setElo({ tier: "DESAFIANTE", cor: "from-red-600 via-purple-600 to-blue-600", glow: "shadow-purple-500/40" });
      else if (t >= 200) setElo({ tier: "MESTRE", cor: "from-purple-400 to-purple-900", glow: "shadow-purple-500/30" });
      else if (t >= 100) setElo({ tier: "DIAMANTE", cor: "from-blue-400 to-indigo-600", glow: "shadow-blue-500/20" });
      else setElo({ tier: "BRONZE", cor: "from-orange-800 to-orange-500", glow: "shadow-orange-900/20" });

      const hoje = new Date().toISOString().split('T')[0];
      const chatFarm = p?.chat_farm_diario || { data: "", ganhos: 0 };
      const interagiuGuilda = chatFarm.data === hoje && chatFarm.ganhos > 0;

      setCondicoesMissoes([
        true, 
        all.some(o => o.ultima_leitura?.startsWith(hoje)), 
        (a || []).some(o => o.ultima_leitura?.startsWith(hoje)), 
        all.filter(o => o.ultima_leitura?.startsWith(hoje)).length >= 3, 
        all.filter(o => o.favorito).length >= 5,
        interagiuGuilda 
      ]);
    }

    if (p) {
      setDadosPerfil({ 
        nome: p.nome_exibicao || usuarioAtivo!, 
        avatar: p.avatar || "👤", 
        bio: p.bio || "", 
        tema: p.cor_tema || "azul", 
        custom_color: p.custom_color || "#3b82f6", 
        pin: p.pin || "", 
        anilist_token: p.anilist_token || "" 
      });
      setEsmolas(p.esmolas || 0);
      setInventario(p.cosmeticos?.comprados || []);
      setEquipados(p.cosmeticos?.ativos || { moldura: "", particula: "", titulo: "", chat_cor: "", chat_balao: "" });
      
      const hoje = new Date().toISOString().split('T')[0];
      if (p.ultima_missao_data !== hoje) {
        const resetProgress = [false, false, false, false, false, false];
        setMissoesProgresso(resetProgress);
        await requisicaoDb({
          tabela: "perfis",
          nome_original: usuarioAtivo,
          dados: { missoes_progresso: resetProgress, ultima_missao_data: hoje }
        });
      } else {
        setMissoesProgresso(p.missoes_progresso || [false, false, false, false, false, false]);
      }
    }
    setCarregando(false);
  }

  async function fazerUploadAvatar(event: any) {
    try {
      setFazendoUpload(true);
      const file = event.target.files[0];
      if (!file) throw new Error("Nenhuma imagem selecionada.");
      const fileExt = file.name.split('.').pop();
      const fileName = `${usuarioAtivo}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setDadosPerfil({ ...dadosPerfil, avatar: data.publicUrl });
      alert("✅ Imagem carregada! Não esqueça de clicar em 'Sincronizar Hunter' para salvar.");
    } catch (error: any) {
      alert("❌ Erro no upload: " + error.message);
    } finally {
      setFazendoUpload(false);
    }
  }

  async function completarMissao(index: number, recompensa: number) {
    if (missoesProgresso[index]) return; 
    const nProg = [...missoesProgresso]; 
    nProg[index] = true; 
    const nSaldo = esmolas + recompensa;
    setMissoesProgresso(nProg); 
    setEsmolas(nSaldo);
    const hoje = new Date().toISOString().split('T')[0];
    await requisicaoDb({
      tabela: "perfis",
      nome_original: usuarioAtivo,
      dados: { missoes_progresso: nProg, esmolas: nSaldo, ultima_missao_data: hoje }
    });
  }

  async function comprarCosmetico(item: any) {
    if (esmolas < item.preco) return alert("❌ Esmolas insuficientes!");
    if (confirm(`Comprar ${item.nome}?`)) {
      const nSaldo = esmolas - item.preco; 
      const nInv = [...inventario, item.id];
      await requisicaoDb({
        tabela: "perfis",
        nome_original: usuarioAtivo,
        dados: { esmolas: nSaldo, cosmeticos: { comprados: nInv, ativos: equipados } }
      });
      setEsmolas(nSaldo); 
      setInventario(nInv);
    }
  }

  async function equiparCosmetico(item: any) {
    const nEquip = { ...equipados, [item.tipo]: equipados[item.tipo] === item.id ? "" : item.id };
    await requisicaoDb({
      tabela: "perfis",
      nome_original: usuarioAtivo,
      dados: { cosmeticos: { comprados: inventario, ativos: nEquip } }
    });
    setEquipados(nEquip);

    // ✅ DISPARA SINAL GLOBAL PARA O LAYOUT ATUALIZAR O FUNDO
    window.dispatchEvent(new Event("hunter_cosmeticos_update"));
  }

  async function atualizarPerfil() {
    await requisicaoDb({
      tabela: "perfis",
      nome_original: usuarioAtivo,
      dados: {
        nome_exibicao: dadosPerfil.nome,
        avatar: dadosPerfil.avatar,
        cor_tema: dadosPerfil.tema,
        custom_color: dadosPerfil.custom_color,
        pin: dadosPerfil.pin
      }
    });
    alert("✨ Hunter Sincronizado!");
  }

  function exportarBiblioteca() {
    const backup = { hunter: dadosPerfil.nome, stats: stats };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); 
    a.href = url; a.download = `backup_${usuarioAtivo}.json`; a.click();
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

  const iconesTrofeus = [ "🌱","📖","🔥","🏃","⏳","💎","🦉","🧭","🏆","⚔️","☕","📚","📦","🌟","🖋️","⚡","❤️","🧘","💾","👑","🐦","🎯","🌐","🎨","🎖️","🏮","⛩️","🐉","🌋","🌌","🔮","🧿","🧸","🃏","🎭","🩰","🧶","🧵","🧹","🧺","🧷","🧼","🧽","🧴","🗝️","⚙️","🧪","🛰️","🔭","🔱","🎬","🍿","🎟️","📽","🎞️","📼","🎫","📺","🎥","🧛","🦸","🧙","🧟","👽","🕵️","🥷","🧑‍🚀","REX","🦈","🛸","📜","✒️","🕯️","🪶","📚","🔖","📓","📙","📗","📘","📔","📃","📰","🗺️","🏛️" ];
  
  const listaTrofeus = Array.from({ length: 85 }, (_, i) => {
    const id = i + 1; 
    let check = false;
    if (id <= 50) {
      if (id === 1) check = stats.obras >= 1;
      else if (id === 2) check = stats.obras >= 10;
      else if (id === 3) check = stats.caps >= 100;
      else if (id === 4) check = stats.horasVida >= 10;
      else if (id === 5) check = stats.favs >= 5;
      else check = stats.obras >= (id * 3);
    } else if (id <= 70) {
      check = stats.filmes >= ((id - 50) * 5);
    } else {
      check = stats.livros >= ((id - 70) * 5);
    }
    return { id, nome: `Hunter ${id}`, icone: iconesTrofeus[i], check };
  });

  const listaMissoes = [
    { titulo: "Check-in Diário", desc: "Aceda à guilda hoje", recompensa: 10, icone: "👋" },
    { titulo: "Leitor Assíduo", desc: "Leia/Atualize 1 manga ou livro hoje", recompensa: 20, icone: "📚" },
    { titulo: "Sétima Arte", desc: "Assista/Atualize 1 anime ou filme hoje", recompensa: 20, icone: "🎬" },
    { titulo: "Caçador Ativo", desc: "Interaja com 3 obras diferentes hoje", recompensa: 25, icone: "🎯" },
    { titulo: "Curador", desc: "Mantenha pelo menos 5 obras favoritas", recompensa: 15, icone: "✨" },
    { titulo: "Socializador", desc: "Interaja e envie mensagens no chat da Guilda hoje", recompensa: 15, icone: "🌍" },
  ];

  const aura = dadosPerfil.tema === "custom" ? TEMAS.custom : (TEMAS[dadosPerfil.tema as keyof typeof TEMAS] || TEMAS.azul);
  const molduraEquipadaItem = lojaItens.find(item => item.id === equipados.moldura);
  const imagemMolduraUrl = molduraEquipadaItem?.imagem_url && !molduraEquipadaItem.imagem_url.includes('.mp4') && !molduraEquipadaItem.imagem_url.includes('.webm') ? molduraEquipadaItem.imagem_url : null;

  if (carregando) return <div className="min-h-screen bg-[#040405] flex items-center justify-center text-white italic animate-pulse">SINCRONIZANDO HUB...</div>;

  return (
    <main className="min-h-screen bg-transparent flex flex-col items-center justify-center p-6 relative overflow-hidden" style={{ "--aura": dadosPerfil.custom_color } as any}>
      
      <div className="fixed top-0 left-0 w-full p-10 flex justify-between items-center z-[110] pointer-events-none">
        <Link href="/" className="pointer-events-auto bg-black/50 px-6 py-3 rounded-2xl border border-white/5 text-[10px] font-black uppercase text-zinc-500 hover:text-white transition-all">← Voltar</Link>
        <button onClick={() => setTelaCheia(!telaCheia)} className="pointer-events-auto text-[10px] font-black uppercase bg-zinc-900/90 px-4 py-2 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white transition-all">{telaCheia ? "⊙ Central" : "⛶ Tela Cheia"}</button>
      </div>

      <div className={`bg-[#0e0e11]/95 backdrop-blur-2xl rounded-[3.5rem] p-12 mt-10 border border-white/5 relative flex flex-col items-center shadow-2xl transition-all duration-700 z-10 ${telaCheia ? 'w-full max-w-6xl' : 'w-full max-w-[550px]'}`}>
        
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/90 px-6 py-2 rounded-2xl border border-yellow-500/30 flex items-center gap-3 shadow-xl z-50">
          <span className="text-xl">🪙</span>
          <span className="text-white font-black">{esmolas}</span>
        </div>

        <div className="relative mt-4 mb-2 flex items-center justify-center w-28 h-28 shrink-0">
          {imagemMolduraUrl && (
            <img src={imagemMolduraUrl} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-[140%] h-[140%] max-w-none object-contain pointer-events-none" alt="Moldura PNG" />
          )}
          <div className={`w-28 h-28 bg-zinc-950 rounded-[2.5rem] overflow-hidden flex items-center justify-center relative z-10 
            ${!MOLDURAS_DISCORD[equipados.moldura] && !imagemMolduraUrl ? 'border-2 ' + aura.border + ' ' + elo.glow : ''} 
            ${MOLDURAS_DISCORD[equipados.moldura] || (!imagemMolduraUrl ? equipados.moldura : '')}
          `}>
            {dadosPerfil.avatar?.startsWith('http') ? <img src={dadosPerfil.avatar} className="w-full h-full object-cover rounded-[2.5rem]" /> : <span className="text-5xl">{dadosPerfil.avatar}</span>}
          </div>
        </div>

        <h1 className="text-3xl font-black text-white uppercase italic mt-6 mb-1">{dadosPerfil.nome}</h1>
        
        {equipados.titulo && (
          <p className={`text-[10px] font-black uppercase tracking-[0.3em] mb-2 drop-shadow-md ${lojaItens.find(i => i.id === equipados.titulo)?.imagem_url || equipados.titulo}`}>
            « {lojaItens.find(i => i.id === equipados.titulo)?.nome.replace("Título: ", "")} »
          </p>
        )}
        
        <p className={`text-[10px] font-black bg-gradient-to-r ${elo.cor} bg-clip-text text-transparent uppercase tracking-[0.5em] mb-10`}>
          RANK: {elo.tier}
        </p>

        <div className="flex gap-4 md:gap-8 border-b border-white/5 w-full justify-center pb-6 mb-10">
          {["STATUS", "MISSÕES", "TROFÉUS", "LOJA", "CONFIG"].map(aba => (
            <button key={aba} onClick={() => setAbaAtiva(aba)} className={`text-[9px] font-black uppercase tracking-widest ${abaAtiva === aba ? aura.text : 'text-zinc-600'}`}>
              {aba}
            </button>
          ))}
        </div>

        <div className="w-full h-[320px] overflow-y-auto custom-scrollbar px-2">
          {abaAtiva === "STATUS" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/40 border border-white/5 p-6 rounded-3xl flex flex-col items-center">
                <span className="text-3xl font-black text-white italic">{stats.obras}</span>
                <span className="text-[7px] font-black text-zinc-600 uppercase mt-2">Obras Totais</span>
              </div>
              <div className="bg-black/40 border border-white/5 p-6 rounded-3xl flex flex-col items-center">
                <span className="text-3xl font-black text-white italic">{stats.caps}</span>
                <span className="text-[7px] font-black text-zinc-600 uppercase mt-2">Capítulos</span>
              </div>
              <div className="col-span-2 bg-gradient-to-r from-zinc-900 to-black p-6 rounded-3xl border border-white/5 flex flex-col items-center overflow-hidden">
                <span className="text-2xl font-black text-white italic">{stats.horasVida} HORAS</span>
                <p className="text-[7px] font-black text-zinc-500 uppercase tracking-widest italic mt-1">Tempo de Vida Consumido</p>
                <a href={`/api/auth/anilist?hunter=${usuarioAtivo}`} className="mt-6 w-full py-3 bg-blue-600/10 border border-blue-500/30 text-blue-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all text-center z-10">
                  {dadosPerfil.anilist_token ? "✅ AniList Conectado (Sincronizar)" : "🔗 Conectar com AniList"}
                </a>
              </div>
            </div>
          )}

          {abaAtiva === "MISSÕES" && (
            <div className="space-y-4 pb-10">
              {listaMissoes.map((m, i) => (
                <div key={i} className={`p-5 rounded-3xl border flex items-center justify-between transition-all ${missoesProgresso[i] ? 'bg-black/40 border-green-500/20' : condicoesMissoes[i] ? 'bg-zinc-900 border-yellow-500/40' : 'bg-zinc-900/50 border-zinc-800'}`}>
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{m.icone}</span>
                    <div>
                      <p className={`font-bold uppercase text-[10px] ${missoesProgresso[i] ? 'text-green-500' : 'text-white'}`}>{m.titulo}</p>
                      <p className="text-[8px] text-zinc-500 uppercase">+{m.recompensa} Esmolas</p>
                    </div>
                  </div>
                  <button onClick={() => completarMissao(i, m.recompensa)} disabled={missoesProgresso[i] || !condicoesMissoes[i]} className="px-4 py-2 rounded-xl text-[9px] font-black border border-white/10">
                    {missoesProgresso[i] ? "Feito" : "💰"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {abaAtiva === "TROFÉUS" && (
            <div className="grid grid-cols-5 gap-y-10 pb-10">
              {listaTrofeus.map(t => (
                <div key={t.id} className="flex flex-col items-center group relative">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border-2 transition-all ${t.check ? aura.border + " bg-black/40" : "border-zinc-800 opacity-10 grayscale"}`}>
                    {t.icone}
                  </div>
                  <div className="absolute -top-12 bg-black border border-white/10 px-3 py-2 rounded-xl text-[8px] font-bold text-white opacity-0 group-hover:opacity-100 z-50 whitespace-nowrap">
                    {t.nome}
                  </div>
                </div>
              ))}
            </div>
          )}

          {abaAtiva === "LOJA" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-10">
              {lojaItens.map(item => {
                const comprado = inventario.includes(item.id); 
                const equipado = equipados[item.tipo] === item.id;
                return (
                  <div key={item.id} className={`p-4 rounded-3xl border flex flex-col gap-4 ${comprado ? 'bg-zinc-900 border-zinc-700' : 'bg-black/50 border-zinc-800'}`}>
                    <div className="flex items-center gap-4">
                      {item.imagem_url && !item.imagem_url.includes('.mp4') && !item.imagem_url.includes('.webm') && item.tipo !== 'titulo' ? (
                        <div className="w-14 h-14 bg-zinc-950 p-2 rounded-2xl border border-white/5 flex items-center justify-center">
                          <img src={item.imagem_url} alt={item.nome} className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <span className="text-3xl bg-zinc-950 p-4 rounded-2xl border border-white/5">{item.icone}</span>
                      )}
                      <div>
                        <p className={`font-black uppercase text-[10px] ${item.tipo === 'titulo' && item.imagem_url ? item.imagem_url : 'text-white'}`}>{item.nome}</p>
                        <p className="text-[7px] text-zinc-500 uppercase">{item.tipo}</p>
                      </div>
                    </div>
                    {!comprado ? (
                      <button onClick={() => comprarCosmetico(item)} className="w-full py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 font-black text-[9px] uppercase">
                        Comprar ({item.preco} 🪙)
                      </button>
                    ) : (
                      <button onClick={() => equiparCosmetico(item)} className={`w-full py-3 rounded-xl font-black text-[9px] border ${equipado ? 'bg-green-500/20 text-green-500 border-green-500' : 'bg-zinc-800 text-zinc-400'}`}>
                        {equipado ? "Equipado" : "Equipar"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {abaAtiva === "CONFIG" && (
            <div className="space-y-6 pb-10">
              <button onClick={atualizarPerfil} className={`w-full py-5 rounded-xl font-black text-[12px] uppercase shadow-xl ${aura.btn}`}>
                💾 Sincronizar Hunter
              </button>
              <input type="text" placeholder="Nome Hunter" className="w-full bg-black border border-white/5 p-4 rounded-xl text-white font-bold outline-none" value={dadosPerfil.nome} onChange={e => setDadosPerfil({...dadosPerfil, nome: e.target.value})} />
              <div className="flex gap-3">
                <input type="text" placeholder="Avatar URL" className="flex-1 bg-black border border-white/5 p-4 rounded-xl text-white text-xs outline-none" value={dadosPerfil.avatar} onChange={e => setDadosPerfil({...dadosPerfil, avatar: e.target.value})} />
                <label className={`flex items-center justify-center px-4 rounded-xl font-black uppercase text-[9px] cursor-pointer transition-all border ${fazendoUpload ? 'bg-zinc-800 text-zinc-500 border-zinc-700' : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:text-white'}`}>
                  {fazendoUpload ? "⏳..." : "⬆️ Upar do PC"}
                  <input type="file" accept="image/*" className="hidden" onChange={fazerUploadAvatar} disabled={fazendoUpload} />
                </label>
              </div>
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
             <label className="py-4 rounded-xl border border-zinc-800 text-[9px] font-black uppercase text-zinc-500 flex items-center justify-center cursor-pointer hover:text-white">📥 Importar <input type="file" accept=".json" className="hidden" onChange={importarJSON} /></label>
          </div>
          <button onClick={() => { sessionStorage.removeItem('hunter_ativo'); window.location.href = '/'; }} className="w-full py-3 text-[8px] font-black text-zinc-700 hover:text-red-500 uppercase tracking-[0.3em] transition-all">Encerrar Sessão</button>
        </div>
      </div>

      {modalSenhaMestra}
    </main>
  );
}