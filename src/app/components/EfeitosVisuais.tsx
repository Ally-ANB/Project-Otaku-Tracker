"use client";
import { useEffect, useState } from "react";

// =============================================================================
// [SESSÃO VFX] - CONFIGURAÇÃO DO STORAGE SUPABASE
// =============================================================================
const SUPABASE_VFX_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/vfx`;

const VIDEOS_VFX: Record<string, string> = {
  particula_fogo_vfx: `${SUPABASE_VFX_URL}/fogo_infernal.mp4`,
  particula_dispersao_dark: `${SUPABASE_VFX_URL}/dispersao_dark.mp4`,
  particula_chuva_janela: `${SUPABASE_VFX_URL}/chuva_janela.mp4`,
  particula_areia_deserto: `${SUPABASE_VFX_URL}/areia_deserto.mp4`,
  particula_dispersao_leve: `${SUPABASE_VFX_URL}/dispersao_leve.mp4`,
  particula_fogo_cinematic: `${SUPABASE_VFX_URL}/fogo_cinematic.mp4`
};

const CONFETE_CORES = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
const MATRIX_CHARS = ['0', '1', 'H', 'U', 'N', 'T', 'E', 'R'];

export default function EfeitosVisuais({ particula, urlVfx }: { particula: string, urlVfx?: string }) {
  const [ativo, setAtivo] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    const checkStatus = () => setAtivo(localStorage.getItem("hunter_animacoes") !== "false");
    checkStatus();
    
    // ✅ SE HOUVER UM URL DO BANCO (MP4/WEBM CUSTOMIZADO), ELE SOBRESCREVE OS PADRÕES!
    setVideoUrl(urlVfx || VIDEOS_VFX[particula] || null);

    window.addEventListener("hunter_animacoes_toggle", checkStatus);
    return () => window.removeEventListener("hunter_animacoes_toggle", checkStatus);
  }, [particula, urlVfx]);

  return (
    <>
      {/* 🚀 CSS GLOBAL DE COSMÉTICOS (CENTRALIZADO) */}
      <style>{`
        /* ANIMAÇÕES DE PARTÍCULAS BASE */
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

        /* CLASSES DE PARTÍCULAS */
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

        /* KEYFRAMES DAS MOLDURAS */
        @keyframes raioEletrico { 0%, 100% { box-shadow: 0 0 10px #3b82f6, inset 0 0 10px #3b82f6; border-color: #60a5fa; } 50% { box-shadow: 0 0 30px #60a5fa, inset 0 0 20px #60a5fa; border-color: #fff; } }
        @keyframes pulsoEsmeralda { 0%, 100% { box-shadow: 0 0 15px #10b981; border-color: #059669; } 50% { box-shadow: 0 0 40px #34d399, inset 0 0 15px #34d399; border-color: #a7f3d0; } }
        @keyframes fumacaSombria { 0%, 100% { box-shadow: 0 0 20px #4c1d95, -5px 5px 30px #000; border-color: #4c1d95; } 50% { box-shadow: 5px -5px 40px #7c3aed, 0 0 20px #000; border-color: #6d28d9; } }
        @keyframes brilhoGelo { 0%, 100% { box-shadow: 0 0 10px #7dd3fc; border-color: #bae6fd; } 50% { box-shadow: 0 0 30px #38bdf8, inset 0 0 20px #e0f2fe; border-color: #fff; } }
        @keyframes animarMagma { 0% { border-color: #ef4444; box-shadow: 0 5px 20px #ef4444; } 50% { border-color: #f97316; box-shadow: 0 -5px 25px #f97316; } 100% { border-color: #ef4444; box-shadow: 0 5px 20px #ef4444; } }
        @keyframes celestialFlutua { 0%, 100% { transform: translateY(0); box-shadow: 0 0 20px #fff, 0 20px 30px rgba(255,255,255,0.2); border-color: #fff; } 50% { transform: translateY(-10px); box-shadow: 0 0 40px #fef08a, 0 30px 40px rgba(255,255,255,0.1); border-color: #fef08a; } }

        /* CLASSES MOLDURAS (Ligadas por ID) */
        .moldura_ouro { border-color: #eab308 !important; box-shadow: 0 0 30px rgba(234,179,8,0.5) !important; z-index: 10; }
        .moldura_neon { border-color: #d946ef !important; box-shadow: 0 0 30px rgba(217,70,239,0.5) !important; animation: piscarEstrela 2s infinite !important; }
        .moldura_choque { animation: raioEletrico 1.5s infinite !important; }
        .moldura_esmeralda { animation: pulsoEsmeralda 2s infinite !important; }
        .moldura_sombria { animation: fumacaSombria 3s infinite !important; }
        .moldura_gelo { animation: brilhoGelo 2s infinite !important; }
        .moldura_magma { animation: animarMagma 2.5s infinite !important; }
        .moldura_celestial { animation: celestialFlutua 3s ease-in-out infinite !important; border-width: 3px !important; }

        /* KEYFRAMES DOS TÍTULOS */
        @keyframes arcoirisBg { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes glitchTxt { 0% { transform: translate(0); text-shadow: none; } 20% { transform: translate(-2px, 2px); text-shadow: 2px 0 red, -2px 0 blue; } 40% { transform: translate(-2px, -2px); text-shadow: none; } 60% { transform: translate(2px, 2px); text-shadow: -2px 0 red, 2px 0 blue; } 80% { transform: translate(2px, -2px); text-shadow: none; } 100% { transform: translate(0); } }
        @keyframes bloodPulse { 0%, 100% { color: #dc2626; text-shadow: 0 0 5px #991b1b; } 50% { color: #f87171; text-shadow: 0 0 20px #ef4444, 0 5px 5px #7f1d1d; } }
        @keyframes ghostAnim { 0%, 100% { opacity: 0.3; filter: blur(2px); transform: translateY(0); } 50% { opacity: 0.9; filter: blur(0px); transform: translateY(-2px); text-shadow: 0 0 10px #cbd5e1; } }
        @keyframes sombraCaminha { 0%, 100% { text-shadow: 5px 5px 10px #000, 10px 10px 20px rgba(0,0,0,0.5); } 50% { text-shadow: -5px 5px 15px #000, -10px 10px 25px rgba(0,0,0,0.8); } }

        /* CLASSES TÍTULOS (Ligadas por ID) */
        .titulo_arcoiris { background: linear-gradient(270deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3); background-size: 400% 400%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: arcoirisBg 4s ease infinite; }
        .titulo_hacker { animation: glitchTxt 1.5s infinite; color: #22c55e; }
        .titulo_sangue { animation: bloodPulse 2s infinite; }
        .titulo_fantasma { animation: ghostAnim 3s infinite; color: #cbd5e1; }
        .titulo_deus { color: #fbbf24; text-shadow: 0 0 10px #f59e0b, 0 0 20px #f59e0b; animation: piscarEstrela 2s infinite; }
        .titulo_sombra { color: #3f3f46; animation: sombraCaminha 4s infinite alternate; }
        .titulo_sabio { color: #fbbf24; }
        .titulo_lenda { color: #fbbf24; }
      `}</style>

      {/* RENDERIZAÇÃO DAS PARTÍCULAS ATIVAS */}
      {ativo && particula && (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none w-screen h-screen">
          
          {/* 🎬 MOTOR DE VÍDEO MP4/WEBM (ITENS DE ELITE) */}
          {videoUrl && (
            <video
              key={videoUrl}
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-screen transition-opacity duration-1000"
            >
              <source src={videoUrl} type={videoUrl.endsWith('.webm') ? 'video/webm' : 'video/mp4'} />
            </video>
          )}

          {/* ❄️ MOTOR DE PARTÍCULAS CSS (ITENS CLÁSSICOS) */}
          {!videoUrl && (
            <>
              {particula === "particula_petalas" && Array.from({ length: 30 }).map((_, i) => <div key={i} className="petala" style={{ left: `${Math.random() * 100}%`, top: '-10%', width: `${8 + Math.random() * 12}px`, height: `${8 + Math.random() * 12}px`, animationDelay: `${Math.random() * 5}s`, animationDuration: `${4 + Math.random() * 5}s` }} />)}
              {particula === "particula_neve" && Array.from({ length: 50 }).map((_, i) => <div key={i} className="neve" style={{ left: `${Math.random() * 100}%`, top: '-10%', width: `${3 + Math.random() * 6}px`, height: `${3 + Math.random() * 6}px`, animationDelay: `${Math.random() * 5}s`, animationDuration: `${3 + Math.random() * 4}s` }} />)}
              {particula === "particula_fogo" && Array.from({ length: 40 }).map((_, i) => <div key={i} className="fogo" style={{ left: `${Math.random() * 100}%`, bottom: '-10%', width: `${4 + Math.random() * 6}px`, height: `${4 + Math.random() * 6}px`, animationDelay: `${Math.random() * 3}s`, animationDuration: `${2 + Math.random() * 3}s` }} />)}
              {particula === "particula_bolhas" && Array.from({ length: 25 }).map((_, i) => <div key={i} className="bolha" style={{ left: `${Math.random() * 100}%`, bottom: '-10%', width: `${10 + Math.random() * 20}px`, height: `${10 + Math.random() * 20}px`, animationDelay: `${Math.random() * 5}s`, animationDuration: `${4 + Math.random() * 4}s` }} />)}
              {particula === "particula_chuva" && Array.from({ length: 60 }).map((_, i) => <div key={i} className="chuva" style={{ left: `${Math.random() * 100}%`, top: '-10%', animationDelay: `${Math.random() * 2}s`, animationDuration: `${0.5 + Math.random() * 0.5}s` }} />)}
              {particula === "particula_estrelas" && Array.from({ length: 40 }).map((_, i) => <div key={i} className="estrela" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, width: `${2 + Math.random() * 4}px`, height: `${2 + Math.random() * 4}px`, animationDelay: `${Math.random() * 3}s`, animationDuration: `${1 + Math.random() * 3}s` }} />)}
              {particula === "particula_matrix" && Array.from({ length: 25 }).map((_, i) => <div key={i} className="matrix" style={{ left: `${Math.random() * 100}%`, top: '-10%', animationDelay: `${Math.random() * 5}s`, animationDuration: `${2 + Math.random() * 3}s` }}>{MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]}</div>)}
              {particula === "particula_confete" && Array.from({ length: 50 }).map((_, i) => <div key={i} className="confete" style={{ left: `${Math.random() * 100}%`, top: '-10%', width: '10px', height: '10px', backgroundColor: CONFETE_CORES[Math.floor(Math.random() * CONFETE_CORES.length)], animationDelay: `${Math.random() * 5}s`, animationDuration: `${3 + Math.random() * 4}s` }} />)}
              {particula === "particula_morcegos" && Array.from({ length: 6 }).map((_, i) => <div key={i} className="morcego" style={{ width: '20px', height: '10px', animationDelay: `${Math.random() * 10}s`, animationDuration: `${2 + Math.random() * 2}s` }} />)}
              
              {/* AS 4 ESTAÇÕES */}
              {particula === "particula_primavera" && Array.from({ length: 25 }).map((_, i) => <div key={i} className="folha-primavera" style={{ left: `${Math.random() * 100}%`, top: '-10%', width: `${6 + Math.random() * 10}px`, height: `${6 + Math.random() * 10}px`, animationDelay: `${Math.random() * 5}s`, animationDuration: `${4 + Math.random() * 6}s` }} />)}
              {particula === "particula_outono" && Array.from({ length: 30 }).map((_, i) => <div key={i} className="folha-outono" style={{ left: `${Math.random() * 100}%`, top: '-10%', width: `${8 + Math.random() * 10}px`, height: `${8 + Math.random() * 10}px`, animationDelay: `${Math.random() * 5}s`, animationDuration: `${3 + Math.random() * 5}s` }} />)}
              {particula === "particula_verao" && Array.from({ length: 20 }).map((_, i) => <div key={i} className="vagalume" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, width: `${4 + Math.random() * 4}px`, height: `${4 + Math.random() * 4}px`, animationDelay: `${Math.random() * 5}s`, animationDuration: `${3 + Math.random() * 3}s` }} />)}
              {particula === "particula_inverno" && Array.from({ length: 60 }).map((_, i) => <div key={i} className="neve" style={{ left: `${Math.random() * 100}%`, top: '-10%', width: `${4 + Math.random() * 8}px`, height: `${4 + Math.random() * 8}px`, animationDelay: `${Math.random() * 5}s`, animationDuration: `${2 + Math.random() * 3}s` }} />)}
            </>
          )}
        </div>
      )}
    </>
  );
}