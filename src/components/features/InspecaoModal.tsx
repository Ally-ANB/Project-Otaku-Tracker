"use client";

import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Languages, Loader2 } from "lucide-react";
import type { EstanteItem, NovoObraDraft, TipoObra } from "@/types/hunter_registry";

export type InspecaoDraft = Partial<EstanteItem> &
  Partial<NovoObraDraft> & {
    tipo_obra?: TipoObra;
  };

export type InspecaoModalProps = {
  isOpen: boolean;
  onClose: () => void;
  draft: InspecaoDraft;
  onDraftChange: Dispatch<SetStateAction<InspecaoDraft>>;
  isManual: boolean;
  /** Aberto a partir de resultado da galáxia (pré-visualização) vs. registro manual na lateral. */
  modoGalaxia?: boolean;
  isEditing: boolean;
  onSave: () => void | Promise<void>;
  onError?: (msg: string) => void;
  salvando?: boolean;
};

export function InspecaoModal({
  isOpen,
  onClose,
  draft,
  onDraftChange,
  isManual,
  modoGalaxia = false,
  isEditing,
  onSave,
  onError,
  salvando = false,
}: InspecaoModalProps) {
  const [traduzindo, setTraduzindo] = useState(false);
  const [inspecaoSalvandoLocal, setInspecaoSalvandoLocal] = useState(false);

  const tituloHeader = isManual
    ? "Registro Manual"
    : isEditing
      ? "Editar na Estante"
      : "Inspecionar Obra";

  const handleTraduzir = async () => {
    if (!draft.sinopse) return;
    setTraduzindo(true);
    try {
      const textoLimpo = draft.sinopse.replace(/<[^>]*>?/gm, "");
      const res = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=pt-BR&dt=t&q=${encodeURIComponent(textoLimpo)}`
      );
      const json = (await res.json()) as unknown[];
      const traduzido = (Array.isArray(json[0]) ? json[0] : [])
        .map((item: unknown) => (Array.isArray(item) ? String(item[0]) : ""))
        .join("");
      onDraftChange({ ...draft, sinopse: traduzido });
    } catch {
      onError?.("Erro ao traduzir sinopse.");
    } finally {
      setTraduzindo(false);
    }
  };

  async function handleSalvar() {
    setInspecaoSalvandoLocal(true);
    try {
      await Promise.resolve(onSave());
    } catch (error) {
      console.error("Erro no Frontend ao processar resposta:", error);
    } finally {
      setInspecaoSalvandoLocal(false);
    }
  }

  const busy = salvando || inspecaoSalvandoLocal;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="modal-inspecao"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          data-inspecao-galaxia={modoGalaxia ? "1" : "0"}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md sm:p-6"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="flex max-h-full w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-cyan-900/50 bg-zinc-950/80 shadow-[0_0_15px_rgba(8,145,178,0.15)] backdrop-blur-xl sm:max-w-2xl lg:max-w-3xl"
          >
            <div className="flex items-center justify-between border-b border-cyan-500/10 bg-black/30 p-5">
              <h2 className="text-sm font-black uppercase tracking-widest text-cyan-300">{tituloHeader}</h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-cyan-500/20 bg-cyan-500/[0.06] p-2 text-zinc-400 transition-all hover:border-cyan-400/40 hover:bg-cyan-500/10 hover:text-cyan-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="custom-scrollbar space-y-6 overflow-y-auto p-6">
              {isManual ? (
                <>
                  <div className="space-y-1.5">
                    <label className="ml-1 text-[9px] font-black uppercase tracking-widest text-zinc-500">
                      Título
                    </label>
                    <input
                      type="text"
                      value={draft.titulo || ""}
                      onChange={(e) => onDraftChange({ ...draft, titulo: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-black/25 p-3 text-sm font-bold text-cyan-50/95 outline-none transition-all focus:border-cyan-500/40 focus:bg-black/40 focus:shadow-[0_0_12px_rgba(34,211,238,0.12)]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="ml-1 text-[9px] font-black uppercase tracking-widest text-zinc-500">
                      URL da Capa
                    </label>
                    <input
                      type="text"
                      value={draft.capa || draft.capa_url || ""}
                      onChange={(e) =>
                        onDraftChange({ ...draft, capa: e.target.value, capa_url: e.target.value })
                      }
                      className="w-full rounded-lg border border-white/10 bg-black/25 p-3 text-sm text-zinc-300 outline-none transition-all focus:border-cyan-500/40 focus:bg-black/40 focus:shadow-[0_0_12px_rgba(34,211,238,0.12)]"
                    />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-4 rounded-xl border border-white/5 bg-black/20 p-4 sm:flex-row sm:items-start sm:gap-5">
                  <div className="relative aspect-[2/3] h-36 w-24 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-zinc-900 shadow-md sm:h-40 sm:w-[6.5rem]">
                    {draft.capa || draft.capa_url ? (
                      <img
                        src={draft.capa || draft.capa_url || ""}
                        alt="Capa"
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col text-center sm:text-left">
                    <h3 className="text-base font-bold leading-snug text-white sm:text-lg">{draft.titulo}</h3>
                    <span className="mt-2 text-[9px] font-black uppercase tracking-widest text-cyan-500/90">
                      {draft.tipo_obra} • Dados Oficiais
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 sm:gap-5">
                <div className="space-y-1.5">
                  <label className="ml-1 text-[9px] font-black uppercase tracking-widest text-zinc-500">Status</label>
                  <select
                    value={draft.status || "Planejo Ler"}
                    onChange={(e) => {
                      const v = e.target.value;
                      const total = Number(draft.total_capitulos) || 0;
                      if (v === "Completos" && total > 0) {
                        onDraftChange({ ...draft, status: v, capitulo_atual: total });
                      } else {
                        onDraftChange({ ...draft, status: v });
                      }
                    }}
                    className="w-full cursor-pointer rounded-lg border border-white/10 bg-black/25 p-3 text-sm font-bold uppercase tracking-wider text-cyan-100/90 outline-none transition-all focus:border-cyan-500/40 focus:bg-black/40 focus:shadow-[0_0_12px_rgba(34,211,238,0.12)]"
                  >
                    <option value="Lendo" className="bg-zinc-900 text-white">
                      Lendo / Assistindo
                    </option>
                    <option value="Planejo Ler" className="bg-zinc-900 text-white">
                      Planejo
                    </option>
                    <option value="Completos" className="bg-zinc-900 text-white">
                      Completos
                    </option>
                    <option value="Pausados" className="bg-zinc-900 text-white">
                      Pausados
                    </option>
                    <option value="Dropados" className="bg-zinc-900 text-white">
                      Dropados
                    </option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="ml-1 text-[9px] font-black uppercase tracking-widest text-zinc-500">
                    Progresso Atual
                  </label>
                  <div className="flex h-[46px] items-center gap-2 rounded-lg border border-white/10 bg-black/25 p-1 transition-all focus-within:border-cyan-500/40 focus-within:bg-black/40 focus-within:shadow-[0_0_12px_rgba(34,211,238,0.12)]">
                    <button
                      type="button"
                      onClick={() =>
                        onDraftChange((prev) => ({
                          ...prev,
                          capitulo_atual: Math.max(0, (prev.capitulo_atual || 0) - 1),
                        }))
                      }
                      className="flex h-full w-10 items-center justify-center rounded-md border border-transparent text-zinc-500 transition-all hover:border-cyan-500/25 hover:bg-cyan-500/10 hover:text-cyan-100"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={draft.capitulo_atual || 0}
                      onChange={(e) =>
                        onDraftChange({ ...draft, capitulo_atual: parseInt(e.target.value, 10) || 0 })
                      }
                      className="h-full flex-1 bg-transparent text-center text-lg font-bold text-cyan-400 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        onDraftChange((prev) => ({
                          ...prev,
                          capitulo_atual: (prev.capitulo_atual || 0) + 1,
                        }))
                      }
                      className="flex h-full w-10 items-center justify-center rounded-md border border-transparent text-zinc-500 transition-all hover:border-cyan-500/25 hover:bg-cyan-500/10 hover:text-cyan-100"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="ml-1 flex items-center justify-between">
                  <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Sinopse</label>
                  <button
                    type="button"
                    onClick={() => void handleTraduzir()}
                    disabled={traduzindo || !draft.sinopse}
                    className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-blue-400/80 transition-colors hover:text-blue-300 disabled:opacity-50"
                  >
                    {traduzindo ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Languages className="h-3 w-3" />
                    )}
                    Traduzir
                  </button>
                </div>
                <textarea
                  value={draft.sinopse || ""}
                  onChange={(e) => onDraftChange({ ...draft, sinopse: e.target.value })}
                  className="custom-scrollbar min-h-[200px] w-full resize-y rounded-lg border border-white/10 bg-black/25 p-4 text-sm leading-relaxed text-zinc-300 outline-none transition-all focus:border-cyan-500/40 focus:bg-black/40 focus:shadow-[0_0_12px_rgba(34,211,238,0.12)] sm:min-h-[220px]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="ml-1 text-[9px] font-black uppercase tracking-widest text-zinc-500">
                  Link Manual / Onde Assistir
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={draft.link_url || ""}
                  onChange={(e) => onDraftChange({ ...draft, link_url: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-black/25 p-3 text-sm text-zinc-300 outline-none transition-all focus:border-cyan-500/40 focus:bg-black/40 placeholder:text-zinc-700 focus:shadow-[0_0_12px_rgba(34,211,238,0.12)]"
                />
              </div>
            </div>

            <div className="border-t border-cyan-500/10 bg-black/35 p-5">
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleSalvar()}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-500/35 bg-cyan-500/[0.08] py-4 text-xs font-black uppercase tracking-widest text-cyan-300 transition-all hover:border-cyan-400/50 hover:bg-cyan-500/15 hover:text-cyan-100 hover:shadow-[0_0_18px_rgba(34,211,238,0.2)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : isEditing ? (
                  "Salvar Alterações"
                ) : (
                  "Adicionar à Estante"
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
