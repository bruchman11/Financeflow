import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatBRL } from "@/lib/format/currency";
import { formatBR, todayISO } from "@/lib/format/date";
import { stableUuid } from "@/lib/integrations/uuid";
import type { IntegrationCreateTxInput } from "@/lib/validation/integration";

/** Erro com status HTTP para a rota mapear na resposta. */
export class IntegrationError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "IntegrationError";
  }
}

const PAGE = 500; // abaixo do teto de ~1000 do PostgREST
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type AccountLite = { id: string; name: string; kind: string };
type CategoryLite = { id: string; code: string; name: string };

function normalizeCode(raw: string): string {
  return raw
    .split(".")
    .map((p) => p.padStart(2, "0"))
    .join(".");
}

function resolveAccount(
  accounts: AccountLite[],
  input: string,
): AccountLite | null {
  const s = input.trim();
  if (UUID_RE.test(s)) return accounts.find((a) => a.id === s) ?? null;
  const lower = s.toLowerCase();
  return accounts.find((a) => a.name.trim().toLowerCase() === lower) ?? null;
}

function resolveCategory(
  categories: CategoryLite[],
  input: string,
): CategoryLite | null {
  const s = input.trim();
  if (UUID_RE.test(s)) return categories.find((c) => c.id === s) ?? null;
  const m = s.match(/^(\d{1,2}(?:\.\d{1,2}){0,2})\s*(.*)$/);
  if (m) {
    const code = m[1];
    const padded = normalizeCode(code);
    const byCode = categories.find(
      (c) => c.code === code || c.code === padded,
    );
    if (byCode) return byCode;
    if (m[2]) {
      const lower = m[2].trim().toLowerCase();
      return categories.find((c) => c.name.trim().toLowerCase() === lower) ?? null;
    }
    return null;
  }
  const lower = s.toLowerCase();
  return categories.find((c) => c.name.trim().toLowerCase() === lower) ?? null;
}

// ── Escrita ─────────────────────────────────────────────────────────────────

export type CreatedTransaction = {
  id: string;
  type: "income" | "expense";
  amount: string;
  occurred_on: string;
  account: string;
  category: string | null;
  description: string | null;
};

export async function createTransaction(
  companyId: string,
  userId: string,
  input: IntegrationCreateTxInput,
): Promise<{ transaction: CreatedTransaction; duplicated: boolean; resumo: string }> {
  const supabase = createSupabaseAdminClient();

  const { data: accounts, error: accErr } = await supabase
    .from("accounts")
    .select("id, name, kind")
    .eq("company_id", companyId)
    .eq("is_archived", false);
  if (accErr) throw new IntegrationError(500, "Falha ao ler contas.");

  const account = resolveAccount((accounts ?? []) as AccountLite[], input.account);
  if (!account) {
    throw new IntegrationError(422, `Conta não encontrada: "${input.account}".`);
  }

  let category: CategoryLite | null = null;
  if (input.category && input.category.trim()) {
    const { data: cats, error: catErr } = await supabase
      .from("categories")
      .select("id, code, name")
      .eq("company_id", companyId)
      .eq("is_archived", false);
    if (catErr) throw new IntegrationError(500, "Falha ao ler categorias.");
    category = resolveCategory((cats ?? []) as CategoryLite[], input.category);
    if (!category) {
      throw new IntegrationError(
        422,
        `Categoria não encontrada: "${input.category}".`,
      );
    }
  }

  const occurredOn = input.occurred_on || todayISO();
  const rid = input.client_request_id
    ? stableUuid(input.client_request_id)
    : null;

  const values = {
    company_id: companyId,
    account_id: account.id,
    category_id: category?.id ?? null,
    type: input.type,
    amount: input.amount,
    description: input.description ?? null,
    occurred_on: occurredOn,
    client_request_id: rid,
    created_by: userId,
    kind: "regular" as const,
  };

  const { data, error } = await supabase
    .from("transactions")
    .insert(values)
    .select("id")
    .single();

  let txId: string;
  let duplicated = false;

  if (error) {
    // Violação de unicidade em client_request_id → idempotência: retorna o existente.
    if (
      (error.code === "23505" || /duplicate key/i.test(error.message)) &&
      rid
    ) {
      const { data: existing } = await supabase
        .from("transactions")
        .select("id")
        .eq("company_id", companyId)
        .eq("client_request_id", rid)
        .maybeSingle();
      if (existing) {
        txId = existing.id;
        duplicated = true;
      } else {
        throw new IntegrationError(500, "Falha ao gravar a movimentação.");
      }
    } else {
      throw new IntegrationError(500, "Falha ao gravar a movimentação.");
    }
  } else {
    txId = data.id;
  }

  const transaction: CreatedTransaction = {
    id: txId,
    type: input.type,
    amount: input.amount,
    occurred_on: occurredOn,
    account: account.name,
    category: category ? `${category.code} ${category.name}` : null,
    description: input.description ?? null,
  };

  const resumo =
    `${input.type === "income" ? "Entrada" : "Saída"} de ${formatBRL(input.amount)} ` +
    `em ${account.name}` +
    (category ? ` · ${category.code} ${category.name}` : "") +
    ` · ${formatBR(occurredOn)}`;

  return { transaction, duplicated, resumo };
}

