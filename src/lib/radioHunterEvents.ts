/** Payload para anexar faixa à fila do RadioHunter sem trocar o que está tocando. */
export type RadioHunterTrackDetail = {
  titulo: string;
  url: string;
  /** Preferencialmente id do YouTube ou da URL. */
  id?: string;
};

export const RADIO_HUNTER_ADD_QUEUE = "RADIO_HUNTER_ADD_QUEUE";

/** Toca esta URL: entra na fila da playlist ativa e pula para a nova faixa. */
export const RADIO_HUNTER_PLAY_URL = "RADIO_HUNTER_PLAY_URL";

/** Abre fluxo no RadioHunter para anexar esta faixa à playlist escolhida pelo usuário. */
export const RADIO_HUNTER_SELECT_PLAYLIST = "RADIO_HUNTER_SELECT_PLAYLIST";
