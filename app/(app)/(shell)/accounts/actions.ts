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
