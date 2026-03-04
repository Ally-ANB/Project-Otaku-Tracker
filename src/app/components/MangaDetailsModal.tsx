"use client";

interface Manga { 
  id: number; titulo: string; capa: string; capitulo_atual: number; total_capitulos: number; 
  status: string; sinopse: string; nota_pessoal: number; nota_amigos: number; 
  comentarios: string; usuario: string; ultima_leitura: string; favorito: boolean; 
}

interface MangaDetailsModalProps {
  manga: Manga;
  abaPrincipal: "MANGA" | "ANIME" | "FILME" | "LIVRO";
  aoFechar: () => void;
  aoAtualizarCapitulo: (manga: Manga, novo: number) => void;
  aoAtualizarDados: (id: number, campos: any) => void;
  aoDeletar: (id: number) => void;
  aoTraduzir: () => void; 
}

export default function MangaDetailsModal({ manga, abaPrincipal, aoFechar, aoAtualizarCapitulo, aoAtualizarDados, aoDeletar, aoTraduzir }: MangaDetailsModalProps) {
  
  // ✅ Função interna para lidar com a mudança de status e auto-completar progresso
  const handleStatusChange = (novoStatus: string) => {
    const campos: any = { status: novoStatus };
    
    // Se marcar como completo e tivermos o total, atualizamos o progresso também
    if (novoStatus === "Completos" && manga.total_capitulos > 0) {
      aoAtualizarCapitulo(manga, manga.total_capitulos);
    } else {
      aoAtualizarDados(manga.id, campos);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[#0e0e11] w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[3rem] border border-zinc-800 shadow-2xl custom-scrollbar relative">
        
        {/* ======================= BANNER SUPERIOR ======================= */}
        <div className="relative h-64 md:h-80 w-full overflow-hidden">
          <img src={manga.capa} className="w-full h-full object-cover blur-3xl opacity-20 scale-110" alt="" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e11] to-transparent" />
          
          <div className="absolute inset-0 p-8 flex flex-col md:flex-row gap-8 items-end">
            <img src={manga.capa} className="w-32 md:w-44 aspect-[2/3] object-cover rounded-2xl shadow-2xl border-4 border-zinc-900" alt="" />
            <div className="flex-1 mb-4 relative">
              <span className="bg-zinc-800 text-zinc-400 text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest mb-3 inline-block">
                {abaPrincipal} • {manga.status}
              </span>
              
              <button 
                onClick={() => aoAtualizarDados(manga.id, { favorito: !manga.favorito })}
                className={`absolute top-0 right-0 w-12 h-12 flex items-center justify-center rounded-xl border border-zinc-800 transition-all ${manga.favorito ? 'bg-zinc-800 text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'text-zinc-600 hover:text-white'}`}
              >
                <span className="text-2xl">{manga.favorito ? '⭐' : '☆'}</span>
              </button>

              <h2 className="text-3xl md:text-5xl font-black text-white italic tracking-tighter leading-none">{manga.titulo}</h2>
            </div>
            <button onClick={aoFechar} className="absolute top-8 right-8 text-zinc-600 hover:text-white transition-colors text-2xl font-black p-2">✕</button>
          </div>
        </div>

        {/* ======================= CORPO DO MODAL ======================= */}
        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-12">
          
          <div className="space-y-8">
            {/* CARD DE PROGRESSO */}
            <div className="bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800 group hover:border-zinc-700 transition-all">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">Progresso Atual</p>
              <div className="flex items-center justify-between gap-2">
                <button onClick={() => aoAtualizarCapitulo(manga, manga.capitulo_atual - 1)} className="w-10 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-all font-black text-xl">-</button>
                <input 
                  type="number"
                  className="w-24 text-center bg-transparent text-4xl font-black text-white outline-none focus:text-green-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  value={manga.capitulo_atual}
                  onChange={(e) => aoAtualizarCapitulo(manga, parseInt(e.target.value) || 0)}
                />
                <button onClick={() => aoAtualizarCapitulo(manga, manga.capitulo_atual + 1)} className="w-10 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-all font-black text-xl">+</button>
              </div>
              <p className="text-center text-[10px] text-zinc-700 mt-2 font-bold uppercase tracking-widest italic">Meta Final: {manga.total_capitulos || '?'}</p>
            </div>

            {/* CARD DE NOTA */}
            <div className="bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800 group hover:border-zinc-700 transition-all">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">Sua Avaliação (0-10)</p>
              <input 
                type="number" max={10} min={0}
                className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-3xl font-black text-yellow-500 text-center outline-none focus:border-yellow-500/30 transition-all"
                value={manga.nota_pessoal || 0}
                onChange={(e) => {
                  let val = parseInt(e.target.value);
                  if (val > 10) val = 10;
                  if (val < 0) val = 0;
                  aoAtualizarDados(manga.id, { nota_pessoal: val || 0 });
                }}
              />
            </div>

            {/* CARD DE STATUS */}
            <div className="bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">Estado da Jornada</p>
              <select 
                value={manga.status} 
                onChange={(e) => handleStatusChange(e.target.value)} 
                className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-sm font-bold text-white uppercase cursor-pointer outline-none focus:border-white/20 transition-all appearance-none"
              >
                <option value="Lendo">{abaPrincipal === "ANIME" || abaPrincipal === "FILME" ? "Assistindo" : "Lendo"}</option>
                <option value="Planejo Ler">{abaPrincipal === "ANIME" || abaPrincipal === "FILME" ? "Planejo Assistir" : "Planejo Ler"}</option>
                <option value="Completos">Completos</option>
                <option value="Pausados">Pausados</option>
                <option value="Dropados">Dropados</option>
              </select>
            </div>
          </div>

          <div className="md:col-span-2 space-y-8">
            {/* SINOPSE */}
            <div>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">Arquivos de Dados / Sinopse</p>
              <div className="relative group bg-zinc-950/50 p-6 rounded-[2rem] border border-zinc-800/50">
                <p className="text-zinc-400 text-sm leading-relaxed max-h-60 overflow-y-auto pr-4 custom-scrollbar italic">
                  {manga.sinopse || "Sem descrição disponível nos bancos de dados Hunter."}
                </p>
                <button 
                  onClick={aoTraduzir}
                  className="mt-6 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-blue-500 hover:text-white transition-all bg-blue-500/5 px-4 py-2 rounded-lg border border-blue-500/20"
                >
                  🌐 Traduzir Relatório
                </button>
              </div>
            </div>
            
            {/* COMENTÁRIOS (EXTRA) */}
            <div>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">Notas de Campo</p>
              <textarea 
                className="w-full bg-zinc-950/50 border border-zinc-800 p-6 rounded-[2rem] text-zinc-300 text-sm outline-none focus:border-zinc-600 transition-all min-h-[120px] resize-none custom-scrollbar"
                placeholder="Escreva suas anotações sobre esta obra..."
                value={manga.comentarios || ""}
                onChange={(e) => aoAtualizarDados(manga.id, { comentarios: e.target.value })}
              />
            </div>

            <div className="flex justify-end pt-4">
              <button 
                onClick={() => aoDeletar(manga.id)}
                className="px-8 py-4 rounded-2xl border border-red-500/20 text-red-500 text-[10px] font-black uppercase hover:bg-red-500 hover:text-white hover:shadow-[0_0_20px_rgba(239,68,68,0.2)] transition-all"
              >
                Eliminar Registro da Estante
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}