# Arquitetura — FinanceFlow

## Estrutura de pastas

```
financeflow/
├── app/
│   ├── (auth)/                       # rotas públicas
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── layout.tsx
│   ├── (app)/                        # rotas protegidas (requer sessão)
│   │   ├── layout.tsx                # shell mobile (header + bottom nav)
│   │   ├── companies/                # seleção / criação de empresa
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── actions.ts
│   │   ├── dashboard/page.tsx
│   │   ├── transactions/
│   │   │   ├── page.tsx              # listagem + filtros
│   │   │   ├── new/page.tsx          # lançamento rápido (a tela mais importante)
│   │   │   ├── [id]/edit/page.tsx
│   │   │   └── actions.ts
│   │   ├── accounts/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   ├── [id]/edit/page.tsx
│   │   │   └── actions.ts
│   │   ├── categories/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   ├── [id]/edit/page.tsx
│   │   │   └── actions.ts
│   │   └── settings/page.tsx
│   ├── auth/
│   │   └── callback/route.ts         # callback Supabase (PKCE)
│   ├── layout.tsx                    # root layout
│   ├── page.tsx                      # redirect inteligente (login → dashboard)
│   └── globals.css
├── components/
│   ├── ui/                           # shadcn (button, input, sheet, dialog…)
│   ├── layout/
│   │   ├── AppHeader.tsx
│   │   ├── BottomNav.tsx
│   │   └── CompanySwitcher.tsx
│   ├── transactions/
│   │   ├── TransactionForm.tsx       # client component, foco no amount
│   │   ├── TransactionList.tsx
│   │   ├── TransactionRow.tsx
│   │   └── AmountInput.tsx           # input numérico mobile-otimizado
│   ├── dashboard/
│   │   ├── SummaryCards.tsx
│   │   ├── ByCategoryChart.tsx
│   │   └── PeriodPicker.tsx
│   └── forms/
│       ├── AccountForm.tsx
│       └── CategoryForm.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # createBrowserClient
│   │   ├── server.ts                 # createServerClient + cookies()
│   │   └── middleware.ts             # session refresh
│   ├── auth/
│   │   └── current.ts                # getUser(), getActiveCompany()
│   ├── db/
│   │   ├── transactions.ts           # queries tipadas (server-only)
│   │   ├── accounts.ts
│   │   ├── categories.ts
│   │   └── summary.ts
│   ├── validation/
│   │   ├── transaction.ts            # zod schemas
│   │   ├── account.ts
│   │   ├── category.ts
│   │   └── company.ts
│   ├── format/
│   │   ├── currency.ts               # parseBRLToNumeric, formatBRL
│   │   └── date.ts                   # todayISO, formatBR, currentMonthRange
│   └── types/
│       └── database.ts               # hand-typed; futuramente gerado por supabase gen types
├── lib/utils.ts                      # cn (clsx + tailwind-merge) — usado pelo shadcn
├── supabase/
│   ├── migrations/
│   │   ├── 20260101_init.sql
│   │   ├── 20260102_rls.sql
│   │   └── 20260103_seed_defaults.sql
├── proxy.ts                          # Next 16: antigo middleware.ts; refresca sessão Supabase
├── next.config.ts
├── tsconfig.json
├── components.json                   # shadcn config
├── package.json
├── .env.example
├── CLAUDE.md
└── docs/
    ├── ARCHITECTURE.md
    ├── DATABASE.md
    ├── ROADMAP.md
    ├── UX.md
    └── SCREENS.md
```

## Camadas

1. **UI (Server Components)** — renderizam dados, recebem props já tipadas.
2. **Forms (Client Components)** — `react-hook-form` + zod, chamam Server Actions.
3. **Server Actions** (`actions.ts` por feature) — único caminho de escrita; sempre validam input com zod e verificam membership.
4. **DB Layer** (`lib/db/*`) — funções server-only que recebem `companyId` e fazem queries Supabase. Nunca expostas a Client.
5. **Auth Layer** (`lib/auth/current.ts`) — `getUser()`, `getActiveCompanyOrRedirect()`, helpers chamados nos layouts/páginas server.
6. **Banco (Postgres + RLS)** — última linha de defesa. Mesmo se a app vazar, RLS impede acesso cross-tenant.

## Fluxo de uma requisição protegida

```
Request → middleware.ts (refresh session)
       → app/(app)/layout.tsx
            → getUser() (redirect /login se nulo)
            → getActiveCompany() (redirect /companies se nulo)
       → page.tsx (server) consulta lib/db/* com companyId
       → renderiza UI
```

## Fluxo de uma escrita (ex: criar transação)

```
TransactionForm (client) → submit → Server Action createTransaction(input)
    1. const user = await getUser()
    2. const companyId = await getActiveCompanyOrThrow()
    3. const data = transactionSchema.parse(input)
    4. await supabase.from('transactions').insert({ ...data, company_id: companyId, created_by: user.id })
    5. revalidatePath('/transactions') + revalidatePath('/dashboard')
    6. return { ok: true }
```

## Empresa ativa

- Cookie httpOnly `ff_active_company` (uuid).
- `getActiveCompany()` lê o cookie, valida membership, retorna `{ id, name, role }`.
- Trocar empresa = atualizar cookie via Server Action e redirecionar para `/dashboard`.

## Variáveis de ambiente

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # apenas para tarefas administrativas/seed
```
