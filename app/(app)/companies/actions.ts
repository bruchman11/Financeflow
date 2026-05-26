"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ZodError } from "zod";
import {
  clearActiveCompanyCookie,
  getUserOrRedirect,
  setActiveCompanyCookie,
} from "@/lib/auth/current";
import { isCurrentUserMember } from "@/lib/db/companies";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createCompanySchema,
  setActiveCompanySchema,
} from "@/lib/validation/company";

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

/**
 * Cria uma nova empresa via RPC create_company_with_defaults.
 * A função SQL cuida do owner, conta "Caixa" e categorias padrão de forma atômica.
 * Em sucesso, define a empresa como ativa e redireciona para /dashboard.
 */
export async function createCompanyAction(
  formData: FormData,
): Promise<ActionResult> {
  await getUserOrRedirect();

  const parsed = createCompanySchema.safeParse({
    name: formData.get("name"),
    legal_name: formData.get("legal_name"),
    tax_id: formData.get("tax_id"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Confira os dados informados.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: companyId, error } = await supabase.rpc(
    "create_company_with_defaults",
    {
      _name: parsed.data.name,
      _legal_name: parsed.data.legal_name || null,
      _tax_id: parsed.data.tax_id || null,
    },
  );

  if (error || !companyId) {
    return {
      ok: false,
      error: "Não foi possível criar a empresa. Tente novamente.",
    };
  }

  await setActiveCompanyCookie(companyId);
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/**
 * Define a empresa ativa. Valida que o usuário é membro.
 */
export async function setActiveCompanyAction(
  formData: FormData,
): Promise<ActionResult> {
  await getUserOrRedirect();

  const parsed = setActiveCompanySchema.safeParse({
    company_id: formData.get("company_id"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Empresa inválida." };
  }

  const isMember = await isCurrentUserMember(parsed.data.company_id);
  if (!isMember) {
    return { ok: false, error: "Você não tem acesso a essa empresa." };
  }

  await setActiveCompanyCookie(parsed.data.company_id);
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/**
 * Wrapper para usar `setActiveCompanyAction` direto em `<form action=...>`.
 * Forms exigem assinatura `(formData) => void | Promise<void>`.
 * Em caso de sucesso o action chama redirect(); um eventual ActionResult de erro
 * é descartado aqui (esse caminho só falha se o cookie/company_id forem inválidos,
 * o que já está protegido por RLS no próximo request).
 */
export async function setActiveCompanyFormAction(
  formData: FormData,
): Promise<void> {
  await setActiveCompanyAction(formData);
}

/**
 * Limpa a empresa ativa (usado em "trocar empresa" no header).
 */
export async function clearActiveCompanyAction() {
  await clearActiveCompanyCookie();
  revalidatePath("/", "layout");
  redirect("/companies");
}

