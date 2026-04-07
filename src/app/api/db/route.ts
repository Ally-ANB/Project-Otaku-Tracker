import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function mensagemErroSupabase(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const m = (error as { message?: string }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Falha na operacao de banco.';
}

let supabaseAdmin: SupabaseClient | null = null;

/** Cliente com SUPABASE_SERVICE_ROLE_KEY: ignora RLS; uso restrito a esta rota após validar SENHA_MESTRA. */
function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url?.trim() || !key?.trim()) {
      throw new Error('Variaveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes.');
    }
    supabaseAdmin = createClient(url, key);
  }
  return supabaseAdmin;
}

/** Confirma que a rota existe em producao (GET costuma ser usado em health checks / navegador). */
export async function GET() {
  return NextResponse.json({ ok: true, route: 'api/db' });
}

function idUuidValido(id: unknown): id is string {
  return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
}

// Whitelist de seguranca
const TABELAS_PERMITIDAS = ['mangas', 'animes', 'filmes', 'series', 'livros', 'jogos', 'musicas', 'perfis', 'site_config', 'loja_itens', 'search_cache', 'guilda_mensagens', 'guilda_ranks'] as const;

export async function POST(request: Request) {
  try {
    const admin = getSupabaseAdmin();
    const { tabela, id, nome_original, dados, senhaMestre, operacao = 'update' } = await request.json();

    if (!tabela || typeof tabela !== 'string') {
      return NextResponse.json({ error: 'Tabela invalida.' }, { status: 400 });
    }

    // 1. Validacao de Tabela
    if (!TABELAS_PERMITIDAS.includes(tabela as (typeof TABELAS_PERMITIDAS)[number])) {
      return NextResponse.json({ error: 'Tabela nao permitida.' }, { status: 403 });
    }

    if (!dados || typeof dados !== 'object') {
      return NextResponse.json({ error: 'Dados invalidos.' }, { status: 400 });
    }

    if (operacao !== 'insert' && operacao !== 'update') {
      return NextResponse.json({ error: 'Operacao invalida.' }, { status: 400 });
    }

    // Perfis, cache de busca e chat da guilda podem operar sem senha mestre.
    if (tabela !== 'perfis' && tabela !== 'search_cache' && tabela !== 'guilda_mensagens' && senhaMestre !== process.env.SENHA_MESTRA) {
      return NextResponse.json({ error: 'Senha Mestra Invalida.' }, { status: 401 });
    }

    if (operacao === 'insert') {
      const payload = Array.isArray(dados) ? dados : [dados];
      const { data, error } =
        tabela === 'search_cache'
          ? await admin.from(tabela).upsert(payload, { onConflict: 'termo_original' }).select()
          : await admin.from(tabela).insert(payload).select();
      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    const idValido = Number.isInteger(id) && id > 0;
    const uuidValido = idUuidValido(id);
    const nomeValido = typeof nome_original === 'string' && nome_original.trim().length > 0;
    if (!idValido && !uuidValido && !nomeValido) {
      return NextResponse.json({ error: 'Identificador ausente (id, id uuid ou nome_original).' }, { status: 400 });
    }

    let query = admin.from(tabela).update(dados);
    if (idValido) query = query.eq('id', id);
    else if (uuidValido) query = query.eq('id', id.trim());
    else if (nomeValido) query = query.eq('nome_original', nome_original);

    const { error } = await query;
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = mensagemErroSupabase(error);
    console.error('[api/db POST]', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Mantemos o DELETE que voce ja tem, mas ajustado para a nova estrutura
export async function DELETE(request: Request) {
  try {
    const admin = getSupabaseAdmin();
    const { id, nome_original, senhaMestre, tabela, limparTudo } = await request.json();

    if (!tabela || typeof tabela !== 'string') {
      return NextResponse.json({ error: 'Tabela invalida.' }, { status: 400 });
    }

    if (!TABELAS_PERMITIDAS.includes(tabela as (typeof TABELAS_PERMITIDAS)[number])) {
      return NextResponse.json({ error: 'Tabela nao permitida.' }, { status: 403 });
    }

    if (tabela !== 'perfis' && tabela !== 'guilda_mensagens' && senhaMestre !== process.env.SENHA_MESTRA) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 401 });
    }

    if (limparTudo === true) {
      if (tabela !== 'search_cache' || senhaMestre !== process.env.SENHA_MESTRA) {
        return NextResponse.json({ error: 'Operacao de limpeza nao permitida.' }, { status: 403 });
      }
      const { error } = await admin.from('search_cache').delete().neq('termo_original', '');
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    const idValido = Number.isInteger(id) && id > 0;
    const uuidValido = idUuidValido(id);
    const nomeValido = typeof nome_original === 'string' && nome_original.trim().length > 0;
    if (!idValido && !uuidValido && !nomeValido) {
      return NextResponse.json({ error: 'Identificador ausente (id, id uuid ou nome_original).' }, { status: 400 });
    }

    let query = admin.from(tabela).delete();
    if (idValido) query = query.eq('id', id);
    else if (uuidValido) query = query.eq('id', id.trim());
    else if (nomeValido) query = query.eq('nome_original', nome_original);

    const { error } = await query;
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = mensagemErroSupabase(error);
    console.error('[api/db DELETE]', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
