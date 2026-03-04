import { NextResponse } from 'next/server';

// =============================================================================
// [SESSÃO 1] - CONFIGURAÇÃO E REDIRECIONAMENTO
// =============================================================================
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hunter = searchParams.get('hunter'); // Identifica se é LEX, BAIAKU, etc.

  if (!hunter) return NextResponse.json({ error: "Hunter não identificado" }, { status: 400 });

  // 1.1 - Variáveis de Ambiente
  const clientID = process.env.ANILIST_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/anilist/callback`;

  // 1.2 - Construção da URL (O 'state' carrega o nome do Hunter para o próximo passo)
  const authUrl = `https://anilist.co/api/v2/oauth/authorize?client_id=${clientID}&redirect_uri=${redirectUri}&response_type=code&state=${hunter}`;

  return NextResponse.redirect(authUrl);
}