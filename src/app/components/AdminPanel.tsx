"use client";
import { useState, useEffect } from "react";
import { supabase } from "../supabase";

interface AdminPanelProps {
  perfis: any[];
  config: any;
  setUsuarioAtual: (v: string | null) => void;
  atualizarConfig: (k: string, v: boolean) => void;
  deletarPerfil: (p: any) => void;
}

// ✅ PRESETS DE AURAS MÁGICAS PARA OS TÍTULOS (Injetam CSS direto no banco)
const TITULO_PRESETS = [
  { id: "fogo_infernal", nome: "🔥 Fogo Infernal", classes: "bg-gradient-to-r from-red-600 to-yellow-500 text-transparent bg-clip-text animate-pulse drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" },
  { id: "ouro_divino", nome: "👑 Ouro Divino", classes: "bg-gradient-to-r from-yellow-300 via-yellow-500 to-yellow-700 text-transparent bg-clip-text drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]" },
  { id: "cyber_glitch", nome: "👾 Cyber Glitch", classes: "bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-transparent bg-clip-text animate-pulse" },
  { id: "abismo_galatico", nome: "🌌 Abismo Galático", classes: "bg-gradient-to-r from-indigo-900 via-purple-900 to-black text-transparent bg-clip-text drop-shadow-[0_0_15px_rgba(88,28,135,0.8)]" },
  { id: "aura_toxica", nome: "☠️ Aura Tóxica", classes: "bg-gradient-to-r from-green-400 to-green-700 text-transparent bg-clip-text drop-shadow-[0_0_12px_rgba(74,222,128,0.8)]" },
  { id: "fantasma", nome: "👻 Espectral", classes: "text-zinc-300 opacity-80 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" },
  { id: "carmesim", nome: "🩸 Carmesim Vampírico", classes: "text-red-700 drop-shadow-[0_0_12px_rgba(153,27,27,0.9)]" }
];

