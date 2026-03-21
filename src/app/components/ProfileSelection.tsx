"use client";

// ==========================================
// 📦 [SESSÃO 1] - IMPORTAÇÕES E INTERFACES
// ==========================================
import { useState } from "react";
import EfeitosVisuais from "./EfeitosVisuais";
// ✅ ADICIONADO: Componente de Identidade para renderizar as molduras
import HunterAvatar from "./HunterAvatar";

interface ProfileSelectionProps {
  perfis: any[];
  lojaItens: any[]; // ✅ Adicionado para buscar dados das molduras
  temas: any;
  tentarMudarPerfil: (nome: string) => void;
  perfilAlvoParaBloqueio: string | null;
  setPerfilAlvoParaBloqueio: (val: string | null) => void;
  pinDigitado: string;
  setPinDigitado: (pin: string) => void;
  confirmarPin: () => void;
  setPinAdminAberto: (aberto: boolean) => void;
  pinAdminAberto: boolean;
}

export default function ProfileSelection({ 
  perfis, 
  lojaItens,
  temas, 
  tentarMudarPerfil, 
  perfilAlvoParaBloqueio, 
  setPerfilAlvoParaBloqueio, 
  pinDigitado, 
  setPinDigitado, 
  confirmarPin, 
  setPinAdminAberto, 
  pinAdminAberto 
}: ProfileSelectionProps) {
  
  // ==========================================
  // 🖥️ [SESSÃO 2] - RENDERIZAÇÃO
  // ==========================================
  return (
    <div className="min-h-screen bg-[#040405] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* 🚀 INJETA O CSS GLOBAL DOS COSMÉTICOS SEM ATIVAR PARTÍCULAS NO LOGIN */}
      <EfeitosVisuais config={null} />

      {/* TÍTULO PRINCIPAL */}
      <div className="text-center mb-16 animate-in slide-in-from-top-8 fade-in duration-700">
        <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter text-white">Hunter<span className="text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]">.</span>Tracker</h1>
        <p className="text-[10px] md:text-xs font-bold uppercase tracking-[0.5em] text-zinc-500 mt-4">Selecione o seu perfil de Caçador</p>
      </div>

      {/* LISTA DE PERFIS - CALIBRADA PARA ALINHAMENTO S+ */}
      <div className="flex flex-wrap justify-center items-end gap-8 md:gap-12 max-w-5xl relative z-10">
        {perfis.filter(p => p.nome_original !== "Admin").map((perfil, i) => {
          const aura = perfil.cor_tema?.startsWith('#') ? temas.custom : (temas[perfil.cor_tema as keyof typeof temas] || temas.verde);
          
          const idMolduraAtiva = perfil.cosmeticos?.ativos?.moldura || "";
          const dadosMoldura = lojaItens?.find(item => item.id === idMolduraAtiva);

          return (
            <div 
              key={perfil.id} 
              className="flex flex-col items-center cursor-pointer group" 
              onClick={() => tentarMudarPerfil(perfil.nome_original)} 
              style={perfil.cor_tema?.startsWith('#') ? { '--aura': perfil.cor_tema } as React.CSSProperties : {}}
            >
              {/* CONTAINER COM TAMANHO FIXO PARA ALINHAMENTO COM ADMIN */}
              <div className="w-24 h-24 mb-4 transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-2 relative flex items-center justify-center">
                <HunterAvatar 
                  avatarUrl={perfil.avatar}
                  idMoldura={idMolduraAtiva}
                  imagemMolduraUrl={dadosMoldura?.imagem_url}
                  temaCor={perfil.cor_tema?.startsWith('#') ? perfil.cor_tema : perfil.custom_color}
                  tamanho="lg" // ✅ Aumentado para preencher os 96px (w-24)
                />
                
                {perfil.pin && (
                  <div className="absolute -bottom-1 -right-1 bg-black/90 p-1.5 rounded-lg border border-white/10 z-[30] shadow-xl">
                    <span className="text-[10px]">🔒</span>
                  </div>
                )}
              </div>

              <div className="h-10 flex flex-col items-center justify-start">
                <p className="text-white font-black uppercase tracking-widest text-sm group-hover:text-yellow-500 transition-colors text-center leading-tight">
                  {perfil.nome_exibicao || perfil.nome_original}
                </p>
                <p className="text-[8px] text-zinc-600 uppercase font-black tracking-widest mt-1">
                  {perfil.pin ? "Acesso Restrito" : "Hunter"}
                </p>
              </div>
            </div>
          );
        })}

        {/* ADMIN CARD - SINCRONIZADO EM TAMANHO */}
        <div className="flex flex-col items-center cursor-pointer group" onClick={() => setPinAdminAberto(true)}>
          <div className="w-24 h-24 mx-auto bg-zinc-950 rounded-3xl border-2 border-yellow-500/30 flex items-center justify-center text-4xl mb-4 transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-2 group-hover:border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.1)] group-hover:shadow-[0_0_30px_rgba(234,179,8,0.4)] relative overflow-hidden">
            👑
          </div>
          <div className="h-10 flex flex-col items-center justify-start">
            <p className="text-zinc-500 font-black uppercase tracking-widest text-sm group-hover:text-yellow-500 transition-colors text-center leading-tight">Admin</p>
            <p className="text-[8px] text-zinc-600 uppercase font-black tracking-widest mt-1">S+ Rank</p>
          </div>
        </div>
      </div>

      {/* MODAL DE PIN (NORMAL) */}
      {perfilAlvoParaBloqueio && perfilAlvoParaBloqueio !== "Admin" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
          <div className="bg-[#0e0e11] w-full max-w-sm p-8 rounded-[3rem] border border-zinc-800 shadow-2xl relative text-center">
            <button onClick={() => { setPerfilAlvoParaBloqueio(null); setPinDigitado(""); }} className="absolute top-6 right-8 text-zinc-600 hover:text-white font-black text-xl">✕</button>
            <div className="w-16 h-16 bg-zinc-900 rounded-2xl mx-auto mb-6 flex items-center justify-center text-2xl border border-zinc-800">🔒</div>
            <h2 className="text-xl font-black text-white uppercase tracking-widest mb-2">Acesso Restrito</h2>
            <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] mb-8">Digite o PIN para {perfilAlvoParaBloqueio}</p>
            <input type="password" maxLength={6} className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-white font-black text-center text-2xl tracking-[1em] outline-none focus:border-white transition-all mb-6" value={pinDigitado} onChange={(e) => setPinDigitado(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => e.key === 'Enter' && confirmarPin()} autoFocus />
            <button onClick={confirmarPin} className="w-full py-4 rounded-xl font-black uppercase tracking-widest transition-all bg-white text-black hover:bg-zinc-200">Desbloquear</button>
          </div>
        </div>
      )}

      {/* MODAL DE PIN (ADMIN) */}
      {pinAdminAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in zoom-in duration-200">
          <div className="bg-[#0e0e11] w-full max-w-sm p-8 rounded-[3rem] border border-yellow-500/30 shadow-[0_0_50px_rgba(234,179,8,0.1)] relative text-center">
            <button onClick={() => { setPinAdminAberto(false); setPinDigitado(""); }} className="absolute top-6 right-8 text-yellow-500/50 hover:text-yellow-500 font-black text-xl">✕</button>
            <div className="w-16 h-16 bg-yellow-500/10 rounded-2xl mx-auto mb-6 flex items-center justify-center text-3xl border border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.2)]">👑</div>
            <h2 className="text-xl font-black text-yellow-500 uppercase tracking-widest mb-2 drop-shadow-md">Acesso Divino</h2>
            <p className="text-[10px] text-yellow-500/60 uppercase tracking-[0.2em] mb-8">Credenciais de Mestre</p>
            <input type="password" maxLength={6} className="w-full bg-black border border-yellow-500/30 p-4 rounded-xl text-yellow-500 font-black text-center text-2xl tracking-[1em] outline-none focus:border-yellow-500 transition-all mb-6 shadow-[inset_0_0_10px_rgba(234,179,8,0.05)]" value={pinDigitado} onChange={(e) => setPinDigitado(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => { if(e.key === 'Enter') { setPerfilAlvoParaBloqueio("Admin"); setTimeout(confirmarPin, 50); } }} autoFocus />
            <button onClick={() => { setPerfilAlvoParaBloqueio("Admin"); setTimeout(confirmarPin, 50); }} className="w-full py-4 rounded-xl font-black uppercase tracking-widest transition-all bg-yellow-500/10 text-yellow-500 border border-yellow-500/50 hover:bg-yellow-500 hover:text-black shadow-[0_0_15px_rgba(234,179,8,0.2)]">Assumir o Controle</button>
          </div>
        </div>
      )}
    </div>
  );
}