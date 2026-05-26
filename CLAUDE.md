# FinanceFlow — Regras do Projeto

App web mobile-first para controle financeiro de empresas (lançamento rápido de movimentações pelo celular).

## Stack

- **Framework**: Next.js 15 (App Router) + TypeScript (strict)
- **Estilo**: Tailwind CSS + shadcn/ui (componentes copiados, não importados)
- **Backend**: Supabase (Postgres + Auth + RLS)
- **Validação**: Zod
- **Forms**: react-hook-form + @hookform/resolvers/zod
- **Deploy**: Vercel
- **Gerenciador**: pnpm (preferir) ou npm

## Princípios inegociáveis

1. **Multiempresa por design**: toda tabela de domínio possui `company_id NOT NULL`. Nenhuma consulta omite o filtro de empresa.
2. **Segurança via RLS**: nunca confiar em filtros do cliente. Toda tabela com dados de empresa tem políticas RLS que validam pertencimento via `company_members`.
3. **Valores monetários**: sempre `numeric(14,2)` no banco; no front, trabalhar com `string` ou inteiro de centavos para entrada, nunca `number` float. Formatar para exibição com `Intl.NumberFormat('pt-BR')`.
4. **Mobile-first**: Tailwind sem prefixo é mobile; usar `md:`/`lg:` apenas para incrementar. Toque mínimo 44px. Sem hover como única affordance.
5. **Velocidade de lançamento**: a tela de Nova Movimentação é a mais crítica. Abrir teclado numérico, foco automático, atalhos, repetir último lançamento.
6. **Server-first**: preferir Server Components e Server Actions; Client Components apenas onde necessário (forms interativos, atalhos de teclado).
7. **Datas em UTC no banco, exibição em `America/Sao_Paulo`**. Campo de data da movimentação é `date` (sem hora) para evitar fuso.
8. **Idempotência em writes sensíveis** (criar movimentação): usar `client_request_id` quando útil para evitar duplicação em falha de rede.

## Convenções de código

- Sem comentários supérfluos. Código claro > comentários.
- Componentes server por padrão; marcar `"use client"` somente quando necessário.
- Schemas Zod em `lib/validation/` espelhando tabelas — única fonte de verdade para tipos compartilhados.
- Server Actions ficam em `app/<rota>/actions.ts` e sempre revalidam o path afetado.
- Queries Supabase no servidor usam `createServerClient` com cookies; no cliente, `createBrowserClient`.
- Estilo: nada de CSS solto; tudo via Tailwind e tokens shadcn.
- Nomes de tabela em `snake_case` plural; colunas `snake_case`.
- Toda tabela tem `id uuid pk default gen_random_uuid()`, `created_at timestamptz default now()`, `updated_at timestamptz default now()` (trigger).

## Multitenancy

- `companies`: empresas.
- `company_members(company_id, user_id, role)`: vínculo N:N. Roles: `owner`, `admin`, `member`.
- Helper SQL `is_company_member(uuid)` (SECURITY DEFINER) usado em todas as policies para evitar recursão.
- Empresa "ativa" do usuário guardada em cookie httpOnly `ff_active_company` (validada server-side a cada request via `company_members`).

## Segurança

- Nenhum segredo no cliente além de `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `SUPABASE_SERVICE_ROLE_KEY` somente em rotas de servidor explicitamente seguras (nunca usar para dados de usuário comum).
- Toda Server Action começa com: (1) ler usuário, (2) ler `company_id` ativo, (3) verificar membership, (4) executar.
- Inputs sempre passam por Zod antes de chegar ao banco.
- Logs nunca contêm valores monetários nem PII em produção.

## Anti-padrões proibidos

- ❌ `float`/`double precision` para dinheiro.
- ❌ Filtrar empresa apenas no client.
- ❌ Buscar todas as movimentações sem paginação.
- ❌ Form com `onChange` que dispara request a cada tecla.
- ❌ CSS customizado fora do design system.
- ❌ `any` em TypeScript (usar `unknown` + narrow).

## Como rodar / desenvolver

```bash
pnpm install
cp .env.example .env.local      # preencher Supabase keys
pnpm supabase db push           # aplica migrations
pnpm dev
```

## Estrutura de pastas (resumo)

Ver `docs/ARCHITECTURE.md`.

## Modelo de dados

Ver `docs/DATABASE.md`.

## Roadmap

Ver `docs/ROADMAP.md`.
