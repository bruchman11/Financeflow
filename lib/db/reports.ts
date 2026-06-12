import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  buildCategoryTree,
  listCategories,
  type CategoryNode,
} from "@/lib/db/categories";
import type { DreType } from "@/lib/types/database";

// ── Fluxo de caixa ────────────────────────────────────────────────────────────

export type CashFlowPoint = {
  date: string; // YYYY-MM-DD
  income: number;
  expense: number;
};

export type CashFlowResult = {
  points: CashFlowPoint[];
  totalIncome: number;
  totalExpense: number;
  balance: number;
};

/**
 * Fluxo de caixa: soma entradas e saídas por dia (kind='regular').
 * Sem accountId: ignora também 'transfer' (já são kind != regular, ok).
 * Com accountId: filtra somente aquela conta.
 */
export async function getCashFlow({
  from,
  to,
  accountId,
}: {
  from: string;
  to: string;
  accountId?: string | null;
}): Promise<CashFlowResult> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("transactions")
    .select("occurred_on, type, amount, kind")
    .gte("occurred_on", from)
    .lte("occurred_on", to)
    .order("occurred_on", { ascending: true });

  if (accountId) {
    query = query.eq("account_id", accountId);
    // com filtro de conta, mostramos tudo (incluindo transferências afetando aquela conta)
  } else {
    // sem conta, excluir transferências e ajustes
    query = query.eq("kind", "regular");
  }

  const { data, error } = await query;
  if (error) throw error;

  const map = new Map<string, CashFlowPoint>();
  let totalIncome = 0;
  let totalExpense = 0;

  for (const tx of data ?? []) {
    const v = Number(tx.amount);
    const entry = map.get(tx.occurred_on) ?? {
      date: tx.occurred_on,
      income: 0,
      expense: 0,
    };
    if (tx.type === "income") {
      entry.income += v;
      totalIncome += v;
    } else {
      entry.expense += v;
      totalExpense += v;
    }
    map.set(tx.occurred_on, entry);
  }

  return {
    points: Array.from(map.values()).sort((a, b) =>
      a.date < b.date ? -1 : 1,
    ),
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
  };
}

// ── DRE ───────────────────────────────────────────────────────────────────────

export type DreTreeNode = {
  id: string;
  code: string;
  name: string;
  total: number;
  children: DreTreeNode[];
};

export type DreNode = {
  dre_type: DreType;
  total: number;
  /** Árvore de categorias com subtotal acumulado por nó (roll-up). */
  tree: DreTreeNode[];
};

export type DreReport = {
  revenue: DreNode;
  cost: DreNode;
  expense: DreNode;
  tax: DreNode;
  grossProfit: number; // revenue - cost
  ebitda: number; // grossProfit - expense
  result: number; // ebitda - tax
};

function emptyNode(dre_type: DreType): DreNode {
  return { dre_type, total: 0, tree: [] };
}

/**
 * DRE no regime escolhido.
 * - cash: usa transactions.occurred_on (apenas kind='regular')
 * - accrual: usa transactions.competence_date + credit_card_purchases não pagas
 *
 * Note: compras de cartão não pagas têm competência, mas só viram transactions
 * quando a fatura é paga. Para refletir corretamente o regime de competência,
 * incluímos essas compras pendentes.
 */
