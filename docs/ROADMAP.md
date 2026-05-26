# Roadmap de Execução — FinanceFlow

Implementação em **9 etapas**. Cada etapa termina rodando localmente e com commit lógico. Ao final de cada etapa eu explico o que foi feito e o que validar.

---

## Etapa 0 — Fundação do projeto
**Entrega**: app Next.js rodando com Tailwind, shadcn e tipos.

- Init Next.js 15 + TS + Tailwind + App Router.
- Configurar `tsconfig` strict, paths `@/*`.
- Instalar e configurar shadcn (button, input, label, sheet, dialog, dropdown-menu, sonner, card, tabs, select).
- `lib/utils/cn.ts`, tema base (cores neutras + accent), `globals.css`.
- Estrutura inicial de pastas conforme `ARCHITECTURE.md`.
- `.env.example`, `.gitignore`, `README.md` mínimo.

**Validação**: `pnpm dev` mostra página em branco estilizada.

---

## Etapa 1 — Supabase e modelo de dados
**Entrega**: banco com schema, RLS, triggers e tipos TS gerados.

- Migration `20260101_init.sql`: extensões, tabelas, indexes, triggers `updated_at`, trigger `handle_new_user`, trigger `check_tx_company_consistency`.
- Migration `20260102_rls.sql`: função `is_company_member` + policies para todas as tabelas.
- Migration `20260103_seed_categories.sql`: função `seed_company_defaults(company_id)`.
- `pnpm supabase gen types` → `lib/types/database.ts`.
- Clients Supabase: `lib/supabase/{client,server,middleware}.ts`.
- `middleware.ts` raiz para refresh de sessão.

**Validação**: tabelas existem; inserir manualmente uma empresa via SQL e ver RLS bloqueando user errado.

---

## Etapa 2 — Auth (login/cadastro/logout)
**Entrega**: usuário consegue criar conta, logar, deslogar.

- Páginas `(auth)/login` e `(auth)/signup` com forms (email + senha) — react-hook-form + zod.
- Server Actions `signIn`, `signUp`, `signOut`.
- `auth/callback/route.ts` (PKCE).
- `lib/auth/current.ts` com `getUser()`.
- `(app)/layout.tsx` redireciona para `/login` se sem sessão.

**Validação**: signup cria registro em `auth.users` e em `profiles` (via trigger).

---

## Etapa 3 — Empresas e empresa ativa
**Entrega**: usuário cria/seleciona empresa; cookie `ff_active_company` ativo.

- Página `/companies` lista empresas do usuário (via `company_members`).
- Página `/companies/new` cria empresa + adiciona como `owner` + seed de categorias/conta padrão (tudo em uma transação via RPC).
- Server Action `setActiveCompany(id)` valida membership e seta cookie.
- `getActiveCompanyOrRedirect()` usado em `(app)/layout.tsx`.
- Componente `CompanySwitcher` no header.

**Validação**: criar 2 empresas e alternar mostra contextos isolados.

---

## Etapa 4 — Shell mobile + navegação
**Entrega**: header + bottom nav + safe-area, layout responsivo.

- `AppHeader.tsx`: nome da empresa (abre switcher), botão de perfil.
- `BottomNav.tsx`: 5 ícones (Início, Lançar [FAB-like centro], Movimentações, Contas, Mais).
- Suporte a `env(safe-area-inset-bottom)`.
- Sheet "Mais" com Categorias, Configurações, Sair.

**Validação**: usabilidade em viewport 375x812 (iPhone).

---

## Etapa 5 — Contas financeiras
**Entrega**: CRUD de contas.

- `/accounts` lista contas (nome, tipo, saldo atual calculado).
- `/accounts/new` e `/accounts/[id]/edit` com form.
- Server Actions com validação zod.
- Arquivar (soft-delete) em vez de deletar quando houver transações.

**Validação**: criar "Caixa" e "Banco X"; saldo inicial reflete.

---

## Etapa 6 — Categorias
**Entrega**: CRUD de categorias com tipo (receita/despesa).

- `/categories` lista agrupada por tipo.
- `/categories/new` e `/categories/[id]/edit`.
- Color picker simples (paleta fixa de 8 cores).
- Arquivar quando houver vínculo.

**Validação**: criar e arquivar; ver listagem agrupada.

---

## Etapa 7 — Lançamento de movimentação (a tela crítica)
**Entrega**: tela `/transactions/new` rápida + listagem `/transactions` com filtros.

Detalhes da tela `new`:
- Toggle Entrada / Saída no topo (chip grande, cores semânticas).
- `AmountInput` numérico (`inputmode="decimal"`) com foco automático, fonte gigante.
- Selects de Conta e Categoria (sheet de seleção mobile com busca).
- Data: default hoje, atalhos "Hoje / Ontem".
- Descrição (opcional).
- Botão fixo "Salvar" + "Salvar e novo" (mantém conta/categoria/data, limpa valor e descrição).
- `client_request_id` para idempotência.
- Otimista: insere no cache local e revalida.

Listagem:
- `/transactions` agrupada por dia, com totais do dia.
- Filtros via sheet: período (chips: Hoje, 7d, Mês, Personalizado), conta, categoria, tipo.
- Paginação por cursor (`occurred_on`, `id`).
- Toque na linha → editar; swipe-left → excluir (com confirmação).

Edição/exclusão em `/transactions/[id]/edit`.

**Validação**: lançar 20 transações em <2 min; voltar e ver tudo correto.

---

## Etapa 8 — Dashboard (resumo do período)
**Entrega**: cards de Entradas / Saídas / Saldo; saldo por conta; saídas por categoria.

- View SQL `period_summary(company_id, from, to)` ou função.
- `PeriodPicker`: chips Hoje, 7d, Mês atual, Mês anterior, Personalizado (server state via search params).
- `SummaryCards` (Entradas, Saídas, Resultado).
- Lista "Saldo por conta".
- Lista "Saídas por categoria" com barra proporcional (sem lib de chart no MVP — visual simples com Tailwind).
- Skeleton durante load.

**Validação**: números batem com somatórios manuais das transações.

---

## Etapa 9 — Polimento + deploy
**Entrega**: app no Vercel, pronto para uso real.

- Estados vazios, mensagens de erro padronizadas (sonner toasts).
- Loading skeletons.
- Acessibilidade básica (labels, foco visível, contraste).
- PWA leve: manifest + ícones (instalável; sem service worker complexo no MVP).
- README com setup e deploy.
- Deploy Vercel + variáveis de ambiente + projeto Supabase de produção.

**Validação**: app instalável no celular, fluxo completo end-to-end.

---

## Pós-MVP (não fazer agora)

- Transferência entre contas
- Contas a pagar/receber
- Recorrência
- Comparativo mês-a-mês e KPIs
- DRE e fluxo de caixa
- Exportações XLSX/PDF
- Conciliação bancária
- Integrações Open Finance / ERPs

## Cadência de comunicação

Ao final de cada etapa eu paro, descrevo o que foi feito, o que validar e qual é a próxima etapa. Você confirma para seguir.
