# Modelo de Banco — FinanceFlow

Postgres (Supabase). Todo dinheiro em `numeric(14,2)`. UUIDs como PK.

## Diagrama lógico

```
auth.users (Supabase managed)
   │
   │ 1:1
   ▼
profiles (id = auth.uid, full_name, avatar_url)
   │
   │ N:N via company_members
   ▼
companies ──< company_members >── profiles
   │
   ├──< accounts              (caixa, banco X, banco Y…)
   ├──< categories            (vendas, aluguel, salário…)
   └──< transactions ─→ account_id, category_id (FK dentro da mesma empresa)
```

## Tabelas

### `profiles`
| coluna       | tipo         | nota                                  |
|--------------|--------------|---------------------------------------|
| id           | uuid PK      | = `auth.users.id`                     |
| full_name    | text         |                                       |
| avatar_url   | text         | opcional                              |
| created_at   | timestamptz  | default now()                         |
| updated_at   | timestamptz  | trigger                               |

Criado automaticamente por trigger em `auth.users` (on insert).

### `companies`
| coluna       | tipo         | nota                                  |
|--------------|--------------|---------------------------------------|
| id           | uuid PK      | gen_random_uuid()                     |
| name         | text NOT NULL|                                       |
| legal_name   | text         | razão social (opcional)               |
| tax_id       | text         | CNPJ (opcional, MVP livre)            |
| created_by   | uuid         | FK profiles.id                        |
| created_at   | timestamptz  |                                       |
| updated_at   | timestamptz  |                                       |

### `company_members`
| coluna       | tipo                                   | nota                       |
|--------------|----------------------------------------|----------------------------|
| company_id   | uuid FK companies(id) ON DELETE CASCADE|                            |
| user_id      | uuid FK profiles(id) ON DELETE CASCADE |                            |
| role         | text CHECK in (owner, admin, member)   | default 'member'           |
| created_at   | timestamptz                            |                            |
| PK           | (company_id, user_id)                  |                            |

### `accounts` (contas financeiras)
| coluna       | tipo                                   | nota                       |
|--------------|----------------------------------------|----------------------------|
| id           | uuid PK                                |                            |
| company_id   | uuid FK companies(id) ON DELETE CASCADE| NOT NULL                   |
| name         | text NOT NULL                          | "Caixa", "Itaú PJ"         |
| kind         | text CHECK in (cash, checking, savings, credit_card, other) |    |
| opening_balance | numeric(14,2) default 0             | saldo inicial              |
| is_archived  | boolean default false                  |                            |
| created_at   | timestamptz                            |                            |
| updated_at   | timestamptz                            |                            |

Index: `(company_id, is_archived)`.

### `categories`
| coluna       | tipo                                       | nota                   |
|--------------|--------------------------------------------|------------------------|
| id           | uuid PK                                    |                        |
| company_id   | uuid FK companies(id) ON DELETE CASCADE    | NOT NULL               |
| name         | text NOT NULL                              |                        |
| type         | text CHECK in (income, expense) NOT NULL   |                        |
| color        | text                                       | hex, opcional          |
| is_archived  | boolean default false                      |                        |
| created_at   | timestamptz                                |                        |
| updated_at   | timestamptz                                |                        |

Unique: `(company_id, lower(name), type)`.

### `transactions` (movimentações)
| coluna             | tipo                                          | nota                            |
|--------------------|-----------------------------------------------|---------------------------------|
| id                 | uuid PK                                       |                                 |
| company_id         | uuid FK companies(id) ON DELETE CASCADE       | NOT NULL                        |
| account_id         | uuid FK accounts(id) ON DELETE RESTRICT       | NOT NULL                        |
| category_id        | uuid FK categories(id) ON DELETE SET NULL     | NULL para transferência futura  |
| type               | text CHECK in (income, expense) NOT NULL      |                                 |
| amount             | numeric(14,2) NOT NULL CHECK (amount > 0)     | sempre positivo; sinal vem do `type` |
| description        | text                                          |                                 |
| occurred_on        | date NOT NULL                                 | data da movimentação            |
| client_request_id  | uuid                                          | idempotência opcional           |
| created_by         | uuid FK profiles(id)                          |                                 |
| created_at         | timestamptz                                   |                                 |
| updated_at         | timestamptz                                   |                                 |

