"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ZodError } from "zod";
import {
  getActiveCompanyOrRedirect,
  getUserOrRedirect,
} from "@/lib/auth/current";
import {
  getAccount,
  insertAccount,
  setAccountArchived as setArchivedDb,
  updateAccount as updateAccountDb,
} from "@/lib/db/accounts";
import {
  archiveAccountSchema,
  createAccountSchema,
  updateAccountSchema,
} from "@/lib/validation/account";
import { createTransferSchema } from "@/lib/validation/transfer";
import { adjustBalanceSchema } from "@/lib/validation/adjustment";
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

export async function createAccountAction(
  formData: FormData,
): Promise<ActionResult> {
  await getUserOrRedirect();
  const company = await getActiveCompanyOrRedirect();

  const parsed = createAccountSchema.safeParse({
    name: formData.get("name"),
    kind: formData.get("kind"),
    opening_balance: formData.get("opening_balance"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Confira os dados informados.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  try {
    await insertAccount({
      company_id: company.id,
      name: parsed.data.name,
      kind: parsed.data.kind,
      opening_balance: parsed.data.opening_balance,
    });
  } catch {
    return {
      ok: false,
      error: "Não foi possível criar a conta. Tente novamente.",
    };
  }

  revalidatePath("/accounts");
  redirect("/accounts");
}

export async function updateAccountAction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  await getUserOrRedirect();
  await getActiveCompanyOrRedirect();

  const existing = await getAccount(id);
  if (!existing) {
    return { ok: false, error: "Conta não encontrada." };
  }

  const parsed = updateAccountSchema.safeParse({
    name: formData.get("name"),
    kind: formData.get("kind"),
    opening_balance: formData.get("opening_balance"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Confira os dados informados.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  try {
    await updateAccountDb(id, {
      name: parsed.data.name,
      kind: parsed.data.kind,
      opening_balance: parsed.data.opening_balance,
    });
  } catch {
    return {
      ok: false,
      error: "Não foi possível salvar a conta.",
    };
  }

  revalidatePath("/accounts");
  redirect("/accounts");
}

/**
 * Arquiva/desarquiva conta. Usado em <form action=...>, então retorna void
 * e ignora resultado (campos vêm do formulário interno do botão).
 */
export async function toggleAccountArchivedAction(
  formData: FormData,
): Promise<void> {
  await getUserOrRedirect();
  await getActiveCompanyOrRedirect();

  const parsed = archiveAccountSchema.safeParse({
    id: formData.get("id"),
    archived: formData.get("archived"),
  });
  if (!parsed.success) return;

  try {
    await setArchivedDb(parsed.data.id, parsed.data.archived);
  } catch {
    return;
  }
  revalidatePath("/accounts");
}

// ── Transferência entre contas ────────────────────────────────────────────────

export async function createTransferAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await getUserOrRedirect();
  await getActiveCompanyOrRedirect();

  const parsed = createTransferSchema.safeParse({
    from_account_id: formData.get("from_account_id"),
    to_account_id: formData.get("to_account_id"),
    amount: formData.get("amount"),
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

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("create_transfer", {
    _from_account_id: parsed.data.from_account_id,
    _to_account_id: parsed.data.to_account_id,
    _amount: parsed.data.amount,
    _occurred_on: parsed.data.occurred_on,
    _description: parsed.data.description || "Transferência entre contas",
  });

  if (error) {
    const msg = (error.message ?? "").toLowerCase();
    if (msg.includes("same_account")) {
      return { ok: false, error: "Origem e destino devem ser diferentes." };
    }
    if (msg.includes("invalid_amount")) {
      return { ok: false, error: "Valor inválido." };
    }
    if (msg.includes("unauthorized") || msg.includes("account_not_found")) {
      return { ok: false, error: "Conta inválida." };
    }
    return { ok: false, error: "Não foi possível registrar a transferência." };
  }

  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  redirect("/accounts");
}

// ── Ajuste de saldo ───────────────────────────────────────────────────────────

export async function createBalanceAdjustmentAction(
  accountId: string,
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await getUserOrRedirect();
  await getActiveCompanyOrRedirect();

  const parsed = adjustBalanceSchema.safeParse({
    account_id: accountId,
    target_balance: formData.get("target_balance"),
    occurred_on: formData.get("occurred_on"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Confira os dados informados.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("create_balance_adjustment", {
    _account_id: parsed.data.account_id,
    _target_balance: parsed.data.target_balance,
    _occurred_on: parsed.data.occurred_on,
    _reason: parsed.data.reason || "",
  });

  if (error) {
    const msg = (error.message ?? "").toLowerCase();
    if (msg.includes("unauthorized") || msg.includes("account_not_found")) {
      return { ok: false, error: "Conta inválida." };
    }
    return { ok: false, error: "Não foi possível ajustar o saldo." };
  }

  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  redirect("/accounts");
}
