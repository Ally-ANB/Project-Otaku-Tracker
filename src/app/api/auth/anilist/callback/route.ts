import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// =============================================================================
// [SESSÃO 1] - PROCESSAMENTO DO CODE -> TOKEN
// =============================================================================
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const hunter = searchParams.get('state'); // Recupera o nome do Hunter

  if (!code || !hunter) return NextResponse.json({ error: "Dados de autenticação incompletos" });

  try {
    // 1.1 - Troca o código pelo Access Token
    const response = await fetch('https://anilist.co/api/v2/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: process.env.ANILIST_CLIENT_ID, // Sua nova variável
        client_secret: process.env.ANILIST_SECRET,
        redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/anilist/callback`,
        code: code,
      }),
    });

    const data = await response.json();

    if (data.access_token) {
      // 1.2 - SALVAMENTO NO BANCO DE DADOS
      const { error } = await supabase
        .from('perfis')
        .update({ anilist_token: data.access_token })
        .eq('nome_original', hunter);

      if (error) throw error;

      // 1.3 - Finalização com sucesso
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/perfil?sync=success`);
    }

    return NextResponse.json({ error: "Falha ao gerar token", detail: data });

  } catch (e) {
    console.error("Erro no Callback:", e);
    return NextResponse.json({ error: "Erro interno no servidor" });
  }
}