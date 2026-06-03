-- =====================================================================
-- Migration: Pagamento de fatura como N transações + unpay trigger
-- Fix dos 3 bugs:
--   1) Excluir transação de pagamento não revertia status da fatura
--   2) Não era possível editar compras de fatura paga
--   3) Compras não apareciam na DRE (um único lump-sum sem categoria)
-- =====================================================================
--
-- ROLLBACK manual (resumido):
--   drop trigger if exists trg_cc_unpay_on_tx_delete on transactions;
--   drop function if exists public.cc_unpay_invoice_before_tx_delete();
--   alter table credit_card_purchases drop column if exists payment_transaction_id;
--   -- restaurar pay_credit_card_invoice e prevent_purchase_change_on_paid_invoice
--   -- do arquivo 20260605_credit_cards.sql
--
-- =====================================================================

-- 1. Coluna nova: cada parcela aponta para a transação que a pagou
alter table public.credit_card_purchases
  add column if not exists payment_transaction_id uuid
    references public.transactions(id) on delete set null;

create index if not exists idx_purchases_payment_tx
  on public.credit_card_purchases(payment_transaction_id)
  where payment_transaction_id is not null;

-- 2. Trigger relaxado: bloqueia mudanças estruturais em compras de fatura paga,
-- mas libera edição de description/category/payee/notes.
create or replace function public.prevent_purchase_change_on_paid_invoice()
returns trigger language plpgsql security definer
set search_path = public as $$
declare
  inv_status text;
begin
  select status into inv_status
  from public.credit_card_invoices
  where id = coalesce(new.invoice_id, old.invoice_id);

  if inv_status is null or inv_status <> 'paid' then
    -- Fatura não paga: comportamento normal, nada a bloquear
    return coalesce(new, old);
  end if;

  -- Fatura paga: INSERT e DELETE seguem bloqueados
  if TG_OP = 'INSERT' or TG_OP = 'DELETE' then
    raise exception 'invoice_already_paid' using errcode = 'P0001';
  end if;

  -- UPDATE: permite description/category_id/payee/notes/payment_transaction_id.
  -- Bloqueia mudanças em valor, parcela, datas e relações estruturais.
  if new.credit_card_id is distinct from old.credit_card_id
     or new.invoice_id is distinct from old.invoice_id
     or new.installment_group_id is distinct from old.installment_group_id
     or new.installment_number is distinct from old.installment_number
     or new.installments_total is distinct from old.installments_total
     or new.installment_amount is distinct from old.installment_amount
     or new.total_amount is distinct from old.total_amount
     or new.purchase_date is distinct from old.purchase_date
     or new.competence_date is distinct from old.competence_date
  then
    raise exception 'invoice_already_paid' using errcode = 'P0001';
  end if;

  return new;
end $$;

-- 3. Reescreve pay_credit_card_invoice: N transações kind='regular'
-- A coluna _amount é aceita mas ignorada (mantida na assinatura para
-- compatibilidade com chamadas existentes). O total é a soma das parcelas
-- ainda não pagas (payment_transaction_id is null).
create or replace function public.pay_credit_card_invoice(
  _invoice_id uuid,
  _account_id uuid,
  _amount numeric,
  _paid_on date
) returns uuid
language plpgsql security definer
set search_path = public as $$
declare
  inv public.credit_card_invoices;
  uid uuid := auth.uid();
  purch record;
  new_tx_id uuid;
  first_tx_id uuid;
  any_paid boolean := false;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;

  select * into inv from public.credit_card_invoices where id = _invoice_id;
  if inv.id is null then
    raise exception 'invoice_not_found' using errcode = 'P0001';
  end if;
  if not public.is_company_member(inv.company_id) then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  if inv.status = 'paid' then
    raise exception 'invoice_already_paid' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.accounts
    where id = _account_id and company_id = inv.company_id
  ) then
    raise exception 'account_invalid' using errcode = 'P0001';
  end if;

  -- Para cada compra ainda não paga, cria 1 transação e vincula
  for purch in (
    select *
    from public.credit_card_purchases
    where invoice_id = _invoice_id
      and payment_transaction_id is null
    order by purchase_date, installment_number
  ) loop
    insert into public.transactions
      (company_id, account_id, category_id, type, amount, description,
       occurred_on, competence_date, kind, created_by)
    values
      (inv.company_id, _account_id, purch.category_id,
       'expense', purch.installment_amount,
       case
         when purch.installments_total > 1 then
           purch.description || ' ' ||
           lpad(purch.installment_number::text, 2, '0') || '/' ||
           lpad(purch.installments_total::text, 2, '0')
         else purch.description
       end,
       _paid_on, purch.competence_date, 'regular', uid)
    returning id into new_tx_id;

    update public.credit_card_purchases
      set payment_transaction_id = new_tx_id
      where id = purch.id;

    if first_tx_id is null then first_tx_id := new_tx_id; end if;
    any_paid := true;
  end loop;

  if not any_paid then
    raise exception 'no_unpaid_purchases' using errcode = 'P0001';
  end if;

  update public.credit_card_invoices set
    status = 'paid',
    paid_at = _paid_on
  where id = _invoice_id;

  return first_tx_id;
end $$;

-- 4. Trigger BEFORE DELETE em transactions: ao deletar uma transação ligada
-- a uma compra (modelo novo) OU diretamente à fatura (legado kind='card_payment'),
-- volta o status da fatura para 'open'.
create or replace function public.cc_unpay_invoice_before_tx_delete()
returns trigger language plpgsql security definer
set search_path = public as $$
declare
  inv_via_purchase uuid;
  inv_via_legacy uuid;
begin
  -- Modelo novo: a transação está vinculada a uma compra
  select invoice_id into inv_via_purchase
  from public.credit_card_purchases
  where payment_transaction_id = old.id
  limit 1;

  -- Modelo legado: invoice.payment_transaction_id aponta para a transação
  select id into inv_via_legacy
  from public.credit_card_invoices
  where payment_transaction_id = old.id
  limit 1;

  if inv_via_purchase is not null then
    update public.credit_card_invoices set
      status = 'open',
      paid_at = null
    where id = inv_via_purchase;
  end if;

  if inv_via_legacy is not null
     and (inv_via_purchase is null or inv_via_legacy <> inv_via_purchase)
  then
    update public.credit_card_invoices set
      status = 'open',
      paid_at = null,
      payment_transaction_id = null
    where id = inv_via_legacy;
  end if;

  return old;
end $$;

drop trigger if exists trg_cc_unpay_on_tx_delete on public.transactions;
create trigger trg_cc_unpay_on_tx_delete
  before delete on public.transactions
  for each row execute function public.cc_unpay_invoice_before_tx_delete();
