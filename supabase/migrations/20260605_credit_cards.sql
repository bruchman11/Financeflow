-- =====================================================================
-- Migration: Cartões de crédito + faturas + compras parceladas
-- Fase 4 do v2
-- =====================================================================
--
-- ROLLBACK:
--   drop trigger if exists trg_prevent_purchase_change_on_paid on credit_card_purchases;
--   drop function if exists public.prevent_purchase_change_on_paid_invoice();
--   drop trigger if exists trg_recalc_invoice_total on credit_card_purchases;
--   drop function if exists public.recalc_invoice_total();
--   drop function if exists public.pay_credit_card_invoice(...);
--   drop function if exists public.create_credit_card_purchase(...);
--   drop function if exists public.get_or_create_invoice_for_month(uuid,date);
--   drop function if exists public.reference_month_for_purchase(uuid,date);
--   drop function if exists public.safe_day(int,int,int);
--   drop table public.credit_card_purchases;
--   drop table public.credit_card_invoices;
--   drop table public.credit_cards;
--
-- =====================================================================

-- 1. Tabela: cartões de crédito
create table public.credit_cards (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  closing_day smallint not null check (closing_day between 1 and 31),
  due_day smallint not null check (due_day between 1 and 31),
  limit_amount numeric(14,2),
  payment_account_id uuid references public.accounts(id) on delete set null,
  color text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_cards_company on public.credit_cards(company_id);

drop trigger if exists trg_cards_updated_at on public.credit_cards;
create trigger trg_cards_updated_at
  before update on public.credit_cards
  for each row execute function public.set_updated_at();

-- 2. Tabela: faturas mensais
create table public.credit_card_invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  credit_card_id uuid not null references public.credit_cards(id) on delete cascade,
  reference_month date not null,        -- sempre dia 01 do mês de referência
  closing_date date not null,
  due_date date not null,
  total_amount numeric(14,2) not null default 0,
  status text not null default 'open'
    check (status in ('open','closed','paid','overdue')),
  paid_at date,
  payment_transaction_id uuid references public.transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (credit_card_id, reference_month)
);
create index idx_invoices_card on public.credit_card_invoices(credit_card_id);
create index idx_invoices_due
  on public.credit_card_invoices(company_id, due_date) where status <> 'paid';

drop trigger if exists trg_invoices_updated_at on public.credit_card_invoices;
create trigger trg_invoices_updated_at
  before update on public.credit_card_invoices
  for each row execute function public.set_updated_at();

-- 3. Tabela: compras (1 linha por parcela)
create table public.credit_card_purchases (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  credit_card_id uuid not null references public.credit_cards(id) on delete cascade,
  invoice_id uuid not null references public.credit_card_invoices(id) on delete restrict,
  category_id uuid references public.categories(id) on delete restrict,
  description text not null,
  installment_group_id uuid not null,
  total_amount numeric(14,2) not null,         -- valor total da compra original
  installment_number smallint not null,
  installments_total smallint not null,
  installment_amount numeric(14,2) not null,   -- valor desta parcela
  purchase_date date not null,
  competence_date date not null,
  payee text,
  notes text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (installment_group_id, installment_number)
);
create index idx_purchases_card on public.credit_card_purchases(credit_card_id);
create index idx_purchases_invoice on public.credit_card_purchases(invoice_id);
create index idx_purchases_group on public.credit_card_purchases(installment_group_id);

drop trigger if exists trg_purchases_updated_at on public.credit_card_purchases;
create trigger trg_purchases_updated_at
  before update on public.credit_card_purchases
  for each row execute function public.set_updated_at();

-- 4. RLS
alter table public.credit_cards enable row level security;
alter table public.credit_card_invoices enable row level security;
alter table public.credit_card_purchases enable row level security;

create policy cards_select on public.credit_cards
  for select using (public.is_company_member(company_id));
create policy cards_insert on public.credit_cards
  for insert with check (public.is_company_member(company_id));
create policy cards_update on public.credit_cards
  for update using (public.is_company_member(company_id))
              with check (public.is_company_member(company_id));
create policy cards_delete on public.credit_cards
  for delete using (public.is_company_member(company_id));

create policy invoices_select on public.credit_card_invoices
  for select using (public.is_company_member(company_id));
create policy invoices_insert on public.credit_card_invoices
  for insert with check (public.is_company_member(company_id));
create policy invoices_update on public.credit_card_invoices
  for update using (public.is_company_member(company_id))
              with check (public.is_company_member(company_id));
create policy invoices_delete on public.credit_card_invoices
  for delete using (public.is_company_member(company_id));

