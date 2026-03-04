import { NextResponse } from 'next/server';

// =============================================================================
// [SESSÃO 1] - CONFIGURAÇÃO E REDIRECIONAMENTO DE AUTH
// =============================================================================

export async function GET(request: Request) {
  // --- SUB-SESSÃO 1.1: EXTRAÇÃO DE PARÂMETROS ---
  const { searchParams } = new URL(request.url);
  const hunter = searchParams.get('hunter');

  if (!hunter) return NextResponse.json({ error: "Hunter não identificado" }, { status: 400 });

  // --- SUB-SESSÃO 1.2: VARIÁVEIS DE AMBIENTE E URLS ---
  const clientID = process.env.ANILIST_CLIENT_ID;
  const redirectUri = "https://project-manga.vercel.app/api/auth/anilist/callback";

  // --- SUB-SESSÃO 1.3: CONSTRUÇÃO DA URL DE AUTORIZAÇÃO ---
  const authUrl = `https://anilist.co/api/v2/oauth/authorize?client_id=${clientID}&redirect_uri=${redirectUri}&response_type=code&state=${hunter}`;

  return NextResponse.redirect(authUrl);
}