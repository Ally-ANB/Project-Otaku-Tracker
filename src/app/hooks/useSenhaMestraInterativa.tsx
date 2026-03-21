"use client";

import { useCallback, useRef, useState } from "react";
import SenhaMestraModal from "../components/SenhaMestraModal";
import { definirSenhaMestreNaSessao, obterSenhaMestreRevelada } from "@/lib/dbClient";

export function useSenhaMestraInterativa() {
  const [modalAberto, setModalAberto] = useState(false);
  const resolverRef = useRef<((valor: string | null) => void) | null>(null);

  const obterSenhaMestreInterativa = useCallback(async (): Promise<string | null> => {
    const emCache = obterSenhaMestreRevelada();
    if (emCache) return emCache;
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setModalAberto(true);
    });
  }, []);

  const confirmarSenhaMestraModal = useCallback((senha: string) => {
    const s = senha.trim();
    if (!s) return;
    definirSenhaMestreNaSessao(s);
    setModalAberto(false);
    resolverRef.current?.(s);
    resolverRef.current = null;
  }, []);

  const cancelarSenhaMestraModal = useCallback(() => {
    setModalAberto(false);
    resolverRef.current?.(null);
    resolverRef.current = null;
  }, []);

  const modalSenhaMestra = (
    <SenhaMestraModal
      aberto={modalAberto}
      aoConfirmar={confirmarSenhaMestraModal}
      aoCancelar={cancelarSenhaMestraModal}
    />
  );

  return { obterSenhaMestreInterativa, modalSenhaMestra };
}
