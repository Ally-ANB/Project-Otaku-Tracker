import { supabase } from "../supabase";
import type { AbaPrincipalObra, FavoritoComTipo, ObraEstante } from "./types";

const TABELAS_FAVORITOS: { tabelaObra: string; abaPrincipal: AbaPrincipalObra }[] = [
  { tabelaObra: "mangas", abaPrincipal: "MANGA" },
  { tabelaObra: "animes", abaPrincipal: "ANIME" },
  { tabelaObra: "filmes", abaPrincipal: "FILME" },
  { tabelaObra: "livros", abaPrincipal: "LIVRO" },
  { tabelaObra: "series", abaPrincipal: "SERIE" },
  { tabelaObra: "jogos", abaPrincipal: "JOGO" },
  { tabelaObra: "musicas", abaPrincipal: "MUSICA" },
];

function favoritoAtivo(v: unknown): boolean {
  return v === true || v === "true" || v === 1;
}

/** Agrega favoritos de todas as estantes do hunter e retorna os 3 mais recentes por `ultima_leitura`. */
export async function buscarTop3FavoritosMembro(nomeUsuario: string): Promise<FavoritoComTipo[]> {
  const acc: FavoritoComTipo[] = [];

  for (const { tabelaObra, abaPrincipal } of TABELAS_FAVORITOS) {
    const { data, error } = await supabase.from(tabelaObra).select("*").eq("usuario", nomeUsuario);
    if (error) continue;
    for (const row of data || []) {
      const r = row as Record<string, unknown>;
      if (!favoritoAtivo(r.favorito)) continue;
      acc.push({
        obra: row as ObraEstante,
        abaPrincipal,
        tabelaObra,
      });
    }
  }

  acc.sort((a, b) => {
    const ta = new Date(a.obra.ultima_leitura || 0).getTime();
    const tb = new Date(b.obra.ultima_leitura || 0).getTime();
    return tb - ta;
  });

  return acc.slice(0, 3);
}
