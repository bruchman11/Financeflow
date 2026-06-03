-- =====================================================================
-- Migration: Despesas fixas/recorrentes + histórico de pagamentos
-- Fase 3 do v2
-- =====================================================================
--
-- ROLLBACK:
--   drop function if exists public.record_fixed_expense_payment(...);
--   drop function if exists public.advance_fixed_expense_due_date(uuid);
--   drop function if exists public.compute_next_due_date(text, int, date);
--   drop table public.fixed_expense_payments;
--   drop table public.fixed_expenses;
--
-- =====================================================================

-- 1. Tabela de despesas fixas
create table public.fixed_expenses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  description text not null,
  amount numeric(14,2) not null check (amount > 0),
  frequency text not null check (frequency in
    ('weekly','biweekly','monthly','bimonthly','quarterly','semiannual','annual','custom')),
  custom_interval_days int,
  next_due_date date not null,
  category_id uuid references public.categories(id) on delete restrict,
  default_account_id uuid references public.accounts(id) on delete restrict,
  status text not null default 'active' check (status in ('active','inactive')),
  notes text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Quando frequency='custom', custom_interval_days é obrigatório
  constraint custom_requires_days
    check (frequency <> 'custom' or (custom_interval_days is not null and custom_interval_days > 0))
);

create index idx_fixed_expenses_company on public.fixed_expenses(company_id);
create index idx_fixed_expenses_due
  on public.fixed_expenses(company_id, next_due_date)
  where status = 'active';

drop trigger if exists trg_fixed_expenses_updated_at on public.fixed_expenses;
create trigger trg_fixed_expenses_updated_at
  before update on public.fixed_expenses
  for each row execute function public.set_updated_at();

-- 2. Histórico de pagamentos
create table public.fixed_expense_payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  fixed_expense_id uuid not null references public.fixed_expenses(id) on delete cascade,
  transaction_id uuid not null references public.transactions(id) on delete restrict,
  paid_at date not null,
  amount_paid numeric(14,2) not null,
  account_id uuid not null references public.accounts(id) on delete restrict,
  due_date_paid date not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  -- Impede pagar a mesma competência/vencimento duas vezes
  unique (fixed_expense_id, due_date_paid)
);

create index idx_fxp_company on public.fixed_expense_payments(company_id);
create index idx_fxp_fixed_expense on public.fixed_expense_payments(fixed_expense_id);
create index idx_fxp_transaction on public.fixed_expense_payments(transaction_id);

-- 3. RLS
alter table public.fixed_expenses enable row level security;
alter table public.fixed_expense_payments enable row level security;

create policy fxe_select on public.fixed_expenses
  for select using (public.is_company_member(company_id));
create policy fxe_insert on public.fixed_expenses
  for insert with check (public.is_company_member(company_id));
create policy fxe_update on public.fixed_expenses
  for update using (public.is_company_member(company_id))
              with check (public.is_company_member(company_id));
create policy fxe_delete on public.fixed_expenses
  for delete using (public.is_company_member(company_id));

create policy fxp_select on public.fixed_expense_payments
  for select using (public.is_company_member(company_id));
create policy fxp_insert on public.fixed_expense_payments
  for insert with check (public.is_company_member(company_id));
create policy fxp_update on public.fixed_expense_payments
  for update using (public.is_company_member(company_id))
              with check (public.is_company_member(company_id));
create policy fxp_delete on public.fixed_expense_payments
  for delete using (public.is_company_member(company_id));

-- 4. Helper: calcula próxima data conforme frequency
create or replace function public.compute_next_due_date(
  _frequency text,
  _custom_days int,
  _from_date date
) returns date
language plpgsql immutable as $$
begin
  return case _frequency
    when 'weekly'     then _from_date + interval '1 week'
    when 'biweekly'   then _from_date + interval '2 weeks'
    when 'monthly'    then _from_date + interval '1 month'
    when 'bimonthly'  then _from_date + interval '2 months'
    when 'quarterly'  then _from_date + interval '3 months'
    when 'semiannual' then _from_date + interval '6 months'
    when 'annual'     then _from_date + interval '1 year'
    when 'custom'     then _from_date + (_custom_days || ' days')::interval
    else _from_date + interval '1 month'
  end;
end $$;

-- 5. RPC atômica: registra pagamento de despesa fixa
-- 1) Insere transaction (kind='regular', type='expense')
-- 2) Insere registro em fixed_expense_payments
-- 3) Avança next_due_date conforme frequency
create or replace function public.record_fixed_expense_payment(
  _fixed_expense_id uuid,
  _account_id uuid,
  _amount numeric,
  _paid_on date,
  _due_date_paid date,
  _category_id uuid default null
) returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  fxe public.fixed_expenses;
  tx_id uuid;
  next_due date;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if _amount <= 0 then raise exception 'invalid_amount' using errcode = 'P0001'; end if;

  select * into fxe from public.fixed_expenses where id = _fixed_expense_id;
  if fxe.id is null then raise exception 'fixed_expense_not_found' using errcode = 'P0001'; end if;
  if not public.is_company_member(fxe.company_id) then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  if fxe.status <> 'active' then raise exception 'inactive' using errcode = 'P0001'; end if;

  -- Valida que a conta pertence à mesma empresa
  if not exists (
    select 1 from public.accounts where id = _account_id and company_id = fxe.company_id
  ) then
    raise exception 'account_invalid' using errcode = 'P0001';
  end if;

  -- 1) Cria a transação de saída
  insert into public.transactions
    (company_id, account_id, category_id, type, amount, description,
     occurred_on, competence_date, kind, created_by)
  values
    (fxe.company_id, _account_id, coalesce(_category_id, fxe.category_id),
     'expense', _amount,
     fxe.description,
     _paid_on, _due_date_paid, 'regular', uid)
  returning id into tx_id;

  -- 2) Registra histórico (UNIQUE constraint protege contra dupe)
  insert into public.fixed_expense_payments
    (company_id, fixed_expense_id, transaction_id, paid_at, amount_paid,
     account_id, due_date_paid, created_by)
  values
    (fxe.company_id, fxe.id, tx_id, _paid_on, _amount, _account_id, _due_date_paid, uid);

  -- 3) Avança o próximo vencimento (a partir do due_date pago)
  next_due := public.compute_next_due_date(
    fxe.frequency, fxe.custom_interval_days, _due_date_paid
  );
  update public.fixed_expenses set next_due_date = next_due where id = fxe.id;

  return tx_id;
end $$;
