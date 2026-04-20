"use client";

import { supabase } from "../supabase";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { History, Mic } from "lucide-react";
import MangaDetailsModal, { type Manga as MangaObraModal } from "@/components/ui/MangaDetailsModal";
import MemberPopout from "./components/MemberPopout";
import SintoniaIndicator from "./components/SintoniaIndicator";
import { useSenhaMestraInterativa } from "@/hooks/useSenhaMestraInterativa";
import { API_DB_PATH } from "@/lib/dbClient";
import { getApiUrl } from "@/utils/api";
// ✅ MOLDURAS IMPORTADAS DO PERFIL
import { MOLDURAS_DISCORD } from "../perfil/page";
// ✅ COMPONENTE DE IDENTIDADE UNIFICADO
import HunterAvatar from "@/components/ui/HunterAvatar";
// ✅ NOVO: Player Card
import HunterCard from "@/components/ui/HunterCard";
import Podium from "./components/Podium";
import HuntersList from "./components/HuntersList";
import type { Mensagem, Perfil, EstatisticasHunter, FiltroRanking, AbaPrincipalObra, FavoritoComTipo } from "./types";
import {
  type GuildaRank,
  type StatsHunterAgregado,
  ordenarRanksPorXpMinimoAsc,
  ordenarRanksPorXpMinimoDesc,
  rankAtualDeListaOrdenada,
  proximoRankPorXp,
  totalXpAscensaoHunter,
  classesTailwindNomeRank,
  calcularXpTotalHunter,
  percentualAscensaoAteProximoRank,
  classesTailwindContornoRank,
  formatTempoVidaGuildaHoras,
} from "./rankUtils";

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

/** Limite inicial do chat (paginação reversa); alinhar scroll automático ao mesmo valor. */
const LIMITE_INICIAL_CHAT = 10;

const BALOES_CHAT: any = {
  chat_balao_cyber: "bg-black/80 border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.1)] rounded-none border-l-4",
  chat_balao_rpg: "bg-[#2c241b] border-[#8b7355] border-2 rounded-sm shadow-inner text-[#e0cba8]",
  chat_balao_vidro: "bg-white/5 backdrop-blur-md border border-white/20 shadow-xl",
  chat_balao_toxico: "bg-green-950/40 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.1)] border-dashed",
  chat_balao_void: "bg-black border-zinc-900 shadow-[inset_0_0_30px_rgba(0,0,0,1)]"
};

