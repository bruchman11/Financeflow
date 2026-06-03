import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { listAccounts } from "@/lib/db/accounts";
import { listCategories } from "@/lib/db/categories";
import { getFixedExpense } from "@/lib/db/fixed_expenses";
import { formatNumber } from "@/lib/format/currency";
import { FixedExpenseForm } from "../../FixedExpenseForm";
import { updateFixedExpenseAction } from "../../actions";

export default async function EditFixedExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [fx, accounts, categories] = await Promise.all([
    getFixedExpense(id),
    listAccounts({ includeArchived: false }),
    listCategories({ includeArchived: false }),
  ]);

  if (!fx) notFound();

  const bound = updateFixedExpenseAction.bind(null, id);

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
        <h1 className="text-xl font-semibold truncate">{fx.description}</h1>
      </header>

      <FixedExpenseForm
        action={bound}
        accounts={accounts}
        categories={categories}
        defaultValues={{
          description: fx.description,
          amount: formatNumber(fx.amount),
          frequency: fx.frequency,
          custom_interval_days: fx.custom_interval_days,
          next_due_date: fx.next_due_date,
          category_id: fx.category_id,
          default_account_id: fx.default_account_id,
          notes: fx.notes,
        }}
        submitLabel="Salvar alterações"
      />
    </main>
  );
}
