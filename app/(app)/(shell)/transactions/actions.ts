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
  listTransactionsPage,
  updateTransaction,
  type TransactionRegime,
  type TransactionsPage,
} from "@/lib/db/transactions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listAccounts } from "@/lib/db/accounts";
import { listCategories } from "@/lib/db/categories";
import { parseImportBuffer } from "@/lib/excel/transactions";
import {
  createTransactionSchema,
  updateTransactionSchema,
  deleteTransactionSchema,
} from "@/lib/validation/transaction";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export type LoadMorePayload = {
  from: string;
  to: string;
  regime: TransactionRegime;
  accountId: string | null;
  categoryId: string | null;
  type: "income" | "expense" | null;
  q: string | null;
  cursor: string;
};

/**
 * Carrega a próxima página de movimentações a partir de um cursor, preservando
 * os filtros aplicados. Leitura isolada por empresa via RLS.
 */
export async function loadMoreTransactionsAction(
  payload: LoadMorePayload,
): Promise<TransactionsPage> {
  await getUserOrRedirect();
  await getActiveCompanyOrRedirect();

  return listTransactionsPage({
    from: payload.from,
    to: payload.to,
    regime: payload.regime,
    accountId: payload.accountId,
    categoryId: payload.categoryId,
    type: payload.type,
    q: payload.q,
    cursor: payload.cursor,
  });
}

export type ImportResult =
  | { ok: "idle" }
  | { ok: true; inserted: number; skipped: number; errors: { row: number; message: string }[] }
  | { ok: false; error: string };

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
    competence_date: formData.get("competence_date"),
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
      ...(parsed.data.competence_date
        ? { competence_date: parsed.data.competence_date }
        : {}),
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
    competence_date: formData.get("competence_date"),
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
      ...(parsed.data.competence_date
        ? { competence_date: parsed.data.competence_date }
        : {}),
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

// ── Importação em massa ───────────────────────────────────────────────────────

export async function importTransactionsAction(
  prev: ImportResult,
  formData: FormData,
): Promise<ImportResult> {
  const user = await getUserOrRedirect();
  const company = await getActiveCompanyOrRedirect();

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0)
    return { ok: false, error: "Nenhum arquivo selecionado." };
  if (!file.name.match(/\.(xlsx|xls)$/i))
    return { ok: false, error: "Formato inválido. Envie um arquivo .xlsx ou .xls." };
  if (file.size > 5 * 1024 * 1024)
    return { ok: false, error: "Arquivo muito grande. Limite de 5 MB." };

  const buffer = await file.arrayBuffer();
  const { rows: parsedRows, errors: parseErrors } = parseImportBuffer(buffer);

  if (parsedRows.length === 0 && parseErrors.length === 0)
    return { ok: false, error: "Planilha sem dados. Verifique o arquivo." };

  const [accounts, categories] = await Promise.all([
    listAccounts({ includeArchived: false }),
    listCategories({ includeArchived: false }),
  ]);

  const accountByName = new Map(
    accounts.map((a) => [a.name.trim().toLowerCase(), a]),
  );
  const categoryByName = new Map(
    categories.map((c) => [c.name.trim().toLowerCase(), c]),
  );

  type TxInsert = {
    company_id: string;
    account_id: string;
    category_id: string | null;
    type: "income" | "expense";
    amount: string;
    description: string | null;
    occurred_on: string;
    created_by: string;
  };

  const toInsert: TxInsert[] = [];
  const rowErrors: { row: number; message: string }[] = [...parseErrors];

  for (const pr of parsedRows) {
    const account = accountByName.get(pr.accountName.toLowerCase());
    if (!account) {
      rowErrors.push({ row: 0, message: `Conta não encontrada: "${pr.accountName}"` });
      continue;
    }
    const category = pr.categoryName
      ? categoryByName.get(pr.categoryName.toLowerCase())
      : undefined;
    if (pr.categoryName && !category) {
      rowErrors.push({
        row: 0,
        message: `Categoria não encontrada: "${pr.categoryName}" — importado sem categoria.`,
      });
    }
    toInsert.push({
      company_id: company.id,
      account_id: account.id,
      category_id: category?.id ?? null,
      type: pr.type,
      amount: pr.amount,
      description: pr.description,
      occurred_on: pr.occurred_on,
      created_by: user.id,
    });
  }

  let inserted = 0;
  if (toInsert.length > 0) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("transactions").insert(toInsert);
    if (error) return { ok: false, error: "Erro ao gravar no banco. Tente novamente." };
    inserted = toInsert.length;
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");

  return {
    ok: true,
    inserted,
    skipped: parsedRows.length - inserted + parseErrors.length,
    errors: rowErrors,
  };
}
