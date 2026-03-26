"use client";

import HunterAvatar from "./HunterAvatar";

interface HunterCardProps {
  perfil: any;
  customizacao?: {
    banner_url?: string;
    tag_texto?: string;
    tag_cor?: string;
    fonte_cor?: string;
    /** URL da playlist do YouTube para o Rádio Hunter (opcional). */
    playlist_url?: string;
  };
}

export default function HunterCard({ perfil, customizacao }: HunterCardProps) {
  const bannerBg = customizacao?.banner_url 
    ? `url(${customizacao.banner_url})` 
    : 'linear-gradient(90deg, #0e0e11 0%, #1a1a2e 100%)';
    
  const tagCor = customizacao?.tag_cor || "#3b82f6";

  return (
    <div 
      className="w-full h-24 rounded-2xl relative overflow-hidden flex items-center px-6 border border-white/5 shadow-2xl transition-all hover:scale-[1.02] group"
      style={{ 
        backgroundImage: bannerBg, 
        backgroundSize: 'cover', 
        backgroundPosition: 'center' 
      }}
    >
      <div className="absolute inset-0 bg-black/40 z-0 group-hover:bg-black/20 transition-colors" />

      <div className="relative z-10 flex items-center gap-4 w-full">
        <div className="shrink-0 scale-90">
          <HunterAvatar 
            avatarUrl={perfil.avatar} 
            idMoldura={perfil.cosmeticos?.ativos?.moldura} 
            tamanho="md"
            temaCor={perfil.cor_tema?.startsWith('#') ? perfil.cor_tema : perfil.custom_color}
          />
        </div>

        <div className="flex flex-col overflow-hidden">
          <h3 
            className="text-xl font-black italic tracking-tighter drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] truncate"
            style={{ color: customizacao?.fonte_cor || '#ffffff' }}
          >
            {perfil.nome_exibicao}
          </h3>
          
          <div className="flex items-center gap-2 mt-0.5">
             <div className="px-2 py-0.5 rounded bg-black/60 border border-white/10 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: tagCor }} />
              <span className="text-[8px] font-black uppercase tracking-widest text-white/90">
                {customizacao?.tag_texto || "HUNTER"}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-white/5 to-transparent pointer-events-none" />
    </div>
  );
}