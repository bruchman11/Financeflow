"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatBRL } from "@/lib/format/currency";
import { formatBRShort } from "@/lib/format/date";

type Point = {
  date: string;
  income: number;
  expense: number;
};

type Props = {
  points: Point[];
};

export function CashFlowChart({ points }: Props) {
  // Compor dados pro chart com expense negativo
  const data = points.map((p) => ({
    date: p.date,
    Entradas: p.income,
    Saídas: -p.expense, // negativo para barras descerem
  }));

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.2)" />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => formatBRShort(v)}
            tick={{ fontSize: 10 }}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={(v) => {
              const abs = Math.abs(v);
              if (abs >= 1000) return `${Math.round(abs / 1000)}k`;
              return String(abs);
            }}
            tick={{ fontSize: 10 }}
          />
          <Tooltip
            formatter={(value) =>
              formatBRL(Math.abs(typeof value === "number" ? value : Number(value ?? 0)))
            }
            labelFormatter={(label) => formatBRShort(String(label))}
            contentStyle={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="Entradas" fill="var(--income)" radius={[2, 2, 0, 0]} />
          <Bar dataKey="Saídas" radius={[2, 2, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill="var(--expense)" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
