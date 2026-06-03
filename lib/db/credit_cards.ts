import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/lib/types/database";

export type CreditCardRow = Tables<"credit_cards">;
export type CreditCardInvoiceRow = Tables<"credit_card_invoices">;
export type CreditCardPurchaseRow = Tables<"credit_card_purchases">;

export type CreditCardWithRefs = CreditCardRow & {
  payment_account: { name: string } | null;
};

// ── Cartões ───────────────────────────────────────────────────────────────────

export async function listCreditCards(options?: {
  includeInactive?: boolean;
}): Promise<CreditCardWithRefs[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("credit_cards")
    .select("*, payment_account:payment_account_id(name)")
    .order("name", { ascending: true });

  if (!options?.includeInactive) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as CreditCardWithRefs[];
}

export async function getCreditCard(
  id: string,
): Promise<CreditCardRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("credit_cards")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) return null;
  return data;
}

export async function insertCreditCard(
  values: TablesInsert<"credit_cards">,
): Promise<CreditCardRow> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("credit_cards")
    .insert(values)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateCreditCard(
  id: string,
  values: TablesUpdate<"credit_cards">,
): Promise<CreditCardRow> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("credit_cards")
    .update(values)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function setCreditCardActive(
  id: string,
  active: boolean,
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("credit_cards")
    .update({ is_active: active })
    .eq("id", id);
  if (error) throw error;
}

// ── Faturas ───────────────────────────────────────────────────────────────────

export async function listInvoicesByCard(
  cardId: string,
): Promise<CreditCardInvoiceRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("credit_card_invoices")
    .select("*")
    .eq("credit_card_id", cardId)
    .order("reference_month", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getInvoice(
  id: string,
): Promise<CreditCardInvoiceRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("credit_card_invoices")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) return null;
  return data;
}

/** Retorna a fatura aberta atual de um cartão (status open) ou null. */
export async function getCurrentOpenInvoice(
  cardId: string,
): Promise<CreditCardInvoiceRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("credit_card_invoices")
    .select("*")
    .eq("credit_card_id", cardId)
    .neq("status", "paid")
    .order("reference_month", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data;
}

// ── Compras ───────────────────────────────────────────────────────────────────

export type PurchaseWithCategory = CreditCardPurchaseRow & {
  categories: { name: string; code: string; color: string | null } | null;
};

export async function listPurchasesByInvoice(
  invoiceId: string,
): Promise<PurchaseWithCategory[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("credit_card_purchases")
    .select("*, categories(name, code, color)")
    .eq("invoice_id", invoiceId)
    .order("purchase_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as PurchaseWithCategory[];
}

export async function getPurchase(
  id: string,
): Promise<CreditCardPurchaseRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("credit_card_purchases")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) return null;
  return data;
}

export async function updatePurchase(
  id: string,
  values: TablesUpdate<"credit_card_purchases">,
): Promise<CreditCardPurchaseRow> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("credit_card_purchases")
    .update(values)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/** Exclui apenas esta parcela. */
export async function deletePurchase(id: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("credit_card_purchases")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

/** Exclui todas as parcelas de um grupo de parcelamento. */
export async function deleteInstallmentGroup(groupId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("credit_card_purchases")
    .delete()
    .eq("installment_group_id", groupId);
  if (error) throw error;
}
