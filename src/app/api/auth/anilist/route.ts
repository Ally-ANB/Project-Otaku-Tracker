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


// =============================================================================
// [SESSÃO 2] - VALIDAÇÃO DE CREDENCIAIS DE SEGURANÇA (POST)
// =============================================================================

export async function POST(request: Request) {
  try {
    const { tipo, senhaDigitada } = await request.json();

    // --- SUB-SESSÃO 2.1: VALIDAÇÃO DA SENHA MESTRA ---
    if (tipo === 'mestre') {
      const senhaCorreta = process.env.SENHA_MESTRA;
      return NextResponse.json({ autorizado: senhaDigitada === senhaCorreta });
    }

    // --- SUB-SESSÃO 2.2: VALIDAÇÃO DO PIN DE ADMIN ---
    if (tipo === 'admin_pin') {
      const pinCorreto = process.env.ADMIN_PIN;
      return NextResponse.json({ autorizado: senhaDigitada === pinCorreto });
    }

    return NextResponse.json({ autorizado: false, erro: 'Tipo de autenticação inválido' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ autorizado: false, erro: 'Erro interno do servidor' }, { status: 500 });
  }
}