import { NextResponse } from 'next/server';

const BOOKS_API_BASE = 'https://www.googleapis.com/books/v1/volumes?q=';
const FETCH_TIMEOUT_MS = 5000;

type OlDoc = Record<string, unknown>;

function emptyBooksResponse(message: string) {
  return NextResponse.json(
    {
      kind: 'books#volumes',
      totalItems: 0,
      items: [],
      success: false,
      error: message,
    },
    { status: 200 }
  );
}

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      signal: ctrl.signal,
      cache: 'no-store',
    });
  } finally {
    clearTimeout(id);
  }
}

function googlePayloadHasError(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const err = (data as { error?: unknown }).error;
  return err !== undefined && err !== null;
}

function normalizeOpenLibraryDocs(docs: OlDoc[]) {
  return docs.map((d, i) => {
    const title = String(d.title ?? 'Sem título');
    const authors = d.author_name;
    const authorStr = Array.isArray(authors)
      ? authors
          .slice(0, 4)
          .map((a) => String(a))
          .join(', ')
      : '';
    const year = d.first_publish_year;
    const yearStr = typeof year === 'number' ? String(year) : '';
    const key = typeof d.key === 'string' ? d.key : '';
    const id = key ? key.replace(/\//g, '_') : `ol_${i}`;
    const coverI = d.cover_i;
    const thumb =
      typeof coverI === 'number'
        ? `https://covers.openlibrary.org/b/id/${coverI}-M.jpg`
        : undefined;
    const subjects = d.subject;
    const subStr = Array.isArray(subjects)
      ? subjects
          .slice(0, 5)
          .map((s) => String(s))
          .join(', ')
      : '';
    const parts = [
      authorStr && `Autores: ${authorStr}`,
      yearStr && `Primeira edição: ${yearStr}`,
      subStr && `Temas: ${subStr}`,
    ].filter(Boolean);
    const description =
      parts.length > 0 ? `${parts.join('. ')}.` : 'Sem sinopse.';

    return {
      kind: 'books#volume',
      id,
      fonteCatalogo: 'Open Library',
      volumeInfo: {
        title,
        ...(Array.isArray(authors) ? { authors } : {}),
        description,
        pageCount: 1,
        ...(thumb ? { imageLinks: { thumbnail: thumb } } : {}),
      },
    };
  });
}

async function fetchOpenLibraryAsGoogleShape(query: string): Promise<NextResponse> {
  const olUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10`;
  try {
    const res = await fetchWithTimeout(olUrl);
    const ct = res.headers.get('content-type') || '';
    if (!res.ok || !ct.includes('application/json')) {
      return emptyBooksResponse('Open Library indisponível');
    }
    let data: { docs?: OlDoc[] };
    try {
      data = (await res.json()) as { docs?: OlDoc[] };
    } catch {
      return emptyBooksResponse('Timeout ou Falha de Rede');
    }
    const docs = Array.isArray(data.docs) ? data.docs : [];
    const items = normalizeOpenLibraryDocs(docs);
    return NextResponse.json(
      {
        kind: 'books#volumes',
        totalItems: items.length,
        items,
        success: true,
      },
      { status: 200 }
    );
  } catch {
    return emptyBooksResponse('Timeout ou Falha de Rede');
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('q') || '').trim();

  if (query.length < 2) {
    return NextResponse.json({ kind: 'books#volumes', totalItems: 0, items: [] });
  }

  const apiKey = (process.env.GOOGLE_BOOKS_API_KEY || '').trim().replace(/["']/g, '');
  const keyParam = apiKey.length > 0 ? `&key=${encodeURIComponent(apiKey)}` : '';
  const url = `${BOOKS_API_BASE}${encodeURIComponent(query)}&maxResults=10${keyParam}`;

  try {
    const res = await fetchWithTimeout(url);

    if (!res.ok) {
      console.warn(
        `>>> GOOGLE BOOKS FALHOU (Status: ${res.status}). Acionando Open Library como fallback.`
      );
      return fetchOpenLibraryAsGoogleShape(query);
    }

    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      console.warn('>>> GOOGLE BOOKS: resposta não-JSON. Acionando Open Library como fallback.');
      return fetchOpenLibraryAsGoogleShape(query);
    }

    let data: unknown;
    try {
      data = await res.json();
    } catch {
      console.warn('>>> GOOGLE BOOKS: parse JSON falhou. Acionando Open Library como fallback.');
      return fetchOpenLibraryAsGoogleShape(query);
    }

    if (googlePayloadHasError(data)) {
      console.warn(
        '>>> GOOGLE BOOKS retornou campo `error` no corpo JSON. Acionando Open Library como fallback.'
      );
      return fetchOpenLibraryAsGoogleShape(query);
    }

    return NextResponse.json(data);
  } catch (err) {
    console.warn(
      '>>> GOOGLE BOOKS FALHOU (rede ou timeout). Tentando Open Library; em último caso resposta vazia.',
      err
    );
    try {
      return await fetchOpenLibraryAsGoogleShape(query);
    } catch {
      return emptyBooksResponse('Timeout ou Falha de Rede');
    }
  }
}
