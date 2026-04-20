// src/app/lib/dbClient.ts

import { getApiUrl } from "@/utils/api";

/** Caminho da rota em `src/app/api/db/route.ts` — relativo à origem (browser / mesmo deploy). */
export const API_DB_PATH = "/api/db" as const;

function disfarcarSenha(senha: string): string {
  return btoa(senha);
}

function revelarSenha(codigo: string): string {
  try {
    return atob(codigo);
  } catch {
    return codigo;
  }
}

function lerSenhaMestreArmazenada(): string | null {
  const armazenado =
    sessionStorage.getItem("acesso_mestre_senha") ||
    sessionStorage.getItem("senha_mestre_cache");
  if (!armazenado) return null;
  const revelada = revelarSenha(armazenado);
  return revelada.length > 0 ? revelada : null;
}

export function definirSenhaMestreNaSessao(senha: string): void {
  sessionStorage.setItem("senha_mestre_cache", disfarcarSenha(senha));
}

export function limparSenhaMestreNaSessao(): void {
  sessionStorage.removeItem("senha_mestre_cache");
  sessionStorage.removeItem("acesso_mestre_senha");
}

export function obterSenhaMestreRevelada(): string | null {
  return lerSenhaMestreArmazenada();
}

/** Lê o corpo JSON de `/api/db` sem lançar (corpo vazio → `{}`). */
export async function parseJsonRespostaApiDb(
  res: Response
): Promise<Record<string, unknown>> {
  try {
    const raw = await res.text();
    if (!raw.trim()) return {};
    return JSON.parse(raw) as Record<string, unknown>;
  } catch (error) {
    console.error("Erro no Frontend ao processar resposta:", error);
    return {};
  }
}

export async function requisicaoDbApi(
  method: "POST" | "DELETE",
  body: Record<string, unknown>
): Promise<{ ok: boolean; data?: any }> {
  const res = await fetch(getApiUrl(API_DB_PATH), {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await parseJsonRespostaApiDb(res);
  if (res.status === 401) limparSenhaMestreNaSessao();
  return { ok: res.ok && !!data?.success, data };
}

export const dbClient = {
  async update(tabela: string, id: number, dados: Record<string, unknown>) {
    const senhaMestre = lerSenhaMestreArmazenada();
    if (!senhaMestre) {
      return {
        success: false,
        error: "Senha mestra necessária para esta operação.",
        precisaSenhaMestre: true as const,
      };
    }

    try {
      const res = await fetch(getApiUrl(API_DB_PATH), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tabela, id, dados, senhaMestre }),
      });

      const data = await parseJsonRespostaApiDb(res);
      if (res.status === 401) {
        limparSenhaMestreNaSessao();
        return {
          success: false,
          error: (data.error as string) || "Acesso negado.",
          precisaSenhaMestre: true as const,
        };
      }
      if (!res.ok) throw new Error((data.error as string) || "Erro na atualização");

      return { success: true as const, data };
    } catch (error: any) {
      console.error("Erro no dbClient:", error.message);
      return { success: false, error: error.message };
    }
  },

  async delete(tabela: string, id: number) {
    const senhaMestre = lerSenhaMestreArmazenada();
    if (!senhaMestre) {
      return {
        success: false,
        error: "Senha mestra necessária para esta operação.",
        precisaSenhaMestre: true as const,
      };
    }

    try {
      const res = await fetch(getApiUrl(API_DB_PATH), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, tabela, senhaMestre }),
      });

      const data = await parseJsonRespostaApiDb(res);
      if (res.status === 401) {
        limparSenhaMestreNaSessao();
        return {
          success: false,
          error: (data.error as string) || "Acesso negado.",
          precisaSenhaMestre: true as const,
        };
      }
      if (!res.ok) throw new Error((data.error as string) || "Erro na exclusão");

      return { success: true as const };
    } catch (error: any) {
      console.error("Erro no dbClient:", error.message);
      return { success: false, error: error.message };
    }
  },
};
