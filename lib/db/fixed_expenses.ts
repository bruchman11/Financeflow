import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  Tables,
  TablesInsert,
  TablesUpdate,
  FixedExpenseStatus,
} from "@/lib/types/database";

export type FixedExpenseRow = Tables<"fixed_expenses">;
export type FixedExpensePaymentRow = Tables<"fixed_expense_payments">;

export type FixedExpenseWithRefs = FixedExpenseRow & {
  categories: { name: string; code: string; color: string | null } | null;
  accounts: { name: string } | null;
};

/** Lista despesas fixas. RLS filtra por empresa. */
export async function listFixedExpenses(options?: {
  status?: FixedExpenseStatus | "all";
}): Promise<FixedExpenseWithRefs[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("fixed_expenses")
    .select(
      "*, categories(name, code, color), accounts:default_account_id(name)",
    )
    .order("next_due_date", { ascending: true });

  const status = options?.status ?? "active";
  if (status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as FixedExpenseWithRefs[];
}

export async function getFixedExpense(
  id: string,
): Promise<FixedExpenseRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("fixed_expenses")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) return null;
  return data;
}

export async function insertFixedExpense(
  values: TablesInsert<"fixed_expenses">,
): Promise<FixedExpenseRow> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("fixed_expenses")
    .insert(values)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateFixedExpense(
  id: string,
  values: TablesUpdate<"fixed_expenses">,
): Promise<FixedExpenseRow> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("fixed_expenses")
    .update(values)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function setFixedExpenseStatus(
  id: string,
  status: FixedExpenseStatus,
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("fixed_expenses")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}

/** Lista pagamentos de uma despesa fixa, mais recentes primeiro. */
export async function listFixedExpensePayments(
  fixedExpenseId: string,
): Promise<FixedExpensePaymentRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("fixed_expense_payments")
    .select("*")
    .eq("fixed_expense_id", fixedExpenseId)
    .order("paid_at", { ascending: false });
  if (error) return [];
  return data ?? [];
}

// ── Classificação de vencimento ──────────────────────────────────────────────

export type DueBucket = "overdue" | "today" | "upcoming" | "future";

/** Classifica um vencimento em bucket relativo à data atual. */
export function classifyDue(
  nextDueDate: string,
  today: string,
  upcomingWindowDays = 15,
): DueBucket {
  if (nextDueDate < today) return "overdue";
  if (nextDueDate === today) return "today";

  // próxima janela: até hoje + N dias
  const [y, m, d] = today.split("-").map(Number);
  const limit = new Date(y, m - 1, d + upcomingWindowDays);
  const limitISO = `${limit.getFullYear()}-${String(limit.getMonth() + 1).padStart(2, "0")}-${String(limit.getDate()).padStart(2, "0")}`;

  if (nextDueDate <= limitISO) return "upcoming";
  return "future";
}

export const dueBucketLabels: Record<DueBucket, string> = {
  overdue: "Vencidas",
  today: "Vencem hoje",
  upcoming: "Próximos 15 dias",
  future: "Futuras",
};
