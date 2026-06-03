import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Download, Upload, Receipt } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { listAccounts } from "@/lib/db/accounts";
import { listCategories } from "@/lib/db/categories";
import {
  getTransactionsSummary,
  listTransactionsPage,
  type TransactionFilters as DbFilters,
  type TransactionRegime,
} from "@/lib/db/transactions";
import { formatBRL } from "@/lib/format/currency";
import { currentYearMonth, monthRange } from "@/lib/format/month";
import { Amount } from "@/components/ui/amount";
import type { FiltersState } from "@/components/filters/FiltersDrawer";
import { TransactionFilters } from "@/components/filters/TransactionFilters";
import { TransactionsList } from "./TransactionsList";

const PAGE_SIZE = 25;

export const metadata: Metadata = { title: "Movimentações — FinanceFlow" };

type RawSearchParams = {
  from?: string;
  to?: string;
  account?: string;
  category?: string;
  type?: string;
  regime?: string;
  q?: string;
};

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const sp = await searchParams;

  // Estado da listagem derivado APENAS dos filtros da URL.
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

  // Período: from/to manuais > mês corrente (padrão quando sem filtro).
  const usesCustomPeriod = Boolean(filters.from && filters.to);
  const { from, to } = usesCustomPeriod
    ? { from: filters.from, to: filters.to }
    : monthRange(currentYearMonth());

  const regime: TransactionRegime = filters.regime;

  const dbFilters: DbFilters = {
    from,
    to,
    regime,
    accountId: filters.accountId || null,
    categoryId: filters.categoryId || null,
    type: filters.type || null,
    q: filters.q || null,
  };

  const [summary, firstPage, accounts, categories] = await Promise.all([
    getTransactionsSummary(dbFilters),
    listTransactionsPage({ ...dbFilters, pageSize: PAGE_SIZE }),
    listAccounts({ includeArchived: false }),
    listCategories({ includeArchived: false }),
  ]);

  const { totalIncome, totalExpense, balance } = summary;

  const hasActiveFilters = Boolean(
    filters.from ||
      filters.to ||
      filters.accountId ||
      filters.categoryId ||
      filters.type ||
      filters.q ||
      filters.regime === "accrual",
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* Filtros inline */}
      <TransactionFilters
        basePath="/transactions"
        filters={filters}
        accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
        categories={categories.map((c) => ({
          id: c.id,
          code: c.code,
          name: c.name,
          level: c.level,
        }))}
      />

      {/* Exportar / importar */}
      <div className="flex items-center justify-end gap-4 px-4 py-2 border-b border-border bg-background">
        <a
          href={`/api/transactions/export?mes=${from.slice(0, 7)}`}
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

      {/* Sumário (sempre derivado dos filtros ativos) */}
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
            title={
              hasActiveFilters
                ? "Nenhuma transação encontrada"
                : "Nenhuma movimentação"
            }
            description={
              hasActiveFilters
                ? "Nenhuma transação encontrada para os filtros selecionados."
                : "Toque no + para lançar a primeira movimentação do período."
            }
          />
        ) : (
          <TransactionsList
            key={`${from}|${to}|${regime}|${dbFilters.accountId ?? ""}|${dbFilters.categoryId ?? ""}|${dbFilters.type ?? ""}|${dbFilters.q ?? ""}`}
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
            "fixed bottom-[calc(96px+env(safe-area-inset-bottom))] right-4 size-14 rounded-full shadow-lg !p-0 flex items-center justify-center",
        })}
      >
        <Plus className="size-6" />
      </Link>
    </div>
  );
}
