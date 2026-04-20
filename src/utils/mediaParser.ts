export function parseMediaFilename(
  filename: string,
  folderName?: string
): {
  title: string;
  episode: string | null;
  year: string | null;
  parsedTitle: string;
  parsedEpisode: string | null;
  searchQuery: string;
} {
  let raw = filename.replace(/\.[^/.]+$/, ""); // Tira extensão

  // 1. Extração Universal de Ano
  const yearMatch = raw.match(/\b(19|20)\d{2}\b/);
  const year = yearMatch ? yearMatch[0] : null;

  // 2. Limpeza Primária (Brackets e Junk Words Expandida)
  let clean = raw.replace(/\[.*?\]|\(.*?\)/g, " ");

  // Lista Negra Massiva (Trackers, formatos e termos pt-BR)
  const junkRegex =
    /\b(?:720p|1080p|480p|2160p|4k|x264|x265|HEVC|WEB[- ]?DL|BluRay|BDRip|BRRip|DVD|DVDRip|HDTV|Dual[- ]?Audio|Dual|Dublado|Legendado|PT[- ]?BR|PT[- ]?PT|ENG|AAC|AC3|5\.1|7\.1|10bit|By[- ]?\w+|Lapumi|Wolverdon|ComandoTorrents|Bludv|Torrent)\b/gi;

  clean = clean.replace(junkRegex, " ");
  if (year) clean = clean.replace(new RegExp(`\\b${year}\\b`, "g"), " ");
  clean = clean.replace(/[._]/g, " ").replace(/\s+/g, " ").trim();

  const folderCtx = folderName?.trim() || undefined;

  let title = clean;
  let episode: string | null = null;
  let isSeriesOrAnime = false;

  // 3. IDENTIFICAÇÃO DE DOMÍNIO E CONTEXTO

  // Edge-case Angel Beats: Se após a limpeza sobrar APENAS um número (ex: "01" ou "02")
  if (/^\d{1,4}$/.test(clean)) {
    episode = clean;
    title = folderCtx || "Desconhecido";
    isSeriesOrAnime = true;
  } else {
    // Padrão A: Séries Ocidentais (S01E01)
    const tvShowMatch = clean.match(/(?:\s|^)[sS](\d{1,2})[eE](\d{1,3})\b/i);
    // Padrão B: Animes explícitos (E01, Ep 1, Cap 2)
    const explicitEpMatch = clean.match(
      /(?:\s|^)(?:-\s*)?(?:E|Ep|Episode|Cap|Capitulo)\s*(\d{1,4}(?:\.\d)?)\b/i
    );
    // Padrão C: Animes com traço divisor (01 - Renascimento)
    const animeDashMatch = clean.match(
      /(?:\s|^)(\d{2,4}(?:\.\d)?)(?:\s+-\s+|\s*:\s+)/i
    );
    // Padrão D: Traço normal (- 01)
    const dashMatch = clean.match(/(?:\s|^)-\s*(\d{1,4}(?:\.\d)?)\b/i);

    if (tvShowMatch && tvShowMatch.index !== undefined) {
      isSeriesOrAnime = true;
      episode = tvShowMatch[2];
      title = clean.substring(0, tvShowMatch.index);
    } else if (explicitEpMatch && explicitEpMatch.index !== undefined) {
      isSeriesOrAnime = true;
      episode = explicitEpMatch[1];
      title = clean.substring(0, explicitEpMatch.index);
    } else if (animeDashMatch && animeDashMatch.index !== undefined) {
      isSeriesOrAnime = true;
      episode = animeDashMatch[1];
      title = clean.substring(0, animeDashMatch.index);
    } else if (dashMatch && dashMatch.index !== undefined) {
      isSeriesOrAnime = true;
      episode = dashMatch[1];
      title = clean.substring(0, dashMatch.index);
    }
  }

  // 4. FALLBACK GUGURE
  if (!isSeriesOrAnime) {
    const fallbackMatch = clean.match(/\s(\d{2,3})$/);
    if (fallbackMatch && fallbackMatch.index !== undefined) {
      episode = fallbackMatch[1];
      title = clean.substring(0, fallbackMatch.index);
    }
  }

  // 5. RECONSTRUÇÃO DO TÍTULO
  title = title.replace(/\s+/g, " ").replace(/-\s*$/, "").trim();
  let finalTitle = title || clean.trim();

  // Fallback Final (Se o título virou fantasma após remover lixo)
  if (!finalTitle && folderCtx) {
    finalTitle = folderCtx;
  }

  const searchQuery =
    year && !episode ? `${finalTitle} ${year}` : finalTitle;

  return {
    title: filename,
    year,
    parsedTitle: finalTitle,
    parsedEpisode: episode,
    episode,
    searchQuery,
  };
}
