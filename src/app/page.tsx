"use client";

// ==========================================
// 📦 [SESSÃO 1] - IMPORTAÇÕES E INTERFACES
// ==========================================
import AcessoMestre from "@/components/ui/AcessoMestre";
import { supabase } from "./supabase";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import MangaCard from "@/components/ui/MangaCard";
import AddMangaModal from "@/components/ui/AddMangaModal";
import MangaDetailsModal from "@/components/ui/MangaDetailsModal";
import AdminPanel from "@/components/ui/AdminPanel";
import ProfileSelection from "@/components/ui/ProfileSelection";
import { useSenhaMestraInterativa } from "@/hooks/useSenhaMestraInterativa";
import { dbClient, requisicaoDbApi } from "@/lib/dbClient";
// ✅ ADICIONADO: Componente de Identidade Universal e Player Card
import HunterAvatar from "@/components/ui/HunterAvatar";
import { BookOpen, Film, Tv, Gamepad2, Music, Book, Search } from "lucide-react";
import { OMNISEARCH_OPEN_EVENT } from "@/components/features/OmniSearch";
import type { Manga } from "@/types/hunter_registry";

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
  const { obterSenhaMestreInterativa, modalSenhaMestra } = useSenhaMestraInterativa();

  const [menuHubAberto, setMenuHubAberto] = useState(false);
  const menuHubRef = useRef<HTMLDivElement>(null);

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
    if (!menuHubAberto) return;
    const fechar = (e: MouseEvent) => {
      if (menuHubRef.current && !menuHubRef.current.contains(e.target as Node)) setMenuHubAberto(false);
    };
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, [menuHubAberto]);

  useEffect(() => {
    if (usuarioAtual) {
      setIsAdmin(usuarioAtual === "Admin");
      buscarMangas(); buscarAnimes(); buscarFilmes(); buscarLivros();
      buscarSeries(); buscarJogos(); buscarMusicas();
      
      // ✅ SINCRONIZA OS DADOS DO CARD E COSMÉTICOS AO MUDAR DE USUÁRIO
      const pAtivo = perfis.find(p => p.nome_original === usuarioAtual);
      if (pAtivo) {
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

  const buscarMusicas = useCallback(async () => {
    if (!usuarioAtual || usuarioAtual === "Admin") return;
    const { data } = await supabase.from("musicas").select("*").eq("usuario", usuarioAtual).order("ultima_leitura", { ascending: false });
    if (data) setMusicas(data as Manga[]);
  }, [usuarioAtual]);

  useEffect(() => {
    const onMusicUpdated = () => {
      void buscarMusicas();
    };
    window.addEventListener("music-updated", onMusicUpdated);
    return () => window.removeEventListener("music-updated", onMusicUpdated);
  }, [buscarMusicas]);

  async function buscarPerfis() {
    const { data } = await supabase.from("perfis").select("*");
    if (data) setPerfis(data);
  }

  async function requisicaoDbSegura(method: "POST" | "DELETE", payload: Record<string, any>, exigirSenhaMestre = true) {
    const senhaMestre = exigirSenhaMestre ? await obterSenhaMestreInterativa() : undefined;
    if (exigirSenhaMestre && !senhaMestre) return { ok: false, data: { error: "Operação cancelada." } };

    return requisicaoDbApi(method, {
      ...payload,
      ...(exigirSenhaMestre ? { senhaMestre } : {}),
    });
  }

  // ✅ FUNÇÃO PARA SALVAR O PLAYER CARD
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

    const resultado = await requisicaoDbSegura("POST", {
      tabela: tabelaDb,
      id: manga.id,
      dados: { capitulo_atual: novo, status: novoStatus, ultima_leitura: agora }
    });
    if (!resultado.ok) {
      mostrarToast(resultado.data?.error || "Erro ao salvar na base de dados.", "erro");
      return;
    }
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

    const resultado = await requisicaoDbSegura("POST", {
      tabela: tabelaDb,
      id,
      dados: dadosAtualizados
    });
    if (!resultado.ok) {
      mostrarToast(resultado.data?.error || "Erro ao salvar configuração.", "erro");
      return;
    }
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

  function refletirMangaNoEstado(id: number, campos: Partial<Manga>) {
    const setLista =
      abaPrincipal === "MANGA"
        ? setMangas
        : abaPrincipal === "ANIME"
          ? setAnimes
          : abaPrincipal === "FILME"
            ? setFilmes
            : abaPrincipal === "LIVRO"
              ? setLivros
              : abaPrincipal === "SERIE"
                ? setSeries
                : abaPrincipal === "JOGO"
                  ? setJogos
                  : setMusicas;
    setLista((prev: Manga[]) => prev.map((m) => (m.id === id ? { ...m, ...campos } : m)));
    setMangaDetalhe((prev) => (prev?.id === id ? { ...prev, ...campos } : prev));
  }

  async function deletarMangaDaEstante(id: number) {
    if (!confirm(`Remover da estante?`)) return;
    const tabela = abaPrincipal === "MANGA" ? "mangas" : abaPrincipal === "ANIME" ? "animes" : abaPrincipal === "FILME" ? "filmes" : abaPrincipal === "LIVRO" ? "livros" : abaPrincipal === "SERIE" ? "series" : abaPrincipal === "JOGO" ? "jogos" : "musicas";

    const executarRemocao = async (): Promise<boolean> => {
      const res = await dbClient.delete(tabela, id);
      if (res.success) return true;
      if ("precisaSenhaMestre" in res && res.precisaSenhaMestre) {
        const senha = await obterSenhaMestreInterativa();
        if (!senha) {
          mostrarToast("Operação cancelada.", "aviso");
          return false;
        }
        return executarRemocao();
      }
      mostrarToast(res.error || "Erro ao remover obra.", "erro");
      return false;
    };

    if (!(await executarRemocao())) return;

    if (abaPrincipal === "MANGA") buscarMangas();
    else if (abaPrincipal === "ANIME") buscarAnimes();
    else if (abaPrincipal === "FILME") buscarFilmes();
    else if (abaPrincipal === "LIVRO") buscarLivros();
    else if (abaPrincipal === "SERIE") buscarSeries();
    else if (abaPrincipal === "JOGO") buscarJogos();
    else buscarMusicas();
    mostrarToast("Obra removida.", "aviso");
  }

  // ==========================================
  // 👥 [SESSÃO 9] - GESTÃO DE PERFIS (ADMIN)
  // ==========================================
  async function salvarHunter() {
    if (!novoHunter.nome) return alert("Nome obrigatório!");
    const dados = { nome_exibicao: novoHunter.nome, avatar: novoHunter.avatar, pin: novoHunter.pin, cor_tema: novoHunter.cor };
    if (editandoNomeOriginal) {
      const resultado = await requisicaoDbSegura("POST", {
        tabela: "perfis",
        nome_original: editandoNomeOriginal,
        dados
      }, false);
      if (!resultado.ok) {
        mostrarToast(resultado.data?.error || "Erro ao salvar hunter.", "erro");
        return;
      }
    } else {
      const resultado = await requisicaoDbSegura("POST", {
        tabela: "perfis",
        operacao: "insert",
        dados: { ...dados, nome_original: novoHunter.nome }
      }, false);
      if (!resultado.ok) {
        mostrarToast(resultado.data?.error || "Erro ao criar hunter.", "erro");
        return;
      }
    }
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

    const resultado = await requisicaoDbSegura("POST", {
      tabela: "perfis",
      nome_original: usuarioAtual,
      dados: {
        cosmeticos: {
          comprados: inventario,
          ativos: nEquip
        }
      }
    }, false);

    if (resultado.ok) {
      setEquipados(nEquip);
      // ✅ Dispara o sinal global para o GlobalVFXManager atualizar sem refresh
      window.dispatchEvent(new Event("hunter_cosmeticos_update"));
      mostrarToast(`${item.nome} ${nEquip[item.tipo] ? 'Equipado' : 'Desequipado'}!`, "sucesso");
    } else {
      mostrarToast(resultado.data?.error || "Erro ao equipar item.", "erro");
    }
  }

  async function atualizarConfig(chave: string, valor: boolean) {
    setConfig(prev => ({ ...prev, [chave]: valor }));
    const resultado = await requisicaoDbSegura("POST", {
      tabela: "site_config",
      id: 1,
      dados: { [chave]: valor }
    });
    if (!resultado.ok) {
      mostrarToast(resultado.data?.error || "Erro ao salvar configuração do site.", "erro");
    }
  }

  async function deletarPerfil(perfil: any) {
    if (perfil.nome_original === "Admin") return alert("Impossível remover Admin.");
    if (confirm(`Remover Hunter "${perfil.nome_exibicao}"?`)) {
      const resultado = await requisicaoDbSegura("DELETE", {
        tabela: "perfis",
        nome_original: perfil.nome_original
      }, false);
      if (!resultado.ok) {
        mostrarToast(resultado.data?.error || "Erro ao remover perfil.", "erro");
        return;
      }
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
        const res = await fetch("/api/auth/anilist", {
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
    <>
      <AdminPanel
        perfis={perfis}
        config={config}
        setUsuarioAtual={setUsuarioAtual}
        atualizarConfig={atualizarConfig}
        deletarPerfil={deletarPerfil}
        solicitarSenhaMestre={obterSenhaMestreInterativa}
      />
      {modalSenhaMestra}
    </>
  );

  const perfilAtivo = perfis.find(p => p.nome_original === usuarioAtual) || { nome_exibicao: usuarioAtual, avatar: "👤", cor_tema: "verde", custom_color: "#22c55e", cosmeticos: { ativos: {} } };
  const aura = perfilAtivo.cor_tema?.startsWith('#') ? TEMAS.custom : (TEMAS[perfilAtivo.cor_tema as keyof typeof TEMAS] || TEMAS.verde);
  const listaExibicao = abaPrincipal === "MANGA" ? mangas : abaPrincipal === "ANIME" ? animes : abaPrincipal === "FILME" ? filmes : abaPrincipal === "LIVRO" ? livros : abaPrincipal === "SERIE" ? series : abaPrincipal === "JOGO" ? jogos : musicas;
  const tabelaObraAtual =
    abaPrincipal === "MANGA"
      ? "mangas"
      : abaPrincipal === "ANIME"
        ? "animes"
        : abaPrincipal === "FILME"
          ? "filmes"
          : abaPrincipal === "LIVRO"
            ? "livros"
            : abaPrincipal === "SERIE"
              ? "series"
              : abaPrincipal === "JOGO"
                ? "jogos"
                : "musicas";
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
          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(new CustomEvent(OMNISEARCH_OPEN_EVENT))
            }
            className="group flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2.5 shadow-[0_8px_40px_rgba(0,0,0,0.35)] ring-1 ring-emerald-500/10 backdrop-blur-xl transition-all hover:border-emerald-500/25 hover:bg-white/[0.1] hover:shadow-[0_12px_48px_rgba(34,197,94,0.08)] sm:gap-3 sm:px-4 sm:py-3"
            title="Abrir busca global (/)"
          >
            <Search
              className="h-4 w-4 shrink-0 text-emerald-400/90 group-hover:text-emerald-300"
              strokeWidth={2.25}
              aria-hidden
            />
            <span className="text-[10px] font-black uppercase tracking-[0.12em] text-zinc-200">
              <span className="hidden sm:inline">Pesquisar na Estante</span>
              <span className="sm:hidden">Busca</span>
            </span>
            <kbd className="pointer-events-none rounded-md border border-emerald-500/20 bg-zinc-950/55 px-2 py-1 font-mono text-[10px] font-semibold tabular-nums text-emerald-400/95 shadow-inner">
              /
            </kbd>
          </button>

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
              
              <div className="relative" ref={menuHubRef}>
                <button
                  type="button"
                  onClick={() => setMenuHubAberto((v) => !v)}
                  className="p-1.5 text-zinc-600 group-hover:text-white group-hover:rotate-90 transition-all duration-500"
                  title="Menu"
                  aria-expanded={menuHubAberto}
                >
                  ⚙️
                </button>
                {menuHubAberto && (
                  <div className="absolute right-0 top-full mt-2 z-[400] min-w-[210px] rounded-2xl border border-cyan-500/25 bg-zinc-950/98 backdrop-blur-md shadow-[0_0_28px_rgba(34,211,238,0.18)] py-1 overflow-hidden pointer-events-auto">
                    <Link
                      href="/perfil?aba=config"
                      className="block px-4 py-3 text-[9px] font-black uppercase tracking-widest text-zinc-300 hover:bg-cyan-500/10 hover:text-cyan-300 transition-colors"
                      onClick={() => setMenuHubAberto(false)}
                    >
                      Configurações
                    </Link>
                    <button
                      type="button"
                      className="w-full text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition-colors border-t border-white/5"
                      onClick={() => {
                        sessionStorage.removeItem("hunter_ativo");
                        window.location.href = "/";
                      }}
                    >
                      Encerrar Sessão
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <nav className="flex gap-3 md:gap-4 mb-10 border-b border-zinc-800/50 pb-4 overflow-x-auto relative z-20">
        {(
          [
            { id: "MANGA" as const, label: "Mangás", Icon: BookOpen },
            { id: "ANIME" as const, label: "Animes", Icon: Tv },
            { id: "FILME" as const, label: "Filmes", Icon: Film },
            { id: "SERIE" as const, label: "Séries", Icon: Tv },
            { id: "LIVRO" as const, label: "Livros", Icon: Book },
            { id: "JOGO" as const, label: "Jogos", Icon: Gamepad2 },
            { id: "MUSICA" as const, label: "Músicas", Icon: Music },
          ] as const
        ).map(({ id: aba, label, Icon }) => (
          <button
            key={aba}
            type="button"
            onClick={() => {
              setAbaPrincipal(aba);
              setFiltroAtivo(
                aba === "ANIME" || aba === "FILME" || aba === "SERIE"
                  ? "Assistindo"
                  : aba === "JOGO"
                    ? "Jogando"
                    : aba === "MUSICA"
                      ? "Ouvindo"
                      : "Lendo"
              );
            }}
            className={`flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-2.5 text-[10px] md:text-xs font-black uppercase tracking-widest transition-all duration-300 ${
              abaPrincipal === aba
                ? "border-cyan-400 bg-zinc-950/95 text-cyan-200 shadow-[0_0_22px_rgba(34,211,238,0.45)]"
                : "border-zinc-800 bg-zinc-950/70 text-zinc-500 hover:border-cyan-500/55 hover:text-cyan-100 hover:shadow-[0_0_18px_rgba(34,211,238,0.28)]"
            }`}
          >
            <Icon className={`h-4 w-4 md:h-5 md:w-5 ${abaPrincipal === aba ? "text-cyan-300" : ""}`} strokeWidth={2.25} />
            {label}
          </button>
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

      <AddMangaModal
        estaAberto={estaAbertoAdd}
        fechar={() => setEstaAbertoAdd(false)}
        usuarioAtual={usuarioAtual}
        abaPrincipal={abaPrincipal}
        solicitarSenhaMestre={obterSenhaMestreInterativa}
        mostrarFeedback={mostrarToast}
        anilistToken={perfis.find((p) => p.nome_original === usuarioAtual)?.anilist_token ?? null}
        aoSalvar={() => { buscarMangas(); buscarAnimes(); buscarFilmes(); buscarLivros(); buscarSeries(); buscarJogos(); buscarMusicas(); setEstaAbertoAdd(false); }}
      />
      
      {mangaDetalhe && (
        <MangaDetailsModal
          manga={mangaDetalhe}
          tabelaObra={tabelaObraAtual}
          abaPrincipal={abaPrincipal}
          podeEditarPrivilegiado={mestreAutorizado || isAdmin}
          solicitarSenhaMestre={obterSenhaMestreInterativa}
          aoFechar={() => setMangaDetalhe(null)}
          aoAtualizarCapitulo={atualizarCapitulo}
          aoAtualizarDados={atualizarDados}
          aoDeletar={(id) => {
            setMangaDetalhe(null);
            deletarMangaDaEstante(id);
          }}
          aoTraduzir={() =>
            window.open(
              `https://translate.google.com/?sl=auto&tl=pt&text=${encodeURIComponent(mangaDetalhe.sinopse)}`,
              "_blank"
            )
          }
          aoEdicaoSalva={(campos) => {
            if (!mangaDetalhe) return;
            refletirMangaNoEstado(mangaDetalhe.id, campos);
            const perfilAtivo = perfis.find((p) => p.nome_original === usuarioAtual);
            if (
              perfilAtivo?.anilist_token &&
              (abaPrincipal === "MANGA" || abaPrincipal === "ANIME")
            ) {
              sincronizarComAniList(
                mangaDetalhe.titulo,
                campos.capitulo_atual ?? mangaDetalhe.capitulo_atual,
                campos.status ?? mangaDetalhe.status,
                perfilAtivo.anilist_token,
                "SALVAR",
                abaPrincipal
              );
            }
          }}
          mostrarFeedback={mostrarToast}
        />
      )} 

      {modalSenhaMestra}

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