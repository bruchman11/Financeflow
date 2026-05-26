import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/types/database";

export type CategoryRow = Tables<"categories">;

/**
 * Lista categorias da empresa ativa (RLS aplica o filtro).
 * Ordem: ativas primeiro, depois tipo (income antes), depois nome.
 */
export async function listCategories(options?: {
  includeArchived?: boolean;
}): Promise<CategoryRow[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("categories")
    .select("*")
    .order("is_archived", { ascending: true })
    .order("type", { ascending: true })
    .order("name", { ascending: true });

  if (!options?.includeArchived) {
    query = query.eq("is_archived", false);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getCategory(id: string): Promise<CategoryRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) return null;
  return data;
}

export async function insertCategory(
  values: TablesInsert<"categories">,
): Promise<CategoryRow> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .insert(values)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateCategory(
  id: string,
  values: TablesUpdate<"categories">,
): Promise<CategoryRow> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .update(values)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function setCategoryArchived(
  id: string,
  archived: boolean,
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("categories")
    .update({ is_archived: archived })
    .eq("id", id);
  if (error) throw error;
}
