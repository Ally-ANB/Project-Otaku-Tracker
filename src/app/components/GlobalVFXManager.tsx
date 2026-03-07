"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/supabase";
import EfeitosVisuais from "./EfeitosVisuais";

export default function GlobalVFXManager() {
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [particulaId, setParticulaId] = useState<string>("");

  const carregarCosmeticosGlobais = async () => {
    const hunterAtivo = sessionStorage.getItem("hunter_ativo");
    // ✅ RESET SEGURO: Se não houver ninguém logado, limpa o visual
    if (!hunterAtivo) {
      setBackgroundUrl(null);
      setParticulaId("");
      return;
    }

    // 1. Busca os cosméticos ativos do Hunter
    const { data: perfil } = await supabase
      .from("perfis")
      .select("cosmeticos")
      .eq("nome_original", hunterAtivo)
      .single();

    if (perfil?.cosmeticos?.ativos) {
      const ativos = perfil.cosmeticos.ativos;
      setParticulaId(ativos.particula || "");

      // 2. Se houver moldura ou fundo, buscamos a URL na loja
      if (ativos.moldura) {
        const { data: item } = await supabase
          .from("loja_itens")
          .select("imagem_url")
          .eq("id", ativos.moldura)
          .single();
        
        // Verificamos se a moldura na verdade é um fundo (GIF ou MP4)
        if (item?.imagem_url && (item.imagem_url.includes('.mp4') || item.imagem_url.includes('.webm') || item.imagem_url.includes('.gif'))) {
          setBackgroundUrl(item.imagem_url);
        } else {
          setBackgroundUrl(null);
        }
      } else {
        setBackgroundUrl(null);
      }
    }
  };

  useEffect(() => {
    carregarCosmeticosGlobais();

    // Ouve o evento que criamos na página de Perfil
    window.addEventListener("hunter_cosmeticos_update", carregarCosmeticosGlobais);
    // Ouve mudanças de login
    window.addEventListener("storage", carregarCosmeticosGlobais);

    return () => {
      window.removeEventListener("hunter_cosmeticos_update", carregarCosmeticosGlobais);
      window.removeEventListener("storage", carregarCosmeticosGlobais);
    };
  }, []);

  return (
    <>
      {/* 🌌 CAMADA 1: FUNDO ANIMADO (GIF/VIDEO) */}
      {backgroundUrl && (
        <div className="fixed inset-0 z-[-2] pointer-events-none overflow-hidden">
          {backgroundUrl.endsWith('.mp4') || backgroundUrl.endsWith('.webm') ? (
            <video
              src={backgroundUrl}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover opacity-40"
            />
          ) : (
            <img 
              src={backgroundUrl} 
              className="w-full h-full object-cover opacity-40" 
              alt="Background" 
            />
          )}
          {/* Overlay para garantir legibilidade */}
          <div className="absolute inset-0 bg-black/60" />
        </div>
      )}

      {/* ✨ CAMADA 2: PARTÍCULAS (VFX) */}
      <EfeitosVisuais particula={particulaId} />
    </>
  );
}