create policy purchases_select on public.credit_card_purchases
  for select using (public.is_company_member(company_id));
create policy purchases_insert on public.credit_card_purchases
  for insert with check (public.is_company_member(company_id));
create policy purchases_update on public.credit_card_purchases
  for update using (public.is_company_member(company_id))
              with check (public.is_company_member(company_id));
create policy purchases_delete on public.credit_card_purchases
  for delete using (public.is_company_member(company_id));

-- 5. Helper: clampa dia para o último dia válido do mês
-- safe_day(2026, 2, 31) = '2026-02-28'
create or replace function public.safe_day(_year int, _month int, _day int)
returns date language plpgsql immutable as $$
declare last_day int;
begin
  last_day := extract(day from
    (make_date(_year, _month, 1) + interval '1 month - 1 day')::date)::int;
  return make_date(_year, _month, least(_day, last_day));
end $$;

-- 6. Calcula o reference_month de uma compra (considerando dia de fechamento)
-- Se purchase_date > closing_day do mês: vai para o mês seguinte.
create or replace function public.reference_month_for_purchase(
  _card_id uuid, _purchase_date date
) returns date language plpgsql stable as $$
declare
  card public.credit_cards;
  y int; m int;
  closing_d date;
begin
  select * into card from public.credit_cards where id = _card_id;
  if card.id is null then
    raise exception 'card_not_found' using errcode = 'P0001';
  end if;

  y := extract(year from _purchase_date)::int;
  m := extract(month from _purchase_date)::int;
  closing_d := public.safe_day(y, m, card.closing_day);

  if _purchase_date > closing_d then
    if m = 12 then y := y + 1; m := 1; else m := m + 1; end if;
  end if;

  return make_date(y, m, 1);
end $$;

-- 7. Get-or-create da fatura para um reference_month específico.
-- Cria a fatura com closing_date e due_date calculados.
create or replace function public.get_or_create_invoice_for_month(
  _card_id uuid, _ref_month date
) returns uuid
language plpgsql security definer
set search_path = public as $$
declare
  card public.credit_cards;
  inv_id uuid;
  inv_status text;
  y int; m int;
  closing_d date;
  due_d date;
begin
  select * into card from public.credit_cards where id = _card_id;
  if card.id is null then
    raise exception 'card_not_found' using errcode = 'P0001';
  end if;
  if not public.is_company_member(card.company_id) then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  y := extract(year from _ref_month)::int;
  m := extract(month from _ref_month)::int;
  closing_d := public.safe_day(y, m, card.closing_day);

  -- Vencimento: se due_day <= closing_day, vence no mês seguinte ao fechamento
  if card.due_day <= card.closing_day then
    if m = 12 then due_d := public.safe_day(y + 1, 1, card.due_day);
    else due_d := public.safe_day(y, m + 1, card.due_day); end if;
  else
    due_d := public.safe_day(y, m, card.due_day);
  end if;

  select id, status into inv_id, inv_status
  from public.credit_card_invoices
  where credit_card_id = _card_id and reference_month = make_date(y, m, 1);

  if inv_id is null then
    insert into public.credit_card_invoices
      (company_id, credit_card_id, reference_month, closing_date, due_date)
    values (card.company_id, _card_id, make_date(y, m, 1), closing_d, due_d)
    returning id into inv_id;
  end if;

  if inv_status = 'paid' then
    raise exception 'invoice_already_paid' using errcode = 'P0001';
  end if;

  return inv_id;
end $$;

