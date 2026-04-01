"use client";

import { useCallback, useState } from "react";
import { supabase } from "@/app/supabase";
import { API_DB_PATH } from "@/lib/dbClient";
import { anilistExternalToProviders } from "@/lib/watchProviders";
import type { AbaPrincipal, ResultadoBusca } from "@/types/hunter_registry";

const CAPA_PLACEHOLDER =
  "https://placehold.co/400x600/1f1f22/52525b.png?text=SEM+CAPA";

export type GalaxiaModo = "anilist" | "tmdb" | "youtube";

function dedupeResultados(arr: ResultadoBusca[]): ResultadoBusca[] {
  return arr.filter(
    (valor, indice, self) =>
      indice ===
      self.findIndex(
        (t) =>
          t.id === valor.id &&
          t.fonte === valor.fonte &&
          t.tipoCatalogo === valor.tipoCatalogo
      )
  );
}

async function insertSearchCache(termoOriginal: string, resultadoIa: string) {
  await fetch(API_DB_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tabela: "search_cache",
      operacao: "insert",
      dados: { termo_original: termoOriginal, resultado_ia: resultadoIa },
    }),
  });
}

/**
 * Busca em catálogos externos para uma aba específica (mesma lógica do modal de adição).
 */
export async function fetchCatalogForAba(
  termoAnilist: string,
  abaPrincipal: AbaPrincipal
): Promise<ResultadoBusca[]> {
  if (termoAnilist.trim().length < 2) return [];

  const dedupe = dedupeResultados;

  let termoFinal = termoAnilist;

  if (
    abaPrincipal !== "FILME" &&
    abaPrincipal !== "LIVRO" &&
    abaPrincipal !== "JOGO" &&
    abaPrincipal !== "MUSICA"
  ) {
    const { data: cacheHit } = await supabase
      .from("search_cache")
      .select("resultado_ia")
      .ilike("termo_original", termoAnilist)
      .maybeSingle();

    if (cacheHit) {
      termoFinal = cacheHit.resultado_ia as string;
    } else {
      const resIA = await fetch("/api/tradutor-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ termo: termoAnilist }),
      });

      if (resIA.ok) {
        const jsonIA = await resIA.json();
        if (jsonIA.resultado && !String(jsonIA.resultado).includes("⚠️")) {
          termoFinal = jsonIA.resultado;
          await insertSearchCache(termoAnilist, termoFinal);
        }
      }
    }
  }

  if (abaPrincipal === "FILME" || abaPrincipal === "SERIE") {
    const tipoTmdb = abaPrincipal === "FILME" ? "movie" : "tv";
    const tipoCatalogo = abaPrincipal === "FILME" ? "movie" : "series";
    const res = await fetch(
      `/api/tmdb?q=${encodeURIComponent(termoFinal)}&type=${tipoTmdb}`
    );
    const json = await res.json();

    if (json.results) {
      return dedupe(
        json.results.slice(0, 5).map(
          (m: Record<string, unknown>): ResultadoBusca => ({
            id: m.id as number,
            titulo:
              (m.title as string) ||
              (m.name as string) ||
              (m.original_name as string) ||
              "",
            capa: m.poster_path
              ? `https://image.tmdb.org/t/p/w500${m.poster_path}`
              : CAPA_PLACEHOLDER,
            total: (m.number_of_episodes as number) || 1,
            sinopse: (m.overview as string) || "Sem sinopse.",
            fonte: "TMDB",
            providers: Array.isArray(m.providers) ? m.providers : [],
            tipoCatalogo,
          })
        )
      );
    }
    return [];
  }

  if (abaPrincipal === "LIVRO") {
    const res = await fetch(`/api/books?q=${encodeURIComponent(termoFinal)}`);
    const json = await res.json();

    if (json.items) {
      return dedupe(
        json.items.map((m: Record<string, unknown>): ResultadoBusca => {
          const vi = m.volumeInfo as Record<string, unknown> | undefined;
          const links = vi?.imageLinks as Record<string, string> | undefined;
          return {
            id: m.id as string,
            titulo: (vi?.title as string) || "Sem Título",
            capa:
              links?.thumbnail?.replace("http:", "https:") || CAPA_PLACEHOLDER,
            total: (vi?.pageCount as number) || 1,
            sinopse: (vi?.description as string) || "Sem sinopse.",
            fonte: "Google Books",
            tipoCatalogo: "book",
          };
        })
      );
    }
    return [];
  }

  if (abaPrincipal === "JOGO") {
    const resRawg = await fetch(`/api/rawg?q=${encodeURIComponent(termoFinal)}`);
    const jsonRawg = await resRawg.json();

    if (jsonRawg.results) {
      return dedupe(
        jsonRawg.results.map(
          (g: Record<string, unknown>): ResultadoBusca => ({
            id: g.id as number,
            titulo: g.name as string,
            capa: (g.background_image as string) || CAPA_PLACEHOLDER,
            total: 100,
            sinopse: "Lançamento: " + (g.released || "Não informada"),
            fonte: "RAWG",
            tipoCatalogo: "game",
          })
        )
      );
    }
    return [];
  }

  if (abaPrincipal === "MUSICA") {
    const resItunes = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(termoFinal)}&entity=album&limit=5`
    );
    const jsonItunes = await resItunes.json();

    if (jsonItunes.results) {
      return dedupe(
        jsonItunes.results.map(
          (m: Record<string, unknown>): ResultadoBusca => ({
            id: m.collectionId as number,
            titulo: `${m.artistName} - ${m.collectionName}`,
            capa:
              String(m.artworkUrl100 || "").replace("100x100bb", "600x600bb") ||
              "https://placehold.co/400x400/1f1f22/52525b.png?text=SEM+CAPA",
            total: (m.trackCount as number) || 1,
            sinopse: `Gênero: ${m.primaryGenreName}\nLançamento: ${String(m.releaseDate || "").substring(0, 4) || "N/A"}`,
            fonte: "Apple Music",
            tipoCatalogo: "song",
          })
        )
      );
    }
    return [];
  }

  if (abaPrincipal === "MANGA" || abaPrincipal === "ANIME") {
    const tipoCatalogo = abaPrincipal === "MANGA" ? "manga" : "anime";
    const resAni = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `query ($search: String, $type: MediaType) {
              Page(perPage: 5) {
                media(search: $search, type: $type) {
                  id
                  title { romaji english }
                  coverImage { large }
                  chapters
                  episodes
                  duration
                  description
                  externalLinks { url site type }
                }
              }
            }`,
        variables: { search: termoFinal, type: abaPrincipal },
      }),
    });
    const jsonAni = await resAni.json();
    const listaAni = jsonAni.data?.Page?.media || [];

    if (listaAni.length > 0) {
      const listaMapeada = listaAni.map(
        (m: Record<string, unknown>): ResultadoBusca => ({
          id: m.id as number,
          titulo:
            ((m.title as Record<string, string>)?.romaji ||
              (m.title as Record<string, string>)?.english) as string,
          capa: (m.coverImage as Record<string, string>)?.large || CAPA_PLACEHOLDER,
          total:
            abaPrincipal === "MANGA"
              ? (m.chapters as number) || 0
              : (m.episodes as number) || 0,
          sinopse: (m.description as string) || "",
          fonte: "AniList",
          providers: anilistExternalToProviders(
            m.externalLinks as
              | { url: string; site?: string | null; type?: string | null }[]
              | null
              | undefined
          ),
          duracao_episodio_minutos:
            abaPrincipal === "ANIME" &&
            typeof m.duration === "number" &&
            (m.duration as number) > 0
              ? (m.duration as number)
              : undefined,
          tipoCatalogo,
        })
      );
      return dedupe(listaMapeada);
    }

    const resMal = await fetch(
      `https://api.jikan.moe/v4/${abaPrincipal === "MANGA" ? "manga" : "anime"}?q=${encodeURIComponent(termoFinal)}&limit=5`
    );
    const jsonMal = await resMal.json();
    const listaMal: ResultadoBusca[] =
      jsonMal.data?.map((m: Record<string, unknown>): ResultadoBusca => {
        const durStr =
          abaPrincipal === "ANIME" && typeof m.duration === "string"
            ? m.duration
            : "";
        const durMatch = durStr.match(/(\d+)/);
        const durMin = durMatch ? parseInt(durMatch[1], 10) : 0;
        const images = m.images as Record<string, Record<string, string>>;
        return {
          id: m.mal_id as number,
          titulo: m.title as string,
          capa: images?.jpg?.large_image_url || CAPA_PLACEHOLDER,
          total:
            abaPrincipal === "MANGA"
              ? (m.chapters as number) || 0
              : (m.episodes as number) || 0,
          sinopse: (m.synopsis as string) || "",
          fonte: "MyAnimeList",
          duracao_episodio_minutos: durMin > 0 ? durMin : undefined,
          tipoCatalogo,
        };
      }) || [];
    return dedupe(listaMal);
  }

  return [];
}

