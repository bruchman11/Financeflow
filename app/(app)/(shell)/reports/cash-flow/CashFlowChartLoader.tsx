"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

type Point = {
  date: string;
  income: number;
  expense: number;
};

// Alturas fixas (literais p/ o scanner do Tailwind) — esqueleto de barras.
const BAR_HEIGHTS = [
  "h-24",
  "h-36",
  "h-20",
  "h-44",
  "h-28",
  "h-32",
  "h-16",
  "h-40",
  "h-24",
  "h-36",
  "h-20",
  "h-28",
];

/**
 * Carrega o gráfico (recharts) só no cliente, evitando que o bundle pesado
 * bloqueie a primeira pintura. Mostra um esqueleto enquanto o chunk chega.
 */
const CashFlowChart = dynamic(
  () => import("./CashFlowChart").then((m) => m.CashFlowChart),
  {
    ssr: false,
    loading: () => (
      <div
        className="w-full h-64 flex items-end justify-between gap-1.5 px-2 pb-6"
        aria-hidden
      >
        {BAR_HEIGHTS.map((h, i) => (
          <Skeleton key={i} className={`flex-1 ${h} rounded-sm`} />
        ))}
      </div>
    ),
  },
);

export function CashFlowChartLoader({ points }: { points: Point[] }) {
  return <CashFlowChart points={points} />;
}
