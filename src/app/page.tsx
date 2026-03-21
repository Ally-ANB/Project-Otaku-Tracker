"use client";

// ==========================================
// 📦 [SESSÃO 1] - IMPORTAÇÕES E INTERFACES
// ==========================================
import AcessoMestre from "./components/AcessoMestre";
import { supabase } from "./supabase";
import { useEffect, useState } from "react";
import Link from "next/link";
import MangaCard from "./components/MangaCard";
import AddMangaModal from "./components/AddMangaModal";
import MangaDetailsModal from "./components/MangaDetailsModal";
import AdminPanel from "./components/AdminPanel";
import ProfileSelection from "./components/ProfileSelection";
// ✅ ADICIONADO: Componente de Identidade Universal e Player Card
import HunterAvatar from "./components/HunterAvatar";
import HunterCard from "./components/HunterCard";

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

  const [abaPrincipal, setAbaPrincipal] = useState<"MANGA" | "ANIME" | "FILME" | "LIVRO" | "SERIE" | "JOGO" | "MUSICA">("MANGA"); 
  const [mangas, setMangas] = useState<Manga[]>([]);
  const [animes, setAnimes] = useState<Manga[]>([]); 
  const [filmes, setFilmes] = useState<Manga[]>([]); 
  const [livros, setLivros] = useState<Manga[]>([]); 
  const [series, setSeries] = useState<Manga[]>([]);
  const [jogos, setJogos] = useState<Manga[]>([]);
  const [musicas, setMusicas] = useState<Manga[]>([]);
  const [perfis, setPerfis] = useState<any[]>([]); 
  
  const [lojaItens, setLojaItens] = useState<any[]>([]);

  // ✅ ESTADOS DE COSMÉTICOS (NOVO SLOT: vfx)
  const [inventario, setInventario] = useState<string[]>([]);
  const [equipados, setEquipados] = useState<Record<string, string>>({ 
    moldura: "", 
    particula: "", 
    vfx: "", 
    titulo: "", 
    chat_cor: "", 
    chat_balao: "" 
  });

  const [estaAbertoAdd, setEstaAbertoAdd] = useState(false);
  const [mangaDetalhe, setMangaDetalhe] = useState<Manga | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [filtroAtivo, setFiltroAtivo] = useState("Lendo");
  const [pesquisaInterna, setPesquisaInterna] = useState("");
  const [config, setConfig] = useState({ mostrar_busca: true, mostrar_stats: true, mostrar_backup: true });
  const [modoCinema, setModoCinema] = useState(false);

  const [novoHunter, setNovoHunter] = useState({ nome: '', avatar: '👤', pin: '', cor: 'verde' });
  const [editandoNomeOriginal, setEditandoNomeOriginal] = useState<string | null>(null);
  const [mostrandoFormHunter, setMostrandoFormHunter] = useState(false);
  const [pinAdminAberto, setPinAdminAberto] = useState(false);

  // ✅ ESTADOS DO PLAYER CARD (IDENTIDADE)
  const [editandoCard, setEditandoCard] = useState(false);
  const [cardDados, setCardDados] = useState({
    banner_url: '',
    tag_texto: 'HUNTER',
    tag_cor: '#3b82f6',
    fonte_cor: '#ffffff'
  });

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
  // 🔄 [SESSÃO 5] - INICIALIZAÇÃO
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
    buscarLoja(); 
    buscarPerfis().then(() => setCarregando(false));
  }, []);

  useEffect(() => {
    if (usuarioAtual) {
      setIsAdmin(usuarioAtual === "Admin");
      buscarMangas(); buscarAnimes(); buscarFilmes(); buscarLivros();
      buscarSeries(); buscarJogos(); buscarMusicas();
      
      // ✅ SINCRONIZA OS DADOS DO CARD E COSMÉTICOS AO MUDAR DE USUÁRIO
      const pAtivo = perfis.find(p => p.nome_original === usuarioAtual);
      if (pAtivo) {
        if (pAtivo.cosmeticos?.ativos?.card_config) {
          setCardDados(pAtivo.cosmeticos.ativos.card_config);
        }
        setInventario(pAtivo.cosmeticos?.comprados || []);
        setEquipados(pAtivo.cosmeticos?.ativos || { moldura: "", particula: "", vfx: "", titulo: "" });
      }
    }
  }, [usuarioAtual, perfis]);

  // ==========================================
  // 🛠️ [SESSÃO 6] - FUNÇÕES DE BUSCA E BANCO
  // ==========================================
  async function buscarLoja() {
    // ✅ BUSCA CAMPOS EXTRAS PARA A LÓGICA DE SEPARAÇÃO (tipo)
    const { data } = await supabase.from("loja_itens").select("id, nome, tipo, imagem_url");
    if (data) setLojaItens(data);
  }

  const toggleModoCinema = () => {
    const novoEstado = !modoCinema;
    setModoCinema(novoEstado);
    localStorage.setItem("hunter_modo_cinema", novoEstado.toString());
  };

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

  async function buscarLivros() {
    if (!usuarioAtual || usuarioAtual === "Admin") return;
    const { data } = await supabase.from("livros").select("*").eq("usuario", usuarioAtual).order("ultima_leitura", { ascending: false });
    if (data) setLivros(data as Manga[]);
  }

  async function buscarSeries() {
    if (!usuarioAtual || usuarioAtual === "Admin") return;
    const { data } = await supabase.from("series").select("*").eq("usuario", usuarioAtual).order("ultima_leitura", { ascending: false });
    if (data) setSeries(data as Manga[]);
  }

  async function buscarJogos() {
    if (!usuarioAtual || usuarioAtual === "Admin") return;
    const { data } = await supabase.from("jogos").select("*").eq("usuario", usuarioAtual).order("ultima_leitura", { ascending: false });
    if (data) setJogos(data as Manga[]);
  }

  async function buscarMusicas() {
    if (!usuarioAtual || usuarioAtual === "Admin") return;
    const { data } = await supabase.from("musicas").select("*").eq("usuario", usuarioAtual).order("ultima_leitura", { ascending: false });
    if (data) setMusicas(data as Manga[]);
  }

  async function buscarPerfis() {
    const { data } = await supabase.from("perfis").select("*");
    if (data) setPerfis(data);
  }

  // ✅ FUNÇÃO PARA SALVAR O PLAYER CARD
  async function salvarPlayerCard() {
    const pAtivo = perfis.find(p => p.nome_original === usuarioAtual);
    if (!pAtivo) return;
    
    const novosAtivos = { 
      ...(pAtivo.cosmeticos?.ativos || {}), 
      card_config: cardDados 
    };

    const { error } = await supabase.from("perfis").update({ 
      cosmeticos: { ...(pAtivo.cosmeticos || {}), ativos: novosAtivos } 
    }).eq("nome_original", usuarioAtual);
    
    if (!error) {
      setEditandoCard(false);
      buscarPerfis();
      mostrarToast("Card de Identidade Atualizado!", "sucesso");
    }
  }

  // ==========================================
  // 🔄 [SESSÃO 7] - SINCRONIZAÇÃO ANILIST
  // ==========================================
  async function sincronizarComAniList(titulo: string, capitulo: number, statusLocal: string, token: string, acao: "SALVAR" | "DELETAR" = "SALVAR", tipoObra: "MANGA" | "ANIME" | "FILME" | "LIVRO" | "SERIE" | "JOGO" | "MUSICA" = "MANGA") {
    if (tipoObra === "FILME" || tipoObra === "LIVRO" || tipoObra === "SERIE" || tipoObra === "JOGO" || tipoObra === "MUSICA") return;
    try {
      const res = await fetch('/api/anilist/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo, capitulo, statusLocal, token, acao, tipoObra })
      });
      const data = await res.json();
      if (data.success) mostrarToast(`"${titulo}" sincronizado no AniList!`, "anilist"); 
    } catch (error) { console.error(error); }
  }

  async function puxarProgressoDoAniList() {
    const perfilAtivo = perfis.find(p => p.nome_original === usuarioAtual);
    if (!perfilAtivo?.anilist_token) return mostrarToast("Conecte o AniList primeiro.", "erro");
    
    setSincronizando(true);
    mostrarToast(`SINCRONIZANDO ${abaPrincipal}...`, "aviso");

    try {
      const res = await fetch('/api/anilist/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: perfilAtivo.anilist_token,
          usuario: usuarioAtual,
          tipoObra: abaPrincipal,
          acao: "PULL"
        })
      });

      const data = await res.json();

      if (data.success) {
        setTimeout(async () => {
          if (abaPrincipal === "MANGA") {
            setMangas([]); 
            await buscarMangas();
          } else if (abaPrincipal === "ANIME") {
            setAnimes([]); 
            await buscarAnimes();
          }
          
          mostrarToast(`SUCESSO! ${data.count} OBRAS SINCRONIZADAS.`, "sucesso");
          setSincronizando(false);
        }, 1500);

      } else {
        throw new Error(data.error || "Erro na API");
      }
    } catch (err) {
      console.error("Erro no Sync:", err);
      mostrarToast("ERRO NA SINCRONIA COM O BANCO.", "erro");
      setSincronizando(false);
    }
  }

  // ==========================================
  // ⚡ [SESSÃO 8] - GATILHOS DE ATUALIZAÇÃO (CORE)
  // ==========================================
  async function atualizarCapitulo(manga: Manga, novo: number) {
    if (novo < 0) return;
    let novoStatus = manga.status;
    if (manga.total_capitulos > 0 && novo >= manga.total_capitulos) novoStatus = "Completos";
    
    const tabelaDb = abaPrincipal === "MANGA" ? "mangas" : abaPrincipal === "ANIME" ? "animes" : abaPrincipal === "FILME" ? "filmes" : abaPrincipal === "LIVRO" ? "livros" : abaPrincipal === "SERIE" ? "series" : abaPrincipal === "JOGO" ? "jogos" : "musicas";
    const setLista = abaPrincipal === "MANGA" ? setMangas : abaPrincipal === "ANIME" ? setAnimes : abaPrincipal === "FILME" ? setFilmes : abaPrincipal === "LIVRO" ? setLivros : abaPrincipal === "SERIE" ? setSeries : abaPrincipal === "JOGO" ? setJogos : setMusicas;
    
    const agora = new Date().toISOString();

    setLista((prev: Manga[]) => prev.map(m => m.id === manga.id ? { ...m, capitulo_atual: novo, status: novoStatus, ultima_leitura: agora } : m));
    
    if (mangaDetalhe?.id === manga.id) {
      setMangaDetalhe(prev => prev ? { ...prev, capitulo_atual: novo, status: novoStatus, ultima_leitura: agora } : null);
    }

    await supabase.from(tabelaDb).update({ capitulo_atual: novo, status: novoStatus, ultima_leitura: agora }).eq("id", manga.id);
    mostrarToast("Salvo na base de dados.", "sucesso");

    const perfilAtivo = perfis.find(p => p.nome_original === usuarioAtual);
    if (perfilAtivo?.anilist_token) {
      sincronizarComAniList(manga.titulo, novo, novoStatus, perfilAtivo.anilist_token, "SALVAR", abaPrincipal);
    }
  }

  async function atualizarDados(id: number, campos: any) {
    const tabelaDb = abaPrincipal === "MANGA" ? "mangas" : abaPrincipal === "ANIME" ? "animes" : abaPrincipal === "FILME" ? "filmes" : abaPrincipal === "LIVRO" ? "livros" : abaPrincipal === "SERIE" ? "series" : abaPrincipal === "JOGO" ? "jogos" : "musicas";
    const setLista = abaPrincipal === "MANGA" ? setMangas : abaPrincipal === "ANIME" ? setAnimes : abaPrincipal === "FILME" ? setFilmes : abaPrincipal === "LIVRO" ? setLivros : abaPrincipal === "SERIE" ? setSeries : abaPrincipal === "JOGO" ? setJogos : setMusicas;
    
    const agora = new Date().toISOString();
    const dadosAtualizados = { ...campos, ultima_leitura: agora };

    setLista((prev: Manga[]) => prev.map(m => m.id === id ? { ...m, ...dadosAtualizados } : m));
    
    if (mangaDetalhe?.id === id) {
      setMangaDetalhe(prev => prev ? { ...prev, ...dadosAtualizados } : null);
    }

    await supabase.from(tabelaDb).update(dadosAtualizados).eq("id", id);
    mostrarToast("Configuração salva.", "sucesso");

    const listaAtual = abaPrincipal === "MANGA" ? mangas : abaPrincipal === "ANIME" ? animes : abaPrincipal === "FILME" ? filmes : abaPrincipal === "LIVRO" ? livros : abaPrincipal === "SERIE" ? series : abaPrincipal === "JOGO" ? jogos : musicas;
    if (campos.status || campos.capitulo_atual !== undefined) {
      const mangaAlterado = listaAtual.find(m => m.id === id);
      const perfilAtivo = perfis.find(p => p.nome_original === usuarioAtual);
      if (mangaAlterado && perfilAtivo?.anilist_token) {
        const progressoEnvio = campos.capitulo_atual !== undefined ? campos.capitulo_atual : mangaAlterado.capitulo_atual;
        const statusEnvio = campos.status || mangaAlterado.status;
        sincronizarComAniList(mangaAlterado.titulo, progressoEnvio, statusEnvio, perfilAtivo.anilist_token, "SALVAR", abaPrincipal);
      }
    }
  }

  async function deletarMangaDaEstante(id: number) {
    const tabelaDb = abaPrincipal === "MANGA" ? "mangas" : abaPrincipal === "ANIME" ? "animes" : abaPrincipal === "FILME" ? "filmes" : abaPrincipal === "LIVRO" ? "livros" : abaPrincipal === "SERIE" ? "series" : abaPrincipal === "JOGO" ? "jogos" : "musicas";
    if(confirm(`Remover da estante?`)) {
      await supabase.from(tabelaDb).delete().eq("id", id);
      if (abaPrincipal === "MANGA") buscarMangas();
      else if (abaPrincipal === "ANIME") buscarAnimes();
      else if (abaPrincipal === "FILME") buscarFilmes();
      else if (abaPrincipal === "LIVRO") buscarLivros();
      else if (abaPrincipal === "SERIE") buscarSeries();
      else if (abaPrincipal === "JOGO") buscarJogos();
      else buscarMusicas();
      mostrarToast("Obra removida.", "aviso");
    }
  }

  // ==========================================
  // 👥 [SESSÃO 9] - GESTÃO DE PERFIS (ADMIN)
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

  // ✅ [SESSÃO 9.1] - SISTEMA DE INVENTÁRIO (EQUIPAR)
  async function equiparCosmetico(item: any) {
    // SEPARAÇÃO: Se for 'vfx', vai pro slot vfx. Se for 'particula', vai pro slot particula.
    // Assim, um não desequipa o outro!
    const nEquip: Record<string, string> = { 
      ...equipados, 
      [item.tipo]: equipados[item.tipo] === item.id ? "" : item.id
    };

    const { error } = await supabase.from("perfis").update({ 
      cosmeticos: { 
        comprados: inventario, 
        ativos: nEquip 
      } 
    }).eq("nome_original", usuarioAtual);
    
    if (!error) {
      setEquipados(nEquip);
      // ✅ Dispara o sinal global para o GlobalVFXManager atualizar sem refresh
      window.dispatchEvent(new Event("hunter_cosmeticos_update"));
      mostrarToast(`${item.nome} ${nEquip[item.tipo] ? 'Equipado' : 'Desequipado'}!`, "sucesso");
    } else {
      mostrarToast("Erro ao equipar item.", "erro");
    }
  }

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
  // 🔑 [SESSÃO 10] - LOGIN E SEGURANÇA (PIN)
  // ==========================================
  async function confirmarPin() {
    if (!perfilAlvoParaBloqueio) return;

    // ✅ VALIDAÇÃO BLINDADA DO ADMIN VIA BACKEND
    if (perfilAlvoParaBloqueio === "Admin") {
      const { data: adminDb } = await supabase
        .from("perfis")
        .select("pin")
        .eq("nome_original", "Admin")
        .maybeSingle();

      // Se o Admin tiver um PIN personalizado salvo no Supabase, usa ele.
      if (adminDb?.pin) {
        if (pinDigitado === adminDb.pin) {
          sessionStorage.setItem("hunter_ativo", "Admin");
          setUsuarioAtual("Admin"); setPerfilAlvoParaBloqueio(null);
          window.dispatchEvent(new CustomEvent("hunter_cosmeticos_update", { detail: { nome: "Admin" } }));
        } else {
          mostrarToast("Acesso Negado: PIN de Administrador Incorreto!", "erro");
        }
        return;
      }

      // Se NÃO tiver PIN no banco, vai perguntar pro Cofre do Servidor (.env)
      try {
        const res = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tipo: "admin_pin", senhaDigitada: pinDigitado })
        });
        const data = await res.json();

        if (data.autorizado) {
          sessionStorage.setItem("hunter_ativo", "Admin");
          setUsuarioAtual("Admin"); setPerfilAlvoParaBloqueio(null);
          window.dispatchEvent(new CustomEvent("hunter_cosmeticos_update", { detail: { nome: "Admin" } }));
        } else {
          mostrarToast("Acesso Negado: PIN de Administrador Incorreto!", "erro");
        }
      } catch {
        mostrarToast("Erro ao validar PIN no servidor.", "erro");
      }
      return;
    }

    // ✅ VALIDAÇÃO DE USUÁRIOS COMUNS (Continua igual, lê do Supabase)
    const { data: perfil } = await supabase
      .from("perfis")
      .select("pin")
      .eq("nome_original", perfilAlvoParaBloqueio)
      .single();

    if (perfil?.pin === pinDigitado) {
      sessionStorage.setItem("hunter_ativo", perfilAlvoParaBloqueio);
      setUsuarioAtual(perfilAlvoParaBloqueio); setPerfilAlvoParaBloqueio(null);
      window.dispatchEvent(new CustomEvent("hunter_cosmeticos_update", { detail: { nome: perfilAlvoParaBloqueio } }));
    } else {
      mostrarToast("PIN Incorreto!", "erro");
    }
  }

  function tentarMudarPerfil(nome: string) {
    const info = perfis.find(p => p.nome_original === nome);
    if (info?.pin || nome === "Admin") { setPerfilAlvoParaBloqueio(nome); setPinDigitado(""); } 
    else { 
      setUsuarioAtual(nome); 
      sessionStorage.setItem('hunter_ativo', nome); 
      window.dispatchEvent(new CustomEvent("hunter_cosmeticos_update", { detail: { nome } }));
    }
  }

  // ==========================================
  // 🖥️ [SESSÃO 11] - RENDERIZAÇÃO
  // ==========================================
  if (!mestreAutorizado) return <AcessoMestre aoAutorizar={() => setMestreAutorizado(true)} />;

  if (!usuarioAtual) return (
  <ProfileSelection 
    perfis={perfis} 
    lojaItens={lojaItens} 
    temas={TEMAS} 
    tentarMudarPerfil={tentarMudarPerfil} 
    perfilAlvoParaBloqueio={perfilAlvoParaBloqueio} 
    setPerfilAlvoParaBloqueio={setPerfilAlvoParaBloqueio} 
    pinDigitado={pinDigitado} 
    setPinDigitado={setPinDigitado} 
    confirmarPin={confirmarPin} 
    setPinAdminAberto={setPinAdminAberto} 
    pinAdminAberto={pinAdminAberto} 
  />
);

  if (isAdmin) return (
    <AdminPanel 
      perfis={perfis} config={config} setUsuarioAtual={setUsuarioAtual} 
      atualizarConfig={atualizarConfig} deletarPerfil={deletarPerfil} 
    />
  );

  const perfilAtivo = perfis.find(p => p.nome_original === usuarioAtual) || { nome_exibicao: usuarioAtual, avatar: "👤", cor_tema: "verde", custom_color: "#22c55e", cosmeticos: { ativos: {} } };
  const aura = perfilAtivo.cor_tema?.startsWith('#') ? TEMAS.custom : (TEMAS[perfilAtivo.cor_tema as keyof typeof TEMAS] || TEMAS.verde);
  const listaExibicao = abaPrincipal === "MANGA" ? mangas : abaPrincipal === "ANIME" ? animes : abaPrincipal === "FILME" ? filmes : abaPrincipal === "LIVRO" ? livros : abaPrincipal === "SERIE" ? series : abaPrincipal === "JOGO" ? jogos : musicas;
  const filtrosAtuais = (abaPrincipal === "MANGA" || abaPrincipal === "LIVRO") ? ["Todos", "Lendo", "Completos", "Planejo Ler", "Pausados", "Dropados"] : abaPrincipal === "JOGO" ? ["Todos", "Jogando", "Completos", "Planejo Jogar", "Pausados", "Dropados"] : abaPrincipal === "MUSICA" ? ["Todos", "Ouvindo", "Favoritas", "Playlist", "Pausados", "Dropados"] : ["Todos", "Assistindo", "Completos", "Planejo Assistir", "Pausados", "Dropados"];

  const obrasFiltradas = listaExibicao.filter(m => {
    if (filtroAtivo === "Todos") return true;
    if (abaPrincipal === "ANIME" || abaPrincipal === "FILME" || abaPrincipal === "SERIE") {
      if (filtroAtivo === "Assistindo") return m.status === "Lendo";
      if (filtroAtivo === "Planejo Assistir") return m.status === "Planejo Ler";
    }
    if (abaPrincipal === "JOGO") {
      if (filtroAtivo === "Jogando") return m.status === "Lendo";
      if (filtroAtivo === "Planejo Jogar") return m.status === "Planejo Ler";
    }
    if (abaPrincipal === "MUSICA") {
      if (filtroAtivo === "Ouvindo") return m.status === "Lendo";
    }
    return m.status === filtroAtivo;
  }).filter(m => m.titulo.toLowerCase().includes(pesquisaInterna.toLowerCase()));

  const molduraHeader = lojaItens.find(i => i.id === perfilAtivo.cosmeticos?.ativos?.moldura);

  return (
    <main className="min-h-screen bg-transparent p-6 md:p-12 text-white relative overflow-x-hidden" style={perfilAtivo.cor_tema?.startsWith('#') ? { '--aura': perfilAtivo.cor_tema } as any : {}}>
      
      {/* ✅ HEADER REESTILIZADO (COMMAND CENTER) */}
      <header className="flex flex-col md:flex-row justify-between items-center gap-6 mb-16 border-b border-zinc-800/50 pb-10 relative z-20">
        <div className="text-center md:text-left">
          <h1 className="text-5xl font-black italic tracking-tighter">Hunter<span className={aura.text}>.</span>Tracker</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-500 mt-2">Central de Operações Hunter</p>
        </div>

        <div className="flex items-center gap-4">
          
          {/* BOTÃO ADICIONAR (GRADIENTE & DESTAQUE) */}
          <button 
            onClick={() => setEstaAbertoAdd(true)} 
            className={`hidden md:flex items-center gap-3 px-8 py-3.5 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 hover:from-blue-600 hover:to-indigo-600 border border-blue-500/20 rounded-2xl group transition-all duration-500 shadow-lg hover:shadow-blue-500/20`}
          >
            <span className="text-blue-400 group-hover:text-white transition-colors text-lg font-light">+</span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Adicionar Obra</span>
          </button>

          {/* CAPSULA DE UTILITÁRIOS (GLASSMORPISM) */}
          <div className="flex items-center gap-1.5 bg-white/5 backdrop-blur-md border border-white/10 p-1.5 rounded-2xl">
            <button 
              onClick={toggleModoCinema} 
              className={`p-3 rounded-xl transition-all ${modoCinema ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:bg-white/10'}`} 
              title="Modo Cinema"
            >
              {modoCinema ? "📺" : "👓"}
            </button>
            
            {perfilAtivo.anilist_token && (abaPrincipal === "MANGA" || abaPrincipal === "ANIME") && (
              <button 
                onClick={puxarProgressoDoAniList} 
                disabled={sincronizando} 
                className={`p-3 text-zinc-500 hover:text-blue-400 hover:bg-white/10 rounded-xl transition-all ${sincronizando ? 'animate-spin' : ''}`}
                title="Sincronizar AniList"
              >
                🔄
              </button>
            )}

            <Link 
              href="/guilda" 
              className="p-3 text-zinc-500 hover:text-purple-400 hover:bg-white/10 rounded-xl transition-all" 
              title="A Guilda Global"
            >
              🌍
            </Link>
          </div>

          {/* HUB DO HUNTER INTEGRADO */}
          <div className="relative group">
            <div className="flex items-center gap-3 pl-2 pr-4 py-1.5 bg-zinc-900/40 hover:bg-zinc-800/60 border border-white/5 rounded-2xl transition-all duration-300 cursor-pointer shadow-lg">
              
              <Link href="/perfil" className="relative flex-shrink-0">
                <HunterAvatar 
                  avatarUrl={perfilAtivo.avatar} 
                  idMoldura={perfilAtivo.cosmeticos?.ativos?.moldura} 
                  imagemMolduraUrl={molduraHeader?.imagem_url}
                  tamanho="sm"
                  temaCor={perfilAtivo.custom_color}
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-zinc-950 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              </Link>

              <div className="hidden lg:flex flex-col text-left">
                <span className="text-[9px] font-black uppercase tracking-wider text-white/90 leading-none">
                  {perfilAtivo.nome_exibicao}
                </span>
                <span className="text-[7px] font-bold text-blue-500/80 uppercase tracking-widest mt-1">Status: Online</span>
              </div>

              <div className="w-px h-4 bg-white/10 mx-1 hidden sm:block" />
              
              <button 
                onClick={() => setEditandoCard(true)}
                className="p-1.5 text-zinc-600 group-hover:text-white group-hover:rotate-90 transition-all duration-500"
                title="Configurar Identidade"
              >
                ⚙️
              </button>
            </div>
          </div>
        </div>
      </header>

      <nav className="flex gap-4 md:gap-8 mb-10 border-b border-zinc-800/50 pb-4 overflow-x-auto relative z-20">
        {(["MANGA", "ANIME", "FILME", "SERIE", "LIVRO", "JOGO", "MUSICA"] as const).map(aba => (
          <button key={aba} onClick={() => { setAbaPrincipal(aba); setFiltroAtivo(aba === "ANIME" || aba === "FILME" || aba === "SERIE" ? "Assistindo" : aba === "JOGO" ? "Jogando" : aba === "MUSICA" ? "Ouvindo" : "Lendo"); }} className={`text-xl md:text-2xl font-black uppercase tracking-widest transition-all ${abaPrincipal === aba ? `${aura.text} drop-shadow-[0_0_15px_currentColor]` : "text-zinc-600 hover:text-white"}`}>{aba === "MANGA" ? "📚 Mangás" : aba === "ANIME" ? "📺 Animes" : aba === "FILME" ? "🎬 Filmes" : aba === "SERIE" ? "🍿 Séries" : aba === "LIVRO" ? "📖 Livros" : aba === "JOGO" ? "🎮 Jogos" : "🎵 Músicas"}</button>
        ))}
      </nav>

      <section className="mb-12 flex flex-col md:flex-row gap-6 items-center justify-between relative z-20">
        <div className="flex bg-zinc-900/50 p-1 rounded-2xl border border-zinc-800 overflow-x-auto">
          {filtrosAtuais.map(f => <button key={f} onClick={() => setFiltroAtivo(f)} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${filtroAtivo === f ? `${aura.bg} text-black` : 'text-zinc-500 hover:text-white'}`}>{f}</button>)}
        </div>
        <input type="text" placeholder="Pesquisar..." className="w-full md:w-80 bg-zinc-900 border border-zinc-800 p-4 rounded-2xl text-xs font-bold uppercase outline-none focus:border-white transition-all" value={pesquisaInterna} onChange={(e) => setPesquisaInterna(e.target.value)} />
      </section>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8 relative z-20">
        {obrasFiltradas.map(m => (
          <MangaCard key={m.id} manga={m} aura={aura} abaPrincipal={abaPrincipal} atualizarCapitulo={atualizarCapitulo} deletarManga={deletarMangaDaEstante} mudarStatusManual={(id, s) => atualizarDados(id, {status: s})} abrirDetalhes={setMangaDetalhe} />
        ))}
      </div>

      {modoCinema && (
        <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden">
          <div className="absolute inset-0 opacity-[0.04]" style={{ background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))', backgroundSize: '100% 4px, 3px 100%' }} />
          <div className="absolute inset-0 bg-orange-950/10 mix-blend-multiply" />
        </div>
      )}

      <AddMangaModal estaAberto={estaAbertoAdd} fechar={() => setEstaAbertoAdd(false)} usuarioAtual={usuarioAtual} abaPrincipal={abaPrincipal} aoSalvar={() => { buscarMangas(); buscarAnimes(); buscarFilmes(); buscarLivros(); buscarSeries(); buscarJogos(); buscarMusicas(); setEstaAbertoAdd(false); }} />
      
      {mangaDetalhe && (
        <MangaDetailsModal 
          manga={mangaDetalhe} abaPrincipal={abaPrincipal} aoFechar={() => setMangaDetalhe(null)} 
          aoAtualizarCapitulo={atualizarCapitulo} aoAtualizarDados={atualizarDados} 
          aoDeletar={(id) => { setMangaDetalhe(null); deletarMangaDaEstante(id); }} 
          aoTraduzir={() => window.open(`https://translate.google.com/?sl=auto&tl=pt&text=${encodeURIComponent(mangaDetalhe.sinopse)}`, '_blank')} 
        />
      )} 

      {editandoCard && perfilAtivo && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md">
          <div className="bg-[#0e0e11] border border-zinc-800 w-full max-w-md rounded-[2.5rem] p-8 flex flex-col gap-6 shadow-2xl animate-in zoom-in duration-300">
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-blue-500">Player Card Identity</h2>
            <div className="border border-white/5 rounded-2xl overflow-hidden scale-90 origin-center mb-2">
              <HunterCard perfil={perfilAtivo} customizacao={cardDados} />
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-500 ml-2">Banner URL (Fundo)</label>
                <input type="text" placeholder="https://exemplo.com/imagem.jpg" className="w-full bg-black border border-zinc-800 p-4 rounded-2xl text-xs outline-none focus:border-blue-500 transition-all mt-1" value={cardDados.banner_url} onChange={(e) => setCardDados({...cardDados, banner_url: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500 ml-2">Tag Texto</label>
                  <input type="text" className="w-full bg-black border border-zinc-800 p-4 rounded-2xl text-xs outline-none focus:border-blue-500 transition-all mt-1 text-center" value={cardDados.tag_texto} maxLength={8} onChange={(e) => setCardDados({...cardDados, tag_texto: e.target.value.toUpperCase()})} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500 ml-2">Tag Color</label>
                  <input type="color" className="w-full h-[50px] bg-black border border-zinc-800 p-2 rounded-2xl cursor-pointer mt-1" value={cardDados.tag_cor} onChange={(e) => setCardDados({...cardDados, tag_cor: e.target.value})} />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={salvarPlayerCard} className="flex-1 bg-blue-600 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-500 transition-all text-white shadow-lg shadow-blue-500/20">Salvar Card</button>
              <button onClick={() => setEditandoCard(false)} className="px-6 bg-zinc-900 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-zinc-800 transition-all text-zinc-400">Cancelar</button>
            </div>
          </div>
        </div>
      )}
      
      <div className="fixed bottom-10 right-10 z-[300] flex flex-col gap-3 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`flex items-center gap-4 px-6 py-4 rounded-2xl border backdrop-blur-md shadow-2xl animate-in slide-in-from-right-8 fade-in duration-300 ${t.tipo === "sucesso" ? "bg-green-500/10 border-green-500/50 text-green-400" : t.tipo === "erro" ? "bg-red-500/10 border-red-500/50 text-red-400" : t.tipo === "aviso" ? "bg-orange-500/10 border-orange-500/50 text-orange-400" : "bg-blue-500/10 border-blue-500/50 text-blue-400"}`}>
            <span className="text-2xl">{t.tipo === "sucesso" ? "✅" : t.tipo === "erro" ? "❌" : t.tipo === "aviso" ? "⚠️" : "🌐"}</span>
            <span className="text-[10px] font-black uppercase tracking-widest mt-1">{t.mensagem}</span>
          </div>
        ))}
      </div>
    </main>
  );
}