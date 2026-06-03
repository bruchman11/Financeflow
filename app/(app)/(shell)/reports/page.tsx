import type { Metadata } from "next";
import { BarChart3, GitCompareArrows, Scale, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { LinkRow } from "@/components/shell/ListRow";
import { Amount } from "@/components/ui/amount";
import { formatBRL } from "@/lib/format/currency";
import { currentMonthRange } from "@/lib/format/date";
import { getTransactionsSummary } from "@/lib/db/transactions";

export const metadata: Metadata = {
  title: "Relatórios — FinanceFlow",
};

type ReportCard = {
  href: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

const reports: ReportCard[] = [
  {
    href: "/reports/cash-flow",
    title: "Fluxo de caixa",
    description: "Entradas, saídas e saldo do período em gráfico",
    icon: TrendingUp,
  },
  {
    href: "/reports/dre",
    title: "DRE",
    description: "Demonstrativo gerencial em regime de caixa ou competência",
    icon: BarChart3,
  },
  {
    href: "/reports/compare",
    title: "Comparativo",
    description: "Compare períodos lado a lado com variação %",
    icon: GitCompareArrows,
  },
  {
    href: "/reports/break-even",
    title: "Ponto de equilíbrio",
    description: "Faturamento necessário para cobrir despesas fixas",
    icon: Scale,
  },
];

export default async function ReportsHubPage() {
  const { from, to } = currentMonthRange();
  const { totalIncome, totalExpense, balance } = await getTransactionsSummary({
    from,
    to,
  });

  return (
    <main className="flex-1 flex flex-col px-4 py-6 gap-6">
      <PageHeader eyebrow="Análises" title="Relatórios" className="px-2" />

      {/* Resumo do mês */}
      <section aria-labelledby="reports-summary-heading">
        <h2
          id="reports-summary-heading"
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

      {/* Relatórios disponíveis */}
      <section aria-labelledby="reports-list-heading">
        <h2
          id="reports-list-heading"
          className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-0.5"
        >
          Relatórios
        </h2>
        <div className="surface divide-y divide-border overflow-hidden">
          {reports.map((r) => (
            <LinkRow
              key={r.href}
              href={r.href}
              icon={r.icon}
              label={r.title}
              hint={r.description}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
