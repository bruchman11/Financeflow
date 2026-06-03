import type { Metadata } from "next";
import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import { getComparison, type PeriodTotals } from "@/lib/db/reports";
import { formatBRL } from "@/lib/format/currency";
import { cn } from "@/lib/utils";
import {
  adjacentMonth,
  currentYearMonth,
  monthLabel,
  monthRange,
} from "../_helpers";
import { PageHeader } from "@/components/shell/PageHeader";
import { RegimeToggle } from "@/components/shell/RegimeToggle";

export const metadata: Metadata = {
  title: "Comparativo — FinanceFlow",
};

const LABELS: Record<keyof PeriodTotals, string> = {
  income: "Entradas",
  expense: "Saídas",
  revenue: "Receitas (DRE)",
  cost: "Custos (DRE)",
  operatingExpense: "Despesas (DRE)",
  tax: "Impostos (DRE)",
  result: "Resultado",
};

const KEYS: (keyof PeriodTotals)[] = [
  "income",
  "expense",
  "revenue",
  "cost",
  "operatingExpense",
  "tax",
  "result",
];

const HIGHER_IS_BETTER: Record<keyof PeriodTotals, boolean> = {
  income: true,
  expense: false,
  revenue: true,
  cost: false,
  operatingExpense: false,
  tax: false,
  result: true,
};

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string; regime?: string }>;
}) {
  const sp = await searchParams;
  const defaultMes = currentYearMonth();
  const a = /^\d{4}-\d{2}$/.test(sp.a ?? "") ? sp.a! : defaultMes;
  const defaultB = adjacentMonth(a, -1);
  const b = /^\d{4}-\d{2}$/.test(sp.b ?? "") ? sp.b! : defaultB;
  const regime = sp.regime === "accrual" ? "accrual" : "cash";

  const aRange = monthRange(a);
  const bRange = monthRange(b);

  const data = await getComparison({
    a: aRange,
    b: bRange,
    regime,
  });

  const buildHref = (aM: string, bM: string, r: string) =>
    `/reports/compare?a=${aM}&b=${bM}${r === "accrual" ? "&regime=accrual" : ""}`;

  return (
    <main className="flex-1 flex flex-col pb-6">
      <PageHeader title="Comparativo" backHref="/reports" />

      {/* Regime */}
      <RegimeToggle
        value={regime}
        cashHref={buildHref(a, b, "cash")}
        accrualHref={buildHref(a, b, "accrual")}
      />

      {/* Seletores de período */}
      <div className="grid grid-cols-2 border-b border-border divide-x divide-border">
        <div className="p-3 flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Período A
          </span>
          <span className="text-sm font-semibold capitalize">
            {monthLabel(a)}
          </span>
          <div className="flex gap-2 mt-1">
            <Link
              href={buildHref(adjacentMonth(a, -1), b, regime)}
              className="text-xs underline text-muted-foreground"
            >
              ← anterior
            </Link>
            <Link
              href={buildHref(adjacentMonth(a, 1), b, regime)}
              className="text-xs underline text-muted-foreground"
            >
              próximo →
            </Link>
          </div>
        </div>
        <div className="p-3 flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Período B (base)
          </span>
          <span className="text-sm font-semibold capitalize">
            {monthLabel(b)}
          </span>
          <div className="flex gap-2 mt-1">
            <Link
              href={buildHref(a, adjacentMonth(b, -1), regime)}
              className="text-xs underline text-muted-foreground"
            >
              ← anterior
            </Link>
            <Link
              href={buildHref(a, adjacentMonth(b, 1), regime)}
              className="text-xs underline text-muted-foreground"
            >
              próximo →
            </Link>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="divide-y divide-border">
        {KEYS.map((key) => {
          const valA = data.a.totals[key];
          const valB = data.b.totals[key];
          const delta = data.deltas[key]!;
          const isHighlight = key === "result";
          const higherIsBetter = HIGHER_IS_BETTER[key];
          const positiveDelta = delta.abs > 0;
          const better = positiveDelta === higherIsBetter;
          const neutral = delta.abs === 0;
          return (
            <div
              key={key}
              className={cn(
                "px-4 py-3",
                isHighlight ? "bg-muted/50" : "",
              )}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={cn(
                    "text-xs font-medium",
                    isHighlight ? "font-semibold text-sm" : "",
                  )}
                >
                  {LABELS[key]}
                </span>
                {!neutral ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 text-[10px] font-semibold tabular-nums",
                      better ? "text-positive" : "text-negative",
                    )}
                  >
                    {better ? (
                      <TrendingUp className="size-3" />
                    ) : (
                      <TrendingDown className="size-3" />
                    )}
                    {positiveDelta ? "+" : ""}
                    {delta.pct.toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground">—</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm tabular-nums">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase block">
                    Atual
                  </span>
                  <span className="font-semibold">{formatBRL(valA)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase block">
                    Base
                  </span>
                  <span className="font-medium text-muted-foreground">
                    {formatBRL(valB)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
