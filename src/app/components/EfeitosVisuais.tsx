"use client";
import { useEffect, useState } from "react";

// ==========================================
// ❄️ [SESSÃO PARTICULAS] - CONFIGURAÇÕES
// ==========================================
const CONFETE_CORES = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
const MATRIX_CHARS = ['0', '1', 'H', 'U', 'N', 'T', 'E', 'R'];

export default function EfeitosVisuais({ config }: { config: { id: string, tema_css: string, quantidade: number, direcao: string | null } | null }) {
  const [ativo, setAtivo] = useState(true);

  useEffect(() => {
    const checkStatus = () => setAtivo(localStorage.getItem("hunter_animacoes") !== "false");
    checkStatus();
    
    window.addEventListener("hunter_animacoes_toggle", checkStatus);
    return () => window.removeEventListener("hunter_animacoes_toggle", checkStatus);
  }, []);

  // ==========================================
  // 🧮 [SESSÃO MATEMÁTICA] - MOTOR DINÂMICO
  // ==========================================
  const gerarEstilosDinamicos = (tema: string, direcao: string | null) => {
    const base = {
      left: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 5}s`,
    } as any;

    // Se uma direção foi definida pelo Admin, nós assumimos o controle da rota
    if (direcao && direcao !== "padrao") {
      base.animationName = 'movimentoDinamico';
      base.animationDuration = `${3 + Math.random() * 5}s`;
      base.top = '-10%';
      base.width = `${5 + Math.random() * 10}px`;
      base.height = `${5 + Math.random() * 10}px`;
      
      // Rotas Dinâmicas Injetadas via Variáveis CSS
      if (direcao === "vertical_baixo") {
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

      // Fallback visual se o Admin não colocar uma classe CSS específica
      if (tema === "custom") {
        base.backgroundColor = 'white';
        base.borderRadius = '50%';
        base.boxShadow = '0 0 10px white';
      }
      return base;
    }

    // Se NÃO tiver direção, mantemos a física exata dos seus Itens Lendários Originais
    switch (tema) {
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

  return (
    <>
      {/* 🚀 CSS GLOBAL DE COSMÉTICOS (AGORA COM MOTOR DE DIREÇÃO) */}
      <style>{`
        /* ANIMAÇÃO MESTRA PARA ROTAS DINÂMICAS DO PAINEL ADMIN */
        @keyframes movimentoDinamico { 
          0% { transform: translateY(var(--start-y, -10vh)) translateX(0) rotate(0deg); opacity: 0; } 
          10% { opacity: 1; } 
          90% { opacity: 1; } 
          100% { transform: translateY(var(--end-y, 110vh)) translateX(var(--move-x, 0px)) rotate(var(--rot, 0deg)); opacity: 0; } 
        }

        /* ANIMAÇÕES DE PARTÍCULAS LENDÁRIAS BASE */
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

        /* CLASSES DE PARTÍCULAS LENDÁRIAS */
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
        
        /* CLASSE GENÉRICA PARA AS PARTÍCULAS DO ADMIN (Se não passar tema específico) */
        .custom { position: absolute; }

        /* MOLDURAS & TITULOS CSS */
        @keyframes raioEletrico { 0%, 100% { box-shadow: 0 0 10px #3b82f6, inset 0 0 10px #3b82f6; border-color: #60a5fa; } 50% { box-shadow: 0 0 30px #60a5fa, inset 0 0 20px #60a5fa; border-color: #fff; } }
        @keyframes celestialFlutua { 0%, 100% { transform: translateY(0); box-shadow: 0 0 20px #fff, 0 20px 30px rgba(255,255,255,0.2); border-color: #fff; } 50% { transform: translateY(-10px); box-shadow: 0 0 40px #fef08a, 0 30px 40px rgba(255,255,255,0.1); border-color: #fef08a; } }
        .moldura_ouro { border-color: #eab308 !important; box-shadow: 0 0 30px rgba(234,179,8,0.5) !important; z-index: 10; }
        .moldura_celestial { animation: celestialFlutua 3s ease-in-out infinite !important; border-width: 3px !important; }
      `}</style>

      {/* ❄️ MOTOR DE PARTÍCULAS DINÂMICO RENDERIZADO NA TELA */}
      {ativo && config && config.tema_css && (
        <div className="fixed inset-0 z-[10] overflow-hidden pointer-events-none w-screen h-screen">
          {Array.from({ length: config.quantidade }).map((_, i) => (
            <div 
              key={i} 
              className={config.tema_css} 
              style={gerarEstilosDinamicos(config.tema_css, config.direcao)}
            >
              {config.tema_css === "matrix" ? MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)] : null}
            </div>
          ))}
        </div>
      )}
    </>
  );
}