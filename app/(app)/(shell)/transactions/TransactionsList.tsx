"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeftRight, Loader2, SlidersHorizontal } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Amount } from "@/components/ui/amount";
import { relativeDayLabel } from "@/lib/format/date";
import { cn } from "@/lib/utils";
import type {
  TransactionRegime,
  TransactionWithRefs,
} from "@/lib/db/transactions";
import {
  loadMoreTransactionsAction,
  type LoadMorePayload,
} from "./actions";

type Props = {
  initialRows: TransactionWithRefs[];
  initialNextCursor: string | null;
  regime: TransactionRegime;
  /** Base do payload do "carregar mais" (sem o cursor). */
  loadMoreBase: Omit<LoadMorePayload, "cursor">;
};

export function TransactionsList({
  initialRows,
  initialNextCursor,
  regime,
  loadMoreBase,
}: Props) {
  const [rows, setRows] = useState(initialRows);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [isPending, startTransition] = useTransition();

  const dateField: keyof TransactionWithRefs =
    regime === "accrual" ? "competence_date" : "occurred_on";

  const days = useMemo(() => {
    const byDay = new Map<string, TransactionWithRefs[]>();
    for (const tx of rows) {
      const day = String(tx[dateField]);
      const list = byDay.get(day) ?? [];
      list.push(tx);
      byDay.set(day, list);
    }
    return Array.from(byDay.entries()).sort((a, b) =>
      a[0] < b[0] ? 1 : -1,
    );
  }, [rows, dateField]);

  function handleLoadMore() {
    if (!nextCursor || isPending) return;
    const cursor = nextCursor;
    startTransition(async () => {
      const page = await loadMoreTransactionsAction({ ...loadMoreBase, cursor });
      setRows((prev) => [...prev, ...page.rows]);
      setNextCursor(page.nextCursor);
    });
  }

  return (
    <>
      <ul>
        {days.map(([day, txs]) => (
          <li key={day}>
            <div className="px-4 py-1.5 bg-muted/50 border-b border-border">
              <span className="text-[11px] text-muted-foreground capitalize">
                {relativeDayLabel(day)}
              </span>
            </div>
            <ul className="divide-y divide-border">
              {txs.map((tx) => (
                <li key={tx.id}>
                  <Link
                    href={`/transactions/${tx.id}/edit`}
                    className="flex items-center gap-3 px-4 py-3 min-h-[60px] hover:bg-muted transition-colors"
                  >
                    {tx.kind === "transfer" ? (
                      <div className="size-3 rounded-full shrink-0 bg-blue-500 flex items-center justify-center">
                        <ArrowLeftRight className="size-2 text-white" />
                      </div>
                    ) : tx.kind === "adjustment" ? (
                      <div className="size-3 rounded-full shrink-0 bg-amber-500 flex items-center justify-center">
                        <SlidersHorizontal className="size-2 text-white" />
                      </div>
                    ) : (
                      <div
                        className="size-3 rounded-full shrink-0"
                        style={{
                          backgroundColor:
                            tx.categories?.color ??
                            `var(--${tx.type === "income" ? "income" : "expense"})`,
                        }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-snug truncate">
                        {tx.kind === "transfer"
                          ? `Transferência${tx.description ? `: ${tx.description}` : ""}`
                          : tx.kind === "adjustment"
                            ? tx.description || "Ajuste de saldo"
                            : tx.description ||
                              tx.categories?.name ||
                              (tx.type === "income" ? "Entrada" : "Saída")}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {tx.accounts?.name ?? ""}
                        {tx.kind === "regular" && tx.categories
                          ? ` · ${tx.categories.code} ${tx.categories.name}`
                          : ""}
                      </p>
                    </div>
                    <Amount
                      value={tx.amount}
                      tone={
                        tx.kind !== "regular"
                          ? "neutral"
                          : tx.type === "income"
                            ? "income"
                            : "expense"
                      }
                      className="text-sm font-semibold shrink-0"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      {nextCursor ? (
        <div className="px-4 py-4">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={isPending}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-11 w-full gap-2 text-sm",
            )}
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Carregando…
              </>
            ) : (
              "Carregar mais"
            )}
          </button>
        </div>
      ) : null}
    </>
  );
}
