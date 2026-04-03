import type { AbaPrincipal, Manga } from "@/types/hunter_registry";

export type ObraComTipo = Manga & { tipoObra: AbaPrincipal };

export function extractAnoDaSinopse(sinopse: string): string | null {
  const m = sinopse?.match?.(/Lançamento:\s*(\d{4})/i);
  return m ? m[1] : null;
}

export function sinopseContemGenero(sinopse: string, genero: string): boolean {
  const g = genero.toLowerCase();
  const m = sinopse?.match?.(/Gênero:\s*([^\n]+)/i);
  if (!m) return false;
  const blob = m[1].toLowerCase();
  if (g === "ação" || g === "acao") {
    return (
      blob.includes("ação") ||
      blob.includes("acao") ||
      blob.includes("action")
    );
  }
  if (g === "comedy") {
    return blob.includes("comedy") || blob.includes("comédia") || blob.includes("comedia");
  }
  return blob.includes(g);
}

export function rotularStatusPorTipo(status: string, tipo: AbaPrincipal): string {
  if (tipo === "ANIME" || tipo === "FILME" || tipo === "SERIE") {
    if (status === "Lendo") return "Assistindo";
    if (status === "Planejo Ler") return "Planejo Assistir";
  }
  if (tipo === "JOGO") {
    if (status === "Lendo") return "Jogando";
    if (status === "Planejo Ler") return "Planejo Jogar";
  }
  if (tipo === "MUSICA" && status === "Lendo") return "Ouvindo";
  return status;
}

export function anexarTipo(lista: Manga[], tipo: AbaPrincipal): ObraComTipo[] {
  return lista.map((m) => ({ ...m, tipoObra: tipo }));
}
