import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  Tables,
  TablesInsert,
  TablesUpdate,
  AccountKind,
} from "@/lib/types/database";

export type TransactionRow = Tables<"transactions">;

export type TransactionWithRefs = TransactionRow & {
  accounts: { name: string; kind: AccountKind } | null;
  categories: { name: string; color: string | null } | null;
};

/**
 * Lista movimentações de um período (YYYY-MM-DD).
 * RLS garante que só vêm registros da empresa ativa.
 * Limite 200 por período — suficiente para uso mensal de PME.
 */
export async function listTransactions({
  from,
  to,
}: {
  from: string;
  to: string;
}): Promise<TransactionWithRefs[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("*, accounts(name, kind), categories(name, color)")
    .gte("occurred_on", from)
    .lte("occurred_on", to)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as unknown as TransactionWithRefs[];
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
