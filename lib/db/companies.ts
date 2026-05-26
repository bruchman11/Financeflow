import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MemberRole } from "@/lib/types/database";

export type UserCompany = {
  id: string;
  name: string;
  legal_name: string | null;
  role: MemberRole;
};

/**
 * Lista as empresas das quais o usuário atual é membro.
 * RLS já filtra; aqui só ordenamos e formatamos.
 */
export async function listUserCompanies(): Promise<UserCompany[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("company_members")
    .select("role, company:companies (id, name, legal_name)")
    .order("created_at", { ascending: true });

  if (error) throw error;
  if (!data) return [];

  return data
    .filter((row): row is typeof row & { company: NonNullable<typeof row.company> } =>
      row.company !== null,
    )
    .map((row) => ({
      id: row.company.id,
      name: row.company.name,
      legal_name: row.company.legal_name,
      role: row.role,
    }));
}

/**
 * Confirma que o usuário atual é membro da empresa informada.
 * Usado para validar o cookie ff_active_company a cada request.
 */
export async function isCurrentUserMember(companyId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) return false;
  return data !== null;
}

/**
 * Busca uma empresa específica (com o papel do usuário).
 * Retorna null se o usuário não for membro.
 */
export async function getCompanyForUser(
  companyId: string,
): Promise<UserCompany | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("company_members")
    .select("role, company:companies (id, name, legal_name)")
    .eq("company_id", companyId)
    .maybeSingle();

  if (error || !data || !data.company) return null;

  return {
    id: data.company.id,
    name: data.company.name,
    legal_name: data.company.legal_name,
    role: data.role,
  };
}
