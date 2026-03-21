export interface Mensagem {
  id: number;
  usuario: string;
  mensagem: string;
  tipo: string;
  criado_em: string;
}

export interface Perfil {
  nome_original: string;
  nome_exibicao: string;
  avatar: string;
  cor_tema: string;
  custom_color?: string;
  esmolas: number;
  figurinhas?: string[];
  cosmeticos?: { ativos: Record<string, any> };
  chat_farm_diario?: { data: string; ganhos: number };
}

export interface EstatisticasHunter extends Perfil {
  total_obras: number;
  total_capitulos: number;
  tempo_vida: number;
  total_favoritos: number;
  elo: string;
  total_conquistas: number;
}

export type FiltroRanking =
  | "OBRAS"
  | "ESMOLAS"
  | "TEMPO"
  | "CAPITULOS"
  | "FAVORITOS"
  | "CONQUISTAS";

export type AbaPrincipalObra = "MANGA" | "ANIME" | "FILME" | "LIVRO" | "SERIE" | "JOGO" | "MUSICA";

/** Alinhado ao modal de detalhes / estante (Supabase). */
export interface ObraEstante {
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
}

export interface FavoritoComTipo {
  obra: ObraEstante;
  abaPrincipal: AbaPrincipalObra;
  tabelaObra: string;
}