// ── Contexto (para a IA mapear nome→código) ──────────────────────────────────

export async function getContext(companyId: string) {
  const supabase = createSupabaseAdminClient();
  const [{ data: accounts }, { data: categories }] = await Promise.all([
    supabase
      .from("accounts")
      .select("id, name, kind")
      .eq("company_id", companyId)
      .eq("is_archived", false)
      .order("name"),
    supabase
      .from("categories")
      .select("code, name, dre_type")
      .eq("company_id", companyId)
      .eq("is_archived", false)
      .order("code"),
  ]);
  return { accounts: accounts ?? [], categories: categories ?? [] };
}

// ── Leitura (ferramentas do chat) ────────────────────────────────────────────

export async function getSummary(
  companyId: string,
  from: string,
  to: string,
): Promise<{ totalIncome: number; totalExpense: number; balance: number }> {
  const supabase = createSupabaseAdminClient();
  let totalIncome = 0;
  let totalExpense = 0;
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from("transactions")
      .select("type, amount")
      .eq("company_id", companyId)
      .eq("kind", "regular")
      .gte("occurred_on", from)
      .lte("occurred_on", to)
      .order("id", { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (error) throw new IntegrationError(500, "Falha ao calcular o resumo.");
    for (const r of data ?? []) {
      const v = Number(r.amount);
      if (r.type === "income") totalIncome += v;
      else totalExpense += v;
    }
    if (!data || data.length < PAGE) break;
  }
  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
  };
}

export async function getAccountBalances(companyId: string) {
  const supabase = createSupabaseAdminClient();
  const { data: accounts, error: accErr } = await supabase
    .from("accounts")
    .select("id, name, kind, opening_balance")
    .eq("company_id", companyId)
    .eq("is_archived", false)
    .order("name");
  if (accErr) throw new IntegrationError(500, "Falha ao ler contas.");

  const sums = new Map<string, number>();
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from("transactions")
      .select("account_id, type, amount")
      .eq("company_id", companyId)
      .order("id", { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (error) throw new IntegrationError(500, "Falha ao calcular saldos.");
    for (const t of data ?? []) {
      const cur = sums.get(t.account_id) ?? 0;
      sums.set(
        t.account_id,
        t.type === "income" ? cur + Number(t.amount) : cur - Number(t.amount),
      );
    }
    if (!data || data.length < PAGE) break;
  }

  return (accounts ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    kind: a.kind,
    currentBalance: Number(a.opening_balance) + (sums.get(a.id) ?? 0),
  }));
}

export type IntegrationTxFilters = {
  from?: string;
  to?: string;
  type?: "income" | "expense";
  q?: string;
  accountId?: string;
  categoryCode?: string;
  limit?: number;
};

export async function listTransactions(
  companyId: string,
  filters: IntegrationTxFilters,
) {
  const supabase = createSupabaseAdminClient();
  const limit = Math.min(Math.max(filters.limit ?? 25, 1), 200);

  let query = supabase
    .from("transactions")
    .select(
      "id, type, amount, occurred_on, description, kind, accounts(name), categories(code, name)",
    )
    .eq("company_id", companyId)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filters.from) query = query.gte("occurred_on", filters.from);
  if (filters.to) query = query.lte("occurred_on", filters.to);
  if (filters.type) query = query.eq("type", filters.type);
  if (filters.accountId) query = query.eq("account_id", filters.accountId);
  if (filters.q && filters.q.trim()) {
    query = query.ilike("description", `%${filters.q.trim()}%`);
  }

  if (filters.categoryCode) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("company_id", companyId)
      .eq("code", normalizeCode(filters.categoryCode))
      .maybeSingle();
    if (cat) query = query.eq("category_id", cat.id);
  }

  const { data, error } = await query;
  if (error) throw new IntegrationError(500, "Falha ao listar movimentações.");
  return data ?? [];
}

export async function getTotalsByCategory(
  companyId: string,
  from: string,
  to: string,
) {
  const supabase = createSupabaseAdminClient();
  const totals = new Map<
    string,
    { code: string; name: string; income: number; expense: number }
  >();

  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from("transactions")
      .select("type, amount, categories(code, name)")
      .eq("company_id", companyId)
      .eq("kind", "regular")
      .gte("occurred_on", from)
      .lte("occurred_on", to)
      .order("id", { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (error)
      throw new IntegrationError(500, "Falha ao agrupar por categoria.");
    for (const r of (data ?? []) as unknown as {
      type: "income" | "expense";
      amount: string;
      categories: { code: string; name: string } | null;
    }[]) {
      const code = r.categories?.code ?? "—";
      const name = r.categories?.name ?? "Sem categoria";
      const entry = totals.get(code) ?? { code, name, income: 0, expense: 0 };
      const v = Number(r.amount);
      if (r.type === "income") entry.income += v;
      else entry.expense += v;
      totals.set(code, entry);
    }
    if (!data || data.length < PAGE) break;
  }

  return Array.from(totals.values()).sort((a, b) =>
    a.code < b.code ? -1 : 1,
  );
}
