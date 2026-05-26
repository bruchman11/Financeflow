-- =====================================================================
-- FinanceFlow — Init schema
-- Tabelas: profiles, companies, company_members, accounts, categories, transactions
-- Tudo em snake_case. Dinheiro em numeric(14,2). PKs uuid.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Helper: trigger genérico para manter updated_at
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- profiles (espelho 1:1 de auth.users)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Trigger para criar profile automaticamente quando um auth.user é criado
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- companies
-- ---------------------------------------------------------------------
create table if not exists public.companies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(btrim(name)) > 0),
  legal_name  text,
  tax_id      text,
  created_by  uuid not null references public.profiles(id) on delete restrict,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger companies_set_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- company_members (N:N entre profiles e companies)
-- ---------------------------------------------------------------------
create table if not exists public.company_members (
  company_id  uuid not null references public.companies(id) on delete cascade,
  user_id     uuid not null references public.profiles(id)  on delete cascade,
  role        text not null default 'member' check (role in ('owner','admin','member')),
  created_at  timestamptz not null default now(),
  primary key (company_id, user_id)
);

create index if not exists company_members_user_idx
  on public.company_members (user_id);

-- ---------------------------------------------------------------------
-- accounts (contas financeiras por empresa)
-- ---------------------------------------------------------------------
create table if not exists public.accounts (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies(id) on delete cascade,
  name             text not null check (length(btrim(name)) > 0),
  kind             text not null default 'checking'
                     check (kind in ('cash','checking','savings','credit_card','other')),
  opening_balance  numeric(14,2) not null default 0,
  is_archived      boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists accounts_company_idx
  on public.accounts (company_id, is_archived);

create trigger accounts_set_updated_at
before update on public.accounts
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- categories (por empresa, separadas por tipo)
-- ---------------------------------------------------------------------
create table if not exists public.categories (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  name         text not null check (length(btrim(name)) > 0),
  type         text not null check (type in ('income','expense')),
  color        text,
  is_archived  boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create unique index if not exists categories_company_lname_type_uniq
  on public.categories (company_id, lower(name), type);

create index if not exists categories_company_idx
  on public.categories (company_id, is_archived);

create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- transactions (movimentações financeiras)
-- ---------------------------------------------------------------------
create table if not exists public.transactions (
  id                 uuid primary key default gen_random_uuid(),
  company_id         uuid not null references public.companies(id) on delete cascade,
  account_id         uuid not null references public.accounts(id)  on delete restrict,
  category_id        uuid          references public.categories(id) on delete set null,
  type               text not null check (type in ('income','expense')),
  amount             numeric(14,2) not null check (amount > 0),
  description        text,
  occurred_on        date not null,
  client_request_id  uuid,
  created_by         uuid not null references public.profiles(id) on delete restrict,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists tx_company_occurred_idx
  on public.transactions (company_id, occurred_on desc);

create index if not exists tx_company_account_occurred_idx
  on public.transactions (company_id, account_id, occurred_on);

create index if not exists tx_company_category_occurred_idx
  on public.transactions (company_id, category_id, occurred_on);

create unique index if not exists tx_idempotency_uniq
  on public.transactions (company_id, client_request_id)
  where client_request_id is not null;

create trigger transactions_set_updated_at
before update on public.transactions
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Trigger de consistência cross-tabela:
-- account.company_id e category.company_id devem casar com transaction.company_id
-- ---------------------------------------------------------------------
create or replace function public.check_tx_company_consistency()
returns trigger
language plpgsql
as $$
declare
  acc_company uuid;
  cat_company uuid;
begin
  select company_id into acc_company from public.accounts where id = new.account_id;
  if acc_company is null or acc_company <> new.company_id then
    raise exception 'account does not belong to company %', new.company_id
      using errcode = '23514';
  end if;

  if new.category_id is not null then
    select company_id into cat_company from public.categories where id = new.category_id;
    if cat_company is null or cat_company <> new.company_id then
      raise exception 'category does not belong to company %', new.company_id
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists tx_check_consistency on public.transactions;
create trigger tx_check_consistency
before insert or update on public.transactions
for each row execute function public.check_tx_company_consistency();
