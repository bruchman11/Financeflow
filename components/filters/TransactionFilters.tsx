"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { todayISO, addDaysISO, parseISODate } from "@/lib/format/date";
import { currentYearMonth, monthRange, adjacentMonth } from "@/lib/format/month";

export type FiltersState = {
  from: string;
  to: string;
  accountId: string;
  categoryId: string;
  type: "" | "income" | "expense";
  regime: "cash" | "accrual";
  q: string;
};

export type FilterAccount = { id: string; name: string };
export type FilterCategory = {
  id: string;
  code: string;
  name: string;
  level: number;
};

type Props = {
  basePath: string;
  filters: FiltersState;
  accounts: FilterAccount[];
  categories: FilterCategory[];
};

function startOfWeek(): { from: string; to: string } {
  const today = todayISO();
  const dow = parseISODate(today).getDay(); // 0=Dom … 6=Sáb
  const back = (dow + 6) % 7; // semana começando na segunda
  const from = addDaysISO(today, -back);
  return { from, to: addDaysISO(from, 6) };
}

export function TransactionFilters({
  basePath,
  filters,
  accounts,
  categories,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(filters.q);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mantém a busca em sincronia quando a URL muda por fora (ex.: limpar).
  useEffect(() => setQ(filters.q), [filters.q]);

  function push(next: Partial<FiltersState>) {
    const m = { ...filters, ...next };
    const params = new URLSearchParams();
    if (m.from) params.set("from", m.from);
    if (m.to) params.set("to", m.to);
    if (m.accountId) params.set("account", m.accountId);
    if (m.categoryId) params.set("category", m.categoryId);
    if (m.type) params.set("type", m.type);
    if (m.regime !== "cash") params.set("regime", m.regime);
    if (m.q.trim()) params.set("q", m.q.trim());
    const query = params.toString();
    startTransition(() => router.push(query ? `${basePath}?${query}` : basePath));
  }

  function onSearch(v: string) {
    setQ(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => push({ q: v }), 400);
  }

  const today = todayISO();
  const thisMonth = monthRange(currentYearMonth());
  const lastMonth = monthRange(adjacentMonth(currentYearMonth(), -1));
  const week = startOfWeek();
  const noPeriod = !filters.from && !filters.to;

  const shortcuts = [
    { key: "hoje", label: "Hoje", from: today, to: today },
    { key: "semana", label: "Esta semana", from: week.from, to: week.to },
    { key: "mes", label: "Este mês", from: thisMonth.from, to: thisMonth.to },
    { key: "passado", label: "Mês passado", from: lastMonth.from, to: lastMonth.to },
  ];

  const isShortcutActive = (s: { key: string; from: string; to: string }) =>
    (s.key === "mes" && noPeriod) ||
    (filters.from === s.from && filters.to === s.to);

  const hasActive = Boolean(
    filters.from ||
      filters.to ||
      filters.accountId ||
      filters.categoryId ||
      filters.type ||
      filters.q ||
      filters.regime === "accrual",
  );

  const chip =
    "h-9 px-3 inline-flex items-center rounded-full text-xs font-medium border whitespace-nowrap transition-colors";

  return (
    <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 space-y-3">
      {/* Atalhos de período */}
      <div className="flex items-center gap-2 overflow-x-auto -mx-1 px-1 pb-0.5">
        {shortcuts.map((s) => {
          const active = isShortcutActive(s);
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => push({ from: s.from, to: s.to })}
              className={cn(
                chip,
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-input hover:bg-muted",
              )}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Período personalizado */}
      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            De
          </span>
          <Input
            type="date"
            value={filters.from}
            onChange={(e) =>
              push({ from: e.target.value, to: filters.to || today })
            }
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Até
          </span>
          <Input
            type="date"
            value={filters.to}
            onChange={(e) =>
              push({ to: e.target.value, from: filters.from || e.target.value })
            }
          />
        </label>
      </div>

      {/* Tipo */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { v: "" as const, label: "Todos" },
          { v: "income" as const, label: "Entrada" },
          { v: "expense" as const, label: "Saída" },
        ].map((opt) => {
          const active = filters.type === opt.v;
          return (
            <button
              key={opt.v || "all"}
              type="button"
              onClick={() => push({ type: opt.v })}
              className={cn(
                "h-10 rounded-lg border text-sm font-medium transition-colors",
                active
                  ? opt.v === "income"
                    ? "bg-income text-white border-income"
                    : opt.v === "expense"
                      ? "bg-expense text-white border-expense"
                      : "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-input hover:bg-muted",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Conta + Categoria */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <NativeSelect
          aria-label="Conta"
          value={filters.accountId}
          onChange={(e) => push({ accountId: e.target.value })}
        >
          <option value="">Todas as contas</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label="Categoria"
          value={filters.categoryId}
          onChange={(e) => push({ categoryId: e.target.value })}
        >
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {" ".repeat((c.level - 1) * 2)}
              {c.code} {c.name}
            </option>
          ))}
        </NativeSelect>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          value={q}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Buscar por descrição…"
          className="pl-9 pr-9"
        />
        {q ? (
          <button
            type="button"
            aria-label="Limpar busca"
            onClick={() => onSearch("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      {/* Limpar filtros */}
      {hasActive ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => router.push(basePath)}
            className="text-xs font-medium text-muted-foreground underline hover:text-foreground"
          >
            Limpar filtros
          </button>
        </div>
      ) : null}
    </div>
  );
}
