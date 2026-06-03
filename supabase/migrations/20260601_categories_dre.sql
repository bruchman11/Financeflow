-- =====================================================================
-- Migration: Categorias hierárquicas no formato DRE
-- Fase 1 do v2
-- DESTRUTIVO: descarta as categorias existentes e recria com novo schema.
-- =====================================================================
--
-- ROLLBACK (manual):
--   drop trigger if exists trg_categories_level on public.categories;
--   drop function if exists public.categories_compute_level();
--   drop function if exists public.categories_resolve_parent();
--   alter table public.transactions drop constraint if exists transactions_category_id_fkey;
--   drop table public.categories;
--   -- restaurar schema antigo a partir da 20260101_init.sql
--
-- =====================================================================

-- 1. Limpa vínculos em transactions (mantém o restante intacto)
update public.transactions set category_id = null where category_id is not null;

-- 2. Drop & recreate
drop table if exists public.categories cascade;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null,
  name text not null,
  parent_id uuid references public.categories(id) on delete restrict,
  dre_type text not null check (dre_type in ('revenue','cost','expense','tax')),
  level smallint not null default 1,
  sort_order int not null default 0,
  color text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index uniq_categories_company_code on public.categories(company_id, code);
create index idx_categories_company on public.categories(company_id);
create index idx_categories_parent on public.categories(parent_id) where parent_id is not null;
create index idx_categories_dre_type on public.categories(company_id, dre_type);

-- 3. Reanexa FK em transactions (categoria opcional)
alter table public.transactions
  add constraint transactions_category_id_fkey
  foreign key (category_id) references public.categories(id) on delete restrict;

-- 4. Trigger para preencher updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_categories_updated_at on public.categories;
create trigger trg_categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- 5. Trigger: calcula level a partir do code ("01" → 1, "01.01" → 2, "01.01.01" → 3)
create or replace function public.categories_compute_level()
returns trigger language plpgsql as $$
declare
  segments int;
begin
  segments := array_length(string_to_array(new.code, '.'), 1);
  new.level := coalesce(segments, 1);
  -- sort_order default = último segmento do code como int (fallback 0)
  if new.sort_order = 0 then
    begin
      new.sort_order := (string_to_array(new.code, '.'))[segments]::int;
    exception when others then
      new.sort_order := 0;
    end;
  end if;
  return new;
end $$;

drop trigger if exists trg_categories_level on public.categories;
create trigger trg_categories_level
  before insert or update of code on public.categories
  for each row execute function public.categories_compute_level();

-- 6. Trigger: resolve parent_id automaticamente pelo prefixo do code
-- "01.05" → procura categoria com code "01" na mesma empresa
create or replace function public.categories_resolve_parent()
returns trigger language plpgsql as $$
declare
  parent_code text;
  segments text[];
begin
  if new.parent_id is not null then return new; end if; -- já informado
  segments := string_to_array(new.code, '.');
  if array_length(segments, 1) <= 1 then return new; end if; -- raiz não tem parent

  parent_code := array_to_string(segments[1:array_length(segments,1)-1], '.');

  select id into new.parent_id
  from public.categories
  where company_id = new.company_id and code = parent_code
  limit 1;

  return new;
end $$;

drop trigger if exists trg_categories_resolve_parent on public.categories;
create trigger trg_categories_resolve_parent
  before insert on public.categories
  for each row execute function public.categories_resolve_parent();

-- 7. RLS
alter table public.categories enable row level security;

create policy categories_select on public.categories
  for select using (public.is_company_member(company_id));
create policy categories_insert on public.categories
  for insert with check (public.is_company_member(company_id));
create policy categories_update on public.categories
  for update using (public.is_company_member(company_id))
              with check (public.is_company_member(company_id));
create policy categories_delete on public.categories
  for delete using (public.is_company_member(company_id));

-- 8. Atualiza RPC create_company_with_defaults para criar a árvore DRE inicial
create or replace function public.create_company_with_defaults(
  _name text,
  _legal_name text default null,
  _tax_id text default null
) returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  new_company_id uuid;
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;

  insert into public.companies (name, legal_name, tax_id, created_by)
  values (_name, _legal_name, _tax_id, uid)
  returning id into new_company_id;

  insert into public.company_members (company_id, user_id, role)
  values (new_company_id, uid, 'owner');

  insert into public.accounts (company_id, name, kind, opening_balance)
  values (new_company_id, 'Caixa', 'cash', 0);

  -- Árvore DRE inicial (4 raízes + subcategorias úteis)
  insert into public.categories (company_id, code, name, dre_type, color) values
    (new_company_id, '01',    'Receita',           'revenue', '#22c55e'),
    (new_company_id, '01.01', 'Receita de Vendas', 'revenue', '#22c55e'),
    (new_company_id, '01.02', 'Outras Receitas',   'revenue', '#10b981'),

    (new_company_id, '02',    'Custo',             'cost',    '#f97316'),
    (new_company_id, '02.01', 'Custo de Mercadoria','cost',   '#f97316'),

    (new_company_id, '03',    'Despesa',           'expense', '#ef4444'),
    (new_company_id, '03.01', 'Aluguel',           'expense', '#ef4444'),
    (new_company_id, '03.02', 'Salários',          'expense', '#dc2626'),
    (new_company_id, '03.03', 'Marketing',         'expense', '#f43f5e'),
    (new_company_id, '03.04', 'Serviços',          'expense', '#ec4899'),

    (new_company_id, '04',    'Impostos',          'tax',     '#64748b'),
    (new_company_id, '04.01', 'Simples Nacional',  'tax',     '#64748b'),
    (new_company_id, '04.02', 'Taxas de Cartão',   'tax',     '#94a3b8');

  return new_company_id;
end $$;

-- 9. Seed retroativo: cria árvore DRE para empresas existentes que ficaram sem categorias
do $$
declare c record;
begin
  for c in select id from public.companies loop
    if not exists (select 1 from public.categories where company_id = c.id) then
      insert into public.categories (company_id, code, name, dre_type, color) values
        (c.id, '01',    'Receita',           'revenue', '#22c55e'),
        (c.id, '01.01', 'Receita de Vendas', 'revenue', '#22c55e'),
        (c.id, '01.02', 'Outras Receitas',   'revenue', '#10b981'),
        (c.id, '02',    'Custo',             'cost',    '#f97316'),
        (c.id, '02.01', 'Custo de Mercadoria','cost',   '#f97316'),
        (c.id, '03',    'Despesa',           'expense', '#ef4444'),
        (c.id, '03.01', 'Aluguel',           'expense', '#ef4444'),
        (c.id, '03.02', 'Salários',          'expense', '#dc2626'),
        (c.id, '03.03', 'Marketing',         'expense', '#f43f5e'),
        (c.id, '03.04', 'Serviços',          'expense', '#ec4899'),
        (c.id, '04',    'Impostos',          'tax',     '#64748b'),
        (c.id, '04.01', 'Simples Nacional',  'tax',     '#64748b'),
        (c.id, '04.02', 'Taxas de Cartão',   'tax',     '#94a3b8');
    end if;
  end loop;
end $$;
