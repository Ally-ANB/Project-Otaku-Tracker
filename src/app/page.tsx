"use client";

// ==========================================
// 📦 [SESSÃO 1] - IMPORTAÇÕES E INTERFACES
// ==========================================
import { supabase } from "./supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import MangaDetailsModal from "@/components/ui/MangaDetailsModal";
import AdminPanel from "@/components/ui/AdminPanel";
import { useSenhaMestraInterativa } from "@/hooks/useSenhaMestraInterativa";
import { dbClient, requisicaoDbApi } from "@/lib/dbClient";
import ANBCalendarView from "@/components/ANBCalendarView";
import ANBHomeView from "@/components/ANBHomeView";
import ANBSidebar from "@/components/ANBSidebar";
import type { ObraComTipo } from "@/components/anbUtils";
import { AlertTriangle, CheckCircle2, Globe, LogOut, XCircle } from "lucide-react";
import type { AbaPrincipal, Manga } from "@/types/hunter_registry";
import { ESTANTE_ATUALIZADA_EVENT } from "@/lib/estanteEvents";
import { getApiUrl } from "@/utils/api";

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
  const router = useRouter();

  // ==========================================
  // 🔐 [SESSÃO 3] - ESTADOS GERAIS DO APP
  // ==========================================
  const [usuarioAtual, setUsuarioAtual] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState<string | null>(null);

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

  const [mangaDetalhe, setMangaDetalhe] = useState<Manga | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [config, setConfig] = useState({ mostrar_busca: true, mostrar_stats: true, mostrar_backup: true });
  const [modoCinema, setModoCinema] = useState(false);

  const [novoHunter, setNovoHunter] = useState({ nome: '', avatar: '👤', pin: '', cor: 'verde' });
  const [editandoNomeOriginal, setEditandoNomeOriginal] = useState<string | null>(null);
  const [mostrandoFormHunter, setMostrandoFormHunter] = useState(false);
  const { obterSenhaMestreInterativa, modalSenhaMestra } = useSenhaMestraInterativa();

  const [anbNavMode, setAnbNavMode] = useState<"HOME" | "ESTANTE">("HOME");
  const [viewAtiva, setViewAtiva] = useState<"home" | "calendar">("home");

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
  const isAccountAdmin = useMemo(() => {
    const expected = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.trim();
    if (!expected || !authEmail) return false;
    return authEmail.toLowerCase() === expected.toLowerCase();
  }, [authEmail]);

  useEffect(() => { 
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
    if (!usuarioAtual) return;
    const { data } = await supabase.from("mangas").select("*").eq("usuario", usuarioAtual).order("ultima_leitura", { ascending: false });
    if (data) setMangas(data as Manga[]);
  }

  async function buscarAnimes() {
    if (!usuarioAtual) return;
    const { data } = await supabase.from("animes").select("*").eq("usuario", usuarioAtual).order("ultima_leitura", { ascending: false });
    if (data) setAnimes(data as Manga[]);
  }

  async function buscarFilmes() {
    if (!usuarioAtual) return;
    const { data } = await supabase.from("filmes").select("*").eq("usuario", usuarioAtual).order("ultima_leitura", { ascending: false });
    if (data) setFilmes(data as Manga[]);
  }

  async function buscarLivros() {
    if (!usuarioAtual) return;
    const { data } = await supabase.from("livros").select("*").eq("usuario", usuarioAtual).order("ultima_leitura", { ascending: false });
    if (data) setLivros(data as Manga[]);
  }

  async function buscarSeries() {
    if (!usuarioAtual) return;
    const { data } = await supabase.from("series").select("*").eq("usuario", usuarioAtual).order("ultima_leitura", { ascending: false });
    if (data) setSeries(data as Manga[]);
  }

  async function buscarJogos() {
    if (!usuarioAtual) return;
    const { data } = await supabase.from("jogos").select("*").eq("usuario", usuarioAtual).order("ultima_leitura", { ascending: false });
    if (data) setJogos(data as Manga[]);
  }

  const buscarMusicas = useCallback(async () => {
    if (!usuarioAtual) return;
    const { data } = await supabase.from("musicas").select("*").eq("usuario", usuarioAtual).order("ultima_leitura", { ascending: false });
    if (data) setMusicas(data as Manga[]);
  }, [usuarioAtual]);

  useEffect(() => {
    const onEstanteAtualizada = () => {
      if (!usuarioAtual) return;
      void buscarMangas();
      void buscarAnimes();
      void buscarFilmes();
      void buscarLivros();
      void buscarSeries();
      void buscarJogos();
      void buscarMusicas();
    };
    window.addEventListener(ESTANTE_ATUALIZADA_EVENT, onEstanteAtualizada);
    return () => window.removeEventListener(ESTANTE_ATUALIZADA_EVENT, onEstanteAtualizada);
  }, [usuarioAtual, buscarMusicas]);

  async function buscarPerfis() {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    setAuthEmail(user?.email ?? null);

    const { data } = await supabase.from("perfis").select("*");
    if (!data) return;

    setPerfis(data);

    if (user?.id) {
      const meus = data.filter(
        (p: { user_id?: string | null }) => p.user_id === user.id
      );
      if (meus.length > 0) {
        const saved = sessionStorage.getItem("hunter_ativo");
        const validSaved =
          saved && meus.some((m) => m.nome_original === saved);
        const pick =
          validSaved && saved
            ? saved
            : meus.find((m) => m.nome_original)?.nome_original ?? null;
        if (pick) {
          setUsuarioAtual(pick);
          sessionStorage.setItem("hunter_ativo", pick);
        } else {
          setUsuarioAtual(null);
        }
      } else {
        setUsuarioAtual(null);
      }
    } else {
      setUsuarioAtual(null);
    }
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
      const res = await fetch(getApiUrl('/api/anilist/sync'), {
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
      const res = await fetch(getApiUrl('/api/anilist/sync'), {
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
  // 🖥️ [SESSÃO 11] - RENDERIZAÇÃO
  // ==========================================
  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent px-6 text-zinc-500">
        <div className="rounded-[2rem] border border-white/10 bg-zinc-950/50 px-12 py-10 text-center backdrop-blur-xl">
          <p className="text-[10px] font-black uppercase tracking-[0.35em]">
            Carregando estante
          </p>
        </div>
      </div>
    );
  }

  if (isAccountAdmin) {
    return (
      <>
        <AdminPanel
          perfis={perfis}
          config={config}
          atualizarConfig={atualizarConfig}
          deletarPerfil={deletarPerfil}
          solicitarSenhaMestre={obterSenhaMestreInterativa}
        />
        {modalSenhaMestra}
      </>
    );
  }

  if (!usuarioAtual) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent px-6">
        <div className="max-w-md rounded-[2rem] border border-white/10 bg-zinc-950/45 p-10 text-center shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset] backdrop-blur-xl">
          <p className="text-sm font-bold text-zinc-200">
            Nenhum perfil Hunter está vinculado à sua conta.
          </p>
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Crie ou associe um perfil na área de configuração.
          </p>
          <Link
            href="/perfil"
            className="mt-8 inline-block rounded-2xl border border-cyan-500/35 bg-cyan-500/10 px-8 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200 transition hover:border-cyan-400/50 hover:bg-cyan-500/15"
          >
            Ir para perfil
          </Link>
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              localStorage.clear();
              router.push("/login");
              router.refresh();
            }}
            className="mt-4 flex w-full items-center justify-center gap-2 text-sm text-white/50 transition-colors hover:text-white"
          >
            <LogOut className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden />
            Encerrar Sessão
          </button>
        </div>
      </div>
    );
  }

  const perfilAtivo = perfis.find(p => p.nome_original === usuarioAtual) || { nome_exibicao: usuarioAtual, avatar: "👤", cor_tema: "verde", custom_color: "#22c55e", cosmeticos: { ativos: {} } };
  const aura = perfilAtivo.cor_tema?.startsWith('#') ? TEMAS.custom : (TEMAS[perfilAtivo.cor_tema as keyof typeof TEMAS] || TEMAS.verde);
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
  const handleEstanteNav = (aba: AbaPrincipal) => {
    setViewAtiva("home");
    setAnbNavMode("ESTANTE");
    setAbaPrincipal(aba);
  };

  const handleAbrirObraAnb = (obra: ObraComTipo) => {
    const { tipoObra, ...rest } = obra;
    setAbaPrincipal(tipoObra);
    setMangaDetalhe(rest as Manga);
  };

  return (
    <main
      className="relative flex min-h-screen gap-2 overflow-x-visible bg-transparent p-3 text-white sm:gap-3 sm:p-4 md:gap-4 md:p-6"
      style={perfilAtivo.cor_tema?.startsWith("#") ? ({ "--aura": perfilAtivo.cor_tema } as Record<string, string>) : undefined}
    >
      <ANBSidebar
        navMode={anbNavMode}
        abaPrincipal={abaPrincipal}
        activeView={viewAtiva}
        onViewChange={setViewAtiva}
        onHome={() => setAnbNavMode("HOME")}
        onEstante={handleEstanteNav}
        modoCinema={modoCinema}
        onToggleCinema={toggleModoCinema}
        anilistDisponivel={
          Boolean(perfilAtivo.anilist_token) &&
          (abaPrincipal === "MANGA" || abaPrincipal === "ANIME")
        }
        sincronizando={sincronizando}
        onSyncAnilist={puxarProgressoDoAniList}
      />

      <div className="relative z-20 flex min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-x-hidden">
        <header className="shrink-0 border-b border-zinc-800/40 pb-4">
          <h1 className="text-2xl font-black italic tracking-tighter md:text-4xl">
            Hunter<span className={aura.text}>.</span>Tracker
          </h1>
          <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.35em] text-zinc-500">
            Projeto da Estante · ANB
          </p>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {viewAtiva === "home" ? (
            <ANBHomeView
              navMode={anbNavMode}
              abaFiltro={anbNavMode === "HOME" ? null : abaPrincipal}
              mangas={mangas}
              animes={animes}
              filmes={filmes}
              series={series}
              jogos={jogos}
              musicas={musicas}
              livros={livros}
              aura={aura}
              onAbrirObra={handleAbrirObraAnb}
              atualizarCapitulo={atualizarCapitulo}
              deletarManga={deletarMangaDaEstante}
              mudarStatusManual={(id, s) => atualizarDados(id, { status: s })}
            />
          ) : (
            <ANBCalendarView />
          )}
        </div>
      </div>

      {modoCinema && (
        <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden">
          <div className="absolute inset-0 opacity-[0.04]" style={{ background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))', backgroundSize: '100% 4px, 3px 100%' }} />
          <div className="absolute inset-0 bg-orange-950/10 mix-blend-multiply" />
        </div>
      )}

      {mangaDetalhe && (
        <MangaDetailsModal
          manga={mangaDetalhe}
          tabelaObra={tabelaObraAtual}
          abaPrincipal={abaPrincipal}
          podeEditarPrivilegiado
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
            {t.tipo === "sucesso" ? (
              <CheckCircle2 className="h-5 w-5 shrink-0" strokeWidth={2.25} aria-hidden />
            ) : t.tipo === "erro" ? (
              <XCircle className="h-5 w-5 shrink-0" strokeWidth={2.25} aria-hidden />
            ) : t.tipo === "aviso" ? (
              <AlertTriangle className="h-5 w-5 shrink-0" strokeWidth={2.25} aria-hidden />
            ) : (
              <Globe className="h-5 w-5 shrink-0" strokeWidth={2.25} aria-hidden />
            )}
            <span className="text-[10px] font-black uppercase tracking-widest mt-1">{t.mensagem}</span>
          </div>
        ))}
      </div>
    </main>
  );
}