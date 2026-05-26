-- =====================================================================
-- FinanceFlow — Função RPC para criar empresa com defaults
-- Chamada pelo cliente quando o usuário cria uma nova empresa.
-- Executa atomicamente:
--   1. cria companies
--   2. adiciona o caller como owner em company_members
--   3. cria conta padrão "Caixa"
--   4. popula categorias padrão (receitas e despesas)
-- Retorna o id da empresa criada.
-- =====================================================================

create or replace function public.create_company_with_defaults(
  _name        text,
  _legal_name  text default null,
  _tax_id      text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id    uuid := auth.uid();
  v_company_id uuid;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if _name is null or length(btrim(_name)) = 0 then
    raise exception 'company name is required' using errcode = '22023';
  end if;

  insert into public.companies (name, legal_name, tax_id, created_by)
  values (btrim(_name), nullif(btrim(_legal_name), ''), nullif(btrim(_tax_id), ''), v_user_id)
  returning id into v_company_id;

  insert into public.company_members (company_id, user_id, role)
  values (v_company_id, v_user_id, 'owner');

  -- Conta padrão
  insert into public.accounts (company_id, name, kind, opening_balance)
  values (v_company_id, 'Caixa', 'cash', 0);

  -- Categorias padrão — receitas
  insert into public.categories (company_id, name, type, color) values
    (v_company_id, 'Vendas',          'income',  '#16a34a'),
    (v_company_id, 'Serviços',        'income',  '#0ea5e9'),
    (v_company_id, 'Outras receitas', 'income',  '#84cc16');

  -- Categorias padrão — despesas
  insert into public.categories (company_id, name, type, color) values
    (v_company_id, 'Fornecedores',   'expense', '#ef4444'),
    (v_company_id, 'Folha',          'expense', '#f97316'),
    (v_company_id, 'Aluguel',        'expense', '#a855f7'),
    (v_company_id, 'Impostos',       'expense', '#dc2626'),
    (v_company_id, 'Marketing',      'expense', '#ec4899'),
    (v_company_id, 'Outras despesas','expense', '#64748b');

  return v_company_id;
end;
$$;

revoke all on function public.create_company_with_defaults(text, text, text) from public;
grant execute on function public.create_company_with_defaults(text, text, text) to authenticated;
