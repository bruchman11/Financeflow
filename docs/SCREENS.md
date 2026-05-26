# Telas do MVP — FinanceFlow

15 telas no total (incluindo formulários como telas). Numeração corresponde à ordem de uso típica.

## Públicas

### 1. `/login`
- Email + senha + botão "Entrar".
- Link "Criar conta" → `/signup`.
- Link "Esqueci minha senha" (placeholder no MVP, sem fluxo completo).

### 2. `/signup`
- Nome, email, senha (regra mínima: 8 chars), confirmar senha.
- Botão "Criar conta".
- Após sucesso → `/companies/new` se não tiver empresa.

## Onboarding multiempresa

### 3. `/companies`
- Lista de empresas que o usuário pertence.
- Cada item: nome, papel (owner/admin/member), botão "Entrar".
- Botão "Nova empresa" no rodapé.
- Caso o usuário não tenha nenhuma, redireciona automaticamente para `/companies/new`.

### 4. `/companies/new`
- Form: nome (obrigatório), razão social (opcional), CNPJ (opcional, sem máscara obrigatória no MVP).
- Ao criar: usuário vira `owner`, categorias e conta "Caixa" padrão são criadas, cookie `ff_active_company` é setado, redireciona para `/dashboard`.

## App (rotas protegidas, dentro do shell mobile)

### 5. `/dashboard` (Início)
- PeriodPicker no topo (chips Hoje / 7d / Mês / Anterior / Personalizado).
- 3 cards: Entradas, Saídas, Resultado.
- Bloco "Saldo por conta" (lista compacta).
- Bloco "Saídas por categoria" (top 5 + barra proporcional).
- Empty state quando ainda não há movimentações: CTA "Lançar primeira movimentação".

### 6. `/transactions` (Movimentações)
- Header com chip de período + ícone de filtro.
- Lista agrupada por dia, com totais do dia no header sticky.
- Pull-to-refresh (nice-to-have).
- Paginação infinita por cursor.
- Estado vazio: "Nenhuma movimentação no período".

### 6a. Sheet de Filtros (sobre `/transactions`)
- Período (chips + custom).
- Tipo (Entrada / Saída / Ambos).
- Conta (multi-select via lista).
- Categoria (multi-select via lista).
- Botão "Aplicar" / "Limpar".

### 7. `/transactions/new` (Lançamento — TELA CRÍTICA)
- Toggle Entrada/Saída.
- Campo de valor gigante (autofocus, `inputmode="decimal"`).
- Chips de data (Hoje, Ontem, Outra…).
- Botão "Conta" (abre sheet).
- Botão "Categoria" (abre sheet, filtrado por tipo).
- Campo Descrição (opcional).
- Footer fixo: "Salvar" + "Salvar e novo".

### 7a. Sheets auxiliares
- **Seleção de Conta**: busca + lista + "Nova conta" inline.
- **Seleção de Categoria**: busca + lista (filtrada por tipo) + "Nova categoria" inline.

### 8. `/transactions/[id]/edit`
- Mesmo form de criação, pré-preenchido.
- Botão "Excluir" no canto superior direito (confirmação via Dialog).

### 9. `/accounts` (Contas financeiras)
- Lista de contas (nome, tipo, saldo atual calculado).
- Total geral no rodapé.
- Botão "Nova conta" (header).
- Toque na conta → editar.

### 10. `/accounts/new` e `/accounts/[id]/edit`
- Form: nome, tipo (cash / checking / savings / credit_card / other), saldo inicial.
- Em edição: botão "Arquivar" no rodapé (se houver transações), "Excluir" se não houver.

### 11. `/categories`
- Lista agrupada por tipo (Receitas / Despesas), com header sticky por grupo.
- Botão "Nova categoria" no header.
- Toque na categoria → editar.

### 12. `/categories/new` e `/categories/[id]/edit`
- Form: nome, tipo (income/expense), cor (paleta fixa de 8).
- Mesma regra de arquivar vs excluir.

### 13. `/settings` (acessada via "Mais")
- Dados da empresa (read-only ou editáveis se owner).
- Membros (MVP: apenas listar; convidar fica para pós-MVP).
- Botão "Sair desta empresa" / "Excluir empresa" (somente owner).

### 14. Sheet "Mais" (acionado via BottomNav)
- Categorias
- Configurações
- Trocar empresa
- Sair

### 15. `/auth/callback`
- Rota técnica do Supabase (PKCE). Sem UI relevante; processa e redireciona.

## Resumo por feature do MVP

| Feature do MVP                | Telas                                  |
|-------------------------------|----------------------------------------|
| 1. Login/cadastro             | 1, 2                                   |
| 2. Seleção de empresa         | 3, 4 + Sheet "Mais" (trocar)           |
| 3. Dashboard simples          | 5                                      |
| 4. Cadastro de contas         | 9, 10                                  |
| 5. Cadastro de categorias     | 11, 12                                 |
| 6. Lançamento de movimentação | 7 + 7a                                 |
| 7. Listagem/filtro            | 6 + 6a                                 |
| 8. Edição e exclusão          | 8                                      |
| 9. Resumo por período         | 5 (dashboard)                          |
