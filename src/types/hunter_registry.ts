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

/** Fontes retornadas pelo catálogo externo. */
export type FonteCatalogo =
  | "AniList"
  | "MyAnimeList"
  | "TMDB"
  | "Google Books"
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
