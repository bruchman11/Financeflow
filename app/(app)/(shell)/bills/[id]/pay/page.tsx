import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { listAccounts } from "@/lib/db/accounts";
import { getBill } from "@/lib/db/bills";
import { formatNumber } from "@/lib/format/currency";
import { todayISO } from "@/lib/format/date";
import { PayBillForm } from "./PayBillForm";

export default async function PayBillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [bill, accounts] = await Promise.all([
    getBill(id),
    listAccounts({ includeArchived: false }),
  ]);

  if (!bill) notFound();

  if (bill.status !== "pending") {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 gap-3 text-center">
        <p className="text-sm font-medium">
          {bill.status === "paid" ? "Boleto já pago" : "Boleto cancelado"}
        </p>
        <Link href="/bills" className="text-sm underline text-muted-foreground">
          Voltar
        </Link>
      </main>
    );
  }

  if (accounts.length === 0) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 gap-3 text-center">
        <p className="text-sm font-medium">Nenhuma conta disponível</p>
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
          href="/bills"
          className="size-9 inline-flex items-center justify-center rounded-md hover:bg-muted -ml-1"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-xl font-semibold">Informar pagamento</h1>
      </header>

      <PayBillForm
        bill={bill}
        accounts={accounts}
        formattedAmount={formatNumber(bill.amount)}
        defaultDate={todayISO()}
      />
    </main>
  );
}