export default function AdminPanel({ perfis, config, setUsuarioAtual, atualizarConfig, deletarPerfil }: AdminPanelProps) {
  const [abaAtiva, setAbaAtiva] = useState("GUILDA");
  const [localPerfis, setLocalPerfis] = useState<any[]>([]);
  const [usuarioEditando, setUsuarioEditando] = useState<any | null>(null);
  const [formEdit, setFormEdit] = useState({ nome_exibicao: "", avatar: "", pin: "", cor_tema: "", esmolas: 0 });
  const [carregandoAcao, setCarregandoAcao] = useState(false);

  // ==========================================
  // 🛒 ESTADOS DA LOJA DE COSMÉTICOS
  // ==========================================
  const [lojaItens, setLojaItens] = useState<any[]>([]);
  const [itemLojaEditando, setItemLojaEditando] = useState<any | null>(null);
  const [formLoja, setFormLoja] = useState({ id: "", nome: "", tipo: "moldura", preco: 0, icone: "", imagem_url: "", desc_texto: "" });
  const [fazendoUploadLoja, setFazendoUploadLoja] = useState(false);
  const [isNovoItem, setIsNovoItem] = useState(false);

  // Sincroniza os perfis que vêm do banco
  useEffect(() => { setLocalPerfis(perfis); }, [perfis]);

  // Carrega os itens da loja ao abrir a aba LOJA
  useEffect(() => {
    if (abaAtiva === "LOJA") {
      carregarLojaItens();
    }
  }, [abaAtiva]);

  // ==========================================
  // 🛠️ FUNÇÕES DA GUILDA (GERENCIAMENTO)
  // ==========================================
  function abrirEdicao(perfil: any) {
    setUsuarioEditando(perfil);
    setFormEdit({
      nome_exibicao: perfil.nome_exibicao || perfil.nome_original,
      avatar: perfil.avatar || "👤",
      pin: perfil.pin || "",
      cor_tema: perfil.cor_tema || "azul",
      esmolas: perfil.esmolas || 0
    });
  }

  async function salvarEdicao() {
    if (!usuarioEditando) return;
    setCarregandoAcao(true);
    try {
      const { error } = await supabase.from("perfis").update({
        nome_exibicao: formEdit.nome_exibicao,
        avatar: formEdit.avatar,
        pin: formEdit.pin,
        cor_tema: formEdit.cor_tema,
        esmolas: formEdit.esmolas
      }).eq("nome_original", usuarioEditando.nome_original);
      
      if (error) throw error;
      
      // Atualiza a lista local na hora para não precisar recarregar a página
      setLocalPerfis(prev => prev.map(p => p.nome_original === usuarioEditando.nome_original ? { ...p, ...formEdit } : p));
      setUsuarioEditando(null);
      alert("✅ Caçador atualizado com sucesso!");
    } catch (err: any) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      setCarregandoAcao(false);
    }
  }

  async function criarNovoUsuario() {
    const nomeOriginal = prompt("Digite o Nome ÚNICO do novo usuário (usado para login):");
    if (!nomeOriginal) return;
    if (localPerfis.find(p => p.nome_original.toLowerCase() === nomeOriginal.toLowerCase())) {
      return alert("❌ Já existe um usuário com esse nome de login!");
    }

    setCarregandoAcao(true);
    try {
      const { data, error } = await supabase.from("perfis").insert([{ 
        nome_original: nomeOriginal, 
        nome_exibicao: nomeOriginal, 
        avatar: "👤", 
        cor_tema: "azul",
        esmolas: 0 
      }]).select().single();
      
      if (error) throw error;
      setLocalPerfis(prev => [...prev, data]);
      alert("🎉 Novo Caçador recrutado com sucesso!");
    } catch (err: any) {
      alert("Erro ao criar: " + err.message);
    } finally {
      setCarregandoAcao(false);
    }
  }

  // ==========================================
  // 🛒 FUNÇÕES DA LOJA (GERENCIAMENTO DE ITENS)
  // ==========================================
  async function carregarLojaItens() {
    setCarregandoAcao(true);
    try {
      const { data, error } = await supabase.from("loja_itens").select("*").order("tipo", { ascending: true });
      if (error) throw error;
      setLojaItens(data || []);
    } catch (err: any) {
      alert("Erro ao carregar loja: " + err.message);
    } finally {
      setCarregandoAcao(false);
    }
  }

  function abrirEdicaoLoja(item: any = null) {
    if (item) {
      setIsNovoItem(false);
      setItemLojaEditando(item);
      setFormLoja({
        id: item.id,
        nome: item.nome,
        tipo: item.tipo,
        preco: item.preco,
        icone: item.icone || "",
        imagem_url: item.imagem_url || "",
        desc_texto: item.desc_texto || ""
      });
    } else {
      setIsNovoItem(true);
      setItemLojaEditando({ id: "novo" });
      setFormLoja({ id: "", nome: "", tipo: "moldura", preco: 0, icone: "🎁", imagem_url: "", desc_texto: "" });
    }
  }

  async function salvarItemLoja() {
    if (!formLoja.id || !formLoja.nome || formLoja.preco < 0) {
      return alert("Preencha ID, Nome e Preço corretamente!");
    }

    setCarregandoAcao(true);
    try {
      if (isNovoItem) {
        const { error } = await supabase.from("loja_itens").insert([formLoja]);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("loja_itens").update({
          nome: formLoja.nome,
          tipo: formLoja.tipo,
          preco: formLoja.preco,
          icone: formLoja.icone,
          imagem_url: formLoja.imagem_url,
          desc_texto: formLoja.desc_texto
        }).eq("id", formLoja.id);
        if (error) throw error;
      }
      
      alert(isNovoItem ? "✅ Item criado com sucesso!" : "✅ Item atualizado!");
      setItemLojaEditando(null);
      carregarLojaItens();
    } catch (err: any) {
      alert("Erro ao salvar item: " + err.message);
    } finally {
      setCarregandoAcao(false);
    }
  }

  async function excluirItemLoja(id: string) {
    if (!confirm("Tem certeza que deseja apagar este item da loja para sempre?")) return;
    setCarregandoAcao(true);
    try {
      const { error } = await supabase.from("loja_itens").delete().eq("id", id);
      if (error) throw error;
      alert("🗑️ Item apagado.");
      carregarLojaItens();
    } catch (err: any) {
      alert("Erro ao apagar: " + err.message);
    } finally {
      setCarregandoAcao(false);
    }
  }

  async function uploadImagemLoja(event: any) {
    try {
      setFazendoUploadLoja(true);
      const file = event.target.files[0];
      if (!file) throw new Error("Nenhum arquivo selecionado.");

      const fileExt = file.name.split('.').pop();
      const fileName = `item-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      // ⚠️ ASSUMIMOS QUE EXISTE UM BUCKET 'cosmeticos'. SE NÃO EXISTIR, MUDE AQUI PARA 'avatars'
      const { error: uploadError } = await supabase.storage.from('cosmeticos').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('cosmeticos').getPublicUrl(filePath);
      
      setFormLoja({ ...formLoja, imagem_url: data.publicUrl });
      alert("✅ Arquivo enviado! Salve o item para confirmar.");
    } catch (error: any) {
      alert("❌ Erro no upload: " + error.message);
    } finally {
      setFazendoUploadLoja(false);
    }
  }

  // ==========================================
  // ⚡ FERRAMENTAS DIVINAS
  // ==========================================
  async function limparCachePesquisa() {
    if (!confirm("⚠️ Tem certeza? Isso vai apagar o histórico de buscas otimizadas pela IA. O sistema vai recriar o cache aos poucos.")) return;
    setCarregandoAcao(true);
    await supabase.from("search_cache").delete().neq("termo_original", "x"); // Apaga tudo
    alert("🧹 Cache de pesquisa purificado com sucesso!");
    setCarregandoAcao(false);
  }

  async function darEsmolasParaTodos() {
    const quantia = parseInt(prompt("Quantas Esmolas deseja dar para TODOS os usuários da guilda?") || "0");
    if (!quantia || quantia <= 0) return;
    
    if (!confirm(`Distribuir ${quantia} esmolas para cada caçador?`)) return;
    setCarregandoAcao(true);
    
    try {
      for (const p of localPerfis) {
        if (p.nome_original === "Admin") continue; // Admin não precisa de esmolas
        await supabase.from("perfis").update({ esmolas: (p.esmolas || 0) + quantia }).eq("nome_original", p.nome_original);
      }
      setLocalPerfis(prev => prev.map(p => p.nome_original === "Admin" ? p : { ...p, esmolas: (p.esmolas || 0) + quantia }));
      alert(`🌧️ Chuva de ${quantia} Esmolas realizada com sucesso!`);
    } catch (err) {
      alert("Erro durante a chuva de esmolas.");
    } finally {
      setCarregandoAcao(false);
    }
  }

  // ==========================================
  // 🖥️ RENDERIZAÇÃO DO PAINEL
  // ==========================================
  return (
    <main className="min-h-screen bg-[#040405] p-6 md:p-12 text-white font-sans relative overflow-x-hidden">
      
      {/* CABEÇALHO */}
      <header className="flex justify-between items-center mb-12 border-b border-yellow-500/20 pb-8">
        <div>
          <h1 className="text-4xl font-black text-white italic tracking-tighter flex items-center gap-3">
            <span className="text-yellow-500">👑</span> Painel S+
          </h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-yellow-500/60 mt-2">Controle Absoluto do Sistema</p>
        </div>
        <button onClick={() => { sessionStorage.removeItem("hunter_ativo"); setUsuarioAtual(null); }} className="px-6 py-3 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)]">
          Desconectar
        </button>
      </header>

      {/* ABAS DO PAINEL */}
      <div className="flex flex-wrap gap-4 mb-10">
        {["GUILDA", "LOJA", "SISTEMA", "FERRAMENTAS"].map(aba => (
          <button 
            key={aba} onClick={() => setAbaAtiva(aba)} 
            className={`px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all border ${abaAtiva === aba ? 'bg-yellow-500 text-black border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.3)]' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-600'}`}
          >
            {aba === "GUILDA" ? "👥 A Guilda" : aba === "LOJA" ? "🛒 Loja S+" : aba === "SISTEMA" ? "⚙️ Sistema" : "⚡ Ferramentas"}
          </button>
        ))}
      </div>

      {/* ==============================================
          ABA: GUILDA (GERENCIAMENTO DE USUÁRIOS)
      ================================================ */}
      {abaAtiva === "GUILDA" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex justify-between items-center mb-6">
            <p className="text-xs font-black text-zinc-500 uppercase tracking-widest">Caçadores Registrados ({localPerfis.length})</p>
            <button onClick={criarNovoUsuario} disabled={carregandoAcao} className="px-6 py-3 bg-green-500/10 border border-green-500/50 text-green-500 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-green-500 hover:text-black transition-all">
              + Recrutar Novo
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {localPerfis.map(p => (
              <div key={p.id} className={`bg-zinc-900/40 p-6 rounded-3xl border flex flex-col gap-4 relative overflow-hidden transition-all hover:border-yellow-500/50 ${p.nome_original === "Admin" ? 'border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.05)]' : 'border-zinc-800'}`}>
                
                {p.nome_original === "Admin" && <div className="absolute top-0 right-0 bg-yellow-500 text-black text-[8px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest">Mestre</div>}

                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-black rounded-2xl overflow-hidden border border-zinc-700 flex items-center justify-center text-2xl">
                    {p.avatar?.startsWith('http') ? <img src={p.avatar} className="w-full h-full object-cover" /> : p.avatar}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-black text-white uppercase truncate">{p.nome_exibicao}</p>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-widest">Login: {p.nome_original}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-black/50 p-3 rounded-xl border border-white/5 mt-2">
                  <div className="text-center">
                    <p className="text-[8px] text-zinc-500 uppercase font-black">PIN</p>
                    <p className="text-xs font-bold text-white tracking-widest">{p.nome_original === "Admin" ? "🔒 .ENV" : (p.pin || "N/A")}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[8px] text-yellow-500 uppercase font-black">Esmolas</p>
                    <p className="text-xs font-bold text-yellow-500">{p.esmolas || 0}</p>
                  </div>
                </div>

                {p.nome_original !== "Admin" && (
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => abrirEdicao(p)} className="flex-1 py-3 bg-zinc-800 text-zinc-300 rounded-xl text-[9px] font-black uppercase hover:bg-white hover:text-black transition-all">Editar Tudo</button>
                    <button onClick={() => deletarPerfil(p)} className="px-4 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-[9px] font-black uppercase hover:bg-red-500 hover:text-white transition-all">X</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==============================================
          ABA: LOJA S+ (GERENCIAMENTO DE COSMÉTICOS)
      ================================================ */}
      {abaAtiva === "LOJA" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex justify-between items-center mb-6">
            <p className="text-xs font-black text-zinc-500 uppercase tracking-widest">Itens à Venda ({lojaItens.length})</p>
            <button onClick={() => abrirEdicaoLoja()} disabled={carregandoAcao} className="px-6 py-3 bg-purple-500/10 border border-purple-500/50 text-purple-400 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-purple-500 hover:text-white transition-all">
              + Novo Cosmético
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {lojaItens.map(item => (
              <div key={item.id} className="bg-zinc-900/40 p-5 rounded-3xl border border-zinc-800 flex flex-col gap-3 relative">
                
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 bg-black rounded-xl border border-white/5 flex items-center justify-center text-2xl overflow-hidden">
                    {item.imagem_url && !item.imagem_url.includes('.mp4') && !item.imagem_url.includes('.webm') && item.tipo !== 'titulo' ? (
                      <img src={item.imagem_url} className="w-full h-full object-contain" alt="item" />
                    ) : (
                      <span>{item.icone}</span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-yellow-500 font-black">{item.preco} 🪙</p>
                    <p className="text-[8px] text-zinc-500 uppercase font-bold bg-black px-2 py-1 rounded-md mt-1 border border-zinc-800">{item.tipo}</p>
                  </div>
                </div>

                <div>
                  <p className={`text-xs font-black uppercase ${item.tipo === 'titulo' && item.imagem_url ? item.imagem_url : 'text-white'}`}>{item.nome}</p>
                  <p className="text-[9px] text-zinc-500 mt-1 line-clamp-2">{item.desc_texto}</p>
                  <p className="text-[8px] text-zinc-600 mt-2 font-mono">ID: {item.id}</p>
                </div>

                <div className="flex gap-2 mt-auto pt-2 border-t border-zinc-800">
                  <button onClick={() => abrirEdicaoLoja(item)} className="flex-1 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-[9px] font-bold uppercase hover:bg-white hover:text-black transition-all">Editar</button>
                  <button onClick={() => excluirItemLoja(item.id)} className="px-3 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg text-[9px] font-bold uppercase hover:bg-red-500 hover:text-white transition-all">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==============================================
          ABA: SISTEMA (CONFIGURAÇÕES GERAIS)
      ================================================ */}
      {abaAtiva === "SISTEMA" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-zinc-900/40 p-8 rounded-3xl border border-zinc-800 flex items-center justify-between">
            <div>
              <p className="font-black text-white uppercase text-sm">Barra de Pesquisa Global</p>
              <p className="text-[10px] text-zinc-500 uppercase mt-1">Permite que os usuários filtrem as obras na tela inicial.</p>
            </div>
            <button onClick={() => atualizarConfig("mostrar_busca", !config.mostrar_busca)} className={`w-16 h-8 rounded-full transition-all relative ${config.mostrar_busca ? 'bg-green-500' : 'bg-zinc-700'}`}>
              <div className={`w-6 h-6 bg-white rounded-full absolute top-1 transition-all ${config.mostrar_busca ? 'left-9' : 'left-1'}`} />
            </button>
          </div>
          <div className="bg-zinc-900/40 p-8 rounded-3xl border border-zinc-800 flex items-center justify-between">
            <div>
              <p className="font-black text-white uppercase text-sm">Botões de Backup</p>
              <p className="text-[10px] text-zinc-500 uppercase mt-1">Permite exportar e importar arquivos .json no perfil.</p>
            </div>
            <button onClick={() => atualizarConfig("mostrar_backup", !config.mostrar_backup)} className={`w-16 h-8 rounded-full transition-all relative ${config.mostrar_backup ? 'bg-green-500' : 'bg-zinc-700'}`}>
              <div className={`w-6 h-6 bg-white rounded-full absolute top-1 transition-all ${config.mostrar_backup ? 'left-9' : 'left-1'}`} />
            </button>
          </div>
        </div>
      )}

      {/* ==============================================
          ABA: FERRAMENTAS DIVINAS
      ================================================ */}
      {abaAtiva === "FERRAMENTAS" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-gradient-to-br from-zinc-900 to-black p-8 rounded-3xl border border-zinc-800 flex flex-col gap-4">
            <span className="text-4xl">🧹</span>
            <p className="font-black text-white uppercase text-sm">Purificar Cache</p>
            <p className="text-[10px] text-zinc-500 uppercase leading-relaxed mb-4">Apaga a memória da IA e força o sistema a buscar os títulos na internet novamente do zero. Útil se as capas estiverem vindo erradas.</p>
            <button onClick={limparCachePesquisa} disabled={carregandoAcao} className="mt-auto py-4 bg-zinc-800 hover:bg-red-500 hover:text-white text-zinc-400 font-black uppercase text-[10px] tracking-widest rounded-xl transition-all">Executar Limpeza</button>
          </div>

          <div className="bg-gradient-to-br from-zinc-900 to-black p-8 rounded-3xl border border-yellow-500/20 flex flex-col gap-4 relative overflow-hidden group">
            <div className="absolute inset-0 bg-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <span className="text-4xl">🌧️</span>
            <p className="font-black text-yellow-500 uppercase text-sm drop-shadow-md">Chuva de Esmolas</p>
            <p className="text-[10px] text-zinc-500 uppercase leading-relaxed mb-4">Adiciona uma quantia exata de Esmolas de forma instantânea para todos os caçadores registrados no banco de dados.</p>
            <button onClick={darEsmolasParaTodos} disabled={carregandoAcao} className="mt-auto py-4 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 hover:bg-yellow-500 hover:text-black font-black uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(234,179,8,0.1)]">Iniciar Evento</button>
          </div>
        </div>
      )}

      {/* ==============================================
          MODAL: EDIÇÃO DIVINA DO USUÁRIO
      ================================================ */}
      {usuarioEditando && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-[#0e0e11] w-full max-w-lg p-8 rounded-[3rem] border border-zinc-800 shadow-2xl relative animate-in zoom-in-95">
            <button onClick={() => setUsuarioEditando(null)} className="absolute top-8 right-8 text-zinc-600 hover:text-white font-black text-xl">✕</button>
            
            <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2">Editor Divino</h2>
            <p className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest mb-8">Editando: {usuarioEditando.nome_original}</p>

            <div className="space-y-5">
              <div>
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Nome de Exibição</label>
                <input type="text" className="w-full bg-black border border-white/5 p-4 rounded-xl text-white font-bold outline-none focus:border-yellow-500 transition-all mt-1" value={formEdit.nome_exibicao} onChange={e => setFormEdit({...formEdit, nome_exibicao: e.target.value})} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Saldo de Esmolas</label>
                  <input type="number" className="w-full bg-black border border-yellow-500/30 p-4 rounded-xl text-yellow-500 font-black outline-none focus:border-yellow-500 transition-all mt-1" value={formEdit.esmolas} onChange={e => setFormEdit({...formEdit, esmolas: parseInt(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Novo PIN (4 Dig)</label>
                  <input type="text" maxLength={4} className="w-full bg-black border border-white/5 p-4 rounded-xl text-white font-bold text-center tracking-[0.5em] outline-none focus:border-red-500 transition-all mt-1" value={formEdit.pin} onChange={e => setFormEdit({...formEdit, pin: e.target.value.replace(/\D/g, '')})} placeholder="0000" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Tema / Cor</label>
                  <select className="w-full bg-black border border-white/5 p-4 rounded-xl text-white text-[10px] font-bold uppercase outline-none mt-1" value={formEdit.cor_tema} onChange={e => setFormEdit({...formEdit, cor_tema: e.target.value})}>
                    <option value="azul">Azul</option> <option value="verde">Verde</option> <option value="roxo">Roxo</option> <option value="laranja">Laranja</option> <option value="custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Avatar Rápido</label>
                  <input type="text" className="w-full bg-black border border-white/5 p-4 rounded-xl text-white font-bold outline-none focus:border-white/20 transition-all mt-1" value={formEdit.avatar} onChange={e => setFormEdit({...formEdit, avatar: e.target.value})} placeholder="URL ou Emoji" />
                </div>
              </div>

              <button onClick={salvarEdicao} disabled={carregandoAcao} className="w-full py-5 mt-4 rounded-xl bg-yellow-500 text-black font-black uppercase tracking-widest hover:bg-yellow-400 transition-all shadow-[0_0_20px_rgba(234,179,8,0.3)]">
                {carregandoAcao ? "Salvando..." : "Gravar Alterações no Banco"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================
          MODAL: CRIAÇÃO/EDIÇÃO DE ITEM DA LOJA
      ================================================ */}
      {itemLojaEditando && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-[#0e0e11] w-full max-w-xl p-8 rounded-[3rem] border border-purple-500/30 shadow-[0_0_40px_rgba(168,85,247,0.1)] relative animate-in zoom-in-95">
            <button onClick={() => setItemLojaEditando(null)} className="absolute top-8 right-8 text-zinc-600 hover:text-white font-black text-xl">✕</button>
            
            <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2">
              {isNovoItem ? "Forjar Cosmético" : "Editar Cosmético"}
            </h2>
            <p className="text-[10px] font-bold uppercase text-purple-400 tracking-widest mb-8">
              Adicionando Itens Premium à Guilda
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">ID Único (ex: aura_fogo)</label>
                  <input type="text" disabled={!isNovoItem} className="w-full bg-black border border-white/5 p-4 rounded-xl text-white font-mono text-xs outline-none focus:border-purple-500 mt-1 disabled:opacity-50" value={formLoja.id} onChange={e => setFormLoja({...formLoja, id: e.target.value})} />
                </div>
                <div>
                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Preço em Esmolas</label>
                  <input type="number" className="w-full bg-black border border-yellow-500/30 p-4 rounded-xl text-yellow-500 font-black outline-none focus:border-yellow-500 mt-1" value={formLoja.preco} onChange={e => setFormLoja({...formLoja, preco: parseInt(e.target.value) || 0})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Nome do Item</label>
                  <input type="text" className="w-full bg-black border border-white/5 p-4 rounded-xl text-white font-bold outline-none focus:border-purple-500 mt-1" value={formLoja.nome} onChange={e => setFormLoja({...formLoja, nome: e.target.value})} />
                </div>
                <div>
                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Tipo de Equipamento</label>
                  <select className="w-full bg-black border border-white/5 p-4 rounded-xl text-white text-[10px] font-bold uppercase outline-none mt-1" value={formLoja.tipo} onChange={e => setFormLoja({...formLoja, tipo: e.target.value})}>
                    <option value="moldura">Moldura de Avatar</option>
                    <option value="particula">Partículas de Fundo / VFX</option>
                    <option value="titulo">Título Honroso</option>
                    <option value="chat_cor">Cor de Chat</option>
                    <option value="chat_balao">Balão de Chat</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Descrição Curta</label>
                <input type="text" className="w-full bg-black border border-white/5 p-4 rounded-xl text-white text-xs outline-none focus:border-purple-500 mt-1" value={formLoja.desc_texto} onChange={e => setFormLoja({...formLoja, desc_texto: e.target.value})} />
              </div>

              {/* LÓGICA CONDICIONAL: SE FOR TÍTULO, MOSTRA A FORJA. SENÃO, MOSTRA O UPLOAD. */}
              {formLoja.tipo === "titulo" ? (
                <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-2xl flex flex-col gap-3 mt-4">
                  <p className="text-[10px] font-black uppercase text-purple-400 tracking-widest">Aura do Título (Forja Automática)</p>
                  <select className="w-full bg-black border border-white/5 p-4 rounded-xl text-white text-xs outline-none" value={formLoja.imagem_url} onChange={e => setFormLoja({...formLoja, imagem_url: e.target.value})}>
                    <option value="">Selecione a Aura Mágica...</option>
                    {TITULO_PRESETS.map(p => <option key={p.id} value={p.classes}>{p.nome}</option>)}
                  </select>
                  {formLoja.imagem_url && (
                    <div className="mt-4 text-center p-4 bg-black border border-zinc-800 rounded-xl">
                      <span className={`text-xl font-black uppercase tracking-widest ${formLoja.imagem_url}`}>Preview do Título</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-2xl flex flex-col gap-3 mt-4">
                  <p className="text-[10px] font-black uppercase text-purple-400 tracking-widest">Aparência do Item (PNG/GIF/MP4/WEBM)</p>
                  <div className="flex gap-3">
                    <input type="text" placeholder="URL direta ou deixe vazio..." className="flex-1 bg-black border border-white/5 p-4 rounded-xl text-white text-xs outline-none" value={formLoja.imagem_url} onChange={e => setFormLoja({...formLoja, imagem_url: e.target.value})} />
                    
                    <label className={`flex items-center justify-center px-4 rounded-xl font-black uppercase text-[9px] cursor-pointer transition-all border ${fazendoUploadLoja ? 'bg-zinc-800 text-zinc-500 border-zinc-700' : 'bg-purple-600/20 text-purple-400 border-purple-500/30 hover:bg-purple-600 hover:text-white'}`}>
                      {fazendoUploadLoja ? "⏳..." : "⬆️ Upar do PC"}
                      {/* ✅ ACEITANDO ARQUIVOS DE VÍDEO AGORA */}
                      <input type="file" accept="image/*, video/mp4, video/webm" className="hidden" onChange={uploadImagemLoja} disabled={fazendoUploadLoja} />
                    </label>
                  </div>
                  {!formLoja.imagem_url && (
                    <div>
                      <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Ícone Simples (Emoji)</label>
                      <input type="text" className="w-full bg-black border border-white/5 p-4 rounded-xl text-white text-2xl text-center outline-none focus:border-purple-500 mt-1" value={formLoja.icone} onChange={e => setFormLoja({...formLoja, icone: e.target.value})} placeholder="🔥" />
                    </div>
                  )}
                </div>
              )}

              <button onClick={salvarItemLoja} disabled={carregandoAcao} className="w-full py-5 mt-4 rounded-xl bg-purple-600 text-white font-black uppercase tracking-widest hover:bg-purple-500 transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                {carregandoAcao ? "Salvando..." : (isNovoItem ? "Lançar Cosmético no Mercado" : "Atualizar Item")}
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}