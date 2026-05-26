import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Download, Upload } from "lucide-react";

export const metadata: Metadata = { title: "Movimentações — FinanceFlow" };
import { buttonVariants } from "@/components/ui/button";
import { listTransactions } from "@/lib/db/transactions";
import { formatBRL } from "@/lib/format/currency";
import { formatWeekday } from "@/lib/format/date";
import { cn } from "@/lib/utils";

// ── helpers de período ────────────────────────────────────────────────────────

function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthRange(mes: string): { from: string; to: string } {
  const [y, m] = mes.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0); // dia 0 do mês seguinte = último dia do mês
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: fmt(first), to: fmt(last) };
}

function adjacentMonth(mes: string, delta: number): string {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(mes: string): string {
  const [y, m] = mes.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(y, m - 1, 1));
}

// ── página ────────────────────────────────────────────────────────────────────

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const params = await searchParams;
  const defaultMes = currentYearMonth();
  const mes =
    /^\d{4}-\d{2}$/.test(params.mes ?? "") ? (params.mes as string) : defaultMes;

  const { from, to } = monthRange(mes);
  const transactions = await listTransactions({ from, to });

  // Sumário — usamos Number() só para soma de exibição (nunca para persistência)
  let totalIncome = 0;
  let totalExpense = 0;
  for (const tx of transactions) {
    const v = Number(tx.amount);
    if (tx.type === "income") totalIncome += v;
    else totalExpense += v;
  }
  const balance = totalIncome - totalExpense;

  // Agrupa por dia, ordem desc
  const byDay = new Map<string, typeof transactions>();
  for (const tx of transactions) {
    const list = byDay.get(tx.occurred_on) ?? [];
    list.push(tx);
    byDay.set(tx.occurred_on, list);
  }
  const days = Array.from(byDay.keys()).sort((a, b) => (a < b ? 1 : -1));

  const prevMes = adjacentMonth(mes, -1);
  const nextMes = adjacentMonth(mes, 1);
  const isCurrentMonth = mes === defaultMes;

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* Navegação de mês */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background sticky top-0 z-10">
        <Link
          href={`/transactions?mes=${prevMes}`}
          className="size-9 inline-flex items-center justify-center rounded-md hover:bg-muted transition-colors"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <span className="text-sm font-semibold capitalize">
          {monthLabel(mes)}
        </span>
        <Link
          href={`/transactions?mes=${nextMes}`}
          aria-label="Próximo mês"
          aria-disabled={isCurrentMonth}
          className={cn(
            "size-9 inline-flex items-center justify-center rounded-md transition-colors",
            isCurrentMonth
              ? "text-muted-foreground/30 pointer-events-none"
              : "hover:bg-muted",
          )}
        >
          <ChevronRight className="size-5" />
        </Link>
      </div>

      {/* Ações secundárias — exportar / importar */}
      <div className="flex items-center justify-end gap-4 px-4 py-2 border-b border-border bg-background">
        <a
          href={`/api/transactions/export?mes=${mes}`}
          download
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Download className="size-3.5" />
          Exportar
        </a>
        <Link
          href="/transactions/import"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Upload className="size-3.5" />
          Importar
        </Link>
      </div>

      {/* Sumário do período */}
      <div className="grid grid-cols-3 border-b border-border">
        <div className="flex flex-col items-center py-3 gap-0.5 border-r border-border">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
            Entradas
          </span>
          <span className="text-sm font-semibold text-emerald-600">
            {formatBRL(totalIncome)}
          </span>
        </div>
        <div className="flex flex-col items-center py-3 gap-0.5 border-r border-border">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
            Saídas
          </span>
          <span className="text-sm font-semibold text-destructive">
            {formatBRL(totalExpense)}
          </span>
        </div>
        <div className="flex flex-col items-center py-3 gap-0.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
            Saldo
          </span>
          <span
            className={cn(
              "text-sm font-semibold",
              balance >= 0 ? "text-emerald-600" : "text-destructive",
            )}
          >
            {balance < 0 ? "−" : ""}
            {formatBRL(Math.abs(balance))}
          </span>
        </div>
      </div>

      {/* Lista ou empty state */}
      <div className="flex-1 overflow-y-auto pb-24">
        {days.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <p className="text-sm font-medium">Nenhuma movimentação</p>
            <p className="text-xs text-muted-foreground">
              Toque no + para lançar a primeira movimentação do período.
            </p>
          </div>
        ) : (
          <ul>
            {days.map((day) => {
              const txs = byDay.get(day)!;
              return (
                <li key={day}>
                  {/* Cabeçalho do dia */}
                  <div className="px-4 py-1.5 bg-muted/50 border-b border-border">
                    <span className="text-[11px] text-muted-foreground capitalize">
                      {formatWeekday(day)}
                    </span>
                  </div>
                  {/* Transações do dia */}
                  <ul className="divide-y divide-border">
                    {txs.map((tx) => (
                      <li key={tx.id}>
                        <Link
                          href={`/transactions/${tx.id}/edit`}
                          className="flex items-center gap-3 px-4 py-3 min-h-[60px] hover:bg-muted transition-colors"
                        >
                          {/* Bolinha de cor da categoria */}
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
                            <p className="text-xs text-muted-foreground truncate">
                              {tx.accounts?.name ?? ""}
                              {tx.categories?.name
                                ? ` · ${tx.categories.name}`
                                : ""}
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
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* FAB — nova movimentação */}
      <Link
        href="/transactions/new"
        aria-label="Nova movimentação"
        className={buttonVariants({
          className:
            "fixed bottom-[88px] right-4 size-14 rounded-full shadow-lg !p-0 flex items-center justify-center",
        })}
      >
        <Plus className="size-6" />
      </Link>
    </div>
  );
}
