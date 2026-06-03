import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { listAccounts } from "@/lib/db/accounts";
import { listCategories } from "@/lib/db/categories";
import { todayISO } from "@/lib/format/date";
import { FixedExpenseForm } from "../FixedExpenseForm";
import { createFixedExpenseAction } from "../actions";

export default async function NewFixedExpensePage() {
  const [accounts, categories] = await Promise.all([
    listAccounts({ includeArchived: false }),
    listCategories({ includeArchived: false }),
  ]);

  return (
    <main className="flex-1 flex flex-col px-4 py-4 gap-6">
      <header className="flex items-center gap-2">
        <Link
          href="/fixed-expenses"
          className="size-9 inline-flex items-center justify-center rounded-md hover:bg-muted -ml-1"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-xl font-semibold">Nova despesa fixa</h1>
      </header>

      <FixedExpenseForm
        action={createFixedExpenseAction}
        accounts={accounts}
        categories={categories}
        defaultValues={{
          frequency: "monthly",
          next_due_date: todayISO(),
        }}
        submitLabel="Criar despesa fixa"
      />
    </main>
  );
}
