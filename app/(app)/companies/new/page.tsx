import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getUserOrRedirect } from "@/lib/auth/current";
import { listUserCompanies } from "@/lib/db/companies";
import { NewCompanyForm } from "./NewCompanyForm";

export default async function NewCompanyPage() {
  await getUserOrRedirect();
  const companies = await listUserCompanies();
  const hasAnyCompany = companies.length > 0;

  return (
    <main className="flex-1 flex flex-col px-6 py-8 gap-6">
      {hasAnyCompany ? (
        <Link
          href="/companies"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground self-start"
        >
          <ChevronLeft className="size-4" />
          Voltar
        </Link>
      ) : null}

      <header className="space-y-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">
          FinanceFlow
        </p>
        <h1 className="text-2xl font-semibold">
          {hasAnyCompany ? "Nova empresa" : "Crie sua primeira empresa"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Você poderá lançar entradas e saídas, organizar contas e ver o
          resultado por período. Categorias e uma conta &quot;Caixa&quot; são
          criadas automaticamente.
        </p>
      </header>

      <NewCompanyForm />
    </main>
  );
}
