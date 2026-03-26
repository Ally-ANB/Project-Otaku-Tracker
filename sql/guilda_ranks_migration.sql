-- =============================================================================
-- SESSÃO 1: guilda_ranks + colunas em perfis (XP / anti-inflação / rank pago)
-- Execute no Supabase SQL Editor ou via CLI. Idempotente (ON CONFLICT).
-- =============================================================================

create table if not exists public.guilda_ranks (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  xp_minimo integer not null,
  recompensa_esmolas integer not null default 0,
  classes_tailwind text not null default ''
);

alter table public.guilda_ranks enable row level security;

drop policy if exists "guilda_ranks_select_publico" on public.guilda_ranks;
create policy "guilda_ranks_select_publico"
  on public.guilda_ranks for select
  using (true);

-- Perfis: XP de missões, último rank já recompensado, contador diário da estante
alter table public.perfis add column if not exists xp_missoes integer not null default 0;
alter table public.perfis add column if not exists guilda_ultimo_rank_id uuid references public.guilda_ranks (id) on delete set null;
alter table public.perfis add column if not exists estante_adicoes_hoje jsonb;

comment on column public.perfis.xp_missoes is 'XP ganho ao concluir missões do perfil (somado ao total para ranks).';
comment on column public.perfis.guilda_ultimo_rank_id is 'Último tier de rank para o qual já foi creditada recompensa_esmolas.';
comment on column public.perfis.estante_adicoes_hoje is 'JSON { "data": "YYYY-MM-DD", "count": number } para limite de esmolas por dia na estante.';

-- Seed (atualiza se já existir pelo nome)
insert into public.guilda_ranks (nome, xp_minimo, recompensa_esmolas, classes_tailwind) values
  ('Rank E', 0, 0, 'border-slate-600 shadow-none text-slate-400'),
  ('Rank D', 500, 50, 'border-zinc-400 drop-shadow-md text-zinc-300'),
  ('Rank C', 2000, 150, 'border-cyan-500 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)] text-cyan-400'),
  ('Rank B', 5000, 300, 'border-blue-500 drop-shadow-[0_0_12px_rgba(59,130,246,0.9)] text-blue-400'),
  ('Rank A', 10000, 600, 'border-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,1)] text-amber-400'),
  ('Rank S', 25000, 1500, 'border-violet-500 animate-pulse drop-shadow-[0_0_20px_rgba(139,92,246,1)] text-violet-400')
on conflict (nome) do update set
  xp_minimo = excluded.xp_minimo,
  recompensa_esmolas = excluded.recompensa_esmolas,
  classes_tailwind = excluded.classes_tailwind;
