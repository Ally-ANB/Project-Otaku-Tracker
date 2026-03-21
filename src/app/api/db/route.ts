import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Whitelist de seguranca
const TABELAS_PERMITIDAS = ['mangas', 'animes', 'filmes', 'series', 'livros', 'jogos', 'musicas', 'perfis', 'site_config', 'loja_itens', 'search_cache', 'guilda_mensagens'] as const;

export async function POST(request: Request) {
  try {
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
      const { data, error } = await supabaseAdmin.from(tabela).insert(payload).select();
      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    const idValido = Number.isInteger(id) && id > 0;
    const nomeValido = typeof nome_original === 'string' && nome_original.trim().length > 0;
    if (!idValido && !nomeValido) {
      return NextResponse.json({ error: 'Identificador ausente (id ou nome_original).' }, { status: 400 });
    }

    let query = supabaseAdmin.from(tabela).update(dados);
    if (idValido) query = query.eq('id', id);
    else if (nomeValido) query = query.eq('nome_original', nome_original);

    const { error } = await query;
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Falha na operacao de banco.' }, { status: 500 });
  }
}

// Mantemos o DELETE que voce ja tem, mas ajustado para a nova estrutura
export async function DELETE(request: Request) {
  try {
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
      const { error } = await supabaseAdmin.from('search_cache').delete().neq('termo_original', '');
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    const idValido = Number.isInteger(id) && id > 0;
    const nomeValido = typeof nome_original === 'string' && nome_original.trim().length > 0;
    if (!idValido && !nomeValido) {
      return NextResponse.json({ error: 'Identificador ausente (id ou nome_original).' }, { status: 400 });
    }

    let query = supabaseAdmin.from(tabela).delete();
    if (idValido) query = query.eq('id', id);
    else if (nomeValido) query = query.eq('nome_original', nome_original);

    const { error } = await query;
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao deletar.' }, { status: 500 });
  }
}
