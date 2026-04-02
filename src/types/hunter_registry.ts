import type { WatchProvider } from "@/lib/watchProviders";

/** Tipos de mídia na estante (busca / badges). */
export type TipoObra =
  | "manga"
  | "anime"
  | "movie"
  | "series"
  | "game"
  | "book"
  | "song";

/** Aba principal da home / modal de adição (MAIÚSCULO). */
export type AbaPrincipal =
  | "MANGA"
  | "ANIME"
  | "FILME"
  | "LIVRO"
  | "SERIE"
  | "JOGO"
  | "MUSICA";

/** Converte tipo da estante (minúsculo) → aba da UI. */
export const TIPO_OBRA_PARA_ABA: Record<TipoObra, AbaPrincipal> = {
  manga: "MANGA",
  anime: "ANIME",
  movie: "FILME",
  series: "SERIE",
  book: "LIVRO",
  game: "JOGO",
  song: "MUSICA",
};

/** Converte aba da UI → tipo da estante. */
export const ABA_PARA_TIPO_OBRA: Record<AbaPrincipal, TipoObra> = {
  MANGA: "manga",
  ANIME: "anime",
  FILME: "movie",
  SERIE: "series",
  LIVRO: "book",
  JOGO: "game",
  MUSICA: "song",
};

/** Tabela Supabase por tipo (ex.: DELETE em `/api/db`). */
export const TIPO_OBRA_TABELA_DB: Record<TipoObra, string> = {
  manga: "mangas",
  anime: "animes",
  movie: "filmes",
  series: "series",
  book: "livros",
  game: "jogos",
  song: "musicas",
};

/** Ordem das categorias no OmniSearch. */
export const TIPO_OBRA_ORDEM_UI: readonly TipoObra[] = [
  "manga",
  "anime",
  "series",
  "movie",
  "book",
  "game",
  "song",
] as const;

/** Título da categoria na UI. */
export const TIPO_OBRA_LABEL_SECAO: Record<TipoObra, string> = {
  manga: "Mangá",
  anime: "Anime",
  series: "Série",
  movie: "Filme",
  book: "Livro",
  game: "Jogo",
  song: "Música",
};

/** Tag compacta no card (OmniSearch). */
export const TIPO_OBRA_TAG_MINI: Record<TipoObra, string> = {
  manga: "MAN",
  anime: "ANM",
  series: "SÉR",
  movie: "FIL",
  book: "LIV",
  game: "JGO",
  song: "MUS",
};

/** Fontes retornadas pelo catálogo externo. */
export type FonteCatalogo =
  | "AniList"
  | "MyAnimeList"
  | "TMDB"
  | "Google Books"
  | "Open Library"
  | "RAWG"
  | "Apple Music"
  | "YouTube";

/** Resultado unificado da busca em APIs externas (catálogo). */
export interface ResultadoBusca {
  id: number | string;
  titulo: string;
  capa: string;
  total: number;
  sinopse: string;
  fonte: FonteCatalogo;
  providers?: WatchProvider[];
  /** Minutos por episódio (anime), quando disponível. */
  duracao_episodio_minutos?: number;
  /** Tipo na estante ao importar (mangá vs anime, filme vs série, etc.). */
  tipoCatalogo: TipoObra;
  /** Link externo opcional (ex.: vídeo YouTube). */
  link_url?: string;
}

/** Rascunho para inserção na estante (alinha ao modal de adição). */
export interface NovoObraDraft {
  titulo: string;
  capa: string;
  capitulo_atual: number;
  total_capitulos: number;
  status: string;
  sinopse: string;
  favorito: boolean;
  link_url: string;
  provider_data: WatchProvider[];
  duracao_episodio_minutos: number;
}

/** Item normalizado para resultados de busca na estante. */
export interface EstanteItem {
  id?: number | string;
  titulo: string;
  capa?: string | null;
  capa_url?: string | null;
  /** Link direto (ex.: YouTube na estante de músicas). */
  link_url?: string | null;
  progresso: number;
  tipo_obra: TipoObra;
}

/** Converte resultado de catálogo externo para o mesmo shape da estante (grid unificada). */
export function resultadoBuscaParaEstanteItem(r: ResultadoBusca): EstanteItem {
  return {
    id: r.id,
    titulo: r.titulo,
    capa: r.capa,
    capa_url: r.capa,
    link_url: r.link_url?.trim() ? r.link_url.trim() : null,
    progresso: 0,
    tipo_obra: r.tipoCatalogo,
  };
}

/** Registro de obra na estante (todas as abas de mídia). */
export interface Manga {
  id: number;
  titulo: string;
  capa: string;
  capitulo_atual: number;
  total_capitulos: number;
  status: string;
  sinopse: string;
  nota_pessoal: number;
  nota_amigos: number;
  comentarios: string;
  usuario: string;
  ultima_leitura: string;
  favorito: boolean;
  link_url?: string | null;
  capa_url?: string | null;
  provider_data?: unknown;
  temporadas_assistidas?: number | null;
  temporadas_totais?: number | null;
}
