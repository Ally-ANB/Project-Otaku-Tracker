"use client";
import { useState } from "react";

export default function AcessoMestre({ aoAutorizar }: { aoAutorizar: () => void }) {
  const [senhaDigitada, setSenhaDigitada] = useState("");
  const [erro, setErro] = useState(false);
  const [validando, setValidando] = useState(false);

  // ✅ CORREÇÃO S+: Validação blindada via Backend Route
  async function verificarSenha() {
    setValidando(true);
    
    try {
      const res = await fetch('/api/auth/anilist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'mestre', senhaDigitada })
      });
      
      const data = await res.json();

      if (data.autorizado) {
        sessionStorage.setItem("acesso_mestre", "true");
        aoAutorizar();
      } else {
        setErro(true);
        setSenhaDigitada("");
        setTimeout(() => setErro(false), 2000);
      }
    } catch (error) {
      setErro(true);
      setTimeout(() => setErro(false), 2000);
    } finally {
      setValidando(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#040405] flex items-center justify-center p-6 text-[#e5e5e5]">
      <div className="max-w-md w-full bg-[#0e0e11] border border-zinc-800 p-12 rounded-[3.5rem] shadow-2xl text-center animate-in fade-in zoom-in duration-500">
        <div className="text-6xl mb-8 drop-shadow-[0_0_20px_rgba(34,197,94,0.2)]">🛡️</div>
        <h1 className="text-2xl font-black uppercase tracking-widest mb-2">Estante Restrita</h1>
        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.3em] mb-10">Introduza a Senha do Portão Principal</p>
        
        <input 
          autoFocus
          type="password" 
          placeholder="••••••••"
          className={`w-full bg-zinc-950 border ${erro ? 'border-red-500' : 'border-zinc-800'} focus:border-green-500 rounded-2xl py-5 text-center text-xl outline-none transition-all mb-6`}
          value={senhaDigitada}
          onChange={(e) => setSenhaDigitada(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && verificarSenha()}
        />

        <button 
          onClick={verificarSenha}
          disabled={validando}
          className="w-full bg-white text-black font-black uppercase tracking-widest py-5 rounded-2xl hover:bg-green-500 hover:text-white transition-all shadow-lg active:scale-95"
        >
          {validando ? "Validando..." : "Entrar na Estante"}
        </button>

        {erro && <p className="mt-6 text-red-500 text-[10px] font-black uppercase animate-bounce">Senha Incorreta!</p>}
      </div>
    </main>
  );
}