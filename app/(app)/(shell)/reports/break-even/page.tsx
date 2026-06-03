import type { Metadata } from "next";
import { Scale } from "lucide-react";
import { getBreakEven } from "@/lib/db/reports";
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

export const metadata: Metadata = {
  title: "Ponto de equilíbrio — FinanceFlow",
};

function parseMC(input: string | undefined): number {
  const raw = (input ?? "").trim().replace(",", ".");
  const n = parseFloat(raw);
  if (!Number.isFinite(n) || n <= 0 || n > 100) return 30;
  return n;
}

export default async function BreakEvenPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; mc?: string }>;
}) {
  const sp = await searchParams;
  const defaultMes = currentYearMonth();
  const mes = /^\d{4}-\d{2}$/.test(sp.mes ?? "") ? sp.mes! : defaultMes;
  const mc = parseMC(sp.mc);

  const { from, to } = monthRange(mes);
  const result = await getBreakEven({
    from,
    to,
    contributionMarginPct: mc,
  });

  const prevMes = adjacentMonth(mes, -1);
  const nextMes = adjacentMonth(mes, 1);
  const isCurrentMonth = mes === defaultMes;
  const buildHref = (m: string, mcVal: number) =>
    `/reports/break-even?mes=${m}&mc=${mcVal}`;

  const reachedBreakEven = result.currentRevenue >= result.breakEvenRevenue;
  const progressPct =
    result.breakEvenRevenue > 0
      ? Math.min(100, (result.currentRevenue / result.breakEvenRevenue) * 100)
      : 0;

  return (
    <main className="flex-1 flex flex-col pb-6">
      <PageHeader title="Ponto de equilíbrio" backHref="/reports" />

      {/* Mês */}
      <MonthNav
        label={monthLabel(mes)}
        prevHref={buildHref(prevMes, mc)}
        nextHref={buildHref(nextMes, mc)}
        nextDisabled={isCurrentMonth}
      />

      {/* MC input via GET form */}
      <form
        action="/reports/break-even"
        method="GET"
        className="px-4 py-4 border-b border-border space-y-2"
      >
        <input type="hidden" name="mes" value={mes} />
        <label
          htmlFor="mc"
          className="text-xs uppercase tracking-wider text-muted-foreground"
        >
          Margem de contribuição (%)
        </label>
        <div className="flex gap-2">
          <input
            id="mc"
            name="mc"
            type="number"
            min={1}
            max={100}
            step={0.1}
            defaultValue={mc}
            className="h-12 px-3 rounded-md border border-input bg-background text-base w-32 tabular-nums"
          />
          <button
            type="submit"
            className="h-12 px-4 rounded-md bg-foreground text-background text-sm font-medium"
          >
            Recalcular
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Percentual da receita que sobra após os custos variáveis. Para
          PMEs típicas, costuma ficar entre 20% e 50%.
        </p>
      </form>

      {/* Resultado */}
      <div className="px-4 py-6">
        <div className="surface p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "size-10 rounded-full flex items-center justify-center",
                reachedBreakEven
                  ? "bg-income/15 text-income"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
              )}
            >
              <Scale className="size-5" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Faturamento necessário
              </p>
              <p className="text-2xl font-bold tabular-nums">
                {formatBRL(result.breakEvenRevenue)}
              </p>
            </div>
          </div>

          {/* Barra de progresso */}
          <div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>
                Atual: {formatBRL(result.currentRevenue)}
              </span>
              <span className="tabular-nums">{progressPct.toFixed(0)}%</span>
            </div>
            <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all",
                  reachedBreakEven ? "bg-positive" : "bg-warning",
                )}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Gap */}
          <div
            className={cn(
              "rounded-lg border px-3 py-3",
              reachedBreakEven
                ? "border-positive/30 bg-positive/10"
                : "border-warning/30 bg-warning/10",
            )}
          >
            <p
              className={cn(
                "text-xs font-medium",
                reachedBreakEven
                  ? "text-income"
                  : "text-amber-700 dark:text-amber-400",
              )}
            >
              {reachedBreakEven
                ? `Você ultrapassou o PE em ${formatBRL(-result.gap)}.`
                : `Faltam ${formatBRL(result.gap)} para atingir o PE.`}
            </p>
          </div>
        </div>
      </div>

      {/* Detalhe */}
      <div className="px-4">
        <div className="surface divide-y divide-border">
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              Despesas fixas no período
            </span>
            <span className="text-sm font-semibold tabular-nums">
              {formatBRL(result.fixedExpenses)}
            </span>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              Margem de contribuição
            </span>
            <span className="text-sm font-semibold tabular-nums">
              {result.contributionMarginPct.toFixed(1)}%
            </span>
          </div>
          <div className="px-4 py-3 text-xs text-muted-foreground">
            <strong className="text-foreground">Fórmula:</strong> faturamento
            de equilíbrio = despesas fixas ÷ margem de contribuição. As
            despesas fixas vêm do somatório de Despesas + Impostos no DRE
            do período (regime de caixa).
          </div>
        </div>
      </div>
    </main>
  );
}
