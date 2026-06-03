import type { Metadata } from "next";
import Link from "next/link";
import {
  Wallet,
  Plus,
  ArrowRight,
  FileText,
  CreditCard,
  Receipt,
  Calendar,
} from "lucide-react";

export const metadata: Metadata = { title: "Início — FinanceFlow" };
import { getActiveCompanyOrRedirect } from "@/lib/auth/current";
import {
  getTransactionsSummary,
  listTransactionsPage,
} from "@/lib/db/transactions";
import { getAccountBalances } from "@/lib/db/dashboard";
import { currentMonthRange } from "@/lib/format/date";
import { formatBRL } from "@/lib/format/currency";
import { formatBRShort } from "@/lib/format/date";
import { accountKindLabels } from "@/lib/validation/account";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Amount } from "@/components/ui/amount";
import { PageHeader } from "@/components/shell/PageHeader";

function currentMonthLabel(): string {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date());
}

const quickActions = [
  { href: "/bills", label: "Boletos", icon: FileText },
  { href: "/credit-cards", label: "Cartões", icon: CreditCard },
  { href: "/fixed-expenses", label: "Desp. fixas", icon: Receipt },
  { href: "/calendar", label: "Agenda", icon: Calendar },
];

export default async function DashboardPage() {
  const company = await getActiveCompanyOrRedirect();

  const { from, to } = currentMonthRange();

  // Resumo agregado + 5 últimas (sem carregar o mês inteiro)
  const [{ totalIncome, totalExpense, balance }, recent, accountBalances] =
    await Promise.all([
      getTransactionsSummary({ from, to }),
      listTransactionsPage({ from, to, pageSize: 5 }),
      getAccountBalances(),
    ]);

  const recentTxs = recent.rows;
  const totalBalance = accountBalances.reduce(
    (sum, a) => sum + a.currentBalance,
    0,
  );

  return (
    <main className="flex-1 flex flex-col px-4 py-5 gap-6 pb-6">
      {/* Cabeçalho */}
      <PageHeader
        eyebrow="Início"
        title={company.name}
        subtitle={currentMonthLabel()}
      />

      {/* KPI — saldo total em contas */}
      {accountBalances.length > 0 ? (
        <section
          aria-labelledby="total-balance-heading"
          className="rounded-2xl bg-gradient-to-br from-primary to-primary/85 px-5 py-5 text-primary-foreground shadow-[var(--shadow-card)]"
        >
          <h2
            id="total-balance-heading"
            className="text-xs uppercase tracking-wider text-primary-foreground/70 mb-1.5"
          >
            Saldo total em contas
          </h2>
          <p className="text-[2rem] leading-none font-bold tabular-nums">
            {totalBalance < 0 ? "−" : ""}
            {formatBRL(Math.abs(totalBalance))}
          </p>
        </section>
      ) : null}

      {/* Resumo do mês */}
      <section aria-labelledby="summary-heading">
        <h2
          id="summary-heading"
          className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-0.5"
        >
          Resumo do mês
        </h2>
        <div className="grid grid-cols-3 surface overflow-hidden">
          <div className="flex flex-col items-center py-4 gap-1 border-r border-border">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Entradas
            </span>
            <span className="text-sm font-semibold text-income tabular-nums">
              {formatBRL(totalIncome)}
            </span>
          </div>
          <div className="flex flex-col items-center py-4 gap-1 border-r border-border">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Saídas
            </span>
            <span className="text-sm font-semibold text-expense tabular-nums">
              {formatBRL(totalExpense)}
            </span>
          </div>
          <div className="flex flex-col items-center py-4 gap-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Saldo
            </span>
            <Amount value={balance} tone="result" className="text-base font-bold" />
          </div>
        </div>
      </section>

      {/* Ações rápidas */}
      <section aria-labelledby="quick-heading">
        <h2
          id="quick-heading"
          className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-0.5"
        >
          Ações rápidas
        </h2>
        <div className="grid grid-cols-4 gap-2">
          {quickActions.map((q) => {
            const Icon = q.icon;
            return (
              <Link
                key={q.href}
                href={q.href}
                className="surface flex flex-col items-center justify-center gap-1.5 min-h-[64px] py-3 text-[11px] font-medium text-center hover:bg-muted transition-colors"
              >
                <Icon className="size-5 text-muted-foreground" aria-hidden />
                <span className="leading-tight">{q.label}</span>
              </Link>
            );
          })}
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
          <ul className="surface divide-y divide-border overflow-hidden">
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
                  <Amount
                    value={a.currentBalance}
                    tone="account"
                    className="text-sm font-semibold shrink-0"
                  />
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
          <EmptyState
            compact
            className="rounded-xl border border-dashed border-border"
            title="Nenhuma movimentação no mês"
            description='Toque em "Lançar movimentação" para registrar a primeira.'
          />
        ) : (
          <ul className="surface divide-y divide-border overflow-hidden">
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
                        `var(--${tx.type === "income" ? "income" : "expense"})`,
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
                  <Amount
                    value={tx.amount}
                    tone={tx.type === "income" ? "income" : "expense"}
                    className="text-sm font-semibold shrink-0"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
