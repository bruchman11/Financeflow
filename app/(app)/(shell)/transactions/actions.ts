"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ZodError } from "zod";
import {
  getActiveCompanyOrRedirect,
  getUserOrRedirect,
} from "@/lib/auth/current";
import {
  deleteTransaction,
  getTransaction,
  insertTransaction,
  updateTransaction,
} from "@/lib/db/transactions";
import {
  createTransactionSchema,
  updateTransactionSchema,
  deleteTransactionSchema,
} from "@/lib/validation/transaction";

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

export async function createTransactionAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getUserOrRedirect();
  const company = await getActiveCompanyOrRedirect();

  const parsed = createTransactionSchema.safeParse({
    type: formData.get("type"),
    amount: formData.get("amount"),
    account_id: formData.get("account_id"),
    category_id: formData.get("category_id"),
    occurred_on: formData.get("occurred_on"),
    description: formData.get("description"),
    client_request_id: formData.get("client_request_id"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Confira os dados informados.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  try {
    await insertTransaction({
      company_id: company.id,
      account_id: parsed.data.account_id,
      category_id: parsed.data.category_id ?? null,
      type: parsed.data.type,
      amount: parsed.data.amount,
      description: parsed.data.description ?? null,
      occurred_on: parsed.data.occurred_on,
      client_request_id: parsed.data.client_request_id ?? null,
      created_by: user.id,
    });
  } catch (err) {
    // unique_violation em client_request_id → retry de lançamento já registrado
    if (
      err instanceof Object &&
      "code" in err &&
      (err as { code: string }).code === "23505"
    ) {
      revalidatePath("/transactions");
      redirect("/transactions");
    }
    return {
      ok: false,
      error: "Não foi possível salvar a movimentação. Tente novamente.",
    };
  }

  revalidatePath("/transactions");
  redirect("/transactions");
}

export async function updateTransactionAction(
  id: string,
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await getUserOrRedirect();
  await getActiveCompanyOrRedirect();

  const existing = await getTransaction(id);
  if (!existing) {
    return { ok: false, error: "Movimentação não encontrada." };
  }

  const parsed = updateTransactionSchema.safeParse({
    type: formData.get("type"),
    amount: formData.get("amount"),
    account_id: formData.get("account_id"),
    category_id: formData.get("category_id"),
    occurred_on: formData.get("occurred_on"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Confira os dados informados.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  try {
    await updateTransaction(id, {
      account_id: parsed.data.account_id,
      category_id: parsed.data.category_id ?? null,
      type: parsed.data.type,
      amount: parsed.data.amount,
      description: parsed.data.description ?? null,
      occurred_on: parsed.data.occurred_on,
    });
  } catch {
    return { ok: false, error: "Não foi possível salvar a movimentação." };
  }

  revalidatePath("/transactions");
  redirect("/transactions");
}

/** Usado como form action puro (sem useActionState). Redireciona após excluir. */
export async function deleteTransactionAction(
  formData: FormData,
): Promise<void> {
  await getUserOrRedirect();
  await getActiveCompanyOrRedirect();

  const parsed = deleteTransactionSchema.safeParse({
    id: formData.get("id"),
  });
  if (!parsed.success) return;

  try {
    await deleteTransaction(parsed.data.id);
  } catch {
    return;
  }

  revalidatePath("/transactions");
  redirect("/transactions");
}