async function fetchYoutubeCatalog(termo: string): Promise<ResultadoBusca[]> {
  const res = await fetch(
    `/api/youtube?q=${encodeURIComponent(termo.trim())}`
  );
  const json = (await res.json()) as {
    results?: Array<{
      id?: string;
      titulo?: string;
      url?: string;
      thumbnail?: string;
      duracao?: string;
    }>;
  };
  const rows = json.results || [];
  return rows.map(
    (v): ResultadoBusca => ({
      id: v.id || v.url || v.titulo || Math.random(),
      titulo: v.titulo || "Sem título",
      capa: v.thumbnail || CAPA_PLACEHOLDER,
      total: 1,
      sinopse: v.duracao ? `Duração: ${v.duracao}` : "Vídeo no YouTube",
      fonte: "YouTube",
      tipoCatalogo: "song",
      link_url: v.url || "",
    })
  );
}

export function useCatalogSearch() {
  const [resultados, setResultados] = useState<ResultadoBusca[]>([]);
  const [buscando, setBuscando] = useState(false);

  const limpar = useCallback(() => {
    setResultados([]);
  }, []);

  const buscarPorAba = useCallback(
    async (termo: string, abaPrincipal: AbaPrincipal) => {
      setBuscando(true);
      setResultados([]);
      try {
        const lista = await fetchCatalogForAba(termo.trim(), abaPrincipal);
        setResultados(lista);
      } catch (e) {
        console.error("[useCatalogSearch]", e);
        setResultados([]);
      } finally {
        setBuscando(false);
      }
    },
    []
  );

  const buscarGalaxia = useCallback(
    async (termoBruto: string, modo: GalaxiaModo) => {
      const t = termoBruto.trim();
      if (t.length < 2) return;

      setBuscando(true);
      setResultados([]);
      try {
        if (modo === "anilist") {
          const [manga, anime] = await Promise.all([
            fetchCatalogForAba(t, "MANGA"),
            fetchCatalogForAba(t, "ANIME"),
          ]);
          setResultados(dedupeResultados([...manga, ...anime]));
        } else if (modo === "tmdb") {
          const [filme, serie] = await Promise.all([
            fetchCatalogForAba(t, "FILME"),
            fetchCatalogForAba(t, "SERIE"),
          ]);
          setResultados(dedupeResultados([...filme, ...serie]));
        } else {
          const videos = await fetchYoutubeCatalog(t);
          setResultados(videos);
        }
      } catch (e) {
        console.error("[useCatalogSearch] galaxia", e);
        setResultados([]);
      } finally {
        setBuscando(false);
      }
    },
    []
  );

  return {
    resultados,
    buscando,
    buscarPorAba,
    buscarGalaxia,
    limpar,
    setResultados,
  };
}
