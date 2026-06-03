import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  Tables,
  TablesInsert,
  TablesUpdate,
  BillStatus,
} from "@/lib/types/database";

export type BillRow = Tables<"bills">;

export type BillWithRefs = BillRow & {
  categories: { name: string; code: string; color: string | null } | null;
  payment_account: { name: string } | null;
};

export async function listBills(options?: {
  status?: BillStatus | "all";
}): Promise<BillWithRefs[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("bills")
    .select(
      "*, categories(name, code, color), payment_account:payment_account_id(name)",
    )
    .order("due_date", { ascending: true });

  const status = options?.status ?? "all";
  if (status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as BillWithRefs[];
}

export async function getBill(id: string): Promise<BillRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("bills")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) return null;
  return data;
}

export async function insertBill(
  values: TablesInsert<"bills">,
): Promise<BillRow> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("bills")
    .insert(values)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateBill(
  id: string,
  values: TablesUpdate<"bills">,
): Promise<BillRow> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("bills")
    .update(values)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function setBillStatus(
  id: string,
  status: BillStatus,
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("bills")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}