-- 8. RPC: criar compra (com parcelamento opcional)
-- Cria N parcelas em N faturas consecutivas. Retorna o installment_group_id.
create or replace function public.create_credit_card_purchase(
  _card_id uuid,
  _category_id uuid,
  _description text,
  _total_amount numeric,
  _installments_total smallint,
  _purchase_date date,
  _competence_date date default null,
  _payee text default null,
  _notes text default null
) returns uuid
language plpgsql security definer
set search_path = public as $$
declare
  card public.credit_cards;
  uid uuid := auth.uid();
  group_id uuid := gen_random_uuid();
  inst_amount numeric(14,2);
  last_amount numeric(14,2);
  i smallint;
  ref_date date;
  inv_id uuid;
  comp_date date;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if _total_amount <= 0 then raise exception 'invalid_amount' using errcode = 'P0001'; end if;
  if _installments_total < 1 or _installments_total > 60 then
    raise exception 'invalid_installments' using errcode = 'P0001';
  end if;

  select * into card from public.credit_cards where id = _card_id;
  if card.id is null then raise exception 'card_not_found' using errcode = 'P0001'; end if;
  if not public.is_company_member(card.company_id) then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  if not card.is_active then
    raise exception 'card_inactive' using errcode = 'P0001';
  end if;

  -- Valida categoria (opcional)
  if _category_id is not null then
    if not exists (select 1 from public.categories
                   where id = _category_id and company_id = card.company_id) then
      raise exception 'invalid_category' using errcode = 'P0001';
    end if;
  end if;

  inst_amount := round(_total_amount / _installments_total, 2);
  -- Última parcela absorve diferença de arredondamento
  last_amount := _total_amount - (inst_amount * (_installments_total - 1));

  comp_date := coalesce(_competence_date, _purchase_date);

  ref_date := public.reference_month_for_purchase(_card_id, _purchase_date);

  for i in 1.._installments_total loop
    if i > 1 then
      ref_date := (ref_date + interval '1 month')::date;
    end if;
    inv_id := public.get_or_create_invoice_for_month(_card_id, ref_date);

    insert into public.credit_card_purchases
      (company_id, credit_card_id, invoice_id, category_id,
       description, installment_group_id, total_amount,
       installment_number, installments_total, installment_amount,
       purchase_date, competence_date, payee, notes, created_by)
    values
      (card.company_id, _card_id, inv_id, _category_id,
       _description, group_id, _total_amount,
       i, _installments_total,
       case when i = _installments_total then last_amount else inst_amount end,
       _purchase_date, comp_date, _payee, _notes, uid);
  end loop;

  return group_id;
end $$;

-- 9. Trigger: recalcula total_amount da fatura ao mudar/inserir/excluir compra
create or replace function public.recalc_invoice_total()
returns trigger language plpgsql security definer
set search_path = public as $$
declare
  inv_id_new uuid;
  inv_id_old uuid;
begin
  if TG_OP = 'INSERT' then
    inv_id_new := new.invoice_id;
  elsif TG_OP = 'UPDATE' then
    inv_id_new := new.invoice_id;
    inv_id_old := old.invoice_id;
  else
    inv_id_old := old.invoice_id;
  end if;

  if inv_id_new is not null then
    update public.credit_card_invoices set
      total_amount = coalesce((select sum(installment_amount)
        from public.credit_card_purchases where invoice_id = inv_id_new), 0)
    where id = inv_id_new;
  end if;

  if inv_id_old is not null and inv_id_old is distinct from inv_id_new then
    update public.credit_card_invoices set
      total_amount = coalesce((select sum(installment_amount)
        from public.credit_card_purchases where invoice_id = inv_id_old), 0)
    where id = inv_id_old;
  end if;

  return null;
end $$;

drop trigger if exists trg_recalc_invoice_total on public.credit_card_purchases;
create trigger trg_recalc_invoice_total
  after insert or update or delete on public.credit_card_purchases
  for each row execute function public.recalc_invoice_total();

-- 10. Trigger: impede alterar/inserir/excluir compras de fatura paga
create or replace function public.prevent_purchase_change_on_paid_invoice()
returns trigger language plpgsql security definer
set search_path = public as $$
declare inv_status text;
begin
  select status into inv_status
  from public.credit_card_invoices
  where id = coalesce(new.invoice_id, old.invoice_id);

  if inv_status = 'paid' then
    raise exception 'invoice_already_paid' using errcode = 'P0001';
  end if;

  return coalesce(new, old);
end $$;

drop trigger if exists trg_prevent_purchase_change_on_paid on public.credit_card_purchases;
create trigger trg_prevent_purchase_change_on_paid
  before insert or update or delete on public.credit_card_purchases
  for each row execute function public.prevent_purchase_change_on_paid_invoice();

-- 11. RPC: pagar fatura
-- Cria 1 transaction kind='card_payment' + atualiza invoice para 'paid'.
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
  tx_id uuid;
  description text;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if _amount <= 0 then raise exception 'invalid_amount' using errcode = 'P0001'; end if;

  select * into inv from public.credit_card_invoices where id = _invoice_id;
  if inv.id is null then raise exception 'invoice_not_found' using errcode = 'P0001'; end if;
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

  description := 'Pagamento fatura ' || to_char(inv.reference_month, 'MM/YYYY');

  insert into public.transactions
    (company_id, account_id, type, amount, description,
     occurred_on, competence_date, kind, created_by)
  values
    (inv.company_id, _account_id, 'expense', _amount, description,
     _paid_on, inv.due_date, 'card_payment', uid)
  returning id into tx_id;

  update public.credit_card_invoices set
    status = 'paid',
    paid_at = _paid_on,
    payment_transaction_id = tx_id
  where id = _invoice_id;

  return tx_id;
end $$;
