-- =====================================================================
-- Migration: Boletos (bills) — cadastro manual + pagamento
-- Fase 5 do v2
-- Não destrutivo. Tabela nova + RPC + trigger de unpay.
-- =====================================================================
--
-- ROLLBACK:
--   drop trigger if exists trg_bill_unpay_on_tx_delete on transactions;
--   drop function if exists public.bill_unpay_before_tx_delete();
--   drop function if exists public.pay_bill(uuid,uuid,numeric,date);
--   drop table public.bills;
--
-- =====================================================================

-- 1. Tabela
create table public.bills (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  description text not null,
  beneficiary_name text,
  barcode text,
  digitable_line text,
  amount numeric(14,2) not null check (amount > 0),
  due_date date not null,
  category_id uuid references public.categories(id) on delete restrict,
  competence_date date not null,
  status text not null default 'pending'
    check (status in ('pending','paid','canceled')),
  source text not null default 'manual' check (source in ('manual','import')),
  attachment_url text,
  paid_at date,
  payment_account_id uuid references public.accounts(id) on delete set null,
  payment_transaction_id uuid references public.transactions(id) on delete set null,
  notes text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_bills_company on public.bills(company_id);
create index idx_bills_due_pending
  on public.bills(company_id, due_date) where status = 'pending';
create index idx_bills_payment_tx
  on public.bills(payment_transaction_id) where payment_transaction_id is not null;

drop trigger if exists trg_bills_updated_at on public.bills;
create trigger trg_bills_updated_at
  before update on public.bills
  for each row execute function public.set_updated_at();

-- 2. RLS
alter table public.bills enable row level security;

create policy bills_select on public.bills
  for select using (public.is_company_member(company_id));
create policy bills_insert on public.bills
  for insert with check (public.is_company_member(company_id));
create policy bills_update on public.bills
  for update using (public.is_company_member(company_id))
              with check (public.is_company_member(company_id));
create policy bills_delete on public.bills
  for delete using (public.is_company_member(company_id));

-- 3. RPC: pagar boleto
-- Cria 1 transação kind='regular', type='expense' com a categoria do boleto.
-- Marca o boleto como pago e linka payment_transaction_id.
create or replace function public.pay_bill(
  _bill_id uuid,
  _account_id uuid,
  _amount numeric,
  _paid_on date
) returns uuid
language plpgsql security definer
set search_path = public as $$
declare
  uid uuid := auth.uid();
  bill public.bills;
  tx_id uuid;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if _amount <= 0 then raise exception 'invalid_amount' using errcode = 'P0001'; end if;

  select * into bill from public.bills where id = _bill_id;
  if bill.id is null then
    raise exception 'bill_not_found' using errcode = 'P0001';
  end if;
  if not public.is_company_member(bill.company_id) then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  if bill.status = 'paid' then
    raise exception 'bill_already_paid' using errcode = 'P0001';
  end if;
  if bill.status = 'canceled' then
    raise exception 'bill_canceled' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.accounts
    where id = _account_id and company_id = bill.company_id
  ) then
    raise exception 'account_invalid' using errcode = 'P0001';
  end if;

  insert into public.transactions
    (company_id, account_id, category_id, type, amount, description,
     occurred_on, competence_date, kind, created_by)
  values
    (bill.company_id, _account_id, bill.category_id, 'expense', _amount,
     bill.description, _paid_on, bill.competence_date, 'regular', uid)
  returning id into tx_id;

  update public.bills set
    status = 'paid',
    paid_at = _paid_on,
    payment_account_id = _account_id,
    payment_transaction_id = tx_id
  where id = _bill_id;

  return tx_id;
end $$;

-- 4. Trigger BEFORE DELETE em transactions: ao excluir uma transação ligada
-- a um boleto, volta o boleto para status 'pending' (igual ao padrão das
-- faturas de cartão).
create or replace function public.bill_unpay_before_tx_delete()
returns trigger language plpgsql security definer
set search_path = public as $$
declare
  affected_bill_id uuid;
begin
  select id into affected_bill_id
  from public.bills
  where payment_transaction_id = old.id
  limit 1;

  if affected_bill_id is not null then
    update public.bills set
      status = 'pending',
      paid_at = null,
      payment_account_id = null
    where id = affected_bill_id;
  end if;

  return old;
end $$;

drop trigger if exists trg_bill_unpay_on_tx_delete on public.transactions;
create trigger trg_bill_unpay_on_tx_delete
  before delete on public.transactions
  for each row execute function public.bill_unpay_before_tx_delete();
