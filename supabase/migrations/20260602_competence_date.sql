-- =====================================================================
-- Migration: Data de competência nas transações
-- Fase 1 do v2
-- Não destrutivo. Backfill = occurred_on.
-- =====================================================================
--
-- ROLLBACK:
--   drop trigger if exists trg_tx_default_competence on public.transactions;
--   drop function if exists public.tx_default_competence();
--   alter table public.transactions drop column if exists competence_date;
--
-- =====================================================================

alter table public.transactions
  add column if not exists competence_date date;

-- Backfill: competência = data de caixa para tudo que existir
update public.transactions
   set competence_date = occurred_on
 where competence_date is null;

alter table public.transactions
  alter column competence_date set not null;

-- Trigger: ao inserir sem informar, espelha occurred_on
create or replace function public.tx_default_competence()
returns trigger language plpgsql as $$
begin
  if new.competence_date is null then
    new.competence_date := new.occurred_on;
  end if;
  return new;
end $$;

drop trigger if exists trg_tx_default_competence on public.transactions;
create trigger trg_tx_default_competence
  before insert on public.transactions
  for each row execute function public.tx_default_competence();

-- Índice para queries por competência (DRE accrual)
create index if not exists idx_transactions_competence
  on public.transactions(company_id, competence_date desc);
