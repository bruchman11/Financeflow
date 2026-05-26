import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCompanyForUser, type UserCompany } from "@/lib/db/companies";

export const ACTIVE_COMPANY_COOKIE = "ff_active_company";

/**
 * Retorna o usuário autenticado (ou null) no contexto de Server Components/Actions.
 * Usa supabase.auth.getUser() — valida o JWT contra o servidor Supabase,
 * mais seguro que getSession() (que confia em dados do cookie).
 */
export async function getUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Igual ao getUser, mas redireciona para /login quando não há sessão. */
export async function getUserOrRedirect() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Lê o cookie da empresa ativa e valida a membership atual.
 * Retorna null se o cookie está ausente, expirado ou se o usuário não é mais membro.
 * Quando inválido, também limpa o cookie.
 */
export async function getActiveCompany(): Promise<UserCompany | null> {
  const cookieStore = await cookies();
  const id = cookieStore.get(ACTIVE_COMPANY_COOKIE)?.value;
  if (!id) return null;

  const company = await getCompanyForUser(id);
  if (!company) {
    try {
      cookieStore.delete(ACTIVE_COMPANY_COOKIE);
    } catch {
      // cookies podem ser read-only em Server Components puros; ok ignorar.
    }
    return null;
  }
  return company;
}

/** Redireciona para /companies quando não há empresa ativa válida. */
export async function getActiveCompanyOrRedirect(): Promise<UserCompany> {
  const company = await getActiveCompany();
  if (!company) redirect("/companies");
  return company;
}

/**
 * Define a empresa ativa via cookie httpOnly.
 * Chamado por Server Actions; o caller é responsável por validar membership antes.
 */
export async function setActiveCompanyCookie(companyId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_COMPANY_COOKIE, companyId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 ano
  });
}

export async function clearActiveCompanyCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_COMPANY_COOKIE);
}
