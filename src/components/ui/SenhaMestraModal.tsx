"use client";

import { useEffect, useState } from "react";

type SenhaMestraModalProps = {
  aberto: boolean;
  aoConfirmar: (senha: string) => void;
  aoCancelar: () => void;
};

export default function SenhaMestraModal({ aberto, aoConfirmar, aoCancelar }: SenhaMestraModalProps) {
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);

  useEffect(() => {
    if (!aberto) {
      setSenha("");
      setMostrarSenha(false);
    }
  }, [aberto]);

  if (!aberto) return null;

  function confirmar() {
    const s = senha.trim();
    if (!s) return;
    aoConfirmar(s);
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-6 backdrop-blur-md">
      <div
        className="w-full max-w-md rounded-[2rem] border-2 border-cyan-500/60 bg-[#050508] p-8 shadow-[0_0_40px_rgba(34,211,238,0.25),inset_0_0_60px_rgba(34,211,238,0.04)] animate-in zoom-in fade-in duration-300"
        role="dialog"
        aria-modal="true"
        aria-labelledby="senha-mestra-titulo"
      >
        <div className="mb-6 text-center">
          <div className="mb-3 text-4xl drop-shadow-[0_0_12px_rgba(34,211,238,0.5)]">🛡️</div>
          <h2 id="senha-mestra-titulo" className="text-xl font-black uppercase italic tracking-wider text-cyan-400">
            Senha Mestra
          </h2>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">
            Confirme sua identidade Hunter
          </p>
        </div>

        <div className="relative mb-6">
          <input
            autoFocus
            type={mostrarSenha ? "text" : "password"}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              confirmar();
            }}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="••••••••"
            className="w-full rounded-2xl border border-cyan-500/30 bg-zinc-950/80 py-4 pl-4 pr-14 text-sm text-white outline-none transition-all placeholder:text-zinc-600 focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(34,211,238,0.2)]"
          />
          <button
            type="button"
            onClick={() => setMostrarSenha((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-2 text-lg text-cyan-400/80 transition-colors hover:bg-cyan-500/10 hover:text-cyan-300"
            title={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
            aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
          >
            👁️
          </button>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={confirmar}
            className="flex-1 rounded-2xl bg-gradient-to-r from-cyan-600 to-emerald-600 py-4 text-[10px] font-black uppercase tracking-widest text-white shadow-[0_0_24px_rgba(34,211,238,0.35)] transition-all hover:brightness-110 active:scale-[0.98]"
          >
            Confirmar
          </button>
          <button
            type="button"
            onClick={aoCancelar}
            className="rounded-2xl border border-zinc-700 bg-zinc-900/80 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 transition-all hover:border-zinc-500 hover:text-white"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
