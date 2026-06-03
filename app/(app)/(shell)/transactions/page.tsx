import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Download, Upload, Receipt } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MonthNav } from "@/components/shell/MonthNav";
import { listAccounts } from "@/lib/db/accounts";
import { listCategories } from "@/lib/db/categories";
import {
  getTransactionsSummary,
  listTransactionsPage,
  type TransactionFilters,
  type TransactionRegime,
} from "@/lib/db/transactions";
import { formatBRL } from "@/lib/format/currency";
import { formatBR } from "@/lib/format/date";
import {
  adjacentMonth,
  currentYearMonth,
  monthLabel,
  monthRange,
} from "@/lib/format/month";
import { Amount } from "@/components/ui/amount";
import {
  FiltersDrawer,
  type FiltersState,
} from "@/components/filters/FiltersDrawer";
import { FilterChip } from "@/components/filters/FilterChip";
import { TransactionsList } from "./TransactionsList";

const PAGE_SIZE = 25;

export const metadata: Metadata = { title: "Movimentações — FinanceFlow" };

// ── helpers de URL ────────────────────────────────────────────────────────────

type RawSearchParams = {
  mes?: string;
  from?: string;
  to?: string;
  account?: string;
  category?: string;
  type?: string;
  regime?: string;
  q?: string;
};

function buildHref(base: string, params: Record<string, string>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== "");
  if (entries.length === 0) return base;
  return `${base}?${new URLSearchParams(entries).toString()}`;
}

