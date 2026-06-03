import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle2,
  FileText,
  Pencil,
  Plus,
  X as XIcon,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { listBills, type BillWithRefs } from "@/lib/db/bills";
import { classifyDue, dueBucketLabels, type DueBucket } from "@/lib/db/fixed_expenses";
import { formatBRL } from "@/lib/format/currency";
import { formatBR, todayISO } from "@/lib/format/date";
import { cn } from "@/lib/utils";
import { cancelBillAction, reopenBillAction } from "./actions";

export const metadata: Metadata = {
  title: "Boletos — FinanceFlow",
};

const BUCKET_ORDER: DueBucket[] = ["overdue", "today", "upcoming", "future"];

const bucketBadgeStyle: Record<DueBucket, string> = {
  overdue: "bg-destructive/10 text-destructive border-destructive/30",
  today: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
  upcoming: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  future: "bg-muted text-muted-foreground border-border",
};

export default async function BillsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const view = params.view ?? "pending";

  const all = await listBills({ status: "all" });
  const pending = all.filter((b) => b.status === "pending");
  const paid = all
    .filter((b) => b.status === "paid")
    .sort((a, b) => (a.paid_at ?? "") < (b.paid_at ?? "") ? 1 : -1);
  const canceled = all.filter((b) => b.status === "canceled");

  const today = todayISO();
  const grouped = new Map<DueBucket, BillWithRefs[]>();
  for (const b of pending) {
    const bucket = classifyDue(b.due_date, today);
    const list = grouped.get(bucket) ?? [];
    list.push(b);
    grouped.set(bucket, list);
  }

  return (
    <main className="flex-1 flex flex-col px-4 py-6 gap-6 pb-24 relative">
      <header className="space-y-1 px-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">
          A pagar
        </p>
        <h1 className="text-2xl font-semibold">Boletos</h1>
      </header>

      {/* Toggle de visualização */}
      <div className="flex gap-2">
        {[
          { v: "pending", label: `Pendentes (${pending.length})` },
          { v: "paid", label: `Pagos (${paid.length})` },
          { v: "canceled", label: `Cancelados (${canceled.length})` },
        ].map((opt) => (
          <Link
            key={opt.v}
            href={`/bills?view=${opt.v}`}
            className={cn(
              "h-9 px-3 inline-flex items-center rounded-md text-xs font-medium border transition-colors",
              view === opt.v
                ? "bg-foreground text-background border-foreground"
                : "bg-background hover:bg-muted border-input",
            )}
          >
            {opt.label}
          </Link>
        ))}
      </div>

      {view === "pending" ? (
        pending.length === 0 ? (
          <EmptyState
            compact
            className="rounded-lg border border-dashed border-border"
            icon={FileText}
            title="Nenhum boleto pendente"
            description="Cadastre boletos para acompanhar vencimentos e registrar pagamentos."
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
                  {items.map((b) => (
                    <BillRow key={b.id} bill={b} bucket={bucket} />
                  ))}
                </ul>
              </section>
            );
          })
        )
      ) : view === "paid" ? (
        paid.length === 0 ? (
          <EmptyState compact title="Nenhum boleto pago" />
        ) : (
          <ul className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
            {paid.map((b) => (
              <li
                key={b.id}
                className="flex items-center gap-3 px-4 py-3 min-h-[56px]"
              >
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {b.description}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    Pago {b.paid_at ? formatBR(b.paid_at) : ""}
                    {b.payment_account ? ` · ${b.payment_account.name}` : ""}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums">
                  {formatBRL(b.amount)}
                </span>
              </li>
            ))}
          </ul>
        )
      ) : canceled.length === 0 ? (
        <EmptyState compact title="Nenhum boleto cancelado" />
      ) : (
        <ul className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
          {canceled.map((b) => (
            <li key={b.id}>
              <div className="flex items-center gap-3 px-4 py-3 min-h-[56px] opacity-70">
                <XIcon className="size-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {b.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Cancelado · venc. {formatBR(b.due_date)}
                  </p>
                </div>
                <form action={reopenBillAction}>
                  <input type="hidden" name="id" value={b.id} />
                  <button
                    type="submit"
                    className="text-xs underline text-muted-foreground"
                  >
                    Reabrir
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/bills/new"
        aria-label="Novo boleto"
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

function BillRow({ bill, bucket }: { bill: BillWithRefs; bucket: DueBucket }) {
  return (
    <li>
      <div className="flex flex-col gap-2 px-4 py-3 min-h-[72px]">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-md bg-muted flex items-center justify-center shrink-0">
            <FileText className="size-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-tight truncate">
              {bill.description}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {bill.beneficiary_name ?? "Sem beneficiário"}
              {bill.categories ? ` · ${bill.categories.name}` : ""}
            </p>
          </div>
          <span className="text-sm font-semibold tabular-nums">
            {formatBRL(bill.amount)}
          </span>
        </div>

        <div className="flex items-center gap-2 pl-11">
          <span
            className={cn(
              "inline-flex items-center h-6 px-2 rounded-full text-[10px] font-semibold border tabular-nums",
              bucketBadgeStyle[bucket],
            )}
          >
            {bucket === "overdue"
              ? `Venceu ${formatBR(bill.due_date)}`
              : bucket === "today"
                ? "Vence hoje"
                : `Vence ${formatBR(bill.due_date)}`}
          </span>
          <div className="flex-1" />

          <Link
            href={`/bills/${bill.id}/pay`}
            className={buttonVariants({
              variant: "outline",
              className: "h-8 px-3 text-xs",
            })}
          >
            Informar pagamento
          </Link>

          <Link
            href={`/bills/${bill.id}/edit`}
            className="size-9 rounded-md inline-flex items-center justify-center hover:bg-muted transition-colors"
            aria-label="Editar"
          >
            <Pencil className="size-4 text-muted-foreground" />
          </Link>

          <form action={cancelBillAction}>
            <input type="hidden" name="id" value={bill.id} />
            <button
              type="submit"
              aria-label="Cancelar boleto"
              className="size-9 rounded-md inline-flex items-center justify-center hover:bg-muted transition-colors"
            >
              <XIcon className="size-4 text-muted-foreground" />
            </button>
          </form>
        </div>
      </div>
    </li>
  );
}
