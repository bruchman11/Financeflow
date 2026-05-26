import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/types/database";

export type AccountRow = Tables<"accounts">;

/**
 * Lista contas da empresa ativa (filtro de empresa imposto pela RLS).
 * Por padrão omite arquivadas; passe `{ includeArchived: true }` para incluir.
 * Ordem: ativas primeiro, depois nome.
 */
export async function listAccounts(options?: {
  includeArchived?: boolean;
}): Promise<AccountRow[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("accounts")
    .select("*")
    .order("is_archived", { ascending: true })
    .order("name", { ascending: true });

  if (!options?.includeArchived) {
    query = query.eq("is_archived", false);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

/** Busca uma conta específica. Retorna null se não existir ou RLS bloquear. */
export async function getAccount(id: string): Promise<AccountRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) return null;
  return data;
}

export async function insertAccount(
  values: TablesInsert<"accounts">,
): Promise<AccountRow> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("accounts")
    .insert(values)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateAccount(
  id: string,
  values: TablesUpdate<"accounts">,
): Promise<AccountRow> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("accounts")
    .update(values)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function setAccountArchived(
  id: string,
  archived: boolean,
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("accounts")
    .update({ is_archived: archived })
    .eq("id", id);
  if (error) throw error;
}
