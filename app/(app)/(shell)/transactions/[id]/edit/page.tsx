import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { listAccounts } from "@/lib/db/accounts";
import { listCategories } from "@/lib/db/categories";
import { getTransaction } from "@/lib/db/transactions";
import { formatNumber } from "@/lib/format/currency";
import { TransactionForm } from "../../TransactionForm";
import { DeleteTransactionButton } from "../../DeleteTransactionButton";
import {
  updateTransactionAction,
  deleteTransactionAction,
} from "../../actions";

export default async function EditTransactionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [transaction, accounts, categories] = await Promise.all([
    getTransaction(id),
    listAccounts(),
    listCategories(),
  ]);

  if (!transaction) notFound();

  // .bind parcializa o id — resultado tem a assinatura (prev, formData) esperada pelo form
  const boundUpdate = updateTransactionAction.bind(null, id);

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
        <h1 className="text-xl font-semibold">Editar movimentação</h1>
      </header>

      <TransactionForm
        action={boundUpdate}
        accounts={accounts}
        categories={categories}
        defaultValues={{
          type: transaction.type,
          // Formata "1234.56" → "1.234,56" para exibição no input
          amount: formatNumber(transaction.amount),
          account_id: transaction.account_id,
          category_id: transaction.category_id,
          occurred_on: transaction.occurred_on,
          competence_date: transaction.competence_date,
          description: transaction.description,
        }}
        submitLabel="Salvar alterações"
      />

      <DeleteTransactionButton
        transactionId={id}
        deleteAction={deleteTransactionAction}
      />
    </main>
  );
}
