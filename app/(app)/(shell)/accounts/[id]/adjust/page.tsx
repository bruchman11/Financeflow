import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAccount } from "@/lib/db/accounts";
import { getAccountBalances } from "@/lib/db/dashboard";
import { todayISO } from "@/lib/format/date";
import { AdjustBalanceForm } from "./AdjustBalanceForm";

export const metadata: Metadata = {
  title: "Ajustar saldo — FinanceFlow",
};

export default async function AdjustBalancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [account, balances] = await Promise.all([
    getAccount(id),
    getAccountBalances(),
  ]);
  if (!account) notFound();

  const balance = balances.find((b) => b.id === id);
  const currentBalance = balance?.currentBalance ?? Number(account.opening_balance);

  return (
    <main className="flex-1 flex flex-col px-4 py-4 gap-6">
      <header className="flex items-center gap-2">
        <Link
          href={`/accounts/${id}/edit`}
          className="size-9 inline-flex items-center justify-center rounded-md hover:bg-muted -ml-1"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-xl font-semibold">Ajustar saldo</h1>
      </header>

      <AdjustBalanceForm
        accountId={account.id}
        accountName={account.name}
        currentBalance={currentBalance}
        defaultDate={todayISO()}
      />
    </main>
  );
}
