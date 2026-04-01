"use client";

import { useSyncExternalStore } from "react";

/**
 * Identificador do Hunter ativo (equivale ao "usuário logado" do app).
 * Fonte: sessionStorage `hunter_ativo` + evento `hunter_cosmeticos_update`.
 */
function getHunterAtivoSnapshot(): string | null {
  if (typeof window === "undefined") return null;
  const v = sessionStorage.getItem("hunter_ativo");
  return v?.trim() ? v.trim() : null;
}

function subscribeHunterAtivo(onChange: () => void) {
  const handler = () => onChange();
  window.addEventListener("hunter_cosmeticos_update", handler);
  return () => window.removeEventListener("hunter_cosmeticos_update", handler);
}

export function useHunterAtivo(): string | null {
  return useSyncExternalStore(subscribeHunterAtivo, getHunterAtivoSnapshot, () => null);
}