// ── página ────────────────────────────────────────────────────────────────────

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const sp = await searchParams;

  const defaultMes = currentYearMonth();
  const mes =
    /^\d{4}-\d{2}$/.test(sp.mes ?? "") ? (sp.mes as string) : defaultMes;

  // Filtros aplicados
  const filters: FiltersState = {
    from: /^\d{4}-\d{2}-\d{2}$/.test(sp.from ?? "") ? sp.from! : "",
    to: /^\d{4}-\d{2}-\d{2}$/.test(sp.to ?? "") ? sp.to! : "",
    accountId: sp.account ?? "",
    categoryId: sp.category ?? "",
    type:
      sp.type === "income" || sp.type === "expense"
        ? (sp.type as "income" | "expense")
        : "",
    regime: sp.regime === "accrual" ? "accrual" : "cash",
    q: sp.q ?? "",
  };

  // Período efetivo: from/to manuais > mês corrente
  const usesCustomPeriod = Boolean(filters.from && filters.to);
  const { from, to } = usesCustomPeriod
    ? { from: filters.from, to: filters.to }
    : monthRange(mes);

  const regime: TransactionRegime = filters.regime;

  // Dados em paralelo: transações + accounts + categories
  const dbFilters: TransactionFilters = {
    from,
    to,
    regime,
    accountId: filters.accountId || null,
    categoryId: filters.categoryId || null,
    type: filters.type || null,
    q: filters.q || null,
  };

  // Resumo agregado (independente da paginação) + primeira página
  const [summary, firstPage, accounts, categories] = await Promise.all([
    getTransactionsSummary(dbFilters),
    listTransactionsPage({ ...dbFilters, pageSize: PAGE_SIZE }),
    listAccounts({ includeArchived: false }),
    listCategories({ includeArchived: false }),
  ]);

  const { totalIncome, totalExpense, balance } = summary;

  // Mapas para resolver nomes nos chips
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const prevMes = adjacentMonth(mes, -1);
  const nextMes = adjacentMonth(mes, 1);
  const isCurrentMonth = mes === defaultMes;

  // Conta filtros ativos (excluindo mes + regime cash padrão)
  const activeFilters: { key: string; label: string; removeHref: string }[] = [];
  const currentParams: Record<string, string> = {
    mes,
    from: filters.from,
    to: filters.to,
    account: filters.accountId,
    category: filters.categoryId,
    type: filters.type,
    regime: filters.regime === "accrual" ? "accrual" : "",
    q: filters.q,
  };
  const withoutMes = !usesCustomPeriod
    ? currentParams
    : { ...currentParams, mes: "" };

  if (usesCustomPeriod) {
    activeFilters.push({
      key: "period",
      label: `${formatBR(filters.from)} → ${formatBR(filters.to)}`,
      removeHref: buildHref("/transactions", {
        ...withoutMes,
        mes,
        from: "",
        to: "",
      }),
    });
  }
  if (filters.accountId) {
    const acc = accountById.get(filters.accountId);
    activeFilters.push({
      key: "account",
      label: `Conta: ${acc?.name ?? "?"}`,
      removeHref: buildHref("/transactions", { ...currentParams, account: "" }),
    });
  }
  if (filters.categoryId) {
    const cat = categoryById.get(filters.categoryId);
    activeFilters.push({
      key: "category",
      label: `${cat?.code ?? ""} ${cat?.name ?? ""}`.trim() || "Categoria",
      removeHref: buildHref("/transactions", {
        ...currentParams,
        category: "",
      }),
    });
  }
  if (filters.type) {
    activeFilters.push({
      key: "type",
      label: filters.type === "income" ? "Entrada" : "Saída",
      removeHref: buildHref("/transactions", { ...currentParams, type: "" }),
    });
  }
  if (filters.regime === "accrual") {
    activeFilters.push({
      key: "regime",
      label: "Competência",
      removeHref: buildHref("/transactions", {
        ...currentParams,
        regime: "",
      }),
    });
  }
  if (filters.q) {
    activeFilters.push({
      key: "q",
      label: `"${filters.q}"`,
      removeHref: buildHref("/transactions", { ...currentParams, q: "" }),
    });
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* Navegação de mês (só quando não tem período custom) */}
      {!usesCustomPeriod ? (
        <MonthNav
          label={monthLabel(mes)}
          prevHref={buildHref("/transactions", { ...currentParams, mes: prevMes })}
          nextHref={buildHref("/transactions", { ...currentParams, mes: nextMes })}
          nextDisabled={isCurrentMonth}
          sticky
        />
      ) : (
        <div className="px-4 py-3 border-b border-border bg-background sticky top-0 z-10 text-center">
          <span className="text-sm font-semibold">
            {formatBR(from)} — {formatBR(to)}
          </span>
        </div>
      )}

      {/* Toolbar: filtros + exportar/importar */}
      <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-border bg-background">
        <FiltersDrawer
          basePath="/transactions"
          monthBaseParam={usesCustomPeriod ? "" : mes}
          initialFilters={filters}
          accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
          categories={categories.map((c) => ({
            id: c.id,
            code: c.code,
            name: c.name,
            level: c.level,
          }))}
          activeCount={activeFilters.length}
        />
        <div className="flex items-center gap-4">
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
      </div>

      {/* Chips ativos */}
      {activeFilters.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-border bg-background">
          {activeFilters.map((f) => (
            <FilterChip key={f.key} label={f.label} removeHref={f.removeHref} />
          ))}
        </div>
      ) : null}

      {/* Sumário */}
      <div className="grid grid-cols-3 border-b border-border">
        <div className="flex flex-col items-center py-3 gap-0.5 border-r border-border">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
            Entradas
          </span>
          <span className="text-sm font-semibold text-income tabular-nums">
            {formatBRL(totalIncome)}
          </span>
        </div>
        <div className="flex flex-col items-center py-3 gap-0.5 border-r border-border">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
            Saídas
          </span>
          <span className="text-sm font-semibold text-expense tabular-nums">
            {formatBRL(totalExpense)}
          </span>
        </div>
        <div className="flex flex-col items-center py-3 gap-0.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
            Saldo
          </span>
          <Amount value={balance} tone="result" className="text-sm font-semibold" />
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto pb-24">
        {firstPage.rows.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Nenhuma movimentação"
            description={
              activeFilters.length > 0
                ? "Nenhum resultado para os filtros aplicados."
                : "Toque no + para lançar a primeira movimentação do período."
            }
          />
        ) : (
          <TransactionsList
            initialRows={firstPage.rows}
            initialNextCursor={firstPage.nextCursor}
            regime={regime}
            loadMoreBase={{
              from,
              to,
              regime,
              accountId: dbFilters.accountId ?? null,
              categoryId: dbFilters.categoryId ?? null,
              type: dbFilters.type ?? null,
              q: dbFilters.q ?? null,
            }}
          />
        )}
      </div>

      {/* FAB */}
      <Link
        href="/transactions/new"
        aria-label="Nova movimentação"
        className={buttonVariants({
          className:
            "fixed bottom-[calc(88px+env(safe-area-inset-bottom))] right-4 size-14 rounded-full shadow-lg !p-0 flex items-center justify-center",
        })}
      >
        <Plus className="size-6" />
      </Link>
    </div>
  );
}
