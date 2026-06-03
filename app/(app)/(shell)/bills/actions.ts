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
  getBill,
  insertBill,
  setBillStatus as setStatusDb,
  updateBill as updateBillDb,
} from "@/lib/db/bills";
import {
  createBillSchema,
  payBillSchema,
  updateBillSchema,
} from "@/lib/validation/bill";

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

export async function createBillAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getUserOrRedirect();
  const company = await getActiveCompanyOrRedirect();

  const parsed = createBillSchema.safeParse({
    description: formData.get("description"),
    beneficiary_name: formData.get("beneficiary_name"),
    amount: formData.get("amount"),
    due_date: formData.get("due_date"),
    competence_date: formData.get("competence_date"),
    category_id: formData.get("category_id"),
    barcode: formData.get("barcode"),
    digitable_line: formData.get("digitable_line"),
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
    await insertBill({
      company_id: company.id,
      description: parsed.data.description,
      beneficiary_name: parsed.data.beneficiary_name,
      amount: parsed.data.amount,
      due_date: parsed.data.due_date,
      competence_date: parsed.data.competence_date ?? parsed.data.due_date,
      category_id: parsed.data.category_id,
      barcode: parsed.data.barcode,
      digitable_line: parsed.data.digitable_line,
      notes: parsed.data.notes,
      created_by: user.id,
    });
  } catch {
    return { ok: false, error: "Não foi possível criar o boleto." };
  }

  revalidatePath("/bills");
  redirect("/bills");
}

export async function updateBillAction(
  id: string,
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await getUserOrRedirect();
  await getActiveCompanyOrRedirect();

  const existing = await getBill(id);
  if (!existing) return { ok: false, error: "Boleto não encontrado." };
  if (existing.status === "paid") {
    return {
      ok: false,
      error: "Boleto pago não pode ser editado. Exclua a transação de pagamento para reabrir.",
    };
  }

  const parsed = updateBillSchema.safeParse({
    description: formData.get("description"),
    beneficiary_name: formData.get("beneficiary_name"),
    amount: formData.get("amount"),
    due_date: formData.get("due_date"),
    competence_date: formData.get("competence_date"),
    category_id: formData.get("category_id"),
    barcode: formData.get("barcode"),
    digitable_line: formData.get("digitable_line"),
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
    await updateBillDb(id, {
      description: parsed.data.description,
      beneficiary_name: parsed.data.beneficiary_name,
      amount: parsed.data.amount,
      due_date: parsed.data.due_date,
      competence_date: parsed.data.competence_date ?? parsed.data.due_date,
      category_id: parsed.data.category_id,
      barcode: parsed.data.barcode,
      digitable_line: parsed.data.digitable_line,
      notes: parsed.data.notes,
    });
  } catch {
    return { ok: false, error: "Não foi possível salvar o boleto." };
  }

  revalidatePath("/bills");
  redirect("/bills");
}

export async function cancelBillAction(formData: FormData): Promise<void> {
  await getUserOrRedirect();
  await getActiveCompanyOrRedirect();

  const id = formData.get("id");
  if (typeof id !== "string") return;

  try {
    await setStatusDb(id, "canceled");
  } catch {
    return;
  }
  revalidatePath("/bills");
}

export async function reopenBillAction(formData: FormData): Promise<void> {
  await getUserOrRedirect();
  await getActiveCompanyOrRedirect();

  const id = formData.get("id");
  if (typeof id !== "string") return;

  const bill = await getBill(id);
  // Só reabre boletos cancelados (boletos pagos exigem deletar a transação)
  if (!bill || bill.status !== "canceled") return;

  try {
    await setStatusDb(id, "pending");
  } catch {
    return;
  }
  revalidatePath("/bills");
}

export async function payBillAction(
  billId: string,
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await getUserOrRedirect();
  await getActiveCompanyOrRedirect();

  const parsed = payBillSchema.safeParse({
    bill_id: billId,
    account_id: formData.get("account_id"),
    amount: formData.get("amount"),
    paid_on: formData.get("paid_on"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Confira os dados informados.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("pay_bill", {
    _bill_id: parsed.data.bill_id,
    _account_id: parsed.data.account_id,
    _amount: parsed.data.amount,
    _paid_on: parsed.data.paid_on,
  });

  if (error) {
    const msg = (error.message ?? "").toLowerCase();
    if (msg.includes("bill_already_paid")) {
      return { ok: false, error: "Boleto já pago." };
    }
    if (msg.includes("bill_canceled")) {
      return { ok: false, error: "Boleto cancelado." };
    }
    if (msg.includes("account_invalid")) {
      return { ok: false, error: "Conta inválida para esta empresa." };
    }
    if (msg.includes("invalid_amount")) {
      return { ok: false, error: "Valor inválido." };
    }
    return { ok: false, error: "Não foi possível registrar o pagamento." };
  }

  revalidatePath("/bills");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  redirect("/bills");
}
