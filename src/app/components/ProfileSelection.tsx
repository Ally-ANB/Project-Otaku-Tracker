// src/app/components/ProfileSelection.tsx
"use client";

import React from 'react';

// Interfaces para os Temas e Props
interface Tema {
  nome: string;
  bg: string;
  bgActive: string;
  text: string;
  border: string;
  shadow: string;
  focus: string;
}

interface ProfileSelectionProps {
  perfis: any[];
  temas: Record<string, Tema>;
  tentarMudarPerfil: (nome: string) => void;
  perfilAlvoParaBloqueio: string | null;
  pinDigitado: string;
  setPinDigitado: (v: string) => void;
  confirmarPin: () => void;
  setPinAdminAberto: (v: boolean) => void;
  pinAdminAberto: boolean;
}

export default function ProfileSelection({
  perfis, temas, tentarMudarPerfil, perfilAlvoParaBloqueio,
  pinDigitado, setPinDigitado, confirmarPin, setPinAdminAberto, pinAdminAberto
  
}: ProfileSelectionProps) {
  return (
    <main className="min-h-screen bg-[#040405] flex flex-col items-center justify-center p-6 text-white animate-in fade-in duration-700">
      <h1 className="text-4xl font-black mb-16 uppercase tracking-tighter text-white italic">Escolha seu Perfil</h1>
      
      <div className="flex flex-wrap justify-center gap-10">
        {perfis.map(p => {
          const auraP = p.cor_tema?.startsWith('#') ? temas.custom : (temas[p.cor_tema as keyof typeof temas] || temas.verde);
          
          return (
            <div 
              key={p.nome_original} 
              onClick={() => tentarMudarPerfil(p.nome_original)} 
              className="flex flex-col items-center gap-4 cursor-pointer group"
              style={p.cor_tema?.startsWith('#') ? { '--aura': p.cor_tema } as React.CSSProperties : {}}
            >
              {/* ✅ CORREÇÃO: AVATAR INTELIGENTE (LINK OU EMOJI) */}
              <div className={`w-40 h-40 bg-zinc-900 rounded-[3rem] flex items-center justify-center overflow-hidden border-4 border-zinc-800 transition-all duration-500 shadow-2xl group-hover:scale-105 group-hover:${auraP.border}`}>
                {p.avatar?.startsWith('http') ? (
                  <img 
                    src={p.avatar} 
                    className="w-full h-full object-cover" 
                    alt={p.nome_exibicao}
                    onError={(e) => {
                      // Fallback caso a imagem quebre
                      (e.target as HTMLImageElement).src = "https://i.imgur.com/8Km9t4S.png";
                    }}
                  />
                ) : (
                  <span className="text-7xl">{p.avatar || "👤"}</span>
                )}
              </div>

              <span className="font-bold uppercase text-zinc-500 group-hover:text-white tracking-widest transition-colors">
                {p.nome_exibicao}
              </span>
            </div>
          );
        })}

        {/* ✅ FIX: PERFIL ADMINISTRADOR CORRIGIDO */}
        <div 
          onClick={() => tentarMudarPerfil("Admin")} 
          className="flex flex-col items-center gap-4 cursor-pointer group"
        >
          <div className="w-40 h-40 bg-zinc-900 border-4 border-dashed border-zinc-700 rounded-[3rem] flex items-center justify-center text-7xl group-hover:border-yellow-500 group-hover:bg-yellow-500/5 transition-all duration-500 group-hover:scale-105">
            👑
          </div>
          <span className="font-bold uppercase text-zinc-700 group-hover:text-yellow-500 text-[10px] tracking-widest transition-colors">
            Administrador
          </span>
        </div>
      </div>

      {/* MODAL DE PIN */}
      {perfilAlvoParaBloqueio && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 backdrop-blur-xl animate-in zoom-in-95 duration-300">
          <div className="bg-zinc-900 p-10 rounded-[2.5rem] border border-zinc-800 text-center max-w-sm w-full shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <h2 className="text-white font-black mb-6 uppercase tracking-widest text-xl italic">PIN de Segurança</h2>
            <input 
              autoFocus 
              type="password" 
              maxLength={4} 
              className="bg-black border border-zinc-700 rounded-2xl w-full py-5 text-center text-4xl text-white outline-none mb-6 focus:border-white transition-all font-mono tracking-[0.5em]" 
              value={pinDigitado} 
              onChange={(e) => setPinDigitado(e.target.value.replace(/\D/g, ''))} 
              onKeyDown={(e) => e.key === 'Enter' && confirmarPin()} 
            />
            <button 
              onClick={confirmarPin} 
              className="w-full py-4 bg-white text-black rounded-xl font-black uppercase hover:bg-zinc-200 transition-all active:scale-95 text-xs tracking-widest"
            >
              Aceder Perfil
            </button>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-6 text-[9px] text-zinc-600 hover:text-white uppercase font-black tracking-widest"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </main>
  );
}