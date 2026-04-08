"use client";

import { useCallback, useState } from "react";
import {
  API_DB_PATH,
  limparSenhaMestreNaSessao,
  obterSenhaMestreRevelada,
  parseJsonRespostaApiDb,
} from "@/lib/dbClient";
import { notificarEstanteAtualizada } from "@/lib/estanteEvents";
import { aplicarEconomiaPosAdicaoEstante } from "@/app/guilda/guildaRankEconomia";
import type { AbaPrincipal, NovoObraDraft } from "@/types/hunter_registry";

export type FeedbackTipo = "sucesso" | "erro" | "aviso" | "anilist";

export interface UseObraInsertOptions {
  usuarioAtual: string;
  solicitarSenhaMestre?: () => Promise<string | null>;
  mostrarFeedback?: (mensagem: string, tipo?: FeedbackTipo) => void;
  anilistToken?: string | null;
}

async function requisicaoDbInsertSegura(
  tabela: string,
  dados: Record<string, unknown>,
  senhaMestre: string | undefined,
  exigirSenhaMestre: boolean
) {
  const res = await fetch(API_DB_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tabela,
      operacao: "insert",
      dados,
      ...(exigirSenhaMestre && senhaMestre ? { senhaMestre } : {}),
    }),
  });

  const data = await parseJsonRespostaApiDb(res);
  if (res.status === 401) limparSenhaMestreNaSessao();

  return { ok: res.ok && !!data?.success, data };
}

export function useObraInsert({
  usuarioAtual,
  solicitarSenhaMestre,
  mostrarFeedback,
  anilistToken,
}: UseObraInsertOptions) {
  const [salvando, setSalvando] = useState(false);

  const obterSenhaMestreCacheada = useCallback(async () => {
    const senhaEmCache = obterSenhaMestreRevelada();
    if (senhaEmCache) return senhaEmCache;
    if (solicitarSenhaMestre) return await solicitarSenhaMestre();
    return null;
  }, [solicitarSenhaMestre]);

  const salvarObra = useCallback(
    async (
      novoManga: NovoObraDraft,
      abaPrincipal: AbaPrincipal
    ): Promise<{
      ok: boolean;
      error?: string;
      obraSalva?: NovoObraDraft & { usuario: string; ultima_leitura: string };
      /** Id numérico retornado pelo insert, quando a API devolve `data`. */
      insertedId?: number;
    }> => {
      if (!usuarioAtual) {
        return { ok: false, error: "Usuário não definido." };
      }

      setSalvando(true);
      try {
        const tabelaDb =
          abaPrincipal === "MANGA"
            ? "mangas"
            : abaPrincipal === "ANIME"
              ? "animes"
              : abaPrincipal === "FILME"
                ? "filmes"
                : abaPrincipal === "LIVRO"
                  ? "livros"
                  : abaPrincipal === "SERIE"
                    ? "series"
                    : abaPrincipal === "JOGO"
                      ? "jogos"
                      : "musicas";

        let progressoFinal = novoManga.capitulo_atual;
        if (novoManga.status === "Completos" && novoManga.total_capitulos > 0) {
          progressoFinal = novoManga.total_capitulos;
        }

        const linkTrim = novoManga.link_url?.trim() || "";
        const obraParaSalvar = {
          ...novoManga,
          capitulo_atual: progressoFinal,
          usuario: usuarioAtual,
          ultima_leitura: new Date().toISOString(),
          link_url: linkTrim || null,
          provider_data: novoManga.provider_data?.length
            ? novoManga.provider_data
            : null,
        };

        const dadosParaSalvar =
          tabelaDb === "animes"
            ? {
                ...obraParaSalvar,
                duracao_episodio_minutos: novoManga.duracao_episodio_minutos || 0,
                temporadas_totais: 0,
                temporadas_assistidas: 0,
                episodios_assistidos: 0,
              }
            : (() => {
                const { duracao_episodio_minutos: _d, ...rest } = obraParaSalvar;
                return rest;
              })();

        const senhaMestre = await obterSenhaMestreCacheada();
        if (!senhaMestre) {
          return { ok: false, error: "Operação cancelada." };
        }

        const resultado = await requisicaoDbInsertSegura(
          tabelaDb,
          dadosParaSalvar as Record<string, unknown>,
          senhaMestre,
          true
        );

        if (!resultado.ok) {
          const errMsg =
            (typeof resultado.data?.error === "string" && resultado.data.error) ||
            "Falha desconhecida.";
          mostrarFeedback?.(`Erro ao salvar: ${errMsg}`, "erro");
          return { ok: false, error: errMsg };
        }

        const obraSalvaResposta: NovoObraDraft & {
          usuario: string;
          ultima_leitura: string;
        } = {
          ...novoManga,
          capitulo_atual: progressoFinal,
          usuario: usuarioAtual,
          ultima_leitura: obraParaSalvar.ultima_leitura,
          link_url: linkTrim,
          provider_data: novoManga.provider_data ?? [],
        };
        const insertedRows = resultado.data?.data as unknown;
        const firstRow =
          Array.isArray(insertedRows) && insertedRows[0] && typeof insertedRows[0] === "object"
            ? (insertedRows[0] as { id?: unknown })
            : null;
        const insertedId =
          typeof firstRow?.id === "number" && Number.isFinite(firstRow.id)
            ? firstRow.id
            : undefined;

        notificarEstanteAtualizada();

        void (async () => {
          try {
            const efeitos = await aplicarEconomiaPosAdicaoEstante(usuarioAtual);
            efeitos.mensagensToast.forEach((msg) =>
              mostrarFeedback?.(msg, "sucesso")
            );
          } catch {
            /* economia opcional */
          }

          try {
            const token =
              (anilistToken && String(anilistToken).length > 0
                ? anilistToken
                : null) ||
              (typeof window !== "undefined"
                ? localStorage.getItem("anilist_token")
                : null);
            if (token && (abaPrincipal === "MANGA" || abaPrincipal === "ANIME")) {
              fetch("/api/anilist/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  token,
                  usuario: usuarioAtual,
                  tipoObra: abaPrincipal,
                  acao: "SALVAR",
                  titulo: String(obraParaSalvar.titulo ?? "").trim(),
                  capitulo: progressoFinal,
                  statusLocal: obraParaSalvar.status,
                }),
              }).catch((err) =>
                console.error("Falha silenciosa no sync do AniList:", err)
              );
            }
          } catch (e) {
            console.error("Erro ao tentar sincronizar novo item com AniList:", e);
          }
        })();

        return { ok: true, obraSalva: obraSalvaResposta, insertedId };
      } catch (e) {
        console.error("Erro no Frontend ao processar resposta:", e);
        console.error("[useObraInsert]", e);
        return { ok: false, error: String(e) };
      } finally {
        setSalvando(false);
      }
    },
    [
      usuarioAtual,
      obterSenhaMestreCacheada,
      mostrarFeedback,
      anilistToken,
    ]
  );

  return { salvarObra, salvando };
}
