"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ZodError } from "zod";
import {
  getActiveCompanyOrRedirect,
  getUserOrRedirect,
} from "@/lib/auth/current";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  deleteInstallmentGroup as deleteGroupDb,
  deletePurchase as deletePurchaseDb,
  getCreditCard,
  getInvoice,
  getPurchase,
  insertCreditCard,
  setCreditCardActive as setActiveDb,
  updateCreditCard as updateCardDb,
  updatePurchase as updatePurchaseDb,
} from "@/lib/db/credit_cards";
import {
  createCreditCardSchema,
  createPurchaseSchema,
  updateCreditCardSchema,
  updatePurchaseSchema,
} from "@/lib/validation/credit_card";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function fieldErrorsOf(err: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in out)) {
      out[key] = issue.message;
    }
  }
  return out;
}

// ── Cartão ────────────────────────────────────────────────────────────────────

export async function createCreditCardAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await getUserOrRedirect();
  const company = await getActiveCompanyOrRedirect();

  const parsed = createCreditCardSchema.safeParse({
    name: formData.get("name"),
    closing_day: formData.get("closing_day"),
    due_day: formData.get("due_day"),
    limit_amount: formData.get("limit_amount"),
    payment_account_id: formData.get("payment_account_id"),
    color: formData.get("color"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Confira os dados informados.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  try {
    await insertCreditCard({
      company_id: company.id,
      name: parsed.data.name,
      closing_day: parsed.data.closing_day,
      due_day: parsed.data.due_day,
      limit_amount: parsed.data.limit_amount,
      payment_account_id: parsed.data.payment_account_id,
      color: parsed.data.color,
    });
  } catch {
    return { ok: false, error: "Não foi possível criar o cartão." };
  }

  revalidatePath("/credit-cards");
  redirect("/credit-cards");
}

export async function updateCreditCardAction(
  id: string,
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await getUserOrRedirect();
  await getActiveCompanyOrRedirect();

  const existing = await getCreditCard(id);
  if (!existing) return { ok: false, error: "Cartão não encontrado." };

  const parsed = updateCreditCardSchema.safeParse({
    name: formData.get("name"),
    closing_day: formData.get("closing_day"),
    due_day: formData.get("due_day"),
    limit_amount: formData.get("limit_amount"),
    payment_account_id: formData.get("payment_account_id"),
    color: formData.get("color"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Confira os dados informados.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  try {
    await updateCardDb(id, {
      name: parsed.data.name,
      closing_day: parsed.data.closing_day,
      due_day: parsed.data.due_day,
      limit_amount: parsed.data.limit_amount,
      payment_account_id: parsed.data.payment_account_id,
      color: parsed.data.color,
    });
  } catch {
    return { ok: false, error: "Não foi possível salvar o cartão." };
  }

  revalidatePath("/credit-cards");
  redirect(`/credit-cards/${id}`);
}

export async function toggleCardActiveAction(
  formData: FormData,
): Promise<void> {
  await getUserOrRedirect();
  await getActiveCompanyOrRedirect();

  const id = formData.get("id");
  const active = formData.get("active");
  if (typeof id !== "string") return;

  try {
    await setActiveDb(id, active === "1" || active === "true");
  } catch {
    return;
  }
  revalidatePath("/credit-cards");
}

// ── Compra ────────────────────────────────────────────────────────────────────

export async function createPurchaseAction(
  cardId: string,
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await getUserOrRedirect();
  await getActiveCompanyOrRedirect();

  const parsed = createPurchaseSchema.safeParse({
    description: formData.get("description"),
    total_amount: formData.get("total_amount"),
    installments_total: formData.get("installments_total"),
    purchase_date: formData.get("purchase_date"),
    competence_date: formData.get("competence_date"),
    category_id: formData.get("category_id"),
    payee: formData.get("payee"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Confira os dados informados.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("create_credit_card_purchase", {
    _card_id: cardId,
    _category_id: parsed.data.category_id,
    _description: parsed.data.description,
    _total_amount: parsed.data.total_amount,
    _installments_total: parsed.data.installments_total,
    _purchase_date: parsed.data.purchase_date,
    _competence_date: parsed.data.competence_date,
    _payee: parsed.data.payee,
    _notes: parsed.data.notes,
  });

  if (error) {
    const msg = (error.message ?? "").toLowerCase();
    if (msg.includes("invoice_already_paid")) {
      return {
        ok: false,
        error:
          "A fatura correspondente já foi paga. Edite a data ou registre uma nova compra fora dela.",
      };
    }
    if (msg.includes("card_inactive")) {
      return { ok: false, error: "Cartão inativo." };
    }
    if (msg.includes("invalid_amount")) {
      return { ok: false, error: "Valor inválido." };
    }
    if (msg.includes("invalid_installments")) {
      return { ok: false, error: "Número de parcelas inválido (1-60)." };
    }
    if (msg.includes("invalid_category")) {
      return { ok: false, error: "Categoria inválida para esta empresa." };
    }
    return { ok: false, error: "Não foi possível criar a compra." };
  }

  revalidatePath(`/credit-cards/${cardId}`);
  revalidatePath("/credit-cards");
  redirect(`/credit-cards/${cardId}`);
}

export async function deletePurchaseAction(
  formData: FormData,
): Promise<void> {
  await getUserOrRedirect();
  await getActiveCompanyOrRedirect();

  const id = formData.get("id");
  const scope = formData.get("scope"); // "one" | "group"
  if (typeof id !== "string") return;

  const purchase = await getPurchase(id);
  if (!purchase) return;

  try {
    if (scope === "group") {
      await deleteGroupDb(purchase.installment_group_id);
    } else {
      await deletePurchaseDb(id);
    }
  } catch {
    return;
  }

  revalidatePath(`/credit-cards/${purchase.credit_card_id}`);
}

// ── Pagamento de fatura ───────────────────────────────────────────────────────

export async function payInvoiceAction(
  invoiceId: string,
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await getUserOrRedirect();
  await getActiveCompanyOrRedirect();

  const invoice = await getInvoice(invoiceId);
  if (!invoice) return { ok: false, error: "Fatura não encontrada." };

  const account_id = formData.get("account_id");
  const paid_on = formData.get("paid_on");

  if (typeof account_id !== "string" || !account_id) {
    return {
      ok: false,
      error: "Selecione a conta de pagamento.",
      fieldErrors: { account_id: "Selecione a conta de pagamento." },
    };
  }
  if (typeof paid_on !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(paid_on)) {
    return {
      ok: false,
      error: "Data inválida.",
      fieldErrors: { paid_on: "Data inválida." },
    };
  }

  const supabase = await createSupabaseServerClient();
  // _amount é aceito pela RPC mas ignorado — usa soma das parcelas pendentes
  const { error } = await supabase.rpc("pay_credit_card_invoice", {
    _invoice_id: invoiceId,
    _account_id: account_id,
    _amount: invoice.total_amount,
    _paid_on: paid_on,
  });

  if (error) {
    const msg = (error.message ?? "").toLowerCase();
    if (msg.includes("invoice_already_paid")) {
      return { ok: false, error: "Fatura já paga." };
    }
    if (msg.includes("account_invalid")) {
      return { ok: false, error: "Conta inválida para esta empresa." };
    }
    if (msg.includes("no_unpaid_purchases")) {
      return {
        ok: false,
        error: "Nenhuma compra pendente — não há o que pagar.",
      };
    }
    return { ok: false, error: "Não foi possível registrar o pagamento." };
  }

  revalidatePath(`/credit-cards/${invoice.credit_card_id}`);
  revalidatePath("/credit-cards");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  redirect(`/credit-cards/${invoice.credit_card_id}`);
}

// ── Edição de compra ──────────────────────────────────────────────────────────

export async function updatePurchaseAction(
  purchaseId: string,
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await getUserOrRedirect();
  await getActiveCompanyOrRedirect();

  const existing = await getPurchase(purchaseId);
  if (!existing) return { ok: false, error: "Compra não encontrada." };

  const parsed = updatePurchaseSchema.safeParse({
    description: formData.get("description"),
    category_id: formData.get("category_id"),
    payee: formData.get("payee"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Confira os dados informados.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  try {
    await updatePurchaseDb(purchaseId, {
      description: parsed.data.description,
      category_id: parsed.data.category_id,
      payee: parsed.data.payee,
      notes: parsed.data.notes,
    });
  } catch {
    return { ok: false, error: "Não foi possível salvar a compra." };
  }

  revalidatePath(`/credit-cards/${existing.credit_card_id}`);
  redirect(`/credit-cards/${existing.credit_card_id}`);
}
