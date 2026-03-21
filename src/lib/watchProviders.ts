/**
 * Provedor "Onde assistir/ler" — usado em TMDB, AniList e link manual.
 */
export type WatchProvider = {
  name: string;
  logo: string;
  link: string;
  source?: "tmdb" | "anilist" | "manual";
};

const TMDB_IMG = "https://image.tmdb.org/t/p/w92";

/** Links diretos às vitrines BR (evita depender do link regional do TMDB quando possível). */
function tmdbProviderDeepLink(providerId: number, title: string, fallback: string): string {
  const q = encodeURIComponent(title);
  const map: Record<number, string> = {
    8: `https://www.netflix.com/br/search?q=${q}`,
    337: `https://www.disneyplus.com/pt-br/search?q=${q}`,
    9: `https://www.primevideo.com/search/?phrase=${q}`,
    119: `https://www.primevideo.com/search/?phrase=${q}`,
    350: `https://tv.apple.com/br/search?term=${q}`,
    283: `https://www.crunchyroll.com/search?q=${q}`,
    384: `https://www.max.com/br/pt/search?q=${q}`,
    531: `https://www.paramountplus.com/br/search/?q=${q}`,
    619: `https://www.starplus.com/pt-br/search?q=${q}`,
  };
  return map[providerId] || fallback;
}

type TmdbRawProvider = {
  provider_id: number;
  provider_name: string;
  logo_path?: string | null;
};

/** Agrega flatrate → rent → buy, mantendo um único registro por provider_id (prioridade ao streaming). */
export function aggregateTmdbBrProviders(
  br: {
    link?: string;
    flatrate?: TmdbRawProvider[];
    rent?: TmdbRawProvider[];
    buy?: TmdbRawProvider[];
  } | null | undefined,
  mediaType: "movie" | "tv",
  mediaId: number,
  title: string
): WatchProvider[] {
  if (!br) return [];
  const fallback =
    br.link || `https://www.themoviedb.org/${mediaType}/${mediaId}/watch?locale=BR`;

  const byId = new Map<number, TmdbRawProvider>();
  const ingest = (list: TmdbRawProvider[] | undefined) => {
    if (!list?.length) return;
    for (const p of list) {
      const id = Number(p?.provider_id);
      if (!Number.isFinite(id) || id <= 0) continue;
      if (byId.has(id)) continue;
      byId.set(id, { ...p, provider_id: id });
    }
  };

  ingest(br.flatrate);
  ingest(br.rent);
  ingest(br.buy);

  return Array.from(byId.values()).map((p) => ({
    name: p.provider_name,
    logo: p.logo_path ? `${TMDB_IMG}${p.logo_path}` : "",
    link: tmdbProviderDeepLink(p.provider_id, title, fallback),
    source: "tmdb" as const,
  }));
}

export function tmdbBrProvidersToWatchList(
  br: {
    link?: string;
    flatrate?: { provider_id: number; provider_name: string; logo_path?: string | null }[];
    rent?: { provider_id: number; provider_name: string; logo_path?: string | null }[];
    buy?: { provider_id: number; provider_name: string; logo_path?: string | null }[];
  } | null | undefined,
  mediaType: "movie" | "tv",
  mediaId: number,
  title: string
): WatchProvider[] {
  return aggregateTmdbBrProviders(br, mediaType, mediaId, title);
}

export function faviconForUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;
  } catch {
    return "";
  }
}

export function parseProviderData(raw: unknown): WatchProvider[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as WatchProvider[];
  if (typeof raw === "string") {
    try {
      const v = JSON.parse(raw);
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Link manual primeiro; depois provedores automáticos. */
export function mergeManualLinkAndProviders(
  linkUrl: string | null | undefined,
  providerData: unknown
): WatchProvider[] {
  const list = parseProviderData(providerData);
  const u = typeof linkUrl === "string" ? linkUrl.trim() : "";
  if (!u) return list;
  const manual: WatchProvider = {
    name: "Link manual",
    logo: faviconForUrl(u),
    link: u,
    source: "manual",
  };
  return [manual, ...list];
}

export function anilistExternalToProviders(
  links: { url: string; site?: string | null; type?: string | null }[] | null | undefined
): WatchProvider[] {
  if (!links?.length) return [];
  const skip = /^(twitter|facebook|instagram|tiktok|youtube\.com\/(channel|c|user))/i;
  return links
    .filter((l) => {
      if (!l?.url || skip.test(l.url)) return false;
      if (l.type === "SOCIAL") return false;
      return true;
    })
    .slice(0, 12)
    .map((l) => ({
      name: (l.site || "Link").replace(/_/g, " "),
      logo: faviconForUrl(l.url),
      link: l.url,
      source: "anilist" as const,
    }));
}
