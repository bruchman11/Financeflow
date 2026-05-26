import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { listAccounts } from "@/lib/db/accounts";
import { listCategories } from "@/lib/db/categories";
import { todayISO } from "@/lib/format/date";
import { TransactionForm } from "../TransactionForm";
import { createTransactionAction } from "../actions";

export default async function NewTransactionPage() {
  const [accounts, categories] = await Promise.all([
    listAccounts(),
    listCategories(),
  ]);

  if (accounts.length === 0) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 gap-4 text-center">
        <p className="text-sm font-medium">Nenhuma conta disponível</p>
        <p className="text-xs text-muted-foreground">
          Crie ao menos uma conta antes de lançar movimentações.
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
          href="/transactions"
          className="size-9 inline-flex items-center justify-center rounded-md hover:bg-muted -ml-1"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-xl font-semibold">Nova movimentação</h1>
      </header>

      <TransactionForm
        action={createTransactionAction}
        accounts={accounts}
        categories={categories}
        defaultValues={{ occurred_on: todayISO() }}
        submitLabel="Lançar"
      />
    </main>
  );
}
