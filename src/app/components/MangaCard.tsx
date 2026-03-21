"use client";
import { useState, useEffect } from "react"; // ✅ Adicionado para gerenciar o input local

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
  link_url?: string | null;
  provider_data?: unknown;
}

interface MangaCardProps {
  manga: Manga;
  aura: any;
  abaPrincipal: "MANGA" | "ANIME" | "FILME" | "LIVRO" | "SERIE" | "JOGO" | "MUSICA";
  atualizarCapitulo: (manga: Manga, novo: number) => Promise<void>;
  deletarManga: (id: number) => Promise<void>;
  mudarStatusManual: (id: number, status: string) => Promise<void>;
  abrirDetalhes: (manga: Manga) => void;
}

export default function MangaCard({ manga, aura, abaPrincipal, atualizarCapitulo, abrirDetalhes }: MangaCardProps) {
  // ✅ Estado local para permitir que o usuário digite sem travar a UI
  const [valorInput, setValorInput] = useState(manga.capitulo_atual);

  // Sincroniza o input se o valor mudar externamente (ex: clicou no +)
  useEffect(() => {
    setValorInput(manga.capitulo_atual);
  }, [manga.capitulo_atual]);

  const statusBadge =
    abaPrincipal === "ANIME" || abaPrincipal === "FILME" || abaPrincipal === "SERIE"
      ? (manga.status === "Lendo" ? "Assistindo" : manga.status === "Planejo Ler" ? "Planejo Assistir" : manga.status)
      : abaPrincipal === "JOGO"
        ? (manga.status === "Lendo" ? "Jogando" : manga.status === "Planejo Ler" ? "Planejo Jogar" : manga.status)
        : abaPrincipal === "MUSICA" && manga.status === "Lendo"
          ? "Ouvindo"
          : manga.status;

  const progresso = manga.total_capitulos > 0 
    ? Math.round((manga.capitulo_atual / manga.total_capitulos) * 100) 
    : 0;

  // ✅ Função para processar a mudança manual (Enter ou Blur)
  const handleBlurOuEnter = () => {
    if (valorInput !== manga.capitulo_atual) {
      atualizarCapitulo(manga, valorInput);
    }
  };

  return (
    <div className="group relative bg-zinc-900/40 rounded-[2rem] border border-zinc-800/50 hover:border-zinc-700 transition-all p-4">
      
      <div className="absolute top-6 right-6 z-10">
        <span className="bg-black/60 backdrop-blur-md text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border border-white/10 text-white">
          {statusBadge}
        </span>
      </div>

      <div className="cursor-pointer" onClick={() => abrirDetalhes(manga)}>
        <img 
          src={manga.capa} 
          className="w-full aspect-[2/3] object-cover rounded-[1.5rem] mb-4 shadow-2xl group-hover:scale-[1.02] transition-transform" 
          alt={manga.titulo} 
        />
        <h3 className="font-bold text-sm leading-tight mb-4 h-10 line-clamp-2 group-hover:text-white transition-colors uppercase tracking-tighter">
          {manga.titulo}
        </h3>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-end px-1">
           <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Progresso</span>
           <span className={`${aura.text} text-[10px] font-black`}>{progresso}%</span>
        </div>
        
        <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className={`${aura.bg} h-full transition-all duration-500`} 
            style={{ width: `${progresso}%` }} 
          />
        </div>

        <div className="flex items-center justify-between bg-black/40 p-1 rounded-xl border border-zinc-800">
          <button 
            onClick={() => atualizarCapitulo(manga, manga.capitulo_atual - 1)} 
            className="w-8 h-8 flex items-center justify-center hover:bg-zinc-800 rounded-lg transition-colors text-zinc-500 hover:text-white"
          >
            -
          </button>
          
          <div className="text-center flex flex-col items-center">
            {/* ✅ SMART INPUT: Hunter pode digitar o valor direto aqui */}
            <input 
              type="number"
              value={valorInput}
              onChange={(e) => setValorInput(parseInt(e.target.value) || 0)}
              onBlur={handleBlurOuEnter}
              onKeyDown={(e) => e.key === 'Enter' && handleBlurOuEnter()}
              className="w-12 bg-transparent text-center text-xs font-black text-white outline-none focus:text-green-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <p className="text-[6px] text-zinc-600 font-bold uppercase">/ {manga.total_capitulos || '?'}</p>
          </div>
          
          <button 
            onClick={() => atualizarCapitulo(manga, manga.capitulo_atual + 1)} 
            className="w-8 h-8 flex items-center justify-center hover:bg-zinc-800 rounded-lg transition-colors text-zinc-500 hover:text-white"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}