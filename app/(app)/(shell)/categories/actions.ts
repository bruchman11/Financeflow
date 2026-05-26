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
  formData: FormData,
): Promise<ActionResult> {
  await getUserOrRedirect();
  const company = await getActiveCompanyOrRedirect();

  const parsed = createCategorySchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
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
    await insertCategory({
      company_id: company.id,
      name: parsed.data.name,
      type: parsed.data.type,
      color: parsed.data.color,
    });
  } catch {
    return {
      ok: false,
      error: "Não foi possível criar a categoria.",
    };
  }

  revalidatePath("/categories");
  redirect("/categories");
}

export async function updateCategoryAction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  await getUserOrRedirect();
  await getActiveCompanyOrRedirect();

  const existing = await getCategory(id);
  if (!existing) {
    return { ok: false, error: "Categoria não encontrada." };
  }

  const parsed = updateCategorySchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
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
    await updateCategoryDb(id, {
      name: parsed.data.name,
      type: parsed.data.type,
      color: parsed.data.color,
    });
  } catch {
    return {
      ok: false,
      error: "Não foi possível salvar a categoria.",
    };
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
