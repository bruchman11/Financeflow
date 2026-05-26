-- =====================================================================
-- FinanceFlow — Row Level Security
-- Estratégia: função helper is_company_member SECURITY DEFINER para evitar
-- recursão; todas as tabelas de domínio filtram por essa função.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Helper
-- ---------------------------------------------------------------------
create or replace function public.is_company_member(_company uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.company_members
    where company_id = _company
      and user_id    = auth.uid()
  );
$$;

revoke all on function public.is_company_member(uuid) from public;
grant execute on function public.is_company_member(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- profiles: cada usuário só lê/edita o próprio
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select to authenticated
  using (id = auth.uid());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- (insert é feito via trigger SECURITY DEFINER em auth.users; não exposto ao client)

-- ---------------------------------------------------------------------
-- companies
-- ---------------------------------------------------------------------
alter table public.companies enable row level security;

drop policy if exists companies_select on public.companies;
create policy companies_select on public.companies
  for select to authenticated
  using (public.is_company_member(id));

drop policy if exists companies_insert on public.companies;
create policy companies_insert on public.companies
  for insert to authenticated
  with check (created_by = auth.uid());

drop policy if exists companies_update on public.companies;
create policy companies_update on public.companies
  for update to authenticated
  using (public.is_company_member(id))
  with check (public.is_company_member(id));

-- Delete propositalmente não exposto via policy: cascade só via service role / RPC futura.

-- ---------------------------------------------------------------------
-- company_members
-- ---------------------------------------------------------------------
alter table public.company_members enable row level security;

drop policy if exists cm_select on public.company_members;
create policy cm_select on public.company_members
  for select to authenticated
  using (public.is_company_member(company_id));

-- Insert: o próprio criador da empresa adicionando a si mesmo (vinculado ao insert
-- da company); OU owner/admin existentes adicionando alguém.
drop policy if exists cm_insert on public.company_members;
create policy cm_insert on public.company_members
  for insert to authenticated
  with check (
    user_id = auth.uid()
    or exists (
      select 1
      from public.company_members me
      where me.company_id = company_members.company_id
        and me.user_id    = auth.uid()
        and me.role in ('owner','admin')
    )
  );

drop policy if exists cm_update on public.company_members;
create policy cm_update on public.company_members
  for update to authenticated
  using (
    exists (
      select 1
      from public.company_members me
      where me.company_id = company_members.company_id
        and me.user_id    = auth.uid()
        and me.role in ('owner','admin')
    )
  )
  with check (
    exists (
      select 1
      from public.company_members me
      where me.company_id = company_members.company_id
        and me.user_id    = auth.uid()
        and me.role in ('owner','admin')
    )
  );

drop policy if exists cm_delete on public.company_members;
create policy cm_delete on public.company_members
  for delete to authenticated
  using (
    -- o próprio membro saindo, ou owner/admin removendo alguém
    user_id = auth.uid()
    or exists (
      select 1
      from public.company_members me
      where me.company_id = company_members.company_id
        and me.user_id    = auth.uid()
        and me.role in ('owner','admin')
    )
  );

-- ---------------------------------------------------------------------
-- accounts
-- ---------------------------------------------------------------------
alter table public.accounts enable row level security;

drop policy if exists accounts_select on public.accounts;
create policy accounts_select on public.accounts
  for select to authenticated using (public.is_company_member(company_id));

drop policy if exists accounts_insert on public.accounts;
create policy accounts_insert on public.accounts
  for insert to authenticated with check (public.is_company_member(company_id));

drop policy if exists accounts_update on public.accounts;
create policy accounts_update on public.accounts
  for update to authenticated
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

drop policy if exists accounts_delete on public.accounts;
create policy accounts_delete on public.accounts
  for delete to authenticated using (public.is_company_member(company_id));

-- ---------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------
alter table public.categories enable row level security;

drop policy if exists categories_select on public.categories;
create policy categories_select on public.categories
  for select to authenticated using (public.is_company_member(company_id));

drop policy if exists categories_insert on public.categories;
create policy categories_insert on public.categories
  for insert to authenticated with check (public.is_company_member(company_id));

drop policy if exists categories_update on public.categories;
create policy categories_update on public.categories
  for update to authenticated
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

drop policy if exists categories_delete on public.categories;
create policy categories_delete on public.categories
  for delete to authenticated using (public.is_company_member(company_id));

-- ---------------------------------------------------------------------
-- transactions
-- ---------------------------------------------------------------------
alter table public.transactions enable row level security;

drop policy if exists tx_select on public.transactions;
create policy tx_select on public.transactions
  for select to authenticated using (public.is_company_member(company_id));

drop policy if exists tx_insert on public.transactions;
create policy tx_insert on public.transactions
  for insert to authenticated
  with check (
    public.is_company_member(company_id)
    and created_by = auth.uid()
  );

drop policy if exists tx_update on public.transactions;
create policy tx_update on public.transactions
  for update to authenticated
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

drop policy if exists tx_delete on public.transactions;
create policy tx_delete on public.transactions
  for delete to authenticated using (public.is_company_member(company_id));
