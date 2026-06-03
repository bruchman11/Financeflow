import type { Metadata } from "next";
import { getDre } from "@/lib/db/reports";
import {
  adjacentMonth,
  currentYearMonth,
  monthLabel,
  monthRange,
} from "../_helpers";
import { PageHeader } from "@/components/shell/PageHeader";
import { MonthNav } from "@/components/shell/MonthNav";
import { RegimeToggle } from "@/components/shell/RegimeToggle";
import { DreSection, DreSubtotal } from "./DreSection";

export const metadata: Metadata = {
  title: "DRE — FinanceFlow",
};

export default async function DrePage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; regime?: string }>;
}) {
  const sp = await searchParams;
  const defaultMes = currentYearMonth();
  const mes = /^\d{4}-\d{2}$/.test(sp.mes ?? "") ? sp.mes! : defaultMes;
  const regime = sp.regime === "accrual" ? "accrual" : "cash";

  const { from, to } = monthRange(mes);
  const dre = await getDre({ from, to, regime });

  const prevMes = adjacentMonth(mes, -1);
  const nextMes = adjacentMonth(mes, 1);
  const isCurrentMonth = mes === defaultMes;

  const buildHref = (m: string, r: string) =>
    `/reports/dre?mes=${m}${r === "accrual" ? "&regime=accrual" : ""}`;

  return (
    <main className="flex-1 flex flex-col">
      <PageHeader title="DRE" backHref="/reports" />

      {/* Regime */}
      <RegimeToggle
        value={regime}
        cashHref={buildHref(mes, "cash")}
        accrualHref={buildHref(mes, "accrual")}
      />

      {/* Mês */}
      <MonthNav
        label={monthLabel(mes)}
        prevHref={buildHref(prevMes, regime)}
        nextHref={buildHref(nextMes, regime)}
        nextDisabled={isCurrentMonth}
      />

      {dre.revenue.total === 0 &&
      dre.cost.total === 0 &&
      dre.expense.total === 0 &&
      dre.tax.total === 0 ? (
        <div className="px-6 py-16 text-center">
          <p className="text-sm font-medium">Sem dados no período</p>
          <p className="text-xs text-muted-foreground mt-1">
            Lance movimentações com categoria para popular a DRE.
          </p>
        </div>
      ) : (
        <div className="flex-1">
          <DreSection
            label="Receitas"
            node={dre.revenue}
            sign="+"
            revenueTotal={dre.revenue.total}
          />
          <DreSection
            label="Custos"
            node={dre.cost}
            sign="-"
            revenueTotal={dre.revenue.total}
          />
          <DreSubtotal
            label="Lucro Bruto"
            value={dre.grossProfit}
            revenueTotal={dre.revenue.total}
          />
          <DreSection
            label="Despesas"
            node={dre.expense}
            sign="-"
            revenueTotal={dre.revenue.total}
          />
          <DreSubtotal
            label="EBITDA"
            value={dre.ebitda}
            revenueTotal={dre.revenue.total}
          />
          <DreSection
            label="Impostos"
            node={dre.tax}
            sign="-"
            revenueTotal={dre.revenue.total}
          />
          <DreSubtotal
            label="Resultado"
            value={dre.result}
            revenueTotal={dre.revenue.total}
            highlight
          />
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center px-4 py-3">
        {regime === "cash"
          ? "Regime de caixa: usa a data em que o dinheiro entrou ou saiu."
          : "Regime de competência: usa a competência da movimentação (inclui compras de cartão pendentes)."}
      </p>
    </main>
  );
}
