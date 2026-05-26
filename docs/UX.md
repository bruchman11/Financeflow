# UX/UI — FinanceFlow

Mobile-first, focado em velocidade de lançamento. Inspiração: apps de banco brasileiro (Nubank, Inter) + apps de despesa pessoal (Mobills, Organizze) — sem copiar marca, apenas padrões.

## Princípios de design

1. **Uma decisão por tela**. Lançar = digitar valor. Tudo o mais é secundário.
2. **Polegar primeiro**. Ações principais sempre no terço inferior da tela.
3. **Confirmação por feedback, não por modal**. Toast discreto + lista atualizada é melhor que diálogo de "sucesso".
4. **Cores semânticas e consistentes**: entrada = verde, saída = vermelho, neutro = cinza. Nunca usar cor sozinha como sinal (sempre acompanhar ícone/sinal).
5. **Zero scroll horizontal em mobile**. Tabelas viram cards/linhas.
6. **Conteúdo em PT-BR**, valores em `R$`, datas `dd/MM`, milhar `.`, decimal `,`.

## Sistema visual

### Cores (Tailwind tokens via shadcn)
- `background` / `foreground`: tons claros / escuros neutros.
- `primary`: índigo/azul escuro sólido (ação principal).
- `success`: verde (entradas).
- `destructive`: vermelho (saídas, excluir).
- `muted` / `border`: cinzas.
- Dark mode: opcional pós-MVP (deixar variáveis CSS preparadas).

### Tipografia
- Fonte: `Inter` (variável, via `next/font/google`).
- Escala mobile:
  - `text-3xl` (30px) — valor grande no input de movimentação.
  - `text-xl` — totais do dashboard.
  - `text-base` — corpo.
  - `text-sm` — meta dados (datas, contas).
- Números tabulares: `font-variant-numeric: tabular-nums` em valores.

### Espaçamento e toque
- Padding base de tela: `px-4 py-3`.
- Altura mínima de toque: `h-11` (44px) para ações primárias `h-12`/`h-14`.
- Gap padrão entre seções: `gap-4`.

### Componentes-chave (shadcn)
- `Button`, `Input`, `Label`, `Select` (substituído por `Sheet` em mobile para opções >5).
- `Sheet` para filtros e seleção (vem de baixo).
- `Dialog` apenas para confirmações destrutivas.
- `Card` para grupos no dashboard.
- `Tabs` para alternar receita/despesa em telas de cadastro.
- `Sonner` (toaster) para feedback.

## Shell de navegação

### AppHeader (sticky top)
```
[Empresa ▾]                              [Avatar]
```
- Clique em "Empresa" abre `Sheet` com lista de empresas + "Nova empresa".
- Avatar abre menu (Perfil, Sair).

### BottomNav (sticky bottom, safe-area)
5 itens, ícone + label curto:
```
 Início   Movs.   [ + ]   Contas   Mais
```
- O botão central `+` é o atalho para `/transactions/new` — destacado (círculo elevado, cor `primary`).
- "Mais" abre `Sheet` com: Categorias, Configurações, Sair.

## Tela de lançamento (a mais importante)

Layout em ordem vertical:
1. **Toggle grande Entrada / Saída** (pill, ocupa largura, 56px de altura). Cor preenchida indica seleção.
2. **Valor** — input ocupa quase toda a largura, fonte `text-5xl` tabular, alinhado à direita, com `R$` à esquerda fixo. `inputmode="decimal"`, autofocus, máscara só formata visualmente; estado interno é string `1234,56`.
3. **Linha de pílulas atalho de data**: `Hoje` (default), `Ontem`, `Outra…` (abre date picker nativo).
4. **Botão "Conta"** (linha full-width, mostra conta selecionada com saldo). Clique abre `Sheet` com lista + busca + "Nova conta".
5. **Botão "Categoria"** (mesmo padrão). Filtrado por tipo (receita/despesa) conforme toggle.
6. **Descrição** (opcional, `Input` simples).
7. **Footer fixo** com dois botões lado a lado:
   - `Salvar` (primary, fechar e voltar para listagem)
   - `Salvar e novo` (secondary, mantém conta+categoria+data, limpa valor).

Atalhos:
- Após `Salvar e novo`, foco volta ao input de valor.
- "Repetir último": no header da tela, ícone que pré-preenche a partir da última transação.

## Tela de listagem

- Grupos por dia, header sticky com data ("Quarta, 22/05 · +R$ 1.200,00 / −R$ 340,00").
- Cada linha: ícone da categoria (círculo colorido) + descrição + conta em `text-sm muted` + valor à direita (verde/vermelho com sinal).
- Toque = editar. Swipe à esquerda revela botão de excluir (com toast de "desfazer" por 5s — UX padrão).
- Topo: chip de filtros ativos + ícone `funnel` para abrir `Sheet` de filtros.

## Dashboard

3 cartões no topo (grid `grid-cols-3 gap-2`):
- Entradas (verde)
- Saídas (vermelho)
- Resultado (neutro, com seta de tendência)

Abaixo:
- **Saldo por conta** — lista, cada linha com nome + tipo + saldo. Total no rodapé.
- **Saídas por categoria** — lista com barra horizontal proporcional (`bg-muted` com `bg-destructive/70` preenchendo a fração). Top 5 + "Ver mais".

Período fixo no topo (chips: Hoje / 7d / Mês / Anterior / Personalizado).

## Estados

- **Vazio**: ilustração leve (emoji ou ícone Lucide grande), título, CTA primário ("Criar primeira conta").
- **Loading**: skeleton com mesmo layout (nunca spinners centrais em telas inteiras).
- **Erro de rede**: banner discreto no topo com botão "Tentar de novo". Não bloquear.
- **Sucesso**: toast canto inferior, dura 2,5s.

## Acessibilidade

- Toques mínimos 44px, labels associadas (`htmlFor`), foco visível (ring shadcn).
- `aria-live="polite"` no toaster.
- Cores acima do contraste WCAG AA (4.5:1 para texto normal).
- Não depender só de cor: usar sinal de `+`/`−` e ícones.

## Performance percebida

- Server Components onde possível → HTML pronto.
- Insert otimista na listagem após `Salvar` (revalidação ao fundo).
- Pré-carregar listas de contas/categorias na entrada do app (mantidas em cache do request).
- Imagens/ícones via `lucide-react` (tree-shakeable).
- Sem libs pesadas de chart no MVP.

## Padrões de formulário

- Um campo por linha em mobile, dois em md+ quando fizer sentido.
- Erros aparecem abaixo do campo, em `text-sm text-destructive`, sem reordenar layout.
- Botão de envio sempre fixo no rodapé em telas longas.
- Após sucesso de criação rápida (ex: nova conta dentro do fluxo de lançamento), fechar `Sheet` e já selecionar a recém-criada.
