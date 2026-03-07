"use client";

import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import EfeitosVisuais from "./EfeitosVisuais";

export default function GlobalVFXManager() {
  const [vfxAtivo, setVfxAtivo] = useState<{ particula: string; urlVfx?: string }>({
    particula: "",
    urlVfx: "",
  });

  useEffect(() => {
    // 1. FUNÇÃO PARA BUSCAR O VISUAL EQUIPADO NO BANCO
    const carregarVisualAtivo = async () => {
      const hunterLogado = sessionStorage.getItem("hunter_ativo");
      if (!hunterLogado) return;

      try {
        // Busca o perfil para ver o ID do item equipado
        const { data: perfil } = await supabase
          .from("perfis")
          .select("cosmeticos")
          .eq("nome_original", hunterLogado)
          .single();

        const idParticula = perfil?.cosmeticos?.ativos?.particula;

        if (idParticula) {
          // Busca os detalhes do item na loja para pegar a URL (GIF ou Vídeo)
          const { data: item } = await supabase
            .from("loja_itens")
            .select("id, imagem_url")
            .eq("id", idParticula)
            .single();

          if (item) {
            setVfxAtivo({
              particula: item.id,
              urlVfx: item.imagem_url,
            });
          }
        } else {
          // Se não tiver nada equipado, limpa o fundo
          setVfxAtivo({ particula: "", urlVfx: "" });
        }
      } catch (err) {
        console.error("Erro ao carregar VFX Global:", err);
      }
    };

    // Executa ao carregar o site
    carregarVisualAtivo();

    // ✅ ESCUTADOR DE EVENTO CUSTOMIZADO
    // Isso garante que quando você equipar algo no perfil, o fundo mude na hora sem F5
    window.addEventListener("hunter_cosmeticos_update", carregarVisualAtivo);

    return () => {
      window.removeEventListener("hunter_cosmeticos_update", carregarVisualAtivo);
    };
  }, []);

  // Se não houver partículas ou URL, não renderiza nada para poupar processamento
  if (!vfxAtivo.particula && !vfxAtivo.urlVfx) return null;

  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <EfeitosVisuais 
        particula={vfxAtivo.particula} 
        urlVfx={vfxAtivo.urlVfx} 
      />
    </div>
  );
}