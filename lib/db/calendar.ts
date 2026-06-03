import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CalendarItemKind = "bill" | "fixed_expense" | "invoice";

export const calendarKindLabels: Record<CalendarItemKind, string> = {
  bill: "Boleto",
  fixed_expense: "Despesa fixa",
  invoice: "Fatura",
};

/**
 * Item normalizado do calendário (oriundo de 3 fontes: boletos,
 * despesas fixas, faturas de cartão).
 */
export type CalendarItem = {
  id: string;
  kind: CalendarItemKind;
  event_date: string; // YYYY-MM-DD
  title: string;
  subtitle: string | null;
  amount: string;
  category_name: string | null;
  category_code: string | null;
  category_color: string | null;
  detail_href: string;
  pay_href: string;
};

function formatRefMonth(refMonth: string | null): string {
  if (!refMonth) return "";
  const [y, m] = refMonth.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "2-digit",
  }).format(new Date(y, m - 1, 1));
}

/**
 * Lista itens do calendário entre `from` e `to` (inclusivos).
 * Permite filtrar por tipo via `kinds`. RLS garante isolamento por empresa.
 */
export async function listCalendarItems({
  from,
  to,
  kinds,
}: {
  from: string;
  to: string;
  kinds?: CalendarItemKind[];
}): Promise<CalendarItem[]> {
  const allKinds = kinds ?? ["bill", "fixed_expense", "invoice"];
  const supabase = await createSupabaseServerClient();

  // 3 queries em paralelo
  const [billsRes, fixedRes, invoicesRes] = await Promise.all([
    allKinds.includes("bill")
      ? supabase
          .from("bills")
          .select(
            "id, due_date, description, beneficiary_name, amount, categories(name, code, color)",
          )
          .eq("status", "pending")
          .gte("due_date", from)
          .lte("due_date", to)
      : Promise.resolve({ data: [], error: null }),

    allKinds.includes("fixed_expense")
      ? supabase
          .from("fixed_expenses")
          .select(
            "id, next_due_date, description, amount, categories(name, code, color)",
          )
          .eq("status", "active")
          .gte("next_due_date", from)
          .lte("next_due_date", to)
      : Promise.resolve({ data: [], error: null }),

    allKinds.includes("invoice")
      ? supabase
          .from("credit_card_invoices")
          .select(
            "id, due_date, total_amount, reference_month, credit_card_id, credit_cards(name)",
          )
          .neq("status", "paid")
          .gt("total_amount", 0)
          .gte("due_date", from)
          .lte("due_date", to)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (billsRes.error || fixedRes.error || invoicesRes.error) {
    throw billsRes.error ?? fixedRes.error ?? invoicesRes.error;
  }

  const items: CalendarItem[] = [];

  type BillJoin = {
    id: string;
    due_date: string;
    description: string;
    beneficiary_name: string | null;
    amount: string;
    categories: { name: string; code: string; color: string | null } | null;
  };
  for (const b of (billsRes.data as unknown as BillJoin[]) ?? []) {
    items.push({
      id: b.id,
      kind: "bill",
      event_date: b.due_date,
      title: b.description,
      subtitle: b.beneficiary_name,
      amount: b.amount,
      category_name: b.categories?.name ?? null,
      category_code: b.categories?.code ?? null,
      category_color: b.categories?.color ?? null,
      detail_href: `/bills/${b.id}/edit`,
      pay_href: `/bills/${b.id}/pay`,
    });
  }

  type FixedJoin = {
    id: string;
    next_due_date: string;
    description: string;
    amount: string;
    categories: { name: string; code: string; color: string | null } | null;
  };
  for (const f of (fixedRes.data as unknown as FixedJoin[]) ?? []) {
    items.push({
      id: f.id,
      kind: "fixed_expense",
      event_date: f.next_due_date,
      title: f.description,
      subtitle: null,
      amount: f.amount,
      category_name: f.categories?.name ?? null,
      category_code: f.categories?.code ?? null,
      category_color: f.categories?.color ?? null,
      detail_href: `/fixed-expenses/${f.id}/edit`,
      pay_href: `/fixed-expenses/${f.id}/pay`,
    });
  }

  type InvoiceJoin = {
    id: string;
    due_date: string;
    total_amount: string;
    reference_month: string;
    credit_card_id: string;
    credit_cards: { name: string } | null;
  };
  for (const i of (invoicesRes.data as unknown as InvoiceJoin[]) ?? []) {
    items.push({
      id: i.id,
      kind: "invoice",
      event_date: i.due_date,
      title: `Fatura ${i.credit_cards?.name ?? "cartão"}`,
      subtitle: `Ref. ${formatRefMonth(i.reference_month)}`,
      amount: i.total_amount,
      category_name: null,
      category_code: null,
      category_color: null,
      detail_href: `/credit-cards/${i.credit_card_id}`,
      pay_href: `/credit-cards/${i.credit_card_id}/invoices/${i.id}/pay`,
    });
  }

  items.sort((a, b) =>
    a.event_date < b.event_date ? -1 : a.event_date > b.event_date ? 1 : 0,
  );
  return items;
}
