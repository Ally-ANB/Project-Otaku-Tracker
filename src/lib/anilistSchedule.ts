const ANILIST_GRAPHQL = "https://graphql.anilist.co";

const MEDIA_DETAIL_FIELDS = `
  id
  title {
    romaji
    english
  }
  coverImage {
    large
  }
  format
  description(asHtml: false)
  isAdult
  genres
  trailer {
    id
    site
  }
`;

const WEEKLY_SCHEDULE_QUERY = `
  query ($weekStart: Int, $weekEnd: Int, $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      airingSchedules(
        airingAt_greater: $weekStart
        airingAt_lesser: $weekEnd
        sort: TIME
      ) {
        id
        airingAt
        episode
        media {
          ${MEDIA_DETAIL_FIELDS}
        }
      }
    }
  }
`;

const SEASONAL_ANIME_QUERY = `
  query ($season: MediaSeason, $seasonYear: Int, $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media(
        season: $season
        seasonYear: $seasonYear
        type: ANIME
        sort: POPULARITY_DESC
      ) {
        ${MEDIA_DETAIL_FIELDS}
      }
    }
  }
`;

export type AnilistTrailer = {
  id?: string | null;
  site?: string | null;
} | null;

export type AnilistScheduleMedia = {
  id: number;
  title: {
    romaji?: string | null;
    english?: string | null;
  };
  coverImage?: {
    large?: string | null;
  } | null;
  format?: string | null;
  description?: string | null;
  isAdult?: boolean | null;
  genres?: string[] | null;
  trailer?: AnilistTrailer;
};

export type AnilistAiringScheduleEntry = {
  id: number;
  airingAt: number;
  episode: number;
  media: AnilistScheduleMedia;
};

export type WeeklyScheduleResult = {
  schedules: AnilistAiringScheduleEntry[];
  ok: boolean;
};

export type AnimeSeasonName = "WINTER" | "SPRING" | "SUMMER" | "FALL";

export type SeasonalAnimeResult = {
  media: AnilistScheduleMedia[];
  ok: boolean;
};

type GraphQLScheduleResponse = {
  data?: {
    Page?: {
      airingSchedules?: AnilistAiringScheduleEntry[];
    };
  };
  errors?: { message?: string }[];
};

type GraphQLSeasonalResponse = {
  data?: {
    Page?: {
      media?: AnilistScheduleMedia[];
    };
  };
  errors?: { message?: string }[];
};

/** WINTER: Jan–Mar, SPRING: Apr–Jun, SUMMER: Jul–Sep, FALL: Oct–Dec (calendário civil). */
export function getCurrentAnimeSeason(): { season: AnimeSeasonName; year: number } {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  if (month <= 2) return { season: "WINTER", year };
  if (month <= 5) return { season: "SPRING", year };
  if (month <= 8) return { season: "SUMMER", year };
  return { season: "FALL", year };
}

/** Domingo 00:00:00 até sábado 23:59:59.999, fuso horário local (Unix em segundos). */
export function getCurrentWeekUnixBounds(): { weekStart: number; weekEnd: number } {
  const now = new Date();
  const dow = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - dow);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return {
    weekStart: Math.floor(start.getTime() / 1000),
    weekEnd: Math.floor(end.getTime() / 1000),
  };
}

const PER_PAGE = 50;
const MAX_PAGES = 6;

async function fetchSchedulePage(
  weekStart: number,
  weekEnd: number,
  page: number
): Promise<{ entries: AnilistAiringScheduleEntry[]; ok: boolean }> {
  try {
    const res = await fetch(ANILIST_GRAPHQL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        query: WEEKLY_SCHEDULE_QUERY,
        variables: { weekStart, weekEnd, page, perPage: PER_PAGE },
      }),
    });

    if (!res.ok) return { entries: [], ok: false };

    const json = (await res.json()) as GraphQLScheduleResponse;
    if (json.errors?.length) return { entries: [], ok: false };
    const list = json.data?.Page?.airingSchedules;
    return { entries: Array.isArray(list) ? list : [], ok: true };
  } catch {
    return { entries: [], ok: false };
  }
}

/**
 * Lançamentos da semana corrente (domingo a sábado, horário local), via AniList.
 * Falhas de rede ou GraphQL retornam `{ schedules: [], ok: false }` sem lançar.
 */
export async function fetchWeeklySchedule(): Promise<WeeklyScheduleResult> {
  const { weekStart, weekEnd } = getCurrentWeekUnixBounds();

  const merged: AnilistAiringScheduleEntry[] = [];
  const seen = new Set<number>();

  for (let page = 1; page <= MAX_PAGES; page++) {
    const { entries: batch, ok } = await fetchSchedulePage(weekStart, weekEnd, page);
    if (!ok) {
      if (page === 1) return { schedules: [], ok: false };
      break;
    }
    for (const row of batch) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      if (row.airingAt >= weekStart && row.airingAt <= weekEnd) {
        merged.push(row);
      }
    }
    if (batch.length < PER_PAGE) break;
  }

  merged.sort((a, b) => a.airingAt - b.airingAt);
  return { schedules: merged, ok: true };
}

async function fetchSeasonalPage(
  season: AnimeSeasonName,
  seasonYear: number,
  page: number
): Promise<{ entries: AnilistScheduleMedia[]; ok: boolean }> {
  try {
    const res = await fetch(ANILIST_GRAPHQL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        query: SEASONAL_ANIME_QUERY,
        variables: { season, seasonYear, page, perPage: PER_PAGE },
      }),
    });

    if (!res.ok) return { entries: [], ok: false };

    const json = (await res.json()) as GraphQLSeasonalResponse;
    if (json.errors?.length) return { entries: [], ok: false };
    const list = json.data?.Page?.media;
    return { entries: Array.isArray(list) ? list : [], ok: true };
  } catch {
    return { entries: [], ok: false };
  }
}

/**
 * Animes da temporada (popularidade), página 1..N até esgotar (máx. 6 páginas).
 */
export async function fetchSeasonalAnime(
  season: AnimeSeasonName,
  year: number
): Promise<SeasonalAnimeResult> {
  const merged: AnilistScheduleMedia[] = [];
  const seen = new Set<number>();

  for (let page = 1; page <= MAX_PAGES; page++) {
    const { entries: batch, ok } = await fetchSeasonalPage(season, year, page);
    if (!ok) {
      if (page === 1) return { media: [], ok: false };
      break;
    }
    for (const m of batch) {
      if (!m?.id || seen.has(m.id)) continue;
      seen.add(m.id);
      merged.push(m);
    }
    if (batch.length < PER_PAGE) break;
  }

  return { media: merged, ok: true };
}

export function scheduleLocalDayOfWeek(airingAtUnix: number): number {
  return new Date(airingAtUnix * 1000).getDay();
}

export function tituloMedia(m: AnilistScheduleMedia): string {
  const r = m.title?.romaji?.trim();
  const e = m.title?.english?.trim();
  if (r) return r;
  if (e) return e;
  return "Sem título";
}
