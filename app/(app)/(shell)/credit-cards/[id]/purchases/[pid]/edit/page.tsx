import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { listCategories } from "@/lib/db/categories";
import { getInvoice, getPurchase } from "@/lib/db/credit_cards";
import { formatBRL } from "@/lib/format/currency";
import { formatBR } from "@/lib/format/date";
import { PurchaseEditForm } from "./PurchaseEditForm";

export default async function EditPurchasePage({
  params,
}: {
  params: Promise<{ id: string; pid: string }>;
}) {
  const { id, pid } = await params;

  const [purchase, categories] = await Promise.all([
    getPurchase(pid),
    listCategories({ includeArchived: false }),
  ]);

  if (!purchase || purchase.credit_card_id !== id) notFound();

  const invoice = await getInvoice(purchase.invoice_id);
  const paidInvoice = invoice?.status === "paid";

  return (
    <main className="flex-1 flex flex-col px-4 py-4 gap-6">
      <header className="flex items-center gap-2">
        <Link
          href={`/credit-cards/${id}`}
          className="size-9 inline-flex items-center justify-center rounded-md hover:bg-muted -ml-1"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">
            {formatBR(purchase.purchase_date)}
            {purchase.installments_total > 1
              ? ` · parcela ${purchase.installment_number}/${purchase.installments_total}`
              : ""}
          </p>
          <h1 className="text-xl font-semibold truncate">
            {purchase.description}
          </h1>
        </div>
      </header>

      {/* Resumo read-only */}
      <div className="surface divide-y divide-border">
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            Valor da parcela
          </span>
          <span className="text-base font-semibold tabular-nums">
            {formatBRL(purchase.installment_amount)}
          </span>
        </div>
        {purchase.installments_total > 1 ? (
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              Valor total
            </span>
            <span className="text-sm tabular-nums">
              {formatBRL(purchase.total_amount)}
            </span>
          </div>
        ) : null}
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            Status
          </span>
          <span
            className={
              purchase.payment_transaction_id
                ? "text-sm font-medium text-income"
                : "text-sm font-medium text-muted-foreground"
            }
          >
            {purchase.payment_transaction_id ? "Paga" : "Pendente"}
          </span>
        </div>
      </div>

      <PurchaseEditForm
        purchaseId={pid}
        categories={categories}
        defaultValues={{
          description: purchase.description,
          category_id: purchase.category_id,
          payee: purchase.payee,
          notes: purchase.notes,
        }}
        paidInvoice={paidInvoice}
      />
    </main>
  );
}
