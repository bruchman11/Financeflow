import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { listAccounts } from "@/lib/db/accounts";
import { getFixedExpense } from "@/lib/db/fixed_expenses";
import { formatNumber } from "@/lib/format/currency";
import { todayISO } from "@/lib/format/date";
import { PayForm } from "./PayForm";

export default async function PayFixedExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [fx, accounts] = await Promise.all([
    getFixedExpense(id),
    listAccounts({ includeArchived: false }),
  ]);

  if (!fx) notFound();

  if (fx.status !== "active") {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 gap-3 text-center">
        <p className="text-sm font-medium">Despesa fixa inativa</p>
        <p className="text-xs text-muted-foreground">
          Reative a despesa antes de registrar pagamento.
        </p>
        <Link
          href="/fixed-expenses"
          className="text-sm underline text-muted-foreground"
        >
          Voltar
        </Link>
      </main>
    );
  }

  if (accounts.length === 0) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 gap-3 text-center">
        <p className="text-sm font-medium">Nenhuma conta disponível</p>
        <p className="text-xs text-muted-foreground">
          Crie uma conta financeira para registrar pagamentos.
        </p>
        <Link href="/accounts/new" className="text-sm underline">
          Criar conta
        </Link>
      </main>
    );
  }

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
        <h1 className="text-xl font-semibold">Informar pagamento</h1>
      </header>

      <PayForm
        fixedExpense={fx}
        accounts={accounts}
        formattedAmount={formatNumber(fx.amount)}
        defaultDate={todayISO()}
      />
    </main>
  );
}
