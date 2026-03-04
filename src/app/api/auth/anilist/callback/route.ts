import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// =============================================================================
// [SESSÃO 1] - INICIALIZAÇÃO DO SUPABASE (SERVER-SIDE)
// =============================================================================
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// =============================================================================
// [SESSÃO 2] - HANDLER DE CALLBACK (TROCA DE CODE POR TOKEN)
// =============================================================================
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const hunter = searchParams.get('state');

  if (!code || !hunter) return NextResponse.json({ error: "Dados ausentes" });

  try {
    // --- SUB-SESSÃO 2.1: REQUISIÇÃO AO ANILIST API ---
    const response = await fetch('https://anilist.co/api/v2/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: process.env.ANILIST_CLIENT_ID,
        client_secret: process.env.ANILIST_SECRET,
        redirect_uri: "https://project-manga.vercel.app/api/auth/anilist/callback",
        code: code,
      }),
    });

    const data = await response.json();

    // --- SUB-SESSÃO 2.2: ATUALIZAÇÃO DO BANCO DE DADOS ---
    if (data.access_token) {
      await supabase
        .from('perfis')
        .update({ anilist_token: data.access_token })
        .eq('nome_original', hunter);

      // --- SUB-SESSÃO 2.3: FINALIZAÇÃO E REDIRECIONAMENTO ---
      return NextResponse.redirect(`https://project-manga.vercel.app/perfil?sync=success`);
    }

    return NextResponse.json({ error: "Erro na autenticação", details: data });
  } catch (e) {
    return NextResponse.json({ error: "Falha crítica no servidor" });
  }
}