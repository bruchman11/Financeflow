import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { listAccounts } from "@/lib/db/accounts";
import {
  getCreditCard,
  getInvoice,
  listPurchasesByInvoice,
} from "@/lib/db/credit_cards";
import { formatBRL } from "@/lib/format/currency";
import { formatBR, todayISO } from "@/lib/format/date";
import { PayInvoiceForm } from "./PayInvoiceForm";

export default async function PayInvoicePage({
  params,
}: {
  params: Promise<{ id: string; invoiceId: string }>;
}) {
  const { id, invoiceId } = await params;

  const [card, invoice, accounts] = await Promise.all([
    getCreditCard(id),
    getInvoice(invoiceId),
    listAccounts({ includeArchived: false }),
  ]);

  if (!card || !invoice) notFound();

  const purchases = await listPurchasesByInvoice(invoiceId);

  const refLabel = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(invoice.reference_month + "T00:00:00"));

  // Se já paga, exibe info read-only
  if (invoice.status === "paid") {
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
            <p className="text-xs text-muted-foreground">{card.name}</p>
            <h1 className="text-xl font-semibold capitalize">{refLabel}</h1>
          </div>
        </header>

        <div className="rounded-xl border border-income/30 bg-income/10 p-4 flex items-center gap-3">
          <CheckCircle2 className="size-5 text-income shrink-0" />
          <div>
            <p className="text-sm font-semibold text-income">
              Fatura paga
            </p>
            {invoice.paid_at ? (
              <p className="text-xs text-income/70">
                Em {formatBR(invoice.paid_at)} — {formatBRL(invoice.total_amount)}
              </p>
            ) : null}
          </div>
        </div>

        {purchases.length > 0 ? (
          <ul className="surface divide-y divide-border overflow-hidden">
            {purchases.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 px-4 py-3 min-h-[56px]"
              >
                <div
                  className="size-3 rounded-full shrink-0"
                  style={{ backgroundColor: p.categories?.color ?? "#94a3b8" }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-tight truncate">
                    {p.description}
                    {p.installments_total > 1
                      ? ` ${p.installment_number}/${p.installments_total}`
                      : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatBR(p.purchase_date)}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums shrink-0">
                  {formatBRL(p.installment_amount)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </main>
    );
  }

  if (accounts.length === 0) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 gap-3 text-center">
        <p className="text-sm font-medium">Nenhuma conta disponível</p>
        <Link href="/accounts/new" className="text-sm underline">
          Criar conta
        </Link>
      </main>
    );
  }

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
          <p className="text-xs text-muted-foreground">{card.name}</p>
          <h1 className="text-xl font-semibold">Pagar fatura</h1>
        </div>
      </header>

      <PayInvoiceForm
        invoice={invoice}
        accounts={accounts}
        defaultAccountId={card.payment_account_id}
        defaultDate={todayISO()}
        refMonthLabel={refLabel}
      />
    </main>
  );
}
