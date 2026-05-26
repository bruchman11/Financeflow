import type { Metadata } from "next";
import Link from "next/link";
import { Wallet, Plus, ArrowRight } from "lucide-react";

export const metadata: Metadata = { title: "Início — FinanceFlow" };
import { getActiveCompanyOrRedirect } from "@/lib/auth/current";
import { listTransactions } from "@/lib/db/transactions";
import { getAccountBalances } from "@/lib/db/dashboard";
import { currentMonthRange } from "@/lib/format/date";
import { formatBRL } from "@/lib/format/currency";
import { formatBRShort } from "@/lib/format/date";
import { accountKindLabels } from "@/lib/validation/account";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function currentMonthLabel(): string {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date());
}

export default async function DashboardPage() {
  const company = await getActiveCompanyOrRedirect();

  const { from, to } = currentMonthRange();

  const [monthTxs, accountBalances] = await Promise.all([
    listTransactions({ from, to }),
    getAccountBalances(),
  ]);

  // Sumário do mês
  let totalIncome = 0;
  let totalExpense = 0;
  for (const tx of monthTxs) {
    const v = Number(tx.amount);
    if (tx.type === "income") totalIncome += v;
    else totalExpense += v;
  }
  const balance = totalIncome - totalExpense;

  // Últimas 5 movimentações
  const recentTxs = monthTxs.slice(0, 5);

  return (
    <main className="flex-1 flex flex-col px-4 py-5 gap-6 pb-6">
      {/* Cabeçalho */}
      <header className="space-y-0.5">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">
          Início
        </p>
        <h1 className="text-2xl font-bold leading-tight">{company.name}</h1>
        <p className="text-sm text-muted-foreground capitalize">
          {currentMonthLabel()}
        </p>
      </header>

      {/* Resumo do mês */}
      <section aria-labelledby="summary-heading">
        <h2
          id="summary-heading"
          className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-0.5"
        >
          Resumo do mês
        </h2>
        <div className="grid grid-cols-3 rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex flex-col items-center py-4 gap-1 border-r border-border">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Entradas
            </span>
            <span className="text-sm font-semibold text-emerald-600 tabular-nums">
              {formatBRL(totalIncome)}
            </span>
          </div>
          <div className="flex flex-col items-center py-4 gap-1 border-r border-border">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Saídas
            </span>
            <span className="text-sm font-semibold text-destructive tabular-nums">
              {formatBRL(totalExpense)}
            </span>
          </div>
          <div className="flex flex-col items-center py-4 gap-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Saldo
            </span>
            <span
              className={cn(
                "text-sm font-semibold tabular-nums",
                balance >= 0 ? "text-emerald-600" : "text-destructive",
              )}
            >
              {balance < 0 ? "−" : ""}
              {formatBRL(Math.abs(balance))}
            </span>
          </div>
        </div>
      </section>

      {/* CTA — lançamento rápido */}
      <Link
        href="/transactions/new"
        className={buttonVariants({
          className: "h-14 text-base w-full gap-2",
        })}
      >
        <Plus className="size-5" />
        Lançar movimentação
      </Link>

      {/* Contas */}
      {accountBalances.length > 0 ? (
        <section aria-labelledby="accounts-heading">
          <h2
            id="accounts-heading"
            className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-0.5"
          >
            Contas
          </h2>
          <ul className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
            {accountBalances.map((a) => (
              <li key={a.id}>
                <Link
                  href="/accounts"
                  className="flex items-center gap-3 px-4 py-3 min-h-[56px] hover:bg-muted transition-colors"
                >
                  <div className="size-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <Wallet className="size-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight truncate">
                      {a.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {accountKindLabels[a.kind]}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-sm font-semibold tabular-nums shrink-0",
                      a.currentBalance < 0
                        ? "text-destructive"
                        : "text-foreground",
                    )}
                  >
                    {a.currentBalance < 0 ? "−" : ""}
                    {formatBRL(Math.abs(a.currentBalance))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Últimas movimentações */}
      <section aria-labelledby="recent-heading">
        <div className="flex items-center justify-between mb-2 px-0.5">
          <h2
            id="recent-heading"
            className="text-xs text-muted-foreground uppercase tracking-wider"
          >
            Últimas movimentações
          </h2>
          <Link
            href="/transactions"
            className="text-xs text-muted-foreground flex items-center gap-0.5 hover:text-foreground transition-colors"
          >
            Ver todas
            <ArrowRight className="size-3" />
          </Link>
        </div>

        {recentTxs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center space-y-1">
            <p className="text-sm font-medium">Nenhuma movimentação no mês</p>
            <p className="text-xs text-muted-foreground">
              Toque em "Lançar movimentação" para registrar a primeira.
            </p>
          </div>
        ) : (
          <ul className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
            {recentTxs.map((tx) => (
              <li key={tx.id}>
                <Link
                  href={`/transactions/${tx.id}/edit`}
                  className="flex items-center gap-3 px-4 py-3 min-h-[56px] hover:bg-muted transition-colors"
                >
                  <div
                    className="size-3 rounded-full shrink-0"
                    style={{
                      backgroundColor:
                        tx.categories?.color ??
                        (tx.type === "income" ? "#22c55e" : "#ef4444"),
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug truncate">
                      {tx.description ||
                        tx.categories?.name ||
                        (tx.type === "income" ? "Entrada" : "Saída")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatBRShort(tx.occurred_on)}
                      {tx.accounts?.name ? ` · ${tx.accounts.name}` : ""}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-sm font-semibold shrink-0 tabular-nums",
                      tx.type === "income"
                        ? "text-emerald-600"
                        : "text-foreground",
                    )}
                  >
                    {tx.type === "expense" ? "−" : "+"}
                    {formatBRL(tx.amount)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
