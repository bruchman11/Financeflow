import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { listAccounts } from "@/lib/db/accounts";
import { todayISO } from "@/lib/format/date";
import { buttonVariants } from "@/components/ui/button";
import { TransferForm } from "./TransferForm";

export const metadata: Metadata = {
  title: "Transferir entre contas — FinanceFlow",
};

export default async function TransferPage() {
  const accounts = await listAccounts({ includeArchived: false });

  if (accounts.length < 2) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 gap-4 text-center">
        <p className="text-sm font-medium">
          São necessárias pelo menos 2 contas para transferir
        </p>
        <p className="text-xs text-muted-foreground max-w-xs">
          Cadastre uma segunda conta para registrar transferências entre
          elas.
        </p>
        <Link
          href="/accounts/new"
          className={buttonVariants({ variant: "outline", className: "h-12" })}
        >
          Criar conta
        </Link>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col px-4 py-4 gap-6">
      <header className="flex items-center gap-2">
        <Link
          href="/accounts"
          className="size-9 inline-flex items-center justify-center rounded-md hover:bg-muted -ml-1"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-xl font-semibold">Transferir entre contas</h1>
      </header>

      <TransferForm accounts={accounts} defaultDate={todayISO()} />
    </main>
  );
}
