# FinanceFlow

App web mobile-first para controle financeiro de empresas. Lançamento rápido de movimentações, multiempresa, com isolamento de dados via Row Level Security.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 + shadcn/ui
- Supabase (Postgres + Auth + RLS)
- React Hook Form + Zod
- Deploy: Vercel

## Setup

Pré-requisitos: Node 22+ e pnpm.

```bash
pnpm install
cp .env.example .env.local       # preencher chaves do Supabase
pnpm dev
```

Abra http://localhost:3000.

## Scripts

| Comando        | Descrição                          |
|----------------|------------------------------------|
| `pnpm dev`     | Servidor de desenvolvimento        |
| `pnpm build`   | Build de produção                  |
| `pnpm start`   | Servidor de produção (após build)  |
| `pnpm lint`    | ESLint                             |

## Documentação

| Arquivo                      | Conteúdo                                |
|------------------------------|-----------------------------------------|
| `CLAUDE.md`                  | Regras inegociáveis e convenções        |
| `docs/ARCHITECTURE.md`       | Estrutura de pastas e camadas           |
| `docs/DATABASE.md`           | Modelo de dados + RLS                   |
| `docs/ROADMAP.md`            | Plano de execução em 9 etapas           |
| `docs/UX.md`                 | Sistema visual e padrões mobile-first   |
| `docs/SCREENS.md`            | Telas do MVP                            |

## Status

🚧 MVP em construção. Etapa atual: **0 — Fundação do projeto**.
