"use client";

import { supabase } from "../supabase";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
// ✅ IMPORTANDO AS MOLDURAS DIRETAMENTE DO PERFIL PARA USAR NA GUILDA
import { MOLDURAS_DISCORD } from "../perfil/page";

// ==========================================
// 🎨 DICIONÁRIO DE COSMÉTICOS DO CHAT
// ==========================================
const CORES_CHAT: any = {
  chat_cor_dourada: "text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.5)] font-black",
  chat_cor_glitch: "bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent font-black animate-pulse",
  chat_cor_sangue: "text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.8)] font-black tracking-wide",
  chat_cor_neon: "text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] font-bold",
  chat_cor_fantasma: "text-zinc-400 opacity-80 font-medium italic"
};

const BALOES_CHAT: any = {
  chat_balao_cyber: "bg-black/80 border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.1)] rounded-none border-l-4",
  chat_balao_rpg: "bg-[#2c241b] border-[#8b7355] border-2 rounded-sm shadow-inner text-[#e0cba8]",
  chat_balao_vidro: "bg-white/5 backdrop-blur-md border border-white/20 shadow-xl",
  chat_balao_toxico: "bg-green-950/40 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.1)] border-dashed",
  chat_balao_void: "bg-black border-zinc-900 shadow-[inset_0_0_30px_rgba(0,0,0,1)]"
};

interface Mensagem {
  id: number;
  usuario: string;
  mensagem: string;
  tipo: string;
  criado_em: string;
}

interface Perfil {
  nome_original: string;
  nome_exibicao: string;
  avatar: string;
  cor_tema: string;
  esmolas: number;
  figurinhas?: string[];
  cosmeticos?: { ativos: Record<string, string> };
  chat_farm_diario?: { data: string, ganhos: number };
}

interface EstatisticasHunter extends Perfil {
  total_obras: number;
  total_capitulos: number;
  tempo_vida: number;
  total_favoritos: number;
  elo: string;
}

