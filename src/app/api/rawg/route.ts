import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const apiKey = process.env.RAWG_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'RAWG_API_KEY não configurada.' }, { status: 500 });
  }

  if (!query) {
    return NextResponse.json({ error: 'Parâmetro "q" é obrigatório.' }, { status: 400 });
  }

  const url = `https://api.rawg.io/api/games?key=${apiKey}&search=${encodeURIComponent(query)}&page_size=10`;

  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Falha ao buscar dados da RAWG.' },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Erro interno ao consultar a RAWG.' }, { status: 500 });
  }
}