export async function getDre({
  from,
  to,
  regime,
}: {
  from: string;
  to: string;
  regime: "cash" | "accrual";
}): Promise<DreReport> {
  const supabase = await createSupabaseServerClient();

  type Row = {
    amount: string;
    type: "income" | "expense";
    categories: {
      id: string;
      code: string;
      name: string;
      dre_type: DreType;
      parent_id: string | null;
    } | null;
  };

  const dateCol = regime === "accrual" ? "competence_date" : "occurred_on";

  const { data: txs, error } = await supabase
    .from("transactions")
    .select(
      "amount, type, categories(id, code, name, dre_type, parent_id)",
    )
    .eq("kind", "regular")
    .gte(dateCol, from)
    .lte(dateCol, to);

  if (error) throw error;

  // Para regime accrual, adiciona purchases pendentes com competence_date no período
  type PurchaseRow = {
    installment_amount: string;
    categories: {
      id: string;
      code: string;
      name: string;
      dre_type: DreType;
      parent_id: string | null;
    } | null;
  };

  let pendingPurchases: PurchaseRow[] = [];
  if (regime === "accrual") {
    const { data, error: err2 } = await supabase
      .from("credit_card_purchases")
      .select(
        "installment_amount, categories(id, code, name, dre_type, parent_id)",
      )
      .is("payment_transaction_id", null)
      .gte("competence_date", from)
      .lte("competence_date", to);
    if (err2) throw err2;
    pendingPurchases = (data ?? []) as unknown as PurchaseRow[];
  }

  const nodes: Record<DreType, DreNode> = {
    revenue: emptyNode("revenue"),
    cost: emptyNode("cost"),
    expense: emptyNode("expense"),
    tax: emptyNode("tax"),
  };

  // mapa para agrupar por categoria
  const byCategory = new Map<
    string,
    { code: string; name: string; dre_type: DreType; total: number }
  >();

  for (const r of (txs as unknown as Row[]) ?? []) {
    if (!r.categories) continue; // sem categoria → não entra na DRE
    const cat = r.categories;
    const v = Number(r.amount) * (r.type === "income" ? 1 : -1);
    const sign = cat.dre_type === "revenue" ? 1 : -1;
    // valor absoluto para somar como total do tipo (revenue positivo, custo/despesa/imposto positivos também na sua linha)
    const abs = Math.abs(v);

    const existing = byCategory.get(cat.id);
    if (existing) {
      existing.total += abs;
    } else {
      byCategory.set(cat.id, {
        code: cat.code,
        name: cat.name,
        dre_type: cat.dre_type,
        total: abs,
      });
    }
    nodes[cat.dre_type].total += abs;
    // suppress unused warning
    void sign;
  }

  for (const p of pendingPurchases) {
    if (!p.categories) continue;
    const cat = p.categories;
    const abs = Math.abs(Number(p.installment_amount));
    const existing = byCategory.get(cat.id);
    if (existing) {
      existing.total += abs;
    } else {
      byCategory.set(cat.id, {
        code: cat.code,
        name: cat.name,
        dre_type: cat.dre_type,
        total: abs,
      });
    }
    nodes[cat.dre_type].total += abs;
  }

  // Monta a árvore por dre_type com roll-up (subtotal = próprio + Σ filhos).
  // includeArchived: garante que lançamentos em categorias arquivadas ainda
  // apareçam na árvore (senão o subtotal não bateria com o total da seção).
  const allCats = await listCategories({ includeArchived: true });

  function toTreeNode(c: CategoryNode): DreTreeNode {
    const children = c.children.map(toTreeNode).filter((n) => n.total !== 0);
    const own = byCategory.get(c.id)?.total ?? 0;
    const total = own + children.reduce((s, n) => s + n.total, 0);
    return { id: c.id, code: c.code, name: c.name, total, children };
  }

  for (const dt of Object.keys(nodes) as DreType[]) {
    const cats = allCats.filter((c) => c.dre_type === dt);
    let roots = buildCategoryTree(cats)
      .map(toTreeNode)
      .filter((n) => n.total !== 0);
    // Colapsa raiz de nível 1 redundante (ex.: "03") p/ abrir direto nos subgrupos.
    while (
      roots.length === 1 &&
      roots[0].children.length > 0 &&
      !roots[0].code.includes(".")
    ) {
      roots = roots[0].children;
    }
    nodes[dt].tree = roots;
  }

  const grossProfit = nodes.revenue.total - nodes.cost.total;
  const ebitda = grossProfit - nodes.expense.total;
  const result = ebitda - nodes.tax.total;

  return {
    revenue: nodes.revenue,
    cost: nodes.cost,
    expense: nodes.expense,
    tax: nodes.tax,
    grossProfit,
    ebitda,
    result,
  };
}

