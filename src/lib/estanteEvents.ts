/** Disparado após insert/update/delete na estante para a home recarregar listas sem F5. */
export const ESTANTE_ATUALIZADA_EVENT = "estante:atualizada" as const;

export function notificarEstanteAtualizada(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ESTANTE_ATUALIZADA_EVENT));
}
