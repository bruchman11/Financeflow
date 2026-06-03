"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ZodError } from "zod";
import {
  getActiveCompanyOrRedirect,
  getUserOrRedirect,
} from "@/lib/auth/current";
import {
  getFixedExpense,
  insertFixedExpense,
  setFixedExpenseStatus as setStatusDb,
  updateFixedExpense as updateDb,
} from "@/lib/db/fixed_expenses";
import {
  createFixedExpenseSchema,
  payFixedExpenseSchema,
  setFixedExpenseStatusSchema,
  updateFixedExpenseSchema,
} from "@/lib/validation/fixed_expense";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

export async function createFixedExpenseAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getUserOrRedirect();
  const company = await getActiveCompanyOrRedirect();

  const parsed = createFixedExpenseSchema.safeParse({
    description: formData.get("description"),
    amount: formData.get("amount"),
    frequency: formData.get("frequency"),
    custom_interval_days: formData.get("custom_interval_days"),
    next_due_date: formData.get("next_due_date"),
    category_id: formData.get("category_id"),
    default_account_id: formData.get("default_account_id"),
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
    await insertFixedExpense({
      company_id: company.id,
      description: parsed.data.description,
      amount: parsed.data.amount,
      frequency: parsed.data.frequency,
      custom_interval_days: parsed.data.custom_interval_days,
      next_due_date: parsed.data.next_due_date,
      category_id: parsed.data.category_id,
      default_account_id: parsed.data.default_account_id,
      notes: parsed.data.notes,
      created_by: user.id,
    });
  } catch {
    return {
      ok: false,
      error: "Não foi possível criar a despesa fixa.",
    };
  }

  revalidatePath("/fixed-expenses");
  redirect("/fixed-expenses");
}

export async function updateFixedExpenseAction(
  id: string,
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await getUserOrRedirect();
  await getActiveCompanyOrRedirect();

  const existing = await getFixedExpense(id);
  if (!existing) {
    return { ok: false, error: "Despesa fixa não encontrada." };
  }

  const parsed = updateFixedExpenseSchema.safeParse({
    description: formData.get("description"),
    amount: formData.get("amount"),
    frequency: formData.get("frequency"),
    custom_interval_days: formData.get("custom_interval_days"),
    next_due_date: formData.get("next_due_date"),
    category_id: formData.get("category_id"),
    default_account_id: formData.get("default_account_id"),
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
    await updateDb(id, {
      description: parsed.data.description,
      amount: parsed.data.amount,
      frequency: parsed.data.frequency,
      custom_interval_days: parsed.data.custom_interval_days,
      next_due_date: parsed.data.next_due_date,
      category_id: parsed.data.category_id,
      default_account_id: parsed.data.default_account_id,
      notes: parsed.data.notes,
    });
  } catch {
    return { ok: false, error: "Não foi possível salvar." };
  }

  revalidatePath("/fixed-expenses");
  redirect("/fixed-expenses");
}

export async function toggleFixedExpenseStatusAction(
  formData: FormData,
): Promise<void> {
  await getUserOrRedirect();
  await getActiveCompanyOrRedirect();

  const parsed = setFixedExpenseStatusSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  try {
    await setStatusDb(parsed.data.id, parsed.data.status);
  } catch {
    return;
  }
  revalidatePath("/fixed-expenses");
}

// ── Pagamento via RPC atômica ─────────────────────────────────────────────────

export async function payFixedExpenseAction(
  fixedExpenseId: string,
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await getUserOrRedirect();
  await getActiveCompanyOrRedirect();

  const parsed = payFixedExpenseSchema.safeParse({
    fixed_expense_id: fixedExpenseId,
    account_id: formData.get("account_id"),
    amount: formData.get("amount"),
    paid_on: formData.get("paid_on"),
    due_date_paid: formData.get("due_date_paid"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Confira os dados informados.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("record_fixed_expense_payment", {
    _fixed_expense_id: parsed.data.fixed_expense_id,
    _account_id: parsed.data.account_id,
    _amount: parsed.data.amount,
    _paid_on: parsed.data.paid_on,
    _due_date_paid: parsed.data.due_date_paid,
  });

  if (error) {
    const msg = (error.message ?? "").toLowerCase();
    // UNIQUE (fixed_expense_id, due_date_paid)
    if ((error as { code?: string }).code === "23505") {
      return {
        ok: false,
        error:
          "Esta competência já foi paga. Edite a data de competência para registrar outro pagamento.",
      };
    }
    if (msg.includes("inactive")) {
      return { ok: false, error: "Despesa fixa inativa." };
    }
    if (msg.includes("account_invalid")) {
      return { ok: false, error: "Conta inválida para esta empresa." };
    }
    if (msg.includes("invalid_amount")) {
      return { ok: false, error: "Valor inválido." };
    }
    return { ok: false, error: "Não foi possível registrar o pagamento." };
  }

  revalidatePath("/fixed-expenses");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  redirect("/fixed-expenses");
}
