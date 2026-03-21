import type { EstatisticasHunter, FiltroRanking } from "./types";

export function metricaRanking(filtro: FiltroRanking, hunter: EstatisticasHunter) {
  let corTexto = "text-indigo-400";
  let valor = hunter.total_obras;
  let label = "Obras Lidas";
  if (filtro === "ESMOLAS") {
    corTexto = "text-yellow-500";
    valor = hunter.esmolas;
    label = "Esmolas";
  } else if (filtro === "TEMPO") {
    corTexto = "text-purple-400";
    valor = hunter.tempo_vida;
    label = "Horas Consumidas";
  } else if (filtro === "CAPITULOS") {
    corTexto = "text-red-400";
    valor = hunter.total_capitulos;
    label = "Caps / Episódios";
  } else if (filtro === "FAVORITOS") {
    corTexto = "text-green-400";
    valor = hunter.total_favoritos;
    label = "Obras Favoritas";
  } else if (filtro === "CONQUISTAS") {
    corTexto = "text-cyan-400";
    valor = hunter.total_conquistas;
    label = "Troféus Desbloqueados";
  }
  return { corTexto, valor, label };
}