export default function GuildaPage() {
  const [usuarioAtivo, setUsuarioAtivo] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [novaMensagem, setNovaMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const limiteMensagensRef = useRef(LIMITE_INICIAL_CHAT);

  const [vistaCentral, setVistaCentral] = useState<"chat-geral" | "podio-hunters">("chat-geral");
  const [filtroRanking, setFiltroRanking] = useState<FiltroRanking>("OBRAS");
  const [estatisticas, setEstatisticas] = useState<EstatisticasHunter[]>([]);
  const [carregandoRanking, setCarregandoRanking] = useState(false);

  const [painelFigurinhas, setPainelFigurinhas] = useState(false);
  const [novaFigurinhaUrl, setNovaFigurinhaUrl] = useState("");
  const [fazendoUploadFigurinha, setFazendoUploadFigurinha] = useState(false);

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [textoEdicao, setTextoEdicao] = useState("");
  const [limiteMensagens, setLimiteMensagens] = useState(LIMITE_INICIAL_CHAT);
  
  const [lojaItens, setLojaItens] = useState<any[]>([]);

  // ✅ ESTADOS DO PLAYER CARD
  const [editandoCard, setEditandoCard] = useState(false);
  const [cardDados, setCardDados] = useState({
    banner_url: '',
    tag_texto: 'HUNTER',
    tag_cor: '#3b82f6',
    fonte_cor: '#ffffff',
  });

  // ✅ NOVO ESTADO: INSPEÇÃO DE PERFIL
  const [inspecionandoHunter, setInspecionandoHunter] = useState<EstatisticasHunter | null>(null);

  const { obterSenhaMestreInterativa, modalSenhaMestra } = useSenhaMestraInterativa();

  const [popoutMembro, setPopoutMembro] = useState<Perfil | null>(null);
  const [popoutAnchorRect, setPopoutAnchorRect] = useState<DOMRect | null>(null);
  const [obraGuildaModal, setObraGuildaModal] = useState<{
    manga: MangaObraModal;
    tabelaObra: string;
    abaPrincipal: AbaPrincipalObra;
  } | null>(null);

  const [sintoniaVozAtiva, setSintoniaVozAtiva] = useState(false);

  const [guildaRanks, setGuildaRanks] = useState<GuildaRank[]>([]);

  const [toastsGuilda, setToastsGuilda] = useState<
    { id: number; mensagem: string; tipo: "sucesso" | "erro" | "aviso" | "anilist" }[]
  >([]);

  const fecharPopoutMembro = useCallback(() => {
    setPopoutMembro(null);
    setPopoutAnchorRect(null);
  }, []);

  function mostrarFeedbackGuilda(mensagem: string, tipo: "sucesso" | "erro" | "aviso" | "anilist" = "sucesso") {
    const id = Date.now() + Math.random();
    setToastsGuilda((prev) => [...prev, { id, mensagem, tipo }]);
    setTimeout(() => setToastsGuilda((prev) => prev.filter((t) => t.id !== id)), 4000);
  }

  async function requisicaoDb(method: "POST" | "DELETE", payload: Record<string, any>) {
    const res = await fetch(getApiUrl(API_DB_PATH), {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    return { ok: res.ok && !!data?.success, data };
  }

  useEffect(() => {
    limiteMensagensRef.current = limiteMensagens;
  }, [limiteMensagens]);

  useEffect(() => {
    void buscarMensagens();
  }, [limiteMensagens]);

  useEffect(() => {
    const hunter = sessionStorage.getItem("hunter_ativo");
    if (!hunter) { window.location.href = '/'; return; }
    setUsuarioAtivo(hunter);
    carregarDados();
    const intervalo = setInterval(() => {
      void buscarMensagens();
    }, 10000);
    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => {
    setSintoniaVozAtiva(sessionStorage.getItem("guilda_sintonia_voz") === "1");
  }, []);

  const meuPerfilAtivo = perfis.find(p => p.nome_original === usuarioAtivo);

  const ranksAsc = useMemo(() => ordenarRanksPorXpMinimoAsc(guildaRanks), [guildaRanks]);
  const ranksDesc = useMemo(() => ordenarRanksPorXpMinimoDesc(guildaRanks), [guildaRanks]);

  useEffect(() => {
    if (meuPerfilAtivo?.cosmeticos?.ativos?.card_config) {
      const cc = meuPerfilAtivo.cosmeticos.ativos.card_config as Record<string, unknown>;
      setCardDados({
        banner_url: String(cc.banner_url ?? ""),
        tag_texto: String(cc.tag_texto ?? "HUNTER").toUpperCase(),
        tag_cor: String(cc.tag_cor ?? "#3b82f6"),
        fonte_cor: String(cc.fonte_cor ?? "#ffffff"),
      });
    }
  }, [meuPerfilAtivo]);

  useEffect(() => {
    if (scrollRef.current && vistaCentral === "chat-geral" && limiteMensagens === LIMITE_INICIAL_CHAT) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensagens, vistaCentral, limiteMensagens]);

  // ✅ DISPARA O CÁLCULO SEMPRE QUE OS PERFIS CARREGAREM
  useEffect(() => {
    if (perfis.length > 0 && estatisticas.length === 0) {
      gerarRanking();
    }
  }, [perfis]);

  async function carregarDados() {
    await buscarPerfis();
    const { data: itensDB } = await supabase.from("loja_itens").select("*");
    if (itensDB) setLojaItens(itensDB);
    const { data: ranksRows } = await supabase.from("guilda_ranks").select("*");
    if (ranksRows) setGuildaRanks(ranksRows as GuildaRank[]);
  }

  async function buscarPerfis() {
    const { data } = await supabase.from("perfis").select("*");
    if (data) setPerfis(data);
  }

  async function buscarMensagens() {
    const lim = limiteMensagensRef.current;
    const { data } = await supabase
      .from("guilda_mensagens")
      .select("*")
      .order("criado_em", { ascending: false })
      .limit(lim);
    if (data) {
      const mensagensOrdenadas = [...data].reverse();
      setMensagens(mensagensOrdenadas);
    }
  }

  // ✅ FUNÇÃO: ABRIR RELATÓRIO DE INSPEÇÃO
  const abrirInspecao = (nomeOriginal: string) => {
    const stats = estatisticas.find(s => s.nome_original === nomeOriginal);
    if (stats) {
      setInspecionandoHunter(stats);
    } else {
      const basico = perfis.find(p => p.nome_original === nomeOriginal);
      if (basico) {
        const txp = totalXpAscensaoHunter({
          total_obras: 0,
          total_conquistas: 0,
          xp_missoes: basico.xp_missoes,
        });
        setInspecionandoHunter({
          ...basico,
          total_obras: 0,
          total_capitulos: 0,
          tempo_vida: 0,
          total_favoritos: 0,
          total_conquistas: 0,
          total_xp_ascensao: txp,
          rank_nome: "—",
          rank_classes_tailwind: "",
        } as EstatisticasHunter);
      }
    }
  };

  async function gerarRanking() {
    setCarregandoRanking(true);
    const { data: ranksRows } = await supabase.from("guilda_ranks").select("*");
    const ranksArr = (ranksRows || []) as GuildaRank[];
    const ranksDesc = ordenarRanksPorXpMinimoDesc(ranksArr);
    const ranksAsc = ordenarRanksPorXpMinimoAsc(ranksArr);

    const { data: m } = await supabase.from("mangas").select("usuario, capitulo_atual, favorito");
    const { data: a } = await supabase.from("animes").select("usuario, capitulo_atual, favorito, duracao_episodio_minutos");
    const { data: f } = await supabase.from("filmes").select("usuario, capitulo_atual, status, favorito");
    const { data: l } = await supabase.from("livros").select("usuario, capitulo_atual, favorito");
    const { data: s } = await supabase.from("series").select("usuario, capitulo_atual, status, favorito, duracao_episodio_minutos");
    const { data: j } = await supabase.from("jogos").select("usuario, capitulo_atual, status, favorito");
    const { data: mu } = await supabase.from("musicas").select("usuario, capitulo_atual, status, favorito");

    const statsByUser: Record<string, { obras: number, caps: number, tempoMin: number, favs: number, filmes: number, livros: number }> = {};
    perfis.forEach(p => { statsByUser[p.nome_original] = { obras: 0, caps: 0, tempoMin: 0, favs: 0, filmes: 0, livros: 0 }; });

    const processarTabela = (dados: any[] | null, tipo: "anime" | "filme" | "livro" | "outro" | "serie" | "jogo" | "musica") => {
      (dados || []).forEach(obra => {
        if (!statsByUser[obra.usuario]) statsByUser[obra.usuario] = { obras: 0, caps: 0, tempoMin: 0, favs: 0, filmes: 0, livros: 0 };
        const userStats = statsByUser[obra.usuario];
        userStats.obras += 1;
        userStats.caps += (obra.capitulo_atual || 0);
        if (obra.favorito) userStats.favs += 1;
        if (tipo === "anime") userStats.tempoMin += (obra.capitulo_atual || 0) * (obra.duracao_episodio_minutos || 23);
        else if (tipo === "filme" && obra.status === "Completos") { userStats.tempoMin += 120; userStats.filmes += 1; }
        else if (tipo === "filme") { userStats.filmes += 1; }
        else if (tipo === "livro") { userStats.livros += 1; }
        else if (tipo === "serie") userStats.tempoMin += (obra.capitulo_atual || 0) * (obra.duracao_episodio_minutos || 45);
        else if (tipo === "jogo") userStats.tempoMin += (obra.capitulo_atual || 0) * 60;
        else if (tipo === "musica") userStats.tempoMin += (obra.capitulo_atual || 0) * 3;
      });
    };

    processarTabela(m, "outro"); processarTabela(a, "anime"); processarTabela(f, "filme"); processarTabela(l, "livro");
    processarTabela(s, "serie"); processarTabela(j, "jogo"); processarTabela(mu, "musica");

    const statusCompletos = perfis.map(p => {
      const s = statsByUser[p.nome_original] || { obras: 0, caps: 0, tempoMin: 0, favs: 0, filmes: 0, livros: 0 };
      let trofeus = 0;
      for (let id = 1; id <= 85; id++) {
        let check = false;
        if (id <= 50) {
          if (id === 1) check = s.obras >= 1;
          else if (id === 2) check = s.obras >= 10;
          else if (id === 3) check = s.caps >= 100;
          else if (id === 4) check = Math.floor(s.tempoMin / 60) >= 10;
          else if (id === 5) check = s.favs >= 5;
          else check = s.obras >= (id * 3);
        } else if (id <= 70) {
          check = s.filmes >= ((id - 50) * 5);
        } else {
          check = s.livros >= ((id - 70) * 5);
        }
        if (check) trofeus++;
      }

      const agg: StatsHunterAgregado = {
        obras: s.obras,
        caps: s.caps,
        tempoMin: s.tempoMin,
        favs: s.favs,
        filmes: s.filmes,
        livros: s.livros,
      };
      const total_xp_ascensao = calcularXpTotalHunter(agg, p.xp_missoes || 0);
      const rankAtual = rankAtualDeListaOrdenada(ranksDesc, total_xp_ascensao);

      return {
        ...p,
        esmolas: p.esmolas || 0,
        total_obras: s.obras,
        total_capitulos: s.caps,
        tempo_vida: Math.floor(s.tempoMin / 60),
        total_favoritos: s.favs,
        total_conquistas: trofeus,
        total_xp_ascensao,
        rank_nome: rankAtual?.nome ?? "—",
        rank_classes_tailwind: rankAtual?.classes_tailwind ?? "",
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
    if (meuPerfilAtivo) {
      const hoje = new Date().toISOString().split('T')[0];
      let farm = meuPerfilAtivo.chat_farm_diario || { data: hoje, ganhos: 0 };
      if (farm.data !== hoje) farm = { data: hoje, ganhos: 0 };
      if (farm.ganhos < 30) {
        farm.ganhos += 5;
        const novoSaldo = (meuPerfilAtivo.esmolas || 0) + 5;
        await requisicaoDb("POST", {
          tabela: "perfis",
          nome_original: usuarioAtivo,
          dados: { esmolas: novoSaldo, chat_farm_diario: farm }
        });
        setPerfis(prev => prev.map(p => p.nome_original === usuarioAtivo ? { ...p, esmolas: novoSaldo, chat_farm_diario: farm } : p));
      }
    }
    const resultado = await requisicaoDb("POST", {
      tabela: "guilda_mensagens",
      operacao: "insert",
      dados: { usuario: usuarioAtivo, mensagem: msg, tipo: tipoMsg }
    });
    if (resultado.ok) await buscarMensagens();
    if (urlFigurinha) setPainelFigurinhas(false);
    setEnviando(false);
  }

  async function excluirMensagem(id: number) {
    if (!confirm("Tem certeza que deseja apagar esta mensagem?")) return;
    await requisicaoDb("DELETE", { tabela: "guilda_mensagens", id });
    buscarMensagens();
  }

  async function salvarEdicao(id: number) {
    if (!textoEdicao.trim()) return;
    await requisicaoDb("POST", { tabela: "guilda_mensagens", id, dados: { mensagem: textoEdicao } });
    setEditandoId(null);
    setTextoEdicao("");
    buscarMensagens();
  }

  async function adicionarFigurinha() {
    if(!novaFigurinhaUrl || !meuPerfilAtivo) return;
    const atualizadas = [...(meuPerfilAtivo.figurinhas || []), novaFigurinhaUrl];
    await requisicaoDb("POST", { tabela: "perfis", nome_original: usuarioAtivo, dados: { figurinhas: atualizadas } });
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
      if(meuPerfilAtivo) {
        const atualizadas = [...(meuPerfilAtivo.figurinhas || []), data.publicUrl];
        await requisicaoDb("POST", { tabela: "perfis", nome_original: usuarioAtivo, dados: { figurinhas: atualizadas } });
        setPerfis(prev => prev.map(p => p.nome_original === usuarioAtivo ? { ...p, figurinhas: atualizadas } : p));
      }
    } catch (error: any) { alert("❌ Erro no upload: " + error.message); }
    finally { setFazendoUploadFigurinha(false); }
  }

  async function deletarFigurinha(url: string) {
    if(!meuPerfilAtivo) return;
    const atualizadas = (meuPerfilAtivo.figurinhas || []).filter(f => f !== url);
    await requisicaoDb("POST", { tabela: "perfis", nome_original: usuarioAtivo, dados: { figurinhas: atualizadas } });
    setPerfis(prev => prev.map(p => p.nome_original === usuarioAtivo ? { ...p, figurinhas: atualizadas } : p));
  }

  async function salvarPlayerCard() {
    if (!meuPerfilAtivo) return;
    const novosAtivos = { 
      ...(meuPerfilAtivo.cosmeticos?.ativos || {}), 
      card_config: cardDados 
    };
    await requisicaoDb("POST", {
      tabela: "perfis",
      nome_original: usuarioAtivo,
      dados: { cosmeticos: { ...(meuPerfilAtivo.cosmeticos || {}), ativos: novosAtivos } }
    });
    
    setEditandoCard(false);
    buscarPerfis();
    window.dispatchEvent(new Event("hunter_cosmeticos_update"));
    alert("Identidade Atualizada!");
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

  const statsPopoutMembro = popoutMembro
    ? estatisticas.find((s) => s.nome_original === popoutMembro.nome_original) ?? null
    : null;

  const popoutGuildaRank =
    popoutMembro && guildaRanks.length > 0
      ? (() => {
          const totalXp =
            statsPopoutMembro?.total_xp_ascensao ??
            totalXpAscensaoHunter({
              total_obras: statsPopoutMembro?.total_obras,
              total_conquistas: statsPopoutMembro?.total_conquistas,
              xp_missoes: popoutMembro.xp_missoes,
            });
          const atual = rankAtualDeListaOrdenada(ranksDesc, totalXp);
          const proximo = proximoRankPorXp(ranksAsc, totalXp);
          return {
            nome: atual?.nome ?? "",
            nomeClasses: classesTailwindNomeRank(atual?.classes_tailwind ?? ""),
            rankTailwind: atual?.classes_tailwind ?? "",
            xpMinProximo: proximo?.xp_minimo ?? null,
          };
        })()
      : null;

  function abrirPopoutMembro(perfil: Perfil, anchor: DOMRect) {
    setPopoutAnchorRect(anchor);
    setPopoutMembro(perfil);
  }

  function aoSelecionarObraNoPopout(item: FavoritoComTipo) {
    fecharPopoutMembro();
    setObraGuildaModal({
      manga: item.obra as MangaObraModal,
      tabelaObra: item.tabelaObra,
      abaPrincipal: item.abaPrincipal,
    });
  }

  const huntersOrdenados = [...estatisticas].sort((a, b) => {
    if (filtroRanking === "CONQUISTAS") return b.total_conquistas - a.total_conquistas;
    if (filtroRanking === "OBRAS") return b.total_obras - a.total_obras;
    if (filtroRanking === "ESMOLAS") return b.esmolas - a.esmolas;
    if (filtroRanking === "TEMPO") return b.tempo_vida - a.tempo_vida;
    if (filtroRanking === "CAPITULOS") return b.total_capitulos - a.total_capitulos;
    if (filtroRanking === "FAVORITOS") return b.total_favoritos - a.total_favoritos;
    return 0;
  });

  return (
    <main className="min-h-screen bg-transparent text-white p-6 md:p-12 relative overflow-hidden flex flex-col">
      <header className="flex justify-between items-center mb-8 relative z-20 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter text-blue-500">A Guilda</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-500 mt-1">Conexão Global Sincronizada</p>
        </div>
        <Link href="/" className="px-6 py-3 rounded-2xl border border-white/5 text-[10px] font-black uppercase text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all">
          ← Voltar à Base
        </Link>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_minmax(0,18rem)] gap-6 lg:gap-8 flex-1 min-h-0 relative z-20 items-stretch">
        <nav className="flex flex-row xl:flex-col gap-3 min-h-0 shrink-0" aria-label="Navegação da Guilda">
          <div className="bg-[#0e0e11]/95 border border-zinc-800 rounded-[2rem] p-5 flex flex-col gap-3 flex-1 xl:flex-none shadow-[0_0_28px_rgba(59,130,246,0.08)]">
            <h2 className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.35em] border-b border-zinc-800/80 pb-3 drop-shadow-[0_0_8px_rgba(34,211,238,0.35)]">
              Navegação
            </h2>
            <button
              type="button"
              onClick={() => setVistaCentral("chat-geral")}
              className={`w-full text-left rounded-2xl border px-4 py-4 transition-all ${
                vistaCentral === "chat-geral"
                  ? "border-cyan-500/50 bg-cyan-500/10 text-white shadow-[0_0_20px_rgba(34,211,238,0.2)]"
                  : "border-white/5 bg-black/40 text-zinc-500 hover:border-blue-500/30 hover:text-zinc-200"
              }`}
            >
              <span className="block text-[8px] font-mono text-cyan-500/80 tracking-tight mb-1">#chat-geral</span>
              <span className="text-[10px] font-black uppercase tracking-widest">💬 Chat Global</span>
            </button>
            <button
              type="button"
              onClick={() => setVistaCentral("podio-hunters")}
              className={`w-full text-left rounded-2xl border px-4 py-4 transition-all ${
                vistaCentral === "podio-hunters"
                  ? "border-amber-500/50 bg-amber-500/10 text-white shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                  : "border-white/5 bg-black/40 text-zinc-500 hover:border-amber-500/30 hover:text-zinc-200"
              }`}
            >
              <span className="block text-[8px] font-mono text-amber-500/80 tracking-tight mb-1">#pódio-hunters</span>
              <span className="text-[10px] font-black uppercase tracking-widest">🏆 Pódio Hunters</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSintoniaVozAtiva((v) => {
                  const next = !v;
                  sessionStorage.setItem("guilda_sintonia_voz", next ? "1" : "0");
                  return next;
                });
              }}
              className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-4 text-left transition-all ${
                sintoniaVozAtiva
                  ? "border-emerald-500/50 bg-emerald-500/10 text-white shadow-[0_0_22px_rgba(52,211,153,0.28)]"
                  : "border-white/5 bg-black/40 text-zinc-500 hover:border-emerald-500/35 hover:text-zinc-200"
              }`}
            >
              <Mic
                className={`h-5 w-5 shrink-0 ${sintoniaVozAtiva ? "text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.85)]" : "text-zinc-500"}`}
                strokeWidth={2.25}
              />
              <div>
                <span className="block text-[8px] font-mono text-emerald-500/80 tracking-tight mb-1">Jami / Voz</span>
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {sintoniaVozAtiva ? "● Em sintonia" : "Entrar em sintonia"}
                </span>
              </div>
            </button>
          </div>
        </nav>

        <section className="min-w-0 min-h-[min(70vh,720px)] xl:min-h-0 flex flex-col bg-[#0e0e11]/95 border border-zinc-800 rounded-[2.5rem] overflow-hidden relative shadow-[0_0_32px_rgba(59,130,246,0.06)]">
          {vistaCentral === "chat-geral" && (
            <div id="chat-geral" className="flex flex-col h-full flex-1 min-h-0">
              <div
                ref={scrollRef}
                className="flex-1 min-h-0 max-h-[min(60vh,500px)] overflow-y-auto pr-2 scroll-smooth custom-scrollbar flex flex-col gap-1 px-8 pt-8 pb-4"
              >
                {mensagens.length >= limiteMensagens && (
                  <div className="flex justify-center py-4">
                    <button
                      type="button"
                      onClick={() => setLimiteMensagens((prev) => prev + 10)}
                      className="text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors flex items-center gap-2 bg-black/40 px-4 py-2 rounded-full border border-white/5 hover:border-white/20"
                    >
                      <History className="w-4 h-4" /> Carregar mensagens anteriores
                    </button>
                  </div>
                )}
                {mensagens.map((msg, index) => {
                  const autorPerfil = perfis.find(p => p.nome_original === msg.usuario);
                  const corAtiva = autorPerfil?.cosmeticos?.ativos?.chat_cor;
                  const balaoAtivo = autorPerfil?.cosmeticos?.ativos?.chat_balao;
                  const classeTexto = corAtiva && CORES_CHAT[corAtiva] ? CORES_CHAT[corAtiva] : "text-zinc-300";
                  const classeBalao = balaoAtivo && BALOES_CHAT[balaoAtivo] ? BALOES_CHAT[balaoAtivo] : "hover:bg-white/5 bg-transparent";
                  const molduraChat = getMolduraPng(autorPerfil?.cosmeticos?.ativos?.moldura);
                  const tituloChat = getTituloItem(autorPerfil?.cosmeticos?.ativos?.titulo);
                  let mostrarCabecalho = true;
                  if (index > 0) {
                    const prevMsg = mensagens[index - 1];
                    const diffTime = new Date(msg.criado_em).getTime() - new Date(prevMsg.criado_em).getTime();
                    if (prevMsg.usuario === msg.usuario && diffTime < 300000) mostrarCabecalho = false;
                  }
                  return (
                    <div key={msg.id} className={`group flex gap-4 items-start w-full px-4 py-1 transition-all rounded-lg ${mostrarCabecalho ? 'mt-4' : 'mt-0'} ${classeBalao.includes('bg-transparent') ? classeBalao : 'p-3 ' + classeBalao}`}>
                      <div className="w-10 shrink-0 flex justify-center mt-1">
                        {mostrarCabecalho ? (
                          <div className="cursor-pointer" onClick={() => abrirInspecao(msg.usuario)}>
                            <HunterAvatar 
                              avatarUrl={getAvatar(msg.usuario)} 
                              idMoldura={autorPerfil?.cosmeticos?.ativos?.moldura} 
                              imagemMolduraUrl={molduraChat || undefined}
                              tamanho="sm"
                              temaCor={autorPerfil?.cor_tema?.startsWith('#') ? autorPerfil.cor_tema : autorPerfil?.custom_color}
                            />
                          </div>
                        ) : <div className="w-10" />}
                      </div>
                      <div className="flex flex-col w-full relative">
                        {mostrarCabecalho && (
                          <div className="flex flex-wrap items-baseline gap-2 mb-1">
                            <span 
                              className={`text-[12px] font-black uppercase cursor-pointer hover:underline ${getCor(msg.usuario)}`} 
                              style={autorPerfil?.cor_tema?.startsWith('#') ? { color: autorPerfil.cor_tema } : {}}
                              onClick={() => abrirInspecao(msg.usuario)}
                            >
                              {autorPerfil?.nome_exibicao || msg.usuario}
                            </span>
                            {tituloChat && <span className={`text-[8px] font-black uppercase tracking-widest ${tituloChat.imagem_url || tituloChat.id}`}>« {tituloChat.nome.replace("Título: ", "")} »</span>}
                            <span className="text-[10px] text-zinc-600 font-bold ml-1">{formatarHora(msg.criado_em)}</span>
                          </div>
                        )}
                        <div className="text-sm leading-relaxed pr-16 min-h-[24px] flex items-center">
                          {editandoId === msg.id ? (
                            <div className="flex gap-2 w-full mt-1">
                              <input type="text" value={textoEdicao} onChange={(e) => setTextoEdicao(e.target.value)} className="flex-1 bg-black border border-blue-500/50 p-2 rounded-lg text-white text-xs outline-none" autoFocus />
                              <button onClick={() => salvarEdicao(msg.id)} className="text-[9px] bg-green-600/20 text-green-500 px-3 rounded-lg font-bold hover:bg-green-600 hover:text-white transition-all">Salvar</button>
                              <button onClick={() => setEditandoId(null)} className="text-[9px] bg-red-600/20 text-red-500 px-3 rounded-lg font-bold hover:bg-red-600 hover:text-white transition-all">Cancelar</button>
                            </div>
                          ) : msg.tipo === "figurinha" ? (
                            <img src={msg.mensagem} alt="Figurinha" className="max-w-[150px] max-h-[150px] rounded-lg object-contain mt-1" />
                          ) : <span className={classeTexto}>{msg.mensagem}</span>}
                        </div>
                        {msg.usuario === usuarioAtivo && editandoId !== msg.id && (
                          <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 bg-[#0e0e11] border border-zinc-800 px-2 py-1 rounded-lg shadow-lg">
                            {msg.tipo !== "figurinha" && <button onClick={() => { setEditandoId(msg.id); setTextoEdicao(msg.mensagem); }} className="text-[10px] font-bold text-zinc-400 hover:text-blue-400 transition-colors">✎ Editar</button>}
                            <button onClick={() => excluirMensagem(msg.id)} className="text-[10px] font-bold text-zinc-400 hover:text-red-400 transition-colors">🗑 Excluir</button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {painelFigurinhas && (
                <div className="px-6 py-4 bg-zinc-900 border-t border-zinc-800 flex flex-col gap-4 animate-in slide-in-from-bottom-2 shrink-0">
                  <div className="flex gap-2 items-center">
                    <input type="text" placeholder="Cole a URL da imagem..." className="flex-1 bg-black border border-zinc-800 p-3 rounded-xl text-xs outline-none text-white" value={novaFigurinhaUrl} onChange={(e) => setNovaFigurinhaUrl(e.target.value)} />
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
                        <img src={url} alt="Figurinha Salva" onClick={() => enviarMensagem(undefined, url)} className="w-20 h-20 object-cover rounded-xl border border-zinc-800 cursor-pointer hover:border-blue-500 transition-all hover:scale-105 bg-black" />
                        <button onClick={() => deletarFigurinha(url)} className="absolute -top-2 -right-2 bg-red-600 text-white w-6 h-6 rounded-full text-xs opacity-0 group-hover/sticker:opacity-100 transition-all flex items-center justify-center">✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="shrink-0 mt-4 pt-4 px-8 pb-8 border-t border-white/10 bg-black/40">
                <form onSubmit={enviarMensagem} className="flex gap-3">
                  <button type="button" onClick={() => setPainelFigurinhas(!painelFigurinhas)} className={`p-4 rounded-2xl border transition-all text-xl ${painelFigurinhas ? 'bg-blue-600/20 border-blue-500' : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800'}`}>🌠</button>
                  <input type="text" placeholder="Conversar na Guilda..." className="flex-1 bg-zinc-950 border border-zinc-800 p-5 rounded-2xl outline-none text-white text-sm focus:border-blue-500/50 transition-all" value={novaMensagem} onChange={e => setNovaMensagem(e.target.value)} maxLength={250} />
                  <button type="submit" disabled={enviando || !novaMensagem.trim()} className="px-8 bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-blue-500 disabled:opacity-50 transition-all">Enviar</button>
                </form>
              </div>
            </div>
          )}

          {vistaCentral === "podio-hunters" && (
            <div id="podio-hunters" className="flex flex-col flex-1 min-h-0 h-full overflow-hidden">
              <div className="shrink-0 px-6 pt-6 pb-3 border-b border-zinc-800/80 bg-black/20">
                <h2 className="text-[10px] font-black uppercase tracking-[0.35em] text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.35)]">
                  Pódio Hunters
                </h2>
                <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest mt-1">#pódio-hunters</p>
              </div>
              <div className="flex-1 flex flex-col gap-6 min-h-0 overflow-y-auto custom-scrollbar p-6">
                <Podium
                  hunters={huntersOrdenados}
                  filtroRanking={filtroRanking}
                  onInspect={abrirInspecao}
                  getMolduraPng={getMolduraPng}
                  getTituloItem={getTituloItem}
                  guildaRanks={guildaRanks}
                />
                <div className="border-t border-zinc-800 pt-6 flex flex-col flex-1 min-h-[12rem]">
                  <h3 className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-4">Demais posições</h3>
                  <HuntersList
                    hunters={huntersOrdenados}
                    filtroRanking={filtroRanking}
                    onFiltroChange={setFiltroRanking}
                    onInspect={abrirInspecao}
                    getMolduraPng={getMolduraPng}
                    getTituloItem={getTituloItem}
                    startIndex={3}
                    guildaRanks={guildaRanks}
                  />
                </div>
              </div>
            </div>
          )}
        </section>

        <aside className="flex flex-col gap-4 min-h-0">
          <div className="bg-[#0e0e11]/95 border border-zinc-800 rounded-[2rem] p-6 flex-1 flex flex-col gap-6 min-h-0 max-h-[70vh] xl:max-h-none shadow-[0_0_28px_rgba(168,85,247,0.07)]">
            <h2 className="text-[10px] font-black text-violet-400 uppercase tracking-widest border-b border-zinc-800 pb-3 drop-shadow-[0_0_8px_rgba(167,139,250,0.35)]">
              Membros
            </h2>

            {meuPerfilAtivo && (
              <div className="flex flex-col gap-3 shrink-0">
                <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Meu Card de Hunter</h3>
                <HunterCard
                  perfil={meuPerfilAtivo}
                  customizacao={meuPerfilAtivo.cosmeticos?.ativos?.card_config}
                />
                <button
                  type="button"
                  onClick={() => setEditandoCard(true)}
                  className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 border border-white/5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all"
                >
                  ⚙️ Customizar Identidade
                </button>
              </div>
            )}

            <div className="flex flex-col flex-1 min-h-0">
              <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 border-b border-zinc-800 pb-3">
                Hunters registrados
              </h3>
              <div className="space-y-4 overflow-y-auto custom-scrollbar pr-2 flex-1 min-h-0">
                {perfis.map((p) => {
                  const molduraSidebar = getMolduraPng(p.cosmeticos?.ativos?.moldura as string | undefined);
                  const tituloSidebar = getTituloItem(p.cosmeticos?.ativos?.titulo as string | undefined);
                  const statsP = estatisticas.find((s) => s.nome_original === p.nome_original);
                  const totalXpSidebar =
                    statsP?.total_xp_ascensao ??
                    totalXpAscensaoHunter({
                      total_obras: statsP?.total_obras,
                      total_conquistas: statsP?.total_conquistas,
                      xp_missoes: p.xp_missoes,
                    });
                  const rankSidebar =
                    guildaRanks.length > 0 ? rankAtualDeListaOrdenada(ranksDesc, totalXpSidebar) : null;
                  const rankClassesSidebar =
                    guildaRanks.length > 0 ? (rankSidebar?.classes_tailwind ?? "") : undefined;
                  return (
                    <div
                      key={p.nome_original}
                      role="button"
                      tabIndex={0}
                      onClick={(e) =>
                        abrirPopoutMembro(p, (e.currentTarget as HTMLDivElement).getBoundingClientRect())
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          abrirPopoutMembro(p, (e.currentTarget as HTMLDivElement).getBoundingClientRect());
                        }
                      }}
                      className="flex items-center gap-4 bg-black/40 p-3 rounded-2xl border border-white/5 cursor-pointer hover:bg-white/5 hover:border-violet-500/20 transition-all"
                    >
                      <HunterAvatar
                        avatarUrl={p.avatar}
                        idMoldura={p.cosmeticos?.ativos?.moldura as string | undefined}
                        imagemMolduraUrl={molduraSidebar || undefined}
                        tamanho="sm"
                        temaCor={p.cor_tema?.startsWith("#") ? p.cor_tema : p.custom_color}
                        rankTailwindClasses={rankClassesSidebar}
                      />
                      <div className="overflow-hidden min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <p
                            className={`font-black text-xs truncate min-w-0 ${p.cor_tema?.startsWith("#") ? "" : getCor(p.nome_original)}`}
                            style={p.cor_tema?.startsWith("#") ? { color: p.cor_tema } : {}}
                          >
                            {p.nome_exibicao}
                          </p>
                          {p.nome_original === usuarioAtivo && sintoniaVozAtiva && (
                            <SintoniaIndicator />
                          )}
                        </div>
                        {tituloSidebar && (
                          <p
                            className={`text-[7px] font-black uppercase tracking-[0.2em] truncate mt-0.5 ${tituloSidebar.imagem_url || tituloSidebar.id}`}
                          >
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
          </div>
        </aside>
      </div>

      <MemberPopout
        member={popoutMembro}
        stats={statsPopoutMembro}
        anchorRect={popoutAnchorRect}
        membroEmSintonia={
          !!popoutMembro &&
          popoutMembro.nome_original === usuarioAtivo &&
          sintoniaVozAtiva
        }
        onClose={fecharPopoutMembro}
        onSelectObra={aoSelecionarObraNoPopout}
        onInspecionar={() => {
          if (popoutMembro) abrirInspecao(popoutMembro.nome_original);
        }}
        getMolduraPng={getMolduraPng}
        getTituloItem={getTituloItem}
        getCor={getCor}
        guildaRankNome={popoutGuildaRank?.nome}
        guildaRankNomeClasses={popoutGuildaRank?.nomeClasses}
        rankTailwindClasses={
          popoutGuildaRank ? popoutGuildaRank.rankTailwind || "" : undefined
        }
        xpMissoesAtual={popoutMembro?.xp_missoes ?? 0}
        xpMinimoProximoRank={popoutGuildaRank?.xpMinProximo ?? null}
      />

      {obraGuildaModal && (
        <MangaDetailsModal
          manga={obraGuildaModal.manga}
          tabelaObra={obraGuildaModal.tabelaObra}
          abaPrincipal={obraGuildaModal.abaPrincipal}
          podeEditarPrivilegiado={false}
          somenteLeitura
          solicitarSenhaMestre={obterSenhaMestreInterativa}
          aoFechar={() => setObraGuildaModal(null)}
          aoAtualizarCapitulo={() => {}}
          aoAtualizarDados={() => {}}
          aoDeletar={() => {}}
          aoTraduzir={() =>
            window.open(
              `https://translate.google.com/?sl=auto&tl=pt&text=${encodeURIComponent(obraGuildaModal.manga.sinopse || "")}`,
              "_blank"
            )
          }
          aoEdicaoSalva={() => {}}
          mostrarFeedback={mostrarFeedbackGuilda}
        />
      )}

      {modalSenhaMestra}

      {editandoCard && meuPerfilAtivo && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm">
          <div className="bg-[#0e0e11] border border-zinc-800 w-full max-w-md rounded-[2.5rem] p-8 flex flex-col gap-6 shadow-2xl animate-in fade-in zoom-in duration-300">
            <h2 className="text-xl font-black italic uppercase tracking-tighter text-blue-500">Configurar Player Card</h2>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-500 ml-2">URL do Banner (Fundo)</label>
                <input 
                  type="text" 
                  placeholder="Link da imagem..."
                  className="w-full bg-black border border-zinc-800 p-4 rounded-2xl text-xs outline-none focus:border-blue-500 mt-1"
                  value={cardDados.banner_url}
                  onChange={(e) => setCardDados({...cardDados, banner_url: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500 ml-2">Texto da Tag</label>
                  <input 
                    type="text" 
                    className="w-full bg-black border border-zinc-800 p-4 rounded-2xl text-xs outline-none focus:border-blue-500 mt-1"
                    value={cardDados.tag_texto}
                    maxLength={6}
                    onChange={(e) => setCardDados({...cardDados, tag_texto: e.target.value.toUpperCase()})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500 ml-2">Cor da Tag</label>
                  <input 
                    type="color" 
                    className="w-full h-[50px] bg-black border border-zinc-800 p-2 rounded-2xl cursor-pointer mt-1"
                    value={cardDados.tag_cor}
                    onChange={(e) => setCardDados({...cardDados, tag_cor: e.target.value})}
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={salvarPlayerCard} className="flex-1 bg-blue-600 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest text-white">Salvar Alterações</button>
              <button onClick={() => setEditandoCard(false)} className="px-6 bg-zinc-900 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest text-zinc-400">Voltar</button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ MODAL DE INSPEÇÃO ATUALIZADO (SCOUTER) */}
      
      {inspecionandoHunter && (() => {
        const molduraInspecao = getMolduraPng(inspecionandoHunter.cosmeticos?.ativos?.moldura);
        const tituloInspecao = getTituloItem(inspecionandoHunter.cosmeticos?.ativos?.titulo);
        const corAura = inspecionandoHunter.cor_tema?.startsWith('#') 
          ? inspecionandoHunter.cor_tema 
          : (inspecionandoHunter.custom_color || "#3b82f6");
        const totalXpInsp = inspecionandoHunter.total_xp_ascensao;
        const rankAtualInsp = guildaRanks.length
          ? rankAtualDeListaOrdenada(ranksDesc, totalXpInsp)
          : null;
        const proximoInsp = guildaRanks.length ? proximoRankPorXp(ranksAsc, totalXpInsp) : null;
        const progresso = percentualAscensaoAteProximoRank(totalXpInsp, rankAtualInsp, proximoInsp);
        const nomeRankInsp = rankAtualInsp?.nome ?? inspecionandoHunter.rank_nome;
        const twRankInsp = rankAtualInsp?.classes_tailwind ?? inspecionandoHunter.rank_classes_tailwind;
        const contornoBarra = classesTailwindContornoRank(twRankInsp);

        return (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setInspecionandoHunter(null)}>
            <div 
              className="bg-[#0e0e11] border border-zinc-800 w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in duration-300 relative"
              onClick={(e) => e.stopPropagation()} 
            >
              {/* COMPONENTE DE FUNDO PERSONALIZADO */}
              <HunterCard 
                perfil={inspecionandoHunter} 
                customizacao={inspecionandoHunter.cosmeticos?.ativos?.card_config} 
              />

              {/* CONTEÚDO DE IDENTIDADE */}
              <div className="px-8 -mt-6 relative z-10">
                <div className="flex justify-center mb-4">
                  <HunterAvatar 
                    avatarUrl={inspecionandoHunter.avatar} 
                    idMoldura={inspecionandoHunter.cosmeticos?.ativos?.moldura} 
                    imagemMolduraUrl={molduraInspecao || undefined}
                    tamanho="lg"
                    temaCor={corAura}
                  />
                </div>
                <div className="text-center">
                  <h3 className="text-2xl font-black uppercase italic tracking-tighter" style={{ color: corAura }}>
                    {inspecionandoHunter.nome_exibicao}
                  </h3>
                  {tituloInspecao && (
                    <p className={`text-[10px] font-black uppercase tracking-[0.4em] mt-1 opacity-80 ${tituloInspecao.id}`}>
                      « {tituloInspecao.nome.replace("Título: ", "")} »
                    </p>
                  )}
                </div>

                {/* BARRA DE PROGRESSO (rank dinâmico guilda_ranks) */}
                <div className="mt-6 mb-2 space-y-2">
                  <div className="flex justify-between items-end gap-2">
                    <span className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">Nível de Ascensão</span>
                    <span className={`text-[10px] font-black italic uppercase tracking-wide text-right ${classesTailwindNomeRank(twRankInsp)}`}>
                      {nomeRankInsp}
                    </span>
                  </div>
                  <div className={`w-full ${classesTailwindNomeRank(twRankInsp)}`}>
                    <div className={`h-1.5 w-full rounded-full overflow-hidden bg-black/50 ${contornoBarra}`}>
                      <div
                        className="h-full bg-current opacity-95 transition-all duration-1000 max-w-full"
                        style={{ width: `${progresso}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* GRID DE ESTATÍSTICAS */}
              <div className="p-8 grid grid-cols-2 gap-3 bg-zinc-950/50 mt-4 border-t border-white/5">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                  <p className="text-[7px] font-black uppercase text-zinc-500 tracking-[0.2em] mb-1">Obras</p>
                  <p className="text-xl font-black italic text-blue-500">{inspecionandoHunter.total_obras}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                  <p className="text-[7px] font-black uppercase text-zinc-500 tracking-[0.2em] mb-1">Capítulos</p>
                  <p className="text-xl font-black italic text-red-500">{inspecionandoHunter.total_capitulos}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                  <p className="text-[7px] font-black uppercase text-zinc-500 tracking-[0.2em] mb-1">Esmolas</p>
                  <p className="text-xl font-black italic text-yellow-500">{inspecionandoHunter.esmolas}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                  <p className="text-[7px] font-black uppercase text-zinc-500 tracking-[0.2em] mb-1">Imersão</p>
                  <p className="text-sm font-black text-white mt-1">
                    {formatTempoVidaGuildaHoras(inspecionandoHunter.tempo_vida)}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setInspecionandoHunter(null)} 
                className="w-full py-6 bg-zinc-900 hover:bg-zinc-800 text-[9px] font-black uppercase tracking-[0.4em] text-zinc-600 transition-all border-t border-zinc-800 hover:text-white"
              >
                Encerrar Inspeção
              </button>
            </div>
          </div>
        );
      })()}

      <div className="fixed bottom-10 right-10 z-[620] flex flex-col gap-3 pointer-events-none">
        {toastsGuilda.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-4 px-6 py-4 rounded-2xl border backdrop-blur-md shadow-2xl animate-in slide-in-from-right-8 fade-in duration-300 ${
              t.tipo === "sucesso"
                ? "bg-green-500/10 border-green-500/50 text-green-400"
                : t.tipo === "erro"
                  ? "bg-red-500/10 border-red-500/50 text-red-400"
                  : t.tipo === "aviso"
                    ? "bg-orange-500/10 border-orange-500/50 text-orange-400"
                    : "bg-blue-500/10 border-blue-500/50 text-blue-400"
            }`}
          >
            <span className="text-2xl">
              {t.tipo === "sucesso" ? "✅" : t.tipo === "erro" ? "❌" : t.tipo === "aviso" ? "⚠️" : "🌐"}
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest">{t.mensagem}</span>
          </div>
        ))}
      </div>
    </main>
  );
}