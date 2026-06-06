import type { Metadata } from "next";
import { NativeSelect } from "@/components/ui/native-select";
import { TrendingUp } from "lucide-react";
import { listAccounts } from "@/lib/db/accounts";
import { EmptyState } from "@/components/ui/empty-state";
import { getCashFlow } from "@/lib/db/reports";
import { formatBRL } from "@/lib/format/currency";
import { cn } from "@/lib/utils";
import {
  adjacentMonth,
  currentYearMonth,
  monthLabel,
  monthRange,
} from "../_helpers";
import { PageHeader } from "@/components/shell/PageHeader";
import { MonthNav } from "@/components/shell/MonthNav";
import { CashFlowChartLoader } from "./CashFlowChartLoader";

export const metadata: Metadata = {
  title: "Fluxo de caixa — FinanceFlow",
};

export default async function CashFlowPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; account?: string }>;
}) {
  const sp = await searchParams;
  const defaultMes = currentYearMonth();
  const mes = /^\d{4}-\d{2}$/.test(sp.mes ?? "") ? sp.mes! : defaultMes;
  const accountId = sp.account ?? null;

  const { from, to } = monthRange(mes);

  const [accounts, cashFlow] = await Promise.all([
    listAccounts({ includeArchived: false }),
    getCashFlow({ from, to, accountId }),
  ]);

  const prevMes = adjacentMonth(mes, -1);
  const nextMes = adjacentMonth(mes, 1);
  const isCurrentMonth = mes === defaultMes;

  const buildHref = (m: string, a: string | null) =>
    `/reports/cash-flow?mes=${m}${a ? `&account=${a}` : ""}`;

  return (
    <main className="flex-1 flex flex-col pb-6">
      <PageHeader title="Fluxo de caixa" backHref="/reports" />

      {/* Mês */}
      <MonthNav
        label={monthLabel(mes)}
        prevHref={buildHref(prevMes, accountId)}
        nextHref={buildHref(nextMes, accountId)}
        nextDisabled={isCurrentMonth}
      />

      {/* Filtro de conta */}
      <div className="px-4 py-3 border-b border-border space-y-1.5">
        <label
          htmlFor="account"
          className="text-xs uppercase tracking-wider text-muted-foreground"
        >
          Conta
        </label>
        <form action="" className="contents">
          <input type="hidden" name="mes" value={mes} />
          <NativeSelect
            id="account"
            name="account"
            defaultValue={accountId ?? ""}
          >
            <option value="">Todas (consolidado)</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </NativeSelect>
        </form>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 border-b border-border">
        <div className="flex flex-col items-center py-3 gap-0.5 border-r border-border">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
            Entradas
          </span>
          <span className="text-sm font-semibold text-income tabular-nums">
            {formatBRL(cashFlow.totalIncome)}
          </span>
        </div>
        <div className="flex flex-col items-center py-3 gap-0.5 border-r border-border">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
            Saídas
          </span>
          <span className="text-sm font-semibold text-expense tabular-nums">
            {formatBRL(cashFlow.totalExpense)}
          </span>
        </div>
        <div className="flex flex-col items-center py-3 gap-0.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
            Saldo
          </span>
          <span
            className={cn(
              "text-sm font-semibold tabular-nums",
              cashFlow.balance >= 0 ? "text-positive" : "text-negative",
            )}
          >
            {cashFlow.balance < 0 ? "−" : ""}
            {formatBRL(Math.abs(cashFlow.balance))}
          </span>
        </div>
      </div>

      {/* Gráfico */}
      <div className="px-2 py-4">
        {cashFlow.points.length === 0 ? (
          <EmptyState
            compact
            className="rounded-lg border border-dashed border-border mx-2"
            icon={TrendingUp}
            title="Sem movimentações no período"
            description="Lance entradas e saídas para visualizar o fluxo aqui."
          />
        ) : (
          <CashFlowChartLoader points={cashFlow.points} />
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center px-4">
        {accountId
          ? "Mostrando todas as movimentações desta conta, incluindo transferências."
          : "Consolidado de todas as contas. Transferências internas excluídas."}
      </p>
    </main>
  );
}
