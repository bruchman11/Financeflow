import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Receipt, Pencil, PowerOff, Power } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  classifyDue,
  dueBucketLabels,
  listFixedExpenses,
  type DueBucket,
  type FixedExpenseWithRefs,
} from "@/lib/db/fixed_expenses";
import { formatBRL } from "@/lib/format/currency";
import { formatBR, todayISO } from "@/lib/format/date";
import { frequencyLabels } from "@/lib/validation/fixed_expense";
import { cn } from "@/lib/utils";
import { toggleFixedExpenseStatusAction } from "./actions";

export const metadata: Metadata = {
  title: "Despesas fixas — FinanceFlow",
};

const BUCKET_ORDER: DueBucket[] = ["overdue", "today", "upcoming", "future"];

const bucketBadgeStyle: Record<DueBucket, string> = {
  overdue: "bg-destructive/10 text-destructive border-destructive/30",
  today: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
  upcoming: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  future: "bg-muted text-muted-foreground border-border",
};

export default async function FixedExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const showInactive = params.status === "inactive";

  const all = await listFixedExpenses({ status: "all" });
  const active = all.filter((e) => e.status === "active");
  const inactive = all.filter((e) => e.status === "inactive");

  const today = todayISO();
  const grouped = new Map<DueBucket, FixedExpenseWithRefs[]>();
  for (const e of active) {
    const b = classifyDue(e.next_due_date, today);
    const list = grouped.get(b) ?? [];
    list.push(e);
    grouped.set(b, list);
  }

  return (
    <main className="flex-1 flex flex-col px-4 py-6 gap-6 pb-24 relative">
      <header className="space-y-1 px-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">
          Recorrentes
        </p>
        <h1 className="text-2xl font-semibold">Despesas fixas</h1>
      </header>

      {!showInactive ? (
        <>
          {active.length === 0 ? (
            <EmptyState
              compact
              className="rounded-lg border border-dashed border-border"
              icon={Receipt}
              title="Nenhuma despesa fixa"
              description="Cadastre aluguel, salários, assinaturas etc. para nunca esquecer."
            />
          ) : (
            BUCKET_ORDER.map((bucket) => {
              const items = grouped.get(bucket) ?? [];
              if (items.length === 0) return null;
              return (
                <section key={bucket} className="space-y-2">
                  <h2 className="text-xs uppercase tracking-wider text-muted-foreground px-2">
                    {dueBucketLabels[bucket]}{" "}
                    <span className="text-foreground/70">({items.length})</span>
                  </h2>
                  <ul className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
                    {items.map((fx) => (
                      <FixedExpenseRow key={fx.id} fx={fx} bucket={bucket} />
                    ))}
                  </ul>
                </section>
              );
            })
          )}
        </>
      ) : (
        <section className="space-y-2">
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground px-2">
            Inativas ({inactive.length})
          </h2>
          {inactive.length === 0 ? (
            <EmptyState compact title="Nenhuma despesa fixa inativa" />
          ) : (
            <ul className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
              {inactive.map((fx) => (
                <FixedExpenseRow key={fx.id} fx={fx} bucket="future" inactive />
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Toggle ativas/inativas */}
      {inactive.length > 0 || showInactive ? (
        <div className="flex justify-center">
          <Link
            href={showInactive ? "/fixed-expenses" : "/fixed-expenses?status=inactive"}
            className="text-xs text-muted-foreground underline"
          >
            {showInactive
              ? "← Ver ativas"
              : `Ver inativas (${inactive.length}) →`}
          </Link>
        </div>
      ) : null}

      {/* FAB nova */}
      <Link
        href="/fixed-expenses/new"
        aria-label="Nova despesa fixa"
        className={buttonVariants({
          className:
            "fixed bottom-[calc(96px+env(safe-area-inset-bottom))] right-4 size-14 rounded-full shadow-lg !p-0 flex items-center justify-center",
        })}
      >
        <Plus className="size-6" />
      </Link>
    </main>
  );
}

function FixedExpenseRow({
  fx,
  bucket,
  inactive = false,
}: {
  fx: FixedExpenseWithRefs;
  bucket: DueBucket;
  inactive?: boolean;
}) {
  return (
    <li>
      <div
        className={cn(
          "flex flex-col gap-2 px-4 py-3 min-h-[72px]",
          inactive && "opacity-70",
        )}
      >
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-md bg-muted flex items-center justify-center shrink-0">
            <Receipt className="size-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-tight truncate">
              {fx.description}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {frequencyLabels[fx.frequency]} ·{" "}
              {fx.categories?.name ?? "Sem categoria"}
            </p>
          </div>
          <span className="text-sm font-semibold tabular-nums">
            {formatBRL(fx.amount)}
          </span>
        </div>

        <div className="flex items-center gap-2 pl-11">
          {!inactive ? (
            <span
              className={cn(
                "inline-flex items-center h-6 px-2 rounded-full text-[10px] font-semibold border tabular-nums",
                bucketBadgeStyle[bucket],
              )}
            >
              {bucket === "overdue"
                ? `Venceu ${formatBR(fx.next_due_date)}`
                : bucket === "today"
                  ? "Vence hoje"
                  : `Vence ${formatBR(fx.next_due_date)}`}
            </span>
          ) : (
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Inativa
            </span>
          )}
          <div className="flex-1" />

          {!inactive ? (
            <Link
              href={`/fixed-expenses/${fx.id}/pay`}
              className={buttonVariants({
                variant: "outline",
                className: "h-8 px-3 text-xs",
              })}
            >
              Informar pagamento
            </Link>
          ) : null}

          <Link
            href={`/fixed-expenses/${fx.id}/edit`}
            className="size-9 rounded-md inline-flex items-center justify-center hover:bg-muted transition-colors"
            aria-label="Editar"
          >
            <Pencil className="size-4 text-muted-foreground" />
          </Link>

          <form action={toggleFixedExpenseStatusAction}>
            <input type="hidden" name="id" value={fx.id} />
            <input
              type="hidden"
              name="status"
              value={inactive ? "active" : "inactive"}
            />
            <button
              type="submit"
              aria-label={inactive ? "Reativar" : "Inativar"}
              className="size-9 rounded-md inline-flex items-center justify-center hover:bg-muted transition-colors"
            >
              {inactive ? (
                <Power className="size-4 text-muted-foreground" />
              ) : (
                <PowerOff className="size-4 text-muted-foreground" />
              )}
            </button>
          </form>
        </div>
      </div>
    </li>
  );
}