// ── Comparativo de períodos ───────────────────────────────────────────────────

export type PeriodTotals = {
  income: number;
  expense: number;
  revenue: number;
  cost: number;
  operatingExpense: number;
  tax: number;
  result: number;
};

export type ComparisonResult = {
  a: { from: string; to: string; totals: PeriodTotals };
  b: { from: string; to: string; totals: PeriodTotals };
  deltas: Partial<Record<keyof PeriodTotals, { abs: number; pct: number }>>;
};

async function getTotalsForPeriod(
  from: string,
  to: string,
  regime: "cash" | "accrual",
): Promise<PeriodTotals> {
  const supabase = await createSupabaseServerClient();
  const dateCol = regime === "accrual" ? "competence_date" : "occurred_on";

  type Row = {
    amount: string;
    type: "income" | "expense";
    categories: { dre_type: DreType } | null;
  };

  const { data, error } = await supabase
    .from("transactions")
    .select("amount, type, categories(dre_type)")
    .eq("kind", "regular")
    .gte(dateCol, from)
    .lte(dateCol, to);

  if (error) throw error;

  let income = 0,
    expense = 0,
    revenue = 0,
    cost = 0,
    operatingExpense = 0,
    tax = 0;

  for (const r of (data as unknown as Row[]) ?? []) {
    const v = Number(r.amount);
    if (r.type === "income") income += v;
    else expense += v;

    if (r.categories) {
      switch (r.categories.dre_type) {
        case "revenue":
          revenue += v;
          break;
        case "cost":
          cost += v;
          break;
        case "expense":
          operatingExpense += v;
          break;
        case "tax":
          tax += v;
          break;
      }
    }
  }

  const result = revenue - cost - operatingExpense - tax;
  return { income, expense, revenue, cost, operatingExpense, tax, result };
}

export async function getComparison({
  a,
  b,
  regime,
}: {
  a: { from: string; to: string };
  b: { from: string; to: string };
  regime: "cash" | "accrual";
}): Promise<ComparisonResult> {
  const [totalsA, totalsB] = await Promise.all([
    getTotalsForPeriod(a.from, a.to, regime),
    getTotalsForPeriod(b.from, b.to, regime),
  ]);

  const deltas: ComparisonResult["deltas"] = {};
  for (const key of Object.keys(totalsA) as (keyof PeriodTotals)[]) {
    const abs = totalsA[key] - totalsB[key];
    const pct = totalsB[key] !== 0 ? (abs / Math.abs(totalsB[key])) * 100 : 0;
    deltas[key] = { abs, pct };
  }

  return {
    a: { ...a, totals: totalsA },
    b: { ...b, totals: totalsB },
    deltas,
  };
}

// ── Ponto de equilíbrio ───────────────────────────────────────────────────────

export type BreakEvenResult = {
  fixedExpenses: number;
  contributionMarginPct: number;
  breakEvenRevenue: number;
  currentRevenue: number;
  gap: number; // breakEvenRevenue - currentRevenue
};

export async function getBreakEven({
  from,
  to,
  contributionMarginPct,
}: {
  from: string;
  to: string;
  contributionMarginPct: number;
}): Promise<BreakEvenResult> {
  const totals = await getTotalsForPeriod(from, to, "cash");

  // Despesas fixas do período = expense + tax (aproximação MVP)
  const fixedExpenses = totals.operatingExpense + totals.tax;
  const mc = Math.max(0.01, contributionMarginPct);
  const breakEvenRevenue = fixedExpenses / (mc / 100);

  return {
    fixedExpenses,
    contributionMarginPct: mc,
    breakEvenRevenue,
    currentRevenue: totals.revenue,
    gap: breakEvenRevenue - totals.revenue,
  };
}
