import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, CheckCircle2, Plus } from "lucide-react";
import {
  ACTIVE_COMPANY_COOKIE,
  getUserOrRedirect,
} from "@/lib/auth/current";
import { cookies } from "next/headers";
import { listUserCompanies } from "@/lib/db/companies";
import { buttonVariants } from "@/components/ui/button";
import { signOutAction } from "@/app/(auth)/actions";
import { setActiveCompanyFormAction } from "./actions";
import { cn } from "@/lib/utils";

const roleLabel = {
  owner: "Dono",
  admin: "Admin",
  member: "Membro",
} as const;

export default async function CompaniesPage() {
  const user = await getUserOrRedirect();
  const companies = await listUserCompanies();

  if (companies.length === 0) {
    redirect("/companies/new");
  }

  const activeId = (await cookies()).get(ACTIVE_COMPANY_COOKIE)?.value ?? null;

  return (
    <main className="flex-1 flex flex-col px-6 py-8 gap-6">
      <header className="space-y-1">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">
          FinanceFlow
        </p>
        <h1 className="text-2xl font-semibold">Suas empresas</h1>
        <p className="text-sm text-muted-foreground">
          Selecione qual empresa você quer usar agora.
        </p>
      </header>

      <ul className="space-y-2">
        {companies.map((c) => {
          const isActive = c.id === activeId;
          return (
            <li key={c.id}>
              <form action={setActiveCompanyFormAction}>
                <input type="hidden" name="company_id" value={c.id} />
                <button
                  type="submit"
                  className={cn(
                    "w-full text-left rounded-lg border bg-card p-4 flex items-center gap-3 transition-colors",
                    "hover:bg-muted active:translate-y-px",
                    isActive ? "border-primary" : "border-border",
                  )}
                >
                  <div className="size-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <Building2 className="size-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {roleLabel[c.role]}
                      {c.legal_name ? ` · ${c.legal_name}` : ""}
                    </p>
                  </div>
                  {isActive ? (
                    <CheckCircle2 className="size-5 text-primary shrink-0" />
                  ) : null}
                </button>
              </form>
            </li>
          );
        })}
      </ul>

      <Link
        href="/companies/new"
        className={buttonVariants({
          variant: "outline",
          className: "h-12 text-base w-full",
        })}
      >
        <Plus className="size-4" />
        Nova empresa
      </Link>

      <div className="mt-auto pt-4 border-t border-border flex items-center justify-between text-sm">
        <span className="text-muted-foreground truncate">{user.email}</span>
        <form action={signOutAction}>
          <button
            type="submit"
            className="text-muted-foreground hover:text-foreground underline"
          >
            Sair
          </button>
        </form>
      </div>
    </main>
  );
}
