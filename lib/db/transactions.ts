import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  Tables,
  TablesInsert,
  TablesUpdate,
  AccountKind,
  DreType,
} from "@/lib/types/database";

export type TransactionRow = Tables<"transactions">;

export type TransactionWithRefs = TransactionRow & {
  accounts: { name: string; kind: AccountKind } | null;
  categories: {
    name: string;
    color: string | null;
    code: string;
    dre_type: DreType;
  } | null;
};

export type TransactionRegime = "cash" | "accrual";

export type TransactionFilters = {
  from: string;
  to: string;
  /** Qual data filtrar/ordenar: caixa (occurred_on) ou competência (competence_date). */
  regime?: TransactionRegime;
  accountId?: string | null;
  categoryId?: string | null;
  /** Inclui também filhas da categoria (uso na DRE). */
  categoryIds?: string[] | null;
  type?: "income" | "expense" | null;
  /** Busca textual em description (ILIKE %q%). */
  q?: string | null;
  limit?: number;
};

export type TransactionsSummary = {
  totalIncome: number;
  totalExpense: number;
  balance: number;
};

export type TransactionsPage = {
  rows: TransactionWithRefs[];
  nextCursor: string | null;
};

/** Cursor opaco para paginação keyset: (data do regime, created_at, id). */
type TransactionCursor = { d: string; c: string; i: string };

function encodeCursor(c: TransactionCursor): string {
  return Buffer.from(JSON.stringify(c), "utf8").toString("base64url");
}

function decodeCursor(raw: string): TransactionCursor | null {
  try {
    const o = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (
      o &&
      typeof o.d === "string" &&
      typeof o.c === "string" &&
      typeof o.i === "string"
    ) {
      return o as TransactionCursor;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Lista movimentações com filtros. RLS garante isolamento por empresa.
 */
export async function listTransactions(
  filters: TransactionFilters,
): Promise<TransactionWithRefs[]> {
  const {
    from,
    to,
    regime = "cash",
    accountId,
    categoryId,
    categoryIds,
    type,
    q,
    limit = 200,
  } = filters;

  const dateCol = regime === "accrual" ? "competence_date" : "occurred_on";

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("transactions")
    .select("*, accounts(name, kind), categories(name, color, code, dre_type)")
    .gte(dateCol, from)
    .lte(dateCol, to)
    .order(dateCol, { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (accountId) query = query.eq("account_id", accountId);
  if (categoryId) query = query.eq("category_id", categoryId);
  if (categoryIds && categoryIds.length > 0) {
    query = query.in("category_id", categoryIds);
  }
  if (type) query = query.eq("type", type);
  if (q && q.trim()) query = query.ilike("description", `%${q.trim()}%`);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as TransactionWithRefs[];
}

/**
 * Resumo agregado do período (entradas/saídas/saldo), independente de paginação.
 * Considera apenas `kind = 'regular'` (exclui transferências e ajustes).
 * Busca somente as colunas necessárias — bem mais leve que carregar a lista.
 */
export async function getTransactionsSummary(
  filters: TransactionFilters,
): Promise<TransactionsSummary> {
  const { from, to, regime = "cash", accountId, categoryId, categoryIds, type, q } =
    filters;

  const dateCol = regime === "accrual" ? "competence_date" : "occurred_on";

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("transactions")
    .select("type, amount")
    .eq("kind", "regular")
    .gte(dateCol, from)
    .lte(dateCol, to)
    .limit(10000);

  if (accountId) query = query.eq("account_id", accountId);
  if (categoryId) query = query.eq("category_id", categoryId);
  if (categoryIds && categoryIds.length > 0) {
    query = query.in("category_id", categoryIds);
  }
  if (type) query = query.eq("type", type);
  if (q && q.trim()) query = query.ilike("description", `%${q.trim()}%`);

  const { data, error } = await query;
  if (error) throw error;

  let totalIncome = 0;
  let totalExpense = 0;
  for (const r of data ?? []) {
    const v = Number(r.amount);
    if (r.type === "income") totalIncome += v;
    else totalExpense += v;
  }
  return { totalIncome, totalExpense, balance: totalIncome - totalExpense };
}

/**
 * Página de movimentações por cursor keyset (sem OFFSET).
 * Ordena por (data do regime, created_at, id) desc e retorna `pageSize` itens
 * + um `nextCursor` quando há mais. Filtros idênticos a `listTransactions`.
 */
export async function listTransactionsPage(
  filters: TransactionFilters & { cursor?: string | null; pageSize?: number },
): Promise<TransactionsPage> {
  const {
    from,
    to,
    regime = "cash",
    accountId,
    categoryId,
    categoryIds,
    type,
    q,
    cursor,
    pageSize = 25,
  } = filters;

  const dateCol = regime === "accrual" ? "competence_date" : "occurred_on";

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("transactions")
    .select("*, accounts(name, kind), categories(name, color, code, dre_type)")
    .gte(dateCol, from)
    .lte(dateCol, to)
    .order(dateCol, { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(pageSize + 1);

  if (accountId) query = query.eq("account_id", accountId);
  if (categoryId) query = query.eq("category_id", categoryId);
  if (categoryIds && categoryIds.length > 0) {
    query = query.in("category_id", categoryIds);
  }
  if (type) query = query.eq("type", type);
  if (q && q.trim()) query = query.ilike("description", `%${q.trim()}%`);

  if (cursor) {
    const c = decodeCursor(cursor);
    if (c) {
      query = query.or(
        `${dateCol}.lt.${c.d},and(${dateCol}.eq.${c.d},created_at.lt.${c.c}),and(${dateCol}.eq.${c.d},created_at.eq.${c.c},id.lt.${c.i})`,
      );
    }
  }

  const { data, error } = await query;
  if (error) throw error;

  const all = (data ?? []) as unknown as TransactionWithRefs[];
  const hasMore = all.length > pageSize;
  const rows = hasMore ? all.slice(0, pageSize) : all;

  let nextCursor: string | null = null;
  if (hasMore && rows.length > 0) {
    const last = rows[rows.length - 1];
    nextCursor = encodeCursor({
      d: String(last[dateCol as keyof TransactionWithRefs]),
      c: String(last.created_at),
      i: String(last.id),
    });
  }

  return { rows, nextCursor };
}

/**
 * Última movimentação regular registrada (por created_at), usada no atalho
 * "repetir último" da tela de novo lançamento. RLS isola por empresa.
 */
export async function getLastRegularTransaction(): Promise<TransactionWithRefs | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("*, accounts(name, kind), categories(name, color, code, dre_type)")
    .eq("kind", "regular")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data as unknown as TransactionWithRefs | null;
}

/** Busca uma movimentação com joins. Retorna null se não encontrada ou RLS bloquear. */
export async function getTransaction(
  id: string,
): Promise<TransactionWithRefs | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("*, accounts(name, kind), categories(name, color)")
    .eq("id", id)
    .maybeSingle();
  if (error) return null;
  return data as unknown as TransactionWithRefs | null;
}

export async function insertTransaction(
  values: TablesInsert<"transactions">,
): Promise<TransactionRow> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("transactions")
    .insert(values)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateTransaction(
  id: string,
  values: TablesUpdate<"transactions">,
): Promise<TransactionRow> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("transactions")
    .update(values)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTransaction(id: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
