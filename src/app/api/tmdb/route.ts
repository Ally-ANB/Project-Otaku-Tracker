import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const type = searchParams.get('type'); // 'movie' ou 'tv'
  
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'TMDB Key faltando' }, { status: 500 });

  const url = `https://api.themoviedb.org/3/search/${type}?api_key=${apiKey}&language=pt-BR&query=${encodeURIComponent(query || '')}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Erro no TMDB' }, { status: 500 });
  }
}
