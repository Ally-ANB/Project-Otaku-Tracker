"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/supabase";
import EfeitosVisuais from "./EfeitosVisuais";

export default function GlobalVFXManager() {
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  // ✅ NOVA SESSÃO: Objeto Completo agora inclui a 'direcao'
  const [particulaConfig, setParticulaConfig] = useState<{ id: string, tema_css: string, quantidade: number, direcao: string | null, particula_custom: any | null } | null>(null);

  const carregarCosmeticosGlobais = async () => {
    const hunterAtivo = sessionStorage.getItem("hunter_ativo");
    
    if (!hunterAtivo) {
      setBackgroundUrl(null);
      setParticulaConfig(null);
      return;
    }

    const { data: perfil } = await supabase
      .from("perfis")
      .select("cosmeticos")
      .eq("nome_original", hunterAtivo)
      .single();

    if (perfil?.cosmeticos?.ativos) {
      const ativos = perfil.cosmeticos.ativos;
      
      // ==========================================
      // ✅ [SESSÃO SLOT 1] - PARTÍCULAS DINÂMICAS
      // ==========================================
      if (ativos.particula) {
        // Agora busca também a direcao e a particula_custom na loja_itens
        const { data: itemParticula } = await supabase
          .from("loja_itens")
          .select("tema_css, quantidade_elementos, direcao, particula_custom")
          .eq("id", ativos.particula)
          .single();

        if (itemParticula && (itemParticula.tema_css || itemParticula.particula_custom)) {
          setParticulaConfig({
            id: ativos.particula,
            tema_css: itemParticula.tema_css,
            quantidade: itemParticula.quantidade_elementos || 30, // Fallback
            direcao: itemParticula.direcao || null, // Pode ser null para itens lendários antigos
            particula_custom: itemParticula.particula_custom || null
          });
        } else {
          setParticulaConfig(null);
        }
      } else {
        setParticulaConfig(null);
      }

      // ==========================================
      // ✅ [SESSÃO SLOT 2] - VFX BACKGROUND
      // ==========================================
      if (ativos.vfx) {
        const { data: item } = await supabase
          .from("loja_itens")
          .select("imagem_url")
          .eq("id", ativos.vfx)
          .single();
        
        if (item?.imagem_url) {
          const urlBase = item.imagem_url.split('?')[0].toLowerCase();
          if (urlBase.endsWith('.mp4') || urlBase.endsWith('.webm') || urlBase.endsWith('.gif')) {
            setBackgroundUrl(item.imagem_url);
          } else {
            setBackgroundUrl(null);
          }
        }
      } else {
        setBackgroundUrl(null);
      }
    }
  };

  useEffect(() => {
    carregarCosmeticosGlobais();
    window.addEventListener("hunter_cosmeticos_update", carregarCosmeticosGlobais);
    return () => window.removeEventListener("hunter_cosmeticos_update", carregarCosmeticosGlobais);
  }, []);

  return (
    <>
      {/* 🎬 CAMADA DE BACKGROUND (VFX) */}
      {backgroundUrl && (
        <div className="fixed inset-0 z-[-2] pointer-events-none overflow-hidden">
          {backgroundUrl.split('?')[0].toLowerCase().endsWith('.gif') ? (
            <img 
              src={backgroundUrl} 
              className="w-full h-full object-cover opacity-70" 
              alt="Background VFX" 
            />
          ) : (
            <video 
              key={backgroundUrl} 
              autoPlay 
              loop 
              muted 
              playsInline 
              preload="auto"
              crossOrigin="anonymous"
              className="w-full h-full object-cover opacity-50 mix-blend-screen" 
            >
              <source src={backgroundUrl} type={backgroundUrl.includes('.webm') ? 'video/webm' : 'video/mp4'} />
            </video>
          )}
          
          <div className="absolute inset-0 bg-black/25 backdrop-blur-[1px]" />
        </div>
      )}

      {/* ❄️ CAMADA DE PRIMEIRO PLANO (PARTÍCULAS CSS) */}
      <EfeitosVisuais config={particulaConfig} />
    </>
  );
}