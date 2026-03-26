// src/app/lib/dbClient.ts

/** Rota em `src/app/api/db/route.ts` — sempre com barra inicial (path absoluto no host). */
export const API_DB_PATH = "/api/db" as const;

/**
 * URL absoluta para a API DB. No browser usa a origem atual; no servidor usa
 * NEXT_PUBLIC_APP_URL ou VERCEL_URL para evitar fetch sem host (404 em alguns ambientes).
 */
export function urlApiDb(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return new URL(API_DB_PATH, window.location.origin).href;
  }
  const base =
    (process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")) ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  return base ? `${base}${API_DB_PATH}` : API_DB_PATH;
}

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

export async function requisicaoDbApi(
  method: "POST" | "DELETE",
  body: Record<string, unknown>
): Promise<{ ok: boolean; data?: any }> {
  const res = await fetch(urlApiDb(), {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let data: any = {};
  try {
    data = await res.json();
  } catch {
    /* ignore */
  }
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
      const res = await fetch(urlApiDb(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tabela, id, dados, senhaMestre }),
      });

      const data = await res.json();
      if (res.status === 401) {
        limparSenhaMestreNaSessao();
        return {
          success: false,
          error: data.error || "Acesso negado.",
          precisaSenhaMestre: true as const,
        };
      }
      if (!res.ok) throw new Error(data.error || "Erro na atualização");

      return { success: true as const };
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
      const res = await fetch(urlApiDb(), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, tabela, senhaMestre }),
      });

      const data = await res.json();
      if (res.status === 401) {
        limparSenhaMestreNaSessao();
        return {
          success: false,
          error: data.error || "Acesso negado.",
          precisaSenhaMestre: true as const,
        };
      }
      if (!res.ok) throw new Error(data.error || "Erro na exclusão");

      return { success: true as const };
    } catch (error: any) {
      console.error("Erro no dbClient:", error.message);
      return { success: false, error: error.message };
    }
  },
};
