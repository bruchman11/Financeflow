"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ZodError } from "zod";
import {
  getActiveCompanyOrRedirect,
  getUserOrRedirect,
} from "@/lib/auth/current";
import {
  getCategory,
  getCategoryByCode,
  insertCategory,
  setCategoryArchived as setArchivedDb,
  updateCategory as updateCategoryDb,
} from "@/lib/db/categories";
import {
  archiveCategorySchema,
  createCategorySchema,
  updateCategorySchema,
} from "@/lib/validation/category";

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

export async function createCategoryAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await getUserOrRedirect();
  const company = await getActiveCompanyOrRedirect();

  const parsed = createCategorySchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    dre_type: formData.get("dre_type"),
    color: formData.get("color"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Confira os dados informados.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  // Verifica duplicata explícita para mensagem amigável
  const existing = await getCategoryByCode(parsed.data.code);
  if (existing) {
    return {
      ok: false,
      error: "Já existe uma categoria com este código.",
      fieldErrors: { code: "Código já em uso." },
    };
  }

  try {
    await insertCategory({
      company_id: company.id,
      code: parsed.data.code,
      name: parsed.data.name,
      dre_type: parsed.data.dre_type,
      color: parsed.data.color,
      // parent_id e level são resolvidos por triggers no banco
    });
  } catch (err) {
    // unique_violation defensivo (race condition)
    if (
      err instanceof Object &&
      "code" in err &&
      (err as { code: string }).code === "23505"
    ) {
      return {
        ok: false,
        error: "Código já em uso.",
        fieldErrors: { code: "Código já em uso." },
      };
    }
    return { ok: false, error: "Não foi possível criar a categoria." };
  }

  revalidatePath("/categories");
  redirect("/categories");
}

export async function updateCategoryAction(
  id: string,
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await getUserOrRedirect();
  await getActiveCompanyOrRedirect();

  const existing = await getCategory(id);
  if (!existing) {
    return { ok: false, error: "Categoria não encontrada." };
  }

  const parsed = updateCategorySchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    dre_type: formData.get("dre_type"),
    color: formData.get("color"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Confira os dados informados.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  // Se o código mudou, verifica duplicata
  if (parsed.data.code !== existing.code) {
    const dupe = await getCategoryByCode(parsed.data.code);
    if (dupe && dupe.id !== id) {
      return {
        ok: false,
        error: "Já existe outra categoria com este código.",
        fieldErrors: { code: "Código já em uso." },
      };
    }
  }

  try {
    await updateCategoryDb(id, {
      code: parsed.data.code,
      name: parsed.data.name,
      dre_type: parsed.data.dre_type,
      color: parsed.data.color,
    });
  } catch {
    return { ok: false, error: "Não foi possível salvar a categoria." };
  }

  revalidatePath("/categories");
  redirect("/categories");
}

export async function toggleCategoryArchivedAction(
  formData: FormData,
): Promise<void> {
  await getUserOrRedirect();
  await getActiveCompanyOrRedirect();

  const parsed = archiveCategorySchema.safeParse({
    id: formData.get("id"),
    archived: formData.get("archived"),
  });
  if (!parsed.success) return;

  try {
    await setArchivedDb(parsed.data.id, parsed.data.archived);
  } catch {
    return;
  }
  revalidatePath("/categories");
}
