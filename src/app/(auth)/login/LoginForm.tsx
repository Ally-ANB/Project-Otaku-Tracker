"use client";

import { createClient } from "@/utils/supabase/client";
import { ArrowLeft, Lock, LogIn, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResetSuccess(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (signError) {
      setError(
        signError.message === "Invalid login credentials"
          ? "E-mail ou senha incorretos."
          : signError.message
      );
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResetSuccess(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Informe o e-mail para recuperação.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      trimmed,
      { redirectTo: `${origin}/login` }
    );
    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setResetSuccess(
      "Se existir uma conta com este e-mail, você receberá o link de recuperação em instantes."
    );
    setIsResetMode(false);
    setPassword("");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16 text-white">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(34,211,238,0.12),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(168,85,247,0.08),transparent_50%)]"
        aria-hidden
      />

      <div className="relative w-full max-w-md rounded-[2rem] border border-white/10 bg-zinc-950/40 p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset,0_25px_50px_-12px_rgba(0,0,0,0.65)] backdrop-blur-xl md:p-10">
        <div className="mb-8 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-400/90">
            Hunter System
          </p>
          <h1 className="mt-2 text-2xl font-black italic tracking-tight text-white md:text-3xl">
            Acesso à <span className="text-cyan-400">Estante</span>
          </h1>
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
            Entre com sua conta Supabase Auth
          </p>
        </div>

        <form
          onSubmit={isResetMode ? handleReset : handleLogin}
          className="flex flex-col gap-5"
        >
          <div className="space-y-2">
            <label
              htmlFor="login-email"
              className="text-[10px] font-black uppercase tracking-widest text-zinc-400"
            >
              E-mail
            </label>
            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-500/70"
                strokeWidth={2}
                aria-hidden
              />
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/30 py-3.5 pl-11 pr-4 text-sm text-white outline-none ring-cyan-500/30 transition placeholder:text-zinc-600 focus:border-cyan-500/40 focus:ring-2"
                placeholder="voce@exemplo.com"
              />
            </div>
          </div>

          {!isResetMode ? (
            <div className="space-y-2">
              <label
                htmlFor="login-password"
                className="text-[10px] font-black uppercase tracking-widest text-zinc-400"
              >
                Senha
              </label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-500/70"
                  strokeWidth={2}
                  aria-hidden
                />
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 py-3.5 pl-11 pr-4 text-sm text-white outline-none ring-cyan-500/30 transition placeholder:text-zinc-600 focus:border-cyan-500/40 focus:ring-2"
                  placeholder="••••••••"
                />
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            {!isResetMode ? (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setResetSuccess(null);
                  setIsResetMode(true);
                }}
                className="text-left text-[10px] font-semibold uppercase tracking-wider text-zinc-500 transition hover:text-cyan-400/90"
              >
                Esqueci minha senha
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setIsResetMode(false);
                }}
                className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 transition hover:text-cyan-400/90"
              >
                <ArrowLeft className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                Voltar ao login
              </button>
            )}
          </div>

          {error ? (
            <p
              className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2.5 text-center text-[11px] font-semibold text-red-400"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          {resetSuccess ? (
            <p
              className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-2.5 text-center text-[11px] font-semibold text-emerald-300/95"
              role="status"
            >
              {resetSuccess}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="group mt-1 flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-cyan-500/20 to-cyan-600/10 py-4 text-[11px] font-black uppercase tracking-[0.25em] text-cyan-100 shadow-[0_0_24px_-4px_rgba(34,211,238,0.35)] transition hover:border-cyan-400/50 hover:from-cyan-400/30 hover:to-cyan-500/15 hover:shadow-[0_0_32px_-4px_rgba(34,211,238,0.5)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isResetMode ? (
              <>
                <Mail
                  className="h-4 w-4 transition group-hover:scale-105"
                  strokeWidth={2.25}
                  aria-hidden
                />
                {loading ? "Enviando…" : "Enviar link de recuperação"}
              </>
            ) : (
              <>
                <LogIn
                  className="h-4 w-4 transition group-hover:scale-105"
                  strokeWidth={2.25}
                  aria-hidden
                />
                {loading ? "Entrando…" : "Entrar"}
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
