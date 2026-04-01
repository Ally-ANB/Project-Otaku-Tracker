"use client";

import { MOLDURAS_DISCORD } from "@/app/perfil/page";

interface HunterAvatarProps {
  avatarUrl: string;
  idMoldura?: string;
  imagemMolduraUrl?: string;
  tamanho?: "sm" | "md" | "lg" | "xl";
  temaCor?: string; // Hexadecimal da aura
  /**
   * Quando definido (ex.: lista da Guilda / popout), substitui borda simples por `classes_tailwind` do rank.
   * String vazia = sem tier aplicável → fallback neutro `border-slate-800`.
   * Omitir = comportamento legado (borda por temaCor / moldura).
   */
  rankTailwindClasses?: string;
}

export default function HunterAvatar({ 
  avatarUrl, 
  idMoldura, 
  imagemMolduraUrl, 
  tamanho = "md",
  temaCor = "#3b82f6",
  rankTailwindClasses,
}: HunterAvatarProps) {
  
  // Definição de tamanhos dinâmicos
  const tamanhos = {
    sm: "w-10 h-10 text-lg rounded-xl",
    md: "w-14 h-14 text-2xl rounded-2xl",
    lg: "w-20 h-20 text-3xl rounded-[1.8rem]",
    xl: "w-28 h-28 text-5xl rounded-[2.5rem]"
  };

  const tamanhoClasse = tamanhos[tamanho];

  const usaRankGuilda = rankTailwindClasses !== undefined;
  const rankBordaGlow = usaRankGuilda
    ? (rankTailwindClasses!.trim() || "border-slate-800 shadow-none")
    : null;

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${tamanhoClasse.split(' ')[0]} ${tamanhoClasse.split(' ')[1]}`}>
      
      {/* 🖼️ MOLDURA PNG (REVESTIMENTO EXTERNO) */}
      {imagemMolduraUrl && (
        <img 
          src={imagemMolduraUrl} 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-[140%] h-[140%] max-w-none object-contain pointer-events-none" 
          alt="Moldura" 
        />
      )}
      
      {/* 👤 CONTAINER DO AVATAR (COM MOLDURA CSS OU BORDA SIMPLES) */}
      <div 
        className={`
          ${tamanhoClasse} bg-zinc-950 overflow-hidden flex items-center justify-center relative z-10 border-2
          ${
            usaRankGuilda
              ? rankBordaGlow
              : !MOLDURAS_DISCORD[idMoldura || ""] && !imagemMolduraUrl
                ? "border-white/10"
                : "border-transparent"
          }
          ${idMoldura && !usaRankGuilda ? MOLDURAS_DISCORD[idMoldura] : ""}
        `}
        style={
          !usaRankGuilda && !idMoldura && !imagemMolduraUrl ? { borderColor: `${temaCor}40` } : {}
        }
      >
        {avatarUrl?.startsWith('http') ? (
          <img src={avatarUrl} className="w-full h-full object-cover" alt="Avatar" />
        ) : (
          <span>{avatarUrl || "👤"}</span>
        )}
      </div>
    </div>
  );
}