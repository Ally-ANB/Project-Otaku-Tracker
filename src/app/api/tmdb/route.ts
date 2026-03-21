import { NextResponse } from 'next/server';
import { aggregateTmdbBrProviders } from '@/lib/watchProviders';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const type = searchParams.get('type'); // 'movie' ou 'tv'

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'TMDB Key faltando' }, { status: 500 });

  if (type !== 'movie' && type !== 'tv') {
    return NextResponse.json({ error: 'type deve ser movie ou tv' }, { status: 400 });
  }

  const searchUrl = `https://api.themoviedb.org/3/search/${type}?api_key=${apiKey}&language=pt-BR&query=${encodeURIComponent(query || '')}`;

  try {
    const res = await fetch(searchUrl);
    const data = await res.json();

    if (!data.results?.length) {
      return NextResponse.json(data);
    }

    const slice = data.results.slice(0, 5);
    const enriched = await Promise.all(
      slice.map(async (m: Record<string, unknown>) => {
        const id = m.id as number;
        const title = (m.title || m.name || m.original_name || '') as string;
        let providers: ReturnType<typeof aggregateTmdbBrProviders> = [];
        try {
          const provRes = await fetch(
            `https://api.themoviedb.org/3/${type}/${id}/watch/providers?api_key=${apiKey}`
          );
          const provJson = await provRes.json();
          const br = provJson.results?.BR;
          providers = aggregateTmdbBrProviders(br, type, id, title);
        } catch {
          providers = [];
        }
        return { ...m, providers };
      })
    );

    return NextResponse.json({ ...data, results: enriched });
  } catch {
    return NextResponse.json({ error: 'Erro no TMDB' }, { status: 500 });
  }
}
