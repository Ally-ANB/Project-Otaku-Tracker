"use client";
import { useEffect, useState } from "react";

// ==========================================
// ❄️ [SESSÃO PARTICULAS] - CONFIGURAÇÕES
// ==========================================
const CONFETE_CORES = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
const MATRIX_CHARS = ['0', '1', 'H', 'U', 'N', 'T', 'E', 'R'];

export default function EfeitosVisuais({ config, isPreview = false }: { config: any | null, isPreview?: boolean }) {
  const [ativo, setAtivo] = useState(true);

  useEffect(() => {
    // Se for o painel de admin (Preview), a animação roda independente do localStorage
    if (isPreview) {
      setAtivo(true);
      return;
    }
    const checkStatus = () => setAtivo(localStorage.getItem("hunter_animacoes") !== "false");
    checkStatus();
    
    window.addEventListener("hunter_animacoes_toggle", checkStatus);
    return () => window.removeEventListener("hunter_animacoes_toggle", checkStatus);
  }, [isPreview]);

  // ==========================================
  // 🧮 [SESSÃO MATEMÁTICA] - MOTOR DINÂMICO & CUSTOMIZADO
  // ==========================================
  const gerarEstilosDinamicos = (configAtual: any) => {
    const { tema_css, direcao, particula_custom } = configAtual;

    const base = {
      left: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 5}s`,
    } as any;

    // 🎨 1. MOTOR DA FORJA CUSTOMIZADA (NOVO!)
    if (particula_custom) {
      base.animationName = 'movimentoDinamico';
      base.top = '-10%';
      
      // Matemática de Tamanho e Velocidade Customizada
      const tamanho = particula_custom.tamanho || 15;
      const velocidade = particula_custom.velocidade || 5;
      
      base.animationDuration = `${velocidade + Math.random() * (velocidade / 2)}s`;
      base.fontSize = `${tamanho + Math.random() * (tamanho / 2)}px`; // Para Emojis

      // Se for uma forma geométrica (Círculo, Quadrado) e não um emoji
      if (particula_custom.tipo_render === "forma") {
        base.width = `${tamanho + Math.random() * (tamanho / 2)}px`;
        base.height = base.width;
        base.backgroundColor = particula_custom.cor || '#ffffff';
        if (particula_custom.forma === "circulo") base.borderRadius = '50%';
        if (particula_custom.brilho) base.boxShadow = `0 0 ${tamanho}px ${particula_custom.cor || '#ffffff'}`;
      }

      // Direção Dinâmica
      if (direcao === "vertical_baixo" || !direcao || direcao === "padrao") {
        base['--start-y'] = '-10vh'; base['--end-y'] = '110vh'; base['--move-x'] = '0px'; base['--rot'] = '0deg';
      } else if (direcao === "vertical_cima") {
        base.top = 'auto'; base.bottom = '-10%';
        base['--start-y'] = '110vh'; base['--end-y'] = '-10vh'; base['--move-x'] = '0px'; base['--rot'] = '0deg';
      } else if (direcao === "diagonal_direita") {
        base['--start-y'] = '-10vh'; base['--end-y'] = '110vh'; base['--move-x'] = '30vw'; base['--rot'] = '360deg';
      } else if (direcao === "diagonal_esquerda") {
        base['--start-y'] = '-10vh'; base['--end-y'] = '110vh'; base['--move-x'] = '-30vw'; base['--rot'] = '-360deg';
      } else if (direcao === "caos") {
        base['--start-y'] = '-10vh'; base['--end-y'] = '110vh'; base['--move-x'] = `${(Math.random() - 0.5) * 50}vw`; base['--rot'] = `${Math.random() * 720}deg`;
      }
      return base;
    }

    // 🌪️ 2. MOTOR DE DIREÇÃO (ITENS CLÁSSICOS REAJUSTADOS PELO ADMIN)
    if (direcao && direcao !== "padrao") {
      base.animationName = 'movimentoDinamico';
      base.animationDuration = `${3 + Math.random() * 5}s`;
      base.top = '-10%';
      base.width = `${5 + Math.random() * 10}px`;
      base.height = `${5 + Math.random() * 10}px`;
      
      if (direcao === "vertical_baixo") { base['--start-y'] = '-10vh'; base['--end-y'] = '110vh'; base['--move-x'] = '0px'; base['--rot'] = '0deg'; }
      else if (direcao === "vertical_cima") { base.top = 'auto'; base.bottom = '-10%'; base['--start-y'] = '110vh'; base['--end-y'] = '-10vh'; base['--move-x'] = '0px'; base['--rot'] = '0deg'; }
      else if (direcao === "diagonal_direita") { base['--start-y'] = '-10vh'; base['--end-y'] = '110vh'; base['--move-x'] = '30vw'; base['--rot'] = '360deg'; }
      else if (direcao === "diagonal_esquerda") { base['--start-y'] = '-10vh'; base['--end-y'] = '110vh'; base['--move-x'] = '-30vw'; base['--rot'] = '-360deg'; }
      else if (direcao === "caos") { base['--start-y'] = '-10vh'; base['--end-y'] = '110vh'; base['--move-x'] = `${(Math.random() - 0.5) * 50}vw`; base['--rot'] = `${Math.random() * 720}deg`; }

      if (tema_css === "custom") { base.backgroundColor = 'white'; base.borderRadius = '50%'; base.boxShadow = '0 0 10px white'; }
      return base;
    }

    // ✨ 3. MOTOR FÍSICO LENDÁRIO ORIGINAL (Se não tiver direção nem customização)
    switch (tema_css) {
      case "petala": return { ...base, top: '-10%', width: `${8 + Math.random() * 12}px`, height: `${8 + Math.random() * 12}px`, animationDuration: `${4 + Math.random() * 5}s` };
      case "neve": return { ...base, top: '-10%', width: `${3 + Math.random() * 6}px`, height: `${3 + Math.random() * 6}px`, animationDuration: `${3 + Math.random() * 4}s` };
      case "fogo": return { ...base, bottom: '-10%', width: `${4 + Math.random() * 6}px`, height: `${4 + Math.random() * 6}px`, animationDuration: `${2 + Math.random() * 3}s` };
      case "bolha": return { ...base, bottom: '-10%', width: `${10 + Math.random() * 20}px`, height: `${10 + Math.random() * 20}px`, animationDuration: `${4 + Math.random() * 4}s` };
      case "chuva": return { ...base, top: '-10%', animationDelay: `${Math.random() * 2}s`, animationDuration: `${0.5 + Math.random() * 0.5}s` };
      case "estrela": return { ...base, top: `${Math.random() * 100}%`, width: `${2 + Math.random() * 4}px`, height: `${2 + Math.random() * 4}px`, animationDuration: `${1 + Math.random() * 3}s` };
      case "matrix": return { ...base, top: '-10%', animationDuration: `${2 + Math.random() * 3}s` };
      case "confete": return { ...base, top: '-10%', width: '10px', height: '10px', backgroundColor: CONFETE_CORES[Math.floor(Math.random() * CONFETE_CORES.length)], animationDuration: `${3 + Math.random() * 4}s` };
      case "morcego": return { ...base, width: '20px', height: '10px', animationDelay: `${Math.random() * 10}s`, animationDuration: `${2 + Math.random() * 2}s` };
      case "folha-primavera": return { ...base, top: '-10%', width: `${6 + Math.random() * 10}px`, height: `${6 + Math.random() * 10}px`, animationDuration: `${4 + Math.random() * 6}s` };
      case "folha-outono": return { ...base, top: '-10%', width: `${8 + Math.random() * 10}px`, height: `${8 + Math.random() * 10}px`, animationDuration: `${3 + Math.random() * 5}s` };
      case "vagalume": return { ...base, top: `${Math.random() * 100}%`, width: `${4 + Math.random() * 4}px`, height: `${4 + Math.random() * 4}px`, animationDuration: `${3 + Math.random() * 3}s` };
      default: return { ...base, top: '-10%', width: `${5 + Math.random() * 10}px`, height: `${5 + Math.random() * 10}px`, animationDuration: `${3 + Math.random() * 4}s` };
    }
  };

  // ✅ BLINDAGEM DE PREVIEW: Se for true, renderiza absoluto dentro do container pai
  const containerClass = isPreview 
    ? "absolute inset-0 z-[10] overflow-hidden pointer-events-none w-full h-full" 
    : "fixed inset-0 z-[10] overflow-hidden pointer-events-none w-screen h-screen";

  return (
    <>
      <style>{`
        @keyframes movimentoDinamico { 0% { transform: translateY(var(--start-y, -10vh)) translateX(0) rotate(0deg); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateY(var(--end-y, 110vh)) translateX(var(--move-x, 0px)) rotate(var(--rot, 0deg)); opacity: 0; } }
        @keyframes cairPetala { 0% { transform: translateY(-10vh) translateX(0) rotate(0deg); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateY(110vh) translateX(50px) rotate(720deg); opacity: 0; } }
        @keyframes cairNeve { 0% { transform: translateY(-10vh) translateX(0); opacity: 0; } 10% { opacity: 0.8; } 90% { opacity: 0.8; } 100% { transform: translateY(110vh) translateX(-30px); opacity: 0; } }
        @keyframes subirFogo { 0% { transform: translateY(110vh) scale(0.5); opacity: 0; } 20% { opacity: 1; } 80% { opacity: 1; } 100% { transform: translateY(-10vh) scale(1.5); opacity: 0; } }
        @keyframes subirBolha { 0% { transform: translateY(110vh) scale(0.5); opacity: 0; } 50% { opacity: 0.6; transform: translateY(50vh) scale(1) translateX(15px); } 100% { transform: translateY(-10vh) scale(1.5) translateX(-15px); opacity: 0; } }
        @keyframes cairChuva { 0% { transform: translateY(-10vh) translateX(10px); opacity: 0; } 10% { opacity: 0.4; } 100% { transform: translateY(110vh) translateX(-10px); opacity: 0; } }
        @keyframes piscarEstrela { 0%, 100% { opacity: 0.1; transform: scale(0.5); } 50% { opacity: 1; transform: scale(1.2); box-shadow: 0 0 10px white; } }
        @keyframes cairMatrix { 0% { transform: translateY(-10vh); opacity: 0; text-shadow: 0 0 5px #22c55e; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateY(110vh); opacity: 0; } }
        @keyframes spinConfete { 0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; } 100% { transform: translateY(110vh) rotate(720deg); opacity: 0; } }
        @keyframes voarMorcego { 0% { transform: translate(110vw, 50vh) scale(0.5); opacity: 0;} 10% {opacity: 1;} 90% {opacity: 1;} 100% { transform: translate(-10vw, -50vh) scale(1.5); opacity: 0;} }
        @keyframes voarVagalume { 0% { transform: translate(0, 0) scale(0.8); opacity: 0; } 20% { opacity: 1; box-shadow: 0 0 25px #fde047; } 80% { opacity: 1; } 100% { transform: translate(60px, -100px) scale(1.2); opacity: 0; } }

        .petala { position: absolute; background: linear-gradient(135deg, #fbcfe8 0%, #f472b6 100%); border-radius: 15px 0 15px 0; animation: cairPetala linear infinite; box-shadow: 0 0 10px rgba(244,114,182,0.5); }
        .neve { position: absolute; background: white; border-radius: 50%; animation: cairNeve linear infinite; box-shadow: 0 0 8px white; }
        .fogo { position: absolute; background: #f97316; border-radius: 50%; animation: subirFogo ease-in infinite; box-shadow: 0 0 15px #ea580c, 0 0 30px #f97316; }
        .bolha { position: absolute; border: 1px solid rgba(56,189,248,0.5); background: rgba(56,189,248,0.2); border-radius: 50%; animation: subirBolha ease-in infinite; }
        .chuva { position: absolute; background: linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.8) 100%); width: 2px; height: 35px; animation: cairChuva linear infinite; }
        .estrela { position: absolute; background: white; border-radius: 50%; animation: piscarEstrela ease-in-out infinite; }
        .matrix { position: absolute; color: #22c55e; font-family: monospace; font-weight: bold; font-size: 16px; animation: cairMatrix linear infinite; }
        .confete { position: absolute; animation: spinConfete linear infinite; }
        .morcego { position: absolute; background: black; border-radius: 50% 50% 0 0; animation: voarMorcego linear infinite; box-shadow: 0 0 10px black; }
        .folha-primavera { position: absolute; background: #86efac; border-radius: 10px 0 10px 0; animation: cairPetala linear infinite; box-shadow: 0 0 8px #4ade80; }
        .folha-outono { position: absolute; background: #ea580c; border-radius: 10px 0 10px 0; animation: cairPetala linear infinite; box-shadow: 0 0 8px #c2410c; }
        .vagalume { position: absolute; background: #fef08a; border-radius: 50%; animation: voarVagalume ease-in-out infinite; box-shadow: 0 0 10px #fde047; }
        .custom { position: absolute; display: flex; align-items: center; justify-content: center; }
      `}</style>

      {ativo && config && (config.tema_css || config.particula_custom) && (
        <div className={containerClass}>
          {Array.from({ length: config.quantidade || 30 }).map((_, i) => (
            <div 
              key={i} 
              // Se tiver particula custom, usa a classe base 'custom', senão usa a classe clássica do tema
              className={config.particula_custom ? "custom" : config.tema_css} 
              style={gerarEstilosDinamicos(config)}
            >
              {/* Renderização de conteúdo interno (Emojis ou Matrix) */}
              {config.particula_custom?.tipo_render === "emoji" 
                ? (config.particula_custom.conteudo || "✨") 
                : config.tema_css === "matrix" 
                  ? MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)] 
                  : null}
            </div>
          ))}
        </div>
      )}
    </>
  );
}