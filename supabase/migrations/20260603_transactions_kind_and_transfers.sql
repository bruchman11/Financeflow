-- =====================================================================
-- Migration: kind + transfer_group_id em transactions + RPCs
-- Fase 2 do v2
-- Não destrutivo. Linhas existentes ficam com kind='regular'.
-- =====================================================================
--
-- ROLLBACK (manual):
--   drop trigger if exists trg_tx_cascade_transfer on public.transactions;
--   drop function if exists public.tx_cascade_delete_transfer();
--   drop function if exists public.create_balance_adjustment(uuid,numeric,date,text);
--   drop function if exists public.create_transfer(uuid,uuid,numeric,date,text,date);
--   alter table public.transactions drop column if exists transfer_group_id;
--   alter table public.transactions drop column if exists kind;
--
-- =====================================================================

-- 1. Adiciona colunas. Default 'regular' para todas linhas existentes.
alter table public.transactions
  add column if not exists kind text not null default 'regular'
    check (kind in ('regular','transfer','adjustment','card_payment')),
  add column if not exists transfer_group_id uuid;

create index if not exists idx_transactions_kind
  on public.transactions(company_id, kind);

create index if not exists idx_transactions_transfer_group
  on public.transactions(transfer_group_id) where transfer_group_id is not null;

-- 2. RPC atômica: cria transferência (2 transactions com mesmo group_id)
create or replace function public.create_transfer(
  _from_account_id uuid,
  _to_account_id uuid,
  _amount numeric,
  _occurred_on date,
  _description text,
  _competence_date date default null
) returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  group_id uuid := gen_random_uuid();
  company uuid;
  uid uuid := auth.uid();
  comp_date date;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if _from_account_id = _to_account_id then
    raise exception 'same_account' using errcode = 'P0001';
  end if;
  if _amount <= 0 then
    raise exception 'invalid_amount' using errcode = 'P0001';
  end if;

  -- Confirma que ambas as contas são da mesma empresa do usuário
  select company_id into company from public.accounts where id = _from_account_id;
  if company is null then
    raise exception 'account_not_found' using errcode = 'P0001';
  end if;
  if not public.is_company_member(company) then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.accounts
    where id = _to_account_id and company_id = company
  ) then
    raise exception 'target_account_invalid' using errcode = 'P0001';
  end if;

  comp_date := coalesce(_competence_date, _occurred_on);

  -- Saída da conta origem
  insert into public.transactions
    (company_id, account_id, type, amount, description, occurred_on,
     competence_date, kind, transfer_group_id, created_by)
  values
    (company, _from_account_id, 'expense', _amount, _description,
     _occurred_on, comp_date, 'transfer', group_id, uid);

  -- Entrada na conta destino
  insert into public.transactions
    (company_id, account_id, type, amount, description, occurred_on,
     competence_date, kind, transfer_group_id, created_by)
  values
    (company, _to_account_id, 'income', _amount, _description,
     _occurred_on, comp_date, 'transfer', group_id, uid);

  return group_id;
end $$;

-- 3. RPC: ajuste de saldo. Insere 1 transaction kind='adjustment' com
-- valor = (saldo_alvo - saldo_atual). Retorna null se delta=0.
create or replace function public.create_balance_adjustment(
  _account_id uuid,
  _target_balance numeric,
  _occurred_on date,
  _reason text
) returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  company uuid;
  uid uuid := auth.uid();
  current_balance numeric;
  delta numeric;
  tx_id uuid;
  tx_type text;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;

  select company_id into company from public.accounts where id = _account_id;
  if company is null then
    raise exception 'account_not_found' using errcode = 'P0001';
  end if;
  if not public.is_company_member(company) then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  -- Saldo atual = opening_balance + soma sinalizada de todas as transações
  select
    a.opening_balance + coalesce(sum(
      case when t.type = 'income' then t.amount else -t.amount end
    ), 0)
  into current_balance
  from public.accounts a
  left join public.transactions t on t.account_id = a.id
  where a.id = _account_id
  group by a.opening_balance;

  delta := _target_balance - current_balance;
  if delta = 0 then return null; end if;

  if delta > 0 then
    tx_type := 'income';
  else
    tx_type := 'expense';
    delta := -delta;
  end if;

  insert into public.transactions
    (company_id, account_id, type, amount, description, occurred_on,
     competence_date, kind, created_by)
  values
    (company, _account_id, tx_type, delta,
     'Ajuste de saldo' || case when _reason is not null and length(trim(_reason)) > 0
                              then ': ' || _reason else '' end,
     _occurred_on, _occurred_on, 'adjustment', uid)
  returning id into tx_id;

  return tx_id;
end $$;

-- 4. Trigger: quando uma transação de transferência é excluída, o outro lado
-- também é excluído (mantém a integridade do par).
create or replace function public.tx_cascade_delete_transfer()
returns trigger language plpgsql as $$
begin
  if old.kind = 'transfer' and old.transfer_group_id is not null then
    delete from public.transactions
    where transfer_group_id = old.transfer_group_id
      and id <> old.id;
  end if;
  return old;
end $$;

drop trigger if exists trg_tx_cascade_transfer on public.transactions;
create trigger trg_tx_cascade_transfer
  after delete on public.transactions
  for each row execute function public.tx_cascade_delete_transfer();
