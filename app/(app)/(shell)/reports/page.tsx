import type { Metadata } from "next";
import { BarChart3, GitCompareArrows, Scale, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { LinkRow } from "@/components/shell/ListRow";

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

export default function ReportsHubPage() {
  return (
    <main className="flex-1 flex flex-col px-4 py-6 gap-6">
      <PageHeader eyebrow="Análises" title="Relatórios" className="px-2" />

      <section className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
        {reports.map((r) => (
          <LinkRow
            key={r.href}
            href={r.href}
            icon={r.icon}
            label={r.title}
            hint={r.description}
          />
        ))}
      </section>
    </main>
  );
}
