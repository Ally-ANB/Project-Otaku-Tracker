"use client";
import { useState, useEffect } from "react";
import type { WatchProvider } from "@/lib/watchProviders";
import WatchProviderStrip from "@/components/ui/WatchProviderStrip";
import { useCatalogSearch } from "@/hooks/useCatalogSearch";
import { useObraInsert } from "@/hooks/useObraInsert";
import type { AbaPrincipal, NovoObraDraft, ResultadoBusca } from "@/types/hunter_registry";

interface AddMangaModalProps {
  estaAberto: boolean;
  fechar: () => void;
  usuarioAtual: string;
  abaPrincipal: AbaPrincipal;
  aoSalvar: (novoManga: NovoObraDraft & { usuario: string; ultima_leitura: string }) => void;
  solicitarSenhaMestre?: () => Promise<string | null>;
  mostrarFeedback?: (mensagem: string, tipo?: "sucesso" | "erro" | "aviso" | "anilist") => void;
  anilistToken?: string | null;
}

export default function AddMangaModal({
  estaAberto,
  fechar,
  usuarioAtual,
  abaPrincipal,
  aoSalvar,
  solicitarSenhaMestre,
  mostrarFeedback,
  anilistToken,
}: AddMangaModalProps) {
  const [modoManual, setModoManual] = useState(false);
  const [termoAnilist, setTermoAnilist] = useState("");
  const [traduzindo, setTraduzindo] = useState(false);

  const {
    resultados,
    buscando,
    buscarPorAba,
    limpar: limparCatalogo,
  } = useCatalogSearch();

  const { salvarObra, salvando } = useObraInsert({
    usuarioAtual,
    solicitarSenhaMestre,
    mostrarFeedback,
    anilistToken,
  });

  const [novoManga, setNovoManga] = useState<NovoObraDraft>({
    titulo: "",
    capa: "",
    capitulo_atual: 0,
    total_capitulos: 0,
    status: "Planejo Ler",
    sinopse: "",
    favorito: false,
    link_url: "",
    provider_data: [] as WatchProvider[],
    duracao_episodio_minutos: 0,
  });

  useEffect(() => {
    if (!estaAberto) {
      setModoManual(false);
      setTermoAnilist("");
      limparCatalogo();
      setNovoManga({
        titulo: "",
        capa: "",
        capitulo_atual: 0,
        total_capitulos: 0,
        status: "Planejo Ler",
        sinopse: "",
        favorito: false,
        link_url: "",
        provider_data: [],
        duracao_episodio_minutos: 0,
      });
    }
  }, [estaAberto, limparCatalogo]);

  async function executarBusca() {
    if (termoAnilist.trim().length < 2) return;
    await buscarPorAba(termoAnilist, abaPrincipal);
  }

  async function traduzirSinopse() {
    if (!novoManga.sinopse) return;
    setTraduzindo(true);
    try {
      const textoLimpo = novoManga.sinopse.replace(/<[^>]*>?/gm, "");
      const res = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=pt-BR&dt=t&q=${encodeURIComponent(textoLimpo)}`
      );
      const json = await res.json();
      setNovoManga((prev) => ({
        ...prev,
        sinopse: json[0].map((item: unknown[]) => item[0]).join(""),
      }));
    } catch {
      alert("Erro na tradução.");
    } finally {
      setTraduzindo(false);
    }
  }

  async function salvarObraFinal() {
    if (!usuarioAtual) return;
    const resultado = await salvarObra(novoManga, abaPrincipal);
    if (resultado.ok && resultado.obraSalva) {
      aoSalvar(resultado.obraSalva);
      fechar();
    } else if (!resultado.ok && resultado.error) {
      alert("Erro ao salvar: " + resultado.error);
    }
  }

  function selecionarResultado(m: ResultadoBusca) {
    setNovoManga({
      ...novoManga,
      titulo: m.titulo,
      capa: m.capa,
      total_capitulos: m.total,
      sinopse: m.sinopse,
      link_url: m.link_url ?? "",
      provider_data: m.providers || [],
      duracao_episodio_minutos: m.duracao_episodio_minutos ?? 0,
    });
  }

  if (!estaAberto) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#111114] w-full max-w-2xl p-8 rounded-[2rem] border border-zinc-700 shadow-2xl relative">
        <button onClick={fechar} className="absolute top-6 right-6 text-zinc-500 hover:text-white p-2">✕</button>

        {!novoManga.titulo && !modoManual && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <h3 className="text-xl font-bold text-green-500 uppercase italic tracking-tighter">Hunter Search S+</h3>
            <div className="flex gap-3">
              <input
                autoFocus
                type="text"
                value={termoAnilist}
                className="flex-1 bg-zinc-950 p-5 rounded-2xl border border-zinc-800 outline-none text-white text-lg font-bold"
                placeholder="Pesquisar obra..."
                onChange={(e) => setTermoAnilist(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void executarBusca()}
              />
              <button
                onClick={() => void executarBusca()}
                disabled={buscando}
                className="px-8 bg-green-600 text-black font-black uppercase rounded-2xl transition-all active:scale-95"
              >
                {buscando ? "..." : "Buscar"}
              </button>
            </div>

            <button
              onClick={() => setModoManual(true)}
              className="w-full py-4 border border-zinc-800 rounded-xl text-[10px] font-black uppercase text-zinc-500 hover:text-white transition-all hover:bg-zinc-900"
            >
              Não encontrou? Registro Manual
            </button>

            <div className="mt-4 max-h-72 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {resultados.map((m, index) => (
                <div
                  key={`${m.fonte}-${m.id}-${m.tipoCatalogo}-${index}`}
                  onClick={() => selecionarResultado(m)}
                  className="flex cursor-pointer flex-col gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 transition-all hover:bg-zinc-800 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative shrink-0">
                      <img src={m.capa} className="h-16 w-12 rounded-xl object-cover" alt="" />
                      <span className="absolute -left-2 -top-2 rounded-md border border-zinc-700 bg-black px-2 py-1 text-[6px] font-black text-zinc-500">
                        {m.fonte}
                      </span>
                    </div>
                    <p className="text-sm font-bold group-hover:text-green-500">{m.titulo}</p>
                  </div>
                  {m.providers && m.providers.length > 0 && (
                    <div className="pl-[4.5rem]">
                      <p className="mb-1 text-[7px] font-black uppercase tracking-widest text-zinc-600">Onde assistir / ler</p>
                      <WatchProviderStrip providers={m.providers} size="sm" />
                    </div>
                  )}
                </div>
              ))}
              {buscando && (
                <div className="text-center p-4 text-green-500 animate-pulse font-black text-[10px] uppercase">Rastreando sinal...</div>
              )}
            </div>
          </div>
        )}

        {!novoManga.titulo && modoManual && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <h3 className="text-xl font-bold text-blue-500 uppercase italic tracking-tighter">Registro Manual</h3>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold text-zinc-600 uppercase mb-2 ml-1">Título</p>
                <input type="text" className="w-full bg-zinc-950 p-4 rounded-xl border border-zinc-800 outline-none text-white font-bold" onChange={(e) => setNovoManga({ ...novoManga, titulo: e.target.value })} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-zinc-600 uppercase mb-2 ml-1">URL da Capa</p>
                <input type="text" className="w-full bg-zinc-950 p-4 rounded-xl border border-zinc-800 outline-none text-white text-xs" onChange={(e) => setNovoManga({ ...novoManga, capa: e.target.value })} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-zinc-600 uppercase mb-2 ml-1">Sinopse</p>
                <textarea className="w-full bg-zinc-950 p-4 rounded-xl border border-zinc-800 outline-none text-white text-sm h-32 resize-none" onChange={(e) => setNovoManga({ ...novoManga, sinopse: e.target.value })} />
              </div>
            </div>
            <button onClick={() => setModoManual(false)} className="w-full py-3 text-zinc-600 font-black uppercase text-[10px] hover:text-white transition-colors">Voltar para a Busca</button>
          </div>
        )}

        {novoManga.titulo && (
          <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-500">
            <div className="flex gap-6 p-6 bg-zinc-900/50 rounded-3xl border border-zinc-800">
              <img src={novoManga.capa || "https://placehold.co/400x600/1f1f22/52525b.png?text=SEM+CAPA"} className="w-28 h-40 object-cover rounded-2xl shadow-2xl" alt="" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Confirmar Entrada</p>
                <h2 className="text-2xl font-bold text-white mb-2 italic leading-tight">{novoManga.titulo}</h2>
                <button onClick={() => void traduzirSinopse()} disabled={traduzindo} className="text-[9px] font-black uppercase text-green-500 hover:text-white transition-colors">
                  {traduzindo ? "Traduzindo..." : "🌐 Traduzir Sinopse"}
                </button>
                {(novoManga.provider_data?.length ?? 0) > 0 && (
                  <div className="mt-4">
                    <p className="text-[8px] font-black uppercase tracking-widest text-zinc-600 mb-2">Plataformas (salvas na estante)</p>
                    <WatchProviderStrip providers={novoManga.provider_data} size="md" />
                  </div>
                )}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase mb-2 ml-1 tracking-widest">Link manual (opcional — prioridade na estante)</p>
              <input
                type="url"
                placeholder="https://…"
                className="w-full bg-zinc-950 p-4 rounded-2xl border border-zinc-800 outline-none text-white text-xs"
                value={novoManga.link_url}
                onChange={(e) => setNovoManga({ ...novoManga, link_url: e.target.value })}
              />
              <p className="text-[8px] text-zinc-600 mt-2 ml-1 font-bold uppercase tracking-tighter">
                Se preenchido, aparece primeiro nos ícones do card, junto das plataformas automáticas.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-bold text-zinc-500 uppercase mb-3 ml-1 tracking-widest">
                  Parou em: ({abaPrincipal === "MANGA" ? "Cap" : abaPrincipal === "ANIME" || abaPrincipal === "SERIE" ? "Ep" : abaPrincipal === "FILME" || abaPrincipal === "LIVRO" ? "Pág" : abaPrincipal === "JOGO" ? "Prog" : abaPrincipal === "MUSICA" ? "Faixa" : "—"})
                </p>
                <input type="number" className="w-full bg-zinc-950 p-5 rounded-2xl border border-zinc-800 outline-none text-2xl font-bold text-green-500" value={novoManga.capitulo_atual} onChange={(e) => setNovoManga({ ...novoManga, capitulo_atual: parseInt(e.target.value, 10) || 0 })} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-zinc-500 uppercase mb-3 ml-1 tracking-widest">Status</p>
                <select value={novoManga.status} onChange={(e) => setNovoManga({ ...novoManga, status: e.target.value })} className="w-full bg-zinc-950 p-5 rounded-2xl border border-zinc-800 text-sm font-bold text-white uppercase cursor-pointer">
                  <option value="Lendo">Lendo / Assistindo</option>
                  <option value="Planejo Ler">Planejo</option>
                  <option value="Completos">Completos</option>
                  <option value="Pausados">Pausados</option>
                  <option value="Dropados">Dropados</option>
                </select>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() =>
                  setNovoManga({
                    titulo: "",
                    capa: "",
                    capitulo_atual: 0,
                    total_capitulos: 0,
                    status: "Planejo Ler",
                    sinopse: "",
                    favorito: false,
                    link_url: "",
                    provider_data: [],
                    duracao_episodio_minutos: 0,
                  })
                }
                className="flex-1 py-5 bg-zinc-800 text-zinc-400 rounded-2xl font-bold uppercase text-xs hover:bg-zinc-700 transition-colors"
              >
                Cancelar
              </button>
              <button onClick={() => void salvarObraFinal()} disabled={salvando} className="flex-[2] py-5 bg-green-600 text-white rounded-2xl font-bold uppercase text-xs shadow-lg shadow-green-600/20 active:scale-95 transition-all">
                {salvando ? "Salvando..." : "Sincronizar Estante"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
