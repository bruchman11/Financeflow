import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/lib/types/database";

export type CategoryRow = Tables<"categories">;

/** Nó da árvore — categoria com seus filhos (recursivo). */
export type CategoryNode = CategoryRow & { children: CategoryNode[] };

/**
 * Lista categorias ordenadas por code. RLS filtra por empresa.
 * Inclui arquivadas se solicitado.
 */
export async function listCategories(options?: {
  includeArchived?: boolean;
}): Promise<CategoryRow[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("categories")
    .select("*")
    .order("code", { ascending: true });

  if (!options?.includeArchived) {
    query = query.eq("is_archived", false);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

/**
 * Monta a árvore aninhada a partir da lista plana.
 * Cada nó tem `children: CategoryNode[]` (vazio se folha).
 */
export function buildCategoryTree(rows: CategoryRow[]): CategoryNode[] {
  const byId = new Map<string, CategoryNode>();
  for (const r of rows) byId.set(r.id, { ...r, children: [] });

  const roots: CategoryNode[] = [];
  for (const node of byId.values()) {
    if (node.parent_id && byId.has(node.parent_id)) {
      byId.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Ordena filhos por code dentro de cada nó
  const sortNodes = (nodes: CategoryNode[]) => {
    nodes.sort((a, b) => a.code.localeCompare(b.code));
    for (const n of nodes) sortNodes(n.children);
  };
  sortNodes(roots);

  return roots;
}

/** Atalho: lista + monta a árvore numa chamada. */
export async function listCategoriesTree(options?: {
  includeArchived?: boolean;
}): Promise<CategoryNode[]> {
  const rows = await listCategories(options);
  return buildCategoryTree(rows);
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

export async function getCategoryByCode(
  code: string,
): Promise<CategoryRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("code", code)
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
