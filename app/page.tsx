import { redirect } from "next/navigation";
import { getActiveCompany, getUser } from "@/lib/auth/current";

/**
 * Root route faz redirect inteligente:
 * - sem sessão → /login
 * - com sessão e com empresa ativa válida → /dashboard
 * - com sessão sem empresa ativa → /companies
 *
 * Como é app interno, não há landing page pública.
 */
export default async function HomePage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const company = await getActiveCompany();
  redirect(company ? "/dashboard" : "/companies");
}