export default function GuildaPage() {
  const [usuarioAtivo, setUsuarioAtivo] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [novaMensagem, setNovaMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Estados do Ranking
  const [abaAtiva, setAbaAtiva] = useState<"CHAT" | "RANKING">("CHAT");
  const [filtroRanking, setFiltroRanking] = useState<"OBRAS" | "ESMOLAS" | "TEMPO" | "CAPITULOS" | "FAVORITOS">("OBRAS");
  const [estatisticas, setEstatisticas] = useState<EstatisticasHunter[]>([]);
  const [carregandoRanking, setCarregandoRanking] = useState(false);

  // Estados das Figurinhas
  const [painelFigurinhas, setPainelFigurinhas] = useState(false);
  const [novaFigurinhaUrl, setNovaFigurinhaUrl] = useState("");
  const [fazendoUploadFigurinha, setFazendoUploadFigurinha] = useState(false);

  // Estados de Edição, Exclusão e Paginação
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [textoEdicao, setTextoEdicao] = useState("");
  const [limiteMensagens, setLimiteMensagens] = useState(50);
  
  // ✅ ESTADO DOS ITENS DA LOJA (PARA LER OS VÍDEOS E AS AURA DOS TÍTULOS)
  const [lojaItens, setLojaItens] = useState<any[]>([]);

  useEffect(() => {
    const hunter = sessionStorage.getItem("hunter_ativo");
    if (!hunter) { window.location.href = '/'; return; }
    setUsuarioAtivo(hunter);
    
    carregarDados();
    
    const intervalo = setInterval(buscarMensagens, 10000);
    return () => clearInterval(intervalo);
  }, [limiteMensagens]);

  useEffect(() => {
    // Só força o scroll para baixo se não estivermos paginando (vendo antigas)
    if (scrollRef.current && abaAtiva === "CHAT" && limiteMensagens === 50) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensagens, abaAtiva]);

  useEffect(() => {
    if (abaAtiva === "RANKING" && estatisticas.length === 0) {
      gerarRanking();
    }
  }, [abaAtiva]);

  async function carregarDados() {
    await buscarPerfis();
    await buscarMensagens();
    
    // ✅ BUSCA OS ITENS DO BANCO PARA SABERMOS QUAIS SÃO AS MOLDURAS E QUAIS SÃO OS TÍTULOS MÁGICOS
    const { data: itensDB } = await supabase.from("loja_itens").select("*");
    if (itensDB) setLojaItens(itensDB);
  }

  async function buscarPerfis() {
    const { data } = await supabase.from("perfis").select("*");
    if (data) setPerfis(data);
  }

  async function buscarMensagens() {
    const { data } = await supabase
      .from("guilda_mensagens")
      .select("*")
      .order("criado_em", { ascending: false })
      .limit(limiteMensagens);
      
    if (data) {
      setMensagens(data.reverse());
    }
  }

  async function gerarRanking() {
    setCarregandoRanking(true);
    
    const { data: m } = await supabase.from("mangas").select("usuario, capitulo_atual, favorito");
    const { data: a } = await supabase.from("animes").select("usuario, capitulo_atual, favorito");
    const { data: f } = await supabase.from("filmes").select("usuario, capitulo_atual, status, favorito");
    const { data: l } = await supabase.from("livros").select("usuario, capitulo_atual, favorito");

    const statsByUser: Record<string, { obras: number, caps: number, tempoMin: number, favs: number }> = {};

    perfis.forEach(p => {
      statsByUser[p.nome_original] = { obras: 0, caps: 0, tempoMin: 0, favs: 0 };
    });

    const processarTabela = (dados: any[] | null, tipo: "anime" | "filme" | "outro") => {
      (dados || []).forEach(obra => {
        if (!statsByUser[obra.usuario]) statsByUser[obra.usuario] = { obras: 0, caps: 0, tempoMin: 0, favs: 0 };
        const userStats = statsByUser[obra.usuario];
        userStats.obras += 1;
        userStats.caps += (obra.capitulo_atual || 0);
        if (obra.favorito) userStats.favs += 1;

        if (tipo === "anime") userStats.tempoMin += (obra.capitulo_atual || 0) * 23;
        else if (tipo === "filme" && obra.status === "Completos") userStats.tempoMin += 120;
      });
    };

    processarTabela(m, "outro"); processarTabela(a, "anime"); processarTabela(f, "filme"); processarTabela(l, "outro");

    const statusCompletos = perfis.map(p => {
      const s = statsByUser[p.nome_original] || { obras: 0, caps: 0, tempoMin: 0, favs: 0 };
      let eloTier = "BRONZE";
      if (s.obras >= 1000) eloTier = "DIVINDADE"; else if (s.obras >= 500) eloTier = "DESAFIANTE";
      else if (s.obras >= 200) eloTier = "MESTRE"; else if (s.obras >= 100) eloTier = "DIAMANTE";

      return {
        ...p, esmolas: p.esmolas || 0, total_obras: s.obras, total_capitulos: s.caps,
        tempo_vida: Math.floor(s.tempoMin / 60), total_favoritos: s.favs, elo: eloTier
      };
    });

    setEstatisticas(statusCompletos);
    setCarregandoRanking(false);
  }

  async function enviarMensagem(e?: React.FormEvent, urlFigurinha?: string) {
    if (e) e.preventDefault();
    const msg = urlFigurinha || novaMensagem.trim();
    if (!msg || !usuarioAtivo) return;

    setEnviando(true);
    const tipoMsg = urlFigurinha ? "figurinha" : "chat";
    if (!urlFigurinha) setNovaMensagem(""); 

    const meuPerfil = perfis.find(p => p.nome_original === usuarioAtivo);
    if (meuPerfil) {
      const hoje = new Date().toISOString().split('T')[0];
      let farm = meuPerfil.chat_farm_diario || { data: hoje, ganhos: 0 };
      if (farm.data !== hoje) farm = { data: hoje, ganhos: 0 };
      
      if (farm.ganhos < 30) {
        farm.ganhos += 5;
        const novoSaldo = (meuPerfil.esmolas || 0) + 5;
        await supabase.from("perfis").update({ esmolas: novoSaldo, chat_farm_diario: farm }).eq("nome_original", usuarioAtivo);
        setPerfis(prev => prev.map(p => p.nome_original === usuarioAtivo ? { ...p, esmolas: novoSaldo, chat_farm_diario: farm } : p));
      }
    }

    const { error } = await supabase.from("guilda_mensagens").insert([{
      usuario: usuarioAtivo, mensagem: msg, tipo: tipoMsg
    }]);

    if (!error) await buscarMensagens();
    if (urlFigurinha) setPainelFigurinhas(false);
    setEnviando(false);
  }

  async function excluirMensagem(id: number) {
    if (!confirm("Tem certeza que deseja apagar esta mensagem?")) return;
    await supabase.from("guilda_mensagens").delete().eq("id", id);
    buscarMensagens();
  }

  async function salvarEdicao(id: number) {
    if (!textoEdicao.trim()) return;
    await supabase.from("guilda_mensagens").update({ mensagem: textoEdicao }).eq("id", id);
    setEditandoId(null);
    setTextoEdicao("");
    buscarMensagens();
  }

  async function adicionarFigurinha() {
    if(!novaFigurinhaUrl) return;
    const meuPerfil = perfis.find(p => p.nome_original === usuarioAtivo);
    if(!meuPerfil) return;
    
    const atualizadas = [...(meuPerfil.figurinhas || []), novaFigurinhaUrl];
    await supabase.from("perfis").update({ figurinhas: atualizadas }).eq("nome_original", usuarioAtivo);
    setPerfis(prev => prev.map(p => p.nome_original === usuarioAtivo ? { ...p, figurinhas: atualizadas } : p));
    setNovaFigurinhaUrl("");
  }

  async function fazerUploadFigurinha(event: any) {
    try {
      setFazendoUploadFigurinha(true);
      const file = event.target.files[0];
      if (!file) throw new Error("Nenhuma imagem selecionada.");

      const fileExt = file.name.split('.').pop();
      const fileName = `sticker-${usuarioAtivo}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      const meuPerfil = perfis.find(p => p.nome_original === usuarioAtivo);
      if(meuPerfil) {
        const atualizadas = [...(meuPerfil.figurinhas || []), data.publicUrl];
        await supabase.from("perfis").update({ figurinhas: atualizadas }).eq("nome_original", usuarioAtivo);
        setPerfis(prev => prev.map(p => p.nome_original === usuarioAtivo ? { ...p, figurinhas: atualizadas } : p));
      }

    } catch (error: any) {
      alert("❌ Erro no upload: " + error.message);
    } finally {
      setFazendoUploadFigurinha(false);
    }
  }

  async function deletarFigurinha(url: string) {
    const meuPerfil = perfis.find(p => p.nome_original === usuarioAtivo);
    if(!meuPerfil) return;
    const atualizadas = (meuPerfil.figurinhas || []).filter(f => f !== url);
    await supabase.from("perfis").update({ figurinhas: atualizadas }).eq("nome_original", usuarioAtivo);
    setPerfis(prev => prev.map(p => p.nome_original === usuarioAtivo ? { ...p, figurinhas: atualizadas } : p));
  }

  function formatarHora(dataIso: string) {
    const data = new Date(dataIso);
    return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function getAvatar(nomeUsuario: string) {
    const p = perfis.find(p => p.nome_original === nomeUsuario);
    return p?.avatar || "👤";
  }

  function getCor(nomeUsuario: string) {
    const p = perfis.find(p => p.nome_original === nomeUsuario);
    if (!p) return "text-zinc-500";
    const cores: any = { verde: "text-green-500", azul: "text-blue-500", roxo: "text-purple-500", laranja: "text-orange-500" };
    return p.cor_tema?.startsWith('#') ? `text-[${p.cor_tema}]` : (cores[p.cor_tema] || "text-green-500");
  }

  // ✅ FUNÇÕES DE APOIO PARA EXIBIR A MOLDURA E O TÍTULO DOS USUÁRIOS
  function getMolduraPng(idItem?: string) {
    if (!idItem) return null;
    const item = lojaItens.find(i => i.id === idItem);
    if (item?.imagem_url && !item.imagem_url.includes('.mp4') && !item.imagem_url.includes('.webm') && item.tipo !== 'titulo') {
      return item.imagem_url;
    }
    return null;
  }

  function getTituloItem(idItem?: string) {
    if (!idItem) return null;
    return lojaItens.find(i => i.id === idItem);
  }

  const huntersOrdenados = [...estatisticas].sort((a, b) => {
    if (filtroRanking === "OBRAS") return b.total_obras - a.total_obras;
    if (filtroRanking === "ESMOLAS") return b.esmolas - a.esmolas;
    if (filtroRanking === "TEMPO") return b.tempo_vida - a.tempo_vida;
    if (filtroRanking === "CAPITULOS") return b.total_capitulos - a.total_capitulos;
    if (filtroRanking === "FAVORITOS") return b.total_favoritos - a.total_favoritos;
    return 0;
  });

  const meuPerfilAtivo = perfis.find(p => p.nome_original === usuarioAtivo);

  return (
    <main className="min-h-screen bg-[#040405] text-white p-6 md:p-12 relative overflow-hidden flex flex-col">
      <header className="flex justify-between items-center mb-8 relative z-20 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter text-blue-500">A Guilda</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-500 mt-1">Conexão Global Sincronizada</p>
        </div>
        <Link href="/" className="px-6 py-3 rounded-2xl border border-white/5 text-[10px] font-black uppercase text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all">
          ← Voltar à Base
        </Link>
      </header>

      <div className="flex flex-col lg:flex-row gap-8 flex-1 min-h-0 relative z-20">
        
        <aside className="lg:w-80 flex flex-col gap-4">
          <div className="bg-[#0e0e11]/95 border border-zinc-800 rounded-[2rem] p-6 flex-1">
            <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-6 border-b border-zinc-800 pb-4">Hunters Registrados</h2>
            <div className="space-y-4 overflow-y-auto custom-scrollbar max-h-[60vh] pr-2">
              {perfis.map(p => {
                const molduraSidebar = getMolduraPng(p.cosmeticos?.ativos?.moldura);
                const tituloSidebar = getTituloItem(p.cosmeticos?.ativos?.titulo);

                return (
                  <div key={p.nome_original} className="flex items-center gap-4 bg-black/40 p-3 rounded-2xl border border-white/5">
                    
                    {/* ✅ AVATARES DA LISTA DE HUNTERS COM MOLDURAS CORRIGIDAS */}
                    <div className="relative shrink-0 w-10 h-10 flex items-center justify-center">
                      {molduraSidebar && (
                        <img src={molduraSidebar} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-[140%] h-[140%] max-w-none object-contain pointer-events-none" alt="Moldura PNG" />
                      )}
                      <div className={`w-10 h-10 rounded-[1rem] overflow-hidden bg-zinc-900 flex items-center justify-center text-xl relative z-10 ${!MOLDURAS_DISCORD[p.cosmeticos?.ativos?.moldura || ""] && !molduraSidebar ? "border border-white/10" : ""} ${MOLDURAS_DISCORD[p.cosmeticos?.ativos?.moldura || ""] || ""}`}>
                        {p.avatar?.startsWith('http') ? <img src={p.avatar} className="w-full h-full object-cover" /> : <span>{p.avatar}</span>}
                      </div>
                    </div>

                    <div className="overflow-hidden">
                      <p className={`font-black text-xs truncate ${p.cor_tema?.startsWith('#') ? '' : getCor(p.nome_original)}`} style={p.cor_tema?.startsWith('#') ? { color: p.cor_tema } : {}}>{p.nome_exibicao}</p>
                      
                      {/* ✅ TÍTULOS SENDO RENDERIZADOS NO PAINEL LATERAL COM CSS INJETADO */}
                      {tituloSidebar && (
                        <p className={`text-[7px] font-black uppercase tracking-[0.2em] truncate mt-0.5 ${tituloSidebar.imagem_url || tituloSidebar.id}`}>
                          « {tituloSidebar.nome.replace("Título: ", "")} »
                        </p>
                      )}
                      
                      <p className="text-[8px] text-zinc-500 uppercase tracking-widest mt-1">ID: {p.nome_original}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        <section className="flex-1 bg-[#0e0e11]/95 border border-zinc-800 rounded-[2.5rem] flex flex-col overflow-hidden relative">
          <div className="flex gap-4 p-6 border-b border-zinc-800 bg-black/20">
            <button onClick={() => setAbaAtiva("CHAT")} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${abaAtiva === "CHAT" ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-zinc-500 hover:text-white'}`}>💬 Chat Global</button>
            <button onClick={() => setAbaAtiva("RANKING")} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${abaAtiva === "RANKING" ? 'bg-yellow-600 text-white' : 'bg-zinc-900 text-zinc-500 hover:text-white'}`}>🏆 Pódio / Ranks</button>
          </div>

          {/* ----------------- ABA 1: CHAT GLOBAL ----------------- */}
          {abaAtiva === "CHAT" && (
            <div className="flex flex-col h-full flex-1 min-h-0">
              <div ref={scrollRef} className="flex-1 p-8 overflow-y-auto custom-scrollbar flex flex-col gap-1">
                
                {/* BOTÃO CARREGAR MAIS MENSAGENS */}
                {mensagens.length >= limiteMensagens && (
                  <div className="flex justify-center mb-6">
                    <button 
                      onClick={() => setLimiteMensagens(prev => prev + 50)} 
                      className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
                    >
                      ↑ Carregar mensagens antigas
                    </button>
                  </div>
                )}

                {mensagens.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-zinc-600 font-bold uppercase text-xs tracking-widest italic">O mural está silencioso...</div>
                ) : (
                  mensagens.map((msg, index) => {
                    const isMe = msg.usuario === usuarioAtivo;
                    const autorPerfil = perfis.find(p => p.nome_original === msg.usuario);
                    
                    const corAtiva = autorPerfil?.cosmeticos?.ativos?.chat_cor;
                    const balaoAtivo = autorPerfil?.cosmeticos?.ativos?.chat_balao;
                    
                    const classeTexto = corAtiva && CORES_CHAT[corAtiva] ? CORES_CHAT[corAtiva] : "text-zinc-300";
                    const classeBalao = balaoAtivo && BALOES_CHAT[balaoAtivo] ? BALOES_CHAT[balaoAtivo] : "hover:bg-white/5 bg-transparent";

                    // Puxando as Molduras e os Títulos Mágicos para o Chat
                    const molduraChat = getMolduraPng(autorPerfil?.cosmeticos?.ativos?.moldura);
                    const tituloChat = getTituloItem(autorPerfil?.cosmeticos?.ativos?.titulo);

                    // LÓGICA DE AGRUPAMENTO DE MENSAGENS (ESTILO DISCORD)
                    let mostrarCabecalho = true;
                    if (index > 0) {
                      const prevMsg = mensagens[index - 1];
                      const diffTime = new Date(msg.criado_em).getTime() - new Date(prevMsg.criado_em).getTime();
                      
                      if (prevMsg.usuario === msg.usuario && diffTime < 300000) {
                        mostrarCabecalho = false;
                      }
                    }

                    return (
                      <div key={msg.id} className={`group flex gap-4 items-start w-full px-4 py-1 transition-all rounded-lg ${mostrarCabecalho ? 'mt-4' : 'mt-0'} ${classeBalao.includes('bg-transparent') ? classeBalao : 'p-3 ' + classeBalao}`}>
                        
                        {/* ✅ Avatar com Moldura 140% no Chat */}
                        <div className="w-10 shrink-0 flex justify-center mt-1">
                          {mostrarCabecalho ? (
                            <div className="relative w-10 h-10 flex items-center justify-center">
                              {molduraChat && (
                                <img src={molduraChat} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-[140%] h-[140%] max-w-none object-contain pointer-events-none" alt="Moldura PNG" />
                              )}
                              <div className={`w-10 h-10 rounded-[1rem] overflow-hidden bg-zinc-900 flex items-center justify-center text-sm relative z-10 ${MOLDURAS_DISCORD[autorPerfil?.cosmeticos?.ativos?.moldura || ""] || ""}`}>
                                {getAvatar(msg.usuario)?.startsWith('http') ? <img src={getAvatar(msg.usuario)} className="w-full h-full object-cover" /> : <span>{getAvatar(msg.usuario)}</span>}
                              </div>
                            </div>
                          ) : (
                            <div className="w-10" /> 
                          )}
                        </div>

                        <div className="flex flex-col w-full relative">
                          {/* ✅ Nome, TÍTULOS CSS e Hora no Chat */}
                          {mostrarCabecalho && (
                            <div className="flex flex-wrap items-baseline gap-2 mb-1">
                              <span className={`text-[12px] font-black uppercase ${getCor(msg.usuario)}`}>
                                {autorPerfil?.nome_exibicao || msg.usuario}
                              </span>
                              {tituloChat && (
                                <span className={`text-[8px] font-black uppercase tracking-widest ${tituloChat.imagem_url || tituloChat.id}`}>
                                  « {tituloChat.nome.replace("Título: ", "")} »
                                </span>
                              )}
                              <span className="text-[10px] text-zinc-600 font-bold ml-1">
                                {formatarHora(msg.criado_em)}
                              </span>
                            </div>
                          )}
                          
                          {/* CAIXA DE EDIÇÃO OU TEXTO NORMAL */}
                          <div className="text-sm leading-relaxed pr-16 min-h-[24px] flex items-center">
                            {editandoId === msg.id ? (
                              <div className="flex gap-2 w-full mt-1">
                                <input 
                                  type="text" 
                                  value={textoEdicao} 
                                  onChange={(e) => setTextoEdicao(e.target.value)} 
                                  className="flex-1 bg-black border border-blue-500/50 p-2 rounded-lg text-white text-xs outline-none" 
                                  autoFocus
                                />
                                <button onClick={() => salvarEdicao(msg.id)} className="text-[9px] bg-green-600/20 text-green-500 px-3 rounded-lg font-bold hover:bg-green-600 hover:text-white transition-all">Salvar</button>
                                <button onClick={() => setEditandoId(null)} className="text-[9px] bg-red-600/20 text-red-500 px-3 rounded-lg font-bold hover:bg-red-600 hover:text-white transition-all">Cancelar</button>
                              </div>
                            ) : msg.tipo === "figurinha" ? (
                              <img src={msg.mensagem} alt="Figurinha" className="max-w-[150px] max-h-[150px] rounded-lg object-contain mt-1" />
                            ) : (
                              <span className={classeTexto}>{msg.mensagem}</span>
                            )}
                          </div>

                          {/* BOTÕES FLUTUANTES DE EDITAR/EXCLUIR */}
                          {isMe && editandoId !== msg.id && (
                            <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 bg-[#0e0e11] border border-zinc-800 px-2 py-1 rounded-lg shadow-lg">
                              {msg.tipo !== "figurinha" && (
                                <button 
                                  onClick={() => { setEditandoId(msg.id); setTextoEdicao(msg.mensagem); }} 
                                  className="text-[10px] font-bold text-zinc-400 hover:text-blue-400 transition-colors"
                                >
                                  ✎ Editar
                                </button>
                              )}
                              <button 
                                onClick={() => excluirMensagem(msg.id)} 
                                className="text-[10px] font-bold text-zinc-400 hover:text-red-400 transition-colors"
                              >
                                🗑 Excluir
                              </button>
                            </div>
                          )}
                        </div>

                      </div>
                    );
                  })
                )}
              </div>

              {/* PAINEL DE FIGURINHAS */}
              {painelFigurinhas && (
                <div className="px-6 py-4 bg-zinc-900 border-t border-zinc-800 flex flex-col gap-4 animate-in slide-in-from-bottom-2 shrink-0">
                  <div className="flex gap-2 items-center">
                    <input 
                      type="text" 
                      placeholder="Cole a URL da imagem..." 
                      className="flex-1 bg-black border border-zinc-800 p-3 rounded-xl text-xs outline-none text-white"
                      value={novaFigurinhaUrl} onChange={(e) => setNovaFigurinhaUrl(e.target.value)}
                    />
                    <button onClick={adicionarFigurinha} className="bg-green-600 text-white px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-500 transition-all">Salvar URL</button>
                    
                    <label className={`flex items-center justify-center px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all border border-blue-500/30 ${fazendoUploadFigurinha ? 'bg-zinc-800 text-zinc-500' : 'bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white'}`}>
                      {fazendoUploadFigurinha ? "⏳..." : "⬆️ Upar PC"}
                      <input type="file" accept="image/*, image/gif" className="hidden" onChange={fazerUploadFigurinha} disabled={fazendoUploadFigurinha} />
                    </label>
                  </div>
                  
                  <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
                    {meuPerfilAtivo?.figurinhas?.length === 0 && <span className="text-[10px] text-zinc-500 italic uppercase">Você ainda não salvou nenhuma figurinha.</span>}
                    {meuPerfilAtivo?.figurinhas?.map((url, i) => (
                      <div key={i} className="relative group/sticker shrink-0">
                        <img 
                          src={url} alt="Figurinha Salva" 
                          onClick={() => enviarMensagem(undefined, url)} 
                          className="w-20 h-20 object-cover rounded-xl border border-zinc-800 cursor-pointer hover:border-blue-500 transition-all hover:scale-105 bg-black" 
                        />
                        <button onClick={() => deletarFigurinha(url)} className="absolute -top-2 -right-2 bg-red-600 text-white w-6 h-6 rounded-full text-xs opacity-0 group-hover/sticker:opacity-100 transition-all flex items-center justify-center">✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-6 bg-black/40 border-t border-zinc-800 shrink-0">
                <form onSubmit={enviarMensagem} className="flex gap-3">
                  <button type="button" onClick={() => setPainelFigurinhas(!painelFigurinhas)} className={`p-4 rounded-2xl border transition-all text-xl ${painelFigurinhas ? 'bg-blue-600/20 border-blue-500' : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800'}`}>
                    🌠
                  </button>
                  <input 
                    type="text" placeholder="Conversar na Guilda..." 
                    className="flex-1 bg-zinc-950 border border-zinc-800 p-5 rounded-2xl outline-none text-white text-sm focus:border-blue-500/50 transition-all"
                    value={novaMensagem} onChange={e => setNovaMensagem(e.target.value)} maxLength={250}
                  />
                  <button type="submit" disabled={enviando || !novaMensagem.trim()} className="px-8 bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-blue-500 disabled:opacity-50 transition-all">
                    Enviar
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ----------------- ABA 2: RANKING EXPANDIDO ----------------- */}
          {abaAtiva === "RANKING" && (
            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar flex flex-col gap-6">
              <div className="flex flex-wrap justify-center gap-3 mb-4">
                <button onClick={() => setFiltroRanking("OBRAS")} className={`px-4 py-2 rounded-xl border text-[9px] font-black uppercase transition-all ${filtroRanking === "OBRAS" ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400' : 'bg-black/50 border-zinc-800 text-zinc-500 hover:text-white'}`}>📚 Mais Viciados</button>
                <button onClick={() => setFiltroRanking("ESMOLAS")} className={`px-4 py-2 rounded-xl border text-[9px] font-black uppercase transition-all ${filtroRanking === "ESMOLAS" ? 'bg-yellow-600/20 border-yellow-500 text-yellow-400' : 'bg-black/50 border-zinc-800 text-zinc-500 hover:text-white'}`}>🪙 Mais Ricos</button>
                <button onClick={() => setFiltroRanking("TEMPO")} className={`px-4 py-2 rounded-xl border text-[9px] font-black uppercase transition-all ${filtroRanking === "TEMPO" ? 'bg-purple-600/20 border-purple-500 text-purple-400' : 'bg-black/50 border-zinc-800 text-zinc-500 hover:text-white'}`}>⏳ Veteranos (Horas)</button>
                <button onClick={() => setFiltroRanking("CAPITULOS")} className={`px-4 py-2 rounded-xl border text-[9px] font-black uppercase transition-all ${filtroRanking === "CAPITULOS" ? 'bg-red-600/20 border-red-500 text-red-400' : 'bg-black/50 border-zinc-800 text-zinc-500 hover:text-white'}`}>🔥 Devoradores (Caps)</button>
                <button onClick={() => setFiltroRanking("FAVORITOS")} className={`px-4 py-2 rounded-xl border text-[9px] font-black uppercase transition-all ${filtroRanking === "FAVORITOS" ? 'bg-green-600/20 border-green-500 text-green-400' : 'bg-black/50 border-zinc-800 text-zinc-500 hover:text-white'}`}>⭐ Curadores</button>
              </div>

              {carregandoRanking ? (
                <div className="flex-1 flex items-center justify-center text-zinc-500 italic animate-pulse">Inspecionando Registros dos Hunters...</div>
              ) : (
                <div className="flex flex-col gap-4">
                  {huntersOrdenados.map((hunter, index) => {
                    const isTop1 = index === 0; const isTop2 = index === 1; const isTop3 = index === 2;
                    let medalha = "🏅"; if (isTop1) medalha = "👑"; else if (isTop2) medalha = "🥈"; else if (isTop3) medalha = "🥉";

                    let corTexto = "text-indigo-400"; let valor = hunter.total_obras; let label = "Obras Lidas";
                    if (filtroRanking === "ESMOLAS") { corTexto = "text-yellow-500"; valor = hunter.esmolas; label = "Esmolas"; }
                    if (filtroRanking === "TEMPO") { corTexto = "text-purple-400"; valor = hunter.tempo_vida; label = "Horas Consumidas"; }
                    if (filtroRanking === "CAPITULOS") { corTexto = "text-red-400"; valor = hunter.total_capitulos; label = "Caps / Episódios"; }
                    if (filtroRanking === "FAVORITOS") { corTexto = "text-green-400"; valor = hunter.total_favoritos; label = "Obras Favoritas"; }

                    // Pegando customizações
                    const molduraRank = getMolduraPng(hunter.cosmeticos?.ativos?.moldura);
                    const tituloRank = getTituloItem(hunter.cosmeticos?.ativos?.titulo);

                    return (
                      <div key={hunter.nome_original} className={`flex items-center justify-between p-5 rounded-3xl border transition-all ${isTop1 ? 'bg-yellow-900/10 border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.1)]' : isTop2 ? 'bg-zinc-800/20 border-zinc-400/50' : isTop3 ? 'bg-orange-900/10 border-orange-700/50' : 'bg-zinc-900/30 border-zinc-800'}`}>
                        <div className="flex items-center gap-6">
                          <span className={`text-3xl font-black italic w-10 text-center ${isTop1 ? 'text-yellow-500 drop-shadow-md' : isTop2 ? 'text-zinc-300' : isTop3 ? 'text-orange-500' : 'text-zinc-600'}`}>#{index + 1}</span>
                          
                          {/* ✅ AVATARES DO RANKING COM MOLDURAS CORRIGIDAS */}
                          <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
                            {molduraRank && (
                              <img src={molduraRank} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-[140%] h-[140%] max-w-none object-contain pointer-events-none" alt="Moldura PNG" />
                            )}
                            <div className={`w-14 h-14 rounded-[1.5rem] overflow-hidden bg-zinc-950 flex items-center justify-center text-2xl relative z-10 ${!MOLDURAS_DISCORD[hunter.cosmeticos?.ativos?.moldura || ""] && !molduraRank ? "border border-white/10" : ""} ${MOLDURAS_DISCORD[hunter.cosmeticos?.ativos?.moldura || ""] || ""}`}>
                              {hunter.avatar?.startsWith('http') ? <img src={hunter.avatar} className="w-full h-full object-cover" /> : <span>{hunter.avatar}</span>}
                            </div>
                          </div>

                          <div>
                            <p className="font-black text-lg uppercase flex items-center gap-2">{hunter.nome_exibicao} {isTop1 || isTop2 || isTop3 ? <span className="text-xl">{medalha}</span> : ""}</p>
                            
                            {/* ✅ TÍTULOS SENDO RENDERIZADOS NO RANKING COM CSS INJETADO */}
                            {tituloRank && (
                              <p className={`text-[9px] font-black uppercase tracking-[0.2em] mt-0.5 ${tituloRank.imagem_url || tituloRank.id}`}>
                                « {tituloRank.nome.replace("Título: ", "")} »
                              </p>
                            )}
                            
                            <p className="text-[9px] text-zinc-500 uppercase tracking-widest mt-1">RANK: <span className="text-white">{hunter.elo}</span></p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-3xl font-black italic ${corTexto}`}>{valor}</p>
                          <p className="text-[8px] text-zinc-500 uppercase tracking-widest">{label}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </section>
      </div>
    </main>
  );
}