Indexes:
- `(company_id, occurred_on DESC)` — listagem por período.
- `(company_id, account_id, occurred_on)` — saldo por conta.
- `(company_id, category_id, occurred_on)` — agrupamento por categoria.
- Unique `(company_id, client_request_id)` quando `client_request_id is not null`.

### Constraints cross-tabela
Triggers garantem que `account_id` e `category_id` pertencem ao mesmo `company_id` da transação. Defesa em profundidade (RLS já impediria, mas trigger evita corrupção mesmo via service role).

## RLS — política base

```sql
-- helper SECURITY DEFINER
create or replace function public.is_company_member(_company uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.company_members
    where company_id = _company and user_id = auth.uid()
  );
$$;

-- companies
alter table companies enable row level security;

create policy companies_select on companies
  for select using (is_company_member(id));

create policy companies_insert on companies
  for insert with check (created_by = auth.uid());

create policy companies_update on companies
  for update using (is_company_member(id))
  with check (is_company_member(id));

-- company_members (visíveis apenas para membros da própria empresa)
alter table company_members enable row level security;

create policy cm_select on company_members
  for select using (is_company_member(company_id));

create policy cm_insert on company_members
  for insert with check (
    -- só owner/admin pode adicionar
    exists (
      select 1 from company_members
      where company_id = company_members.company_id
        and user_id = auth.uid()
        and role in ('owner','admin')
    )
    or
    -- ou o próprio criador da empresa adicionando a si mesmo
    (user_id = auth.uid())
  );

-- accounts, categories, transactions: mesma forma
-- exemplo transactions:
alter table transactions enable row level security;

create policy tx_select on transactions
  for select using (is_company_member(company_id));

create policy tx_insert on transactions
  for insert with check (is_company_member(company_id));

create policy tx_update on transactions
  for update using (is_company_member(company_id))
  with check (is_company_member(company_id));

create policy tx_delete on transactions
  for delete using (is_company_member(company_id));
```

`profiles`: cada usuário só vê o próprio (`auth.uid() = id`). Pode-se permitir SELECT cruzado entre membros da mesma empresa via JOIN com `company_members` quando necessário (lista de equipe).

## Saldos

Saldo NÃO é coluna materializada no MVP — é calculado on-the-fly:

```sql
-- saldo de uma conta:
select a.opening_balance
     + coalesce(sum(case when t.type = 'income' then t.amount else -t.amount end), 0) as balance
from accounts a
left join transactions t on t.account_id = a.id
where a.id = $1 and a.company_id = $2
group by a.id;
```

Para o dashboard (resumo do período), uma `view` ou função SQL agrega entradas/saídas por intervalo, conta e categoria. View será criada conforme necessidade na etapa do dashboard.

## Triggers

- `set_updated_at` em todas as tabelas (`before update`).
- `handle_new_user` em `auth.users` → cria `profiles`.
- `check_tx_company_consistency` em `transactions` → garante `account.company_id = tx.company_id` e idem para `category`.

## Seed (opcional)

Quando uma empresa é criada, popular categorias padrão:
- Receitas: "Vendas", "Serviços", "Outras receitas"
- Despesas: "Fornecedores", "Folha", "Aluguel", "Impostos", "Marketing", "Outras despesas"

E uma conta "Caixa" padrão. Feito via Server Action `createCompany`, dentro de uma transação.

## Escalabilidade futura

- `transfers` (transferência entre contas): tabela própria que gera 2 linhas em `transactions` ou uma única `transaction` com `account_id`/`counter_account_id`.
- `payables` / `receivables` (contas a pagar/receber): tabelas separadas com FK opcional para `transactions` quando liquidadas.
- `recurring_rules`: para movimentações recorrentes.
- Particionamento de `transactions` por ano quando o volume justificar.
- Coluna `balances_cache` materializada se relatórios ficarem pesados.
