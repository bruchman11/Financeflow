import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Pencil,
  Plus,
  ShoppingBag,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getCreditCard,
  listInvoicesByCard,
  listPurchasesByInvoice,
  type CreditCardInvoiceRow,
} from "@/lib/db/credit_cards";
import { formatBRL } from "@/lib/format/currency";
import { formatBR } from "@/lib/format/date";

const invoiceStatusLabel: Record<string, string> = {
  open: "Aberta",
  closed: "Fechada",
  paid: "Paga",
  overdue: "Vencida",
};

const invoiceStatusVariant: Record<
  string,
  "info" | "warning" | "success" | "danger"
> = {
  open: "info",
  closed: "warning",
  paid: "success",
  overdue: "danger",
};

export default async function CreditCardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const card = await getCreditCard(id);
  if (!card) notFound();

  const invoices = await listInvoicesByCard(id);

  // Primeira fatura não-paga é a "atual"
  const current = invoices.find((i) => i.status !== "paid") ?? null;
  const currentPurchases = current
    ? await listPurchasesByInvoice(current.id)
    : [];

  const others = invoices.filter((i) => i.id !== current?.id);

  return (
    <main className="flex-1 flex flex-col gap-5 pb-6">
      {/* Cabeçalho */}
      <div
        className="px-4 py-4 text-white"
        style={{
          background: `linear-gradient(135deg, ${card.color ?? "#1e293b"}, ${card.color ?? "#0f172a"}cc)`,
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Link
            href="/credit-cards"
            className="size-9 inline-flex items-center justify-center rounded-md hover:bg-white/10 -ml-1"
            aria-label="Voltar"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider opacity-70">
              Cartão
            </p>
            <p className="text-xl font-semibold leading-tight truncate">
              {card.name}
            </p>
          </div>
          <Link
            href={`/credit-cards/${id}/edit`}
            className="size-9 inline-flex items-center justify-center rounded-md hover:bg-white/10"
            aria-label="Editar"
          >
            <Pencil className="size-4" />
          </Link>
        </div>
        <div className="flex items-center justify-between text-xs opacity-90">
          <span>Fechamento dia {card.closing_day}</span>
          <span>Vencimento dia {card.due_day}</span>
          {card.limit_amount ? (
            <span>Limite {formatBRL(card.limit_amount)}</span>
          ) : null}
        </div>
      </div>

      {/* Fatura atual */}
      {current ? (
        <section className="px-4 space-y-3">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xs uppercase tracking-wider text-muted-foreground">
              Fatura atual · {formatRefMonth(current.reference_month)}
            </h2>
            <InvoiceStatusBadge status={current.status} />
          </div>

          <div className="surface p-4 space-y-3">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Total
                </p>
                <p className="text-3xl font-bold tabular-nums">
                  {formatBRL(current.total_amount)}
                </p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>Fecha {formatBR(current.closing_date)}</p>
                <p>Vence {formatBR(current.due_date)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Link
                href={`/credit-cards/${id}/purchases/new`}
                className={buttonVariants({
                  variant: "outline",
                  className: "h-12",
                })}
              >
                <Plus className="size-4" />
                Nova compra
              </Link>
              <Link
                href={`/credit-cards/${id}/invoices/${current.id}/pay`}
                className={buttonVariants({
                  className: "h-12",
                })}
              >
                Pagar fatura
              </Link>
            </div>
          </div>

          {/* Compras da fatura atual */}
          {currentPurchases.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhuma compra nesta fatura ainda.
              </p>
            </div>
          ) : (
            <ul className="surface divide-y divide-border overflow-hidden">
              {currentPurchases.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/credit-cards/${id}/purchases/${p.id}/edit`}
                    className="flex items-center gap-3 px-4 py-3 min-h-[56px] hover:bg-muted transition-colors"
                  >
                    <div
                      className="size-3 rounded-full shrink-0"
                      style={{
                        backgroundColor: p.categories?.color ?? "#94a3b8",
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-tight truncate">
                        {p.description}
                        {p.installments_total > 1 ? (
                          <span className="text-xs text-muted-foreground ml-1">
                            {p.installment_number}/{p.installments_total}
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {formatBR(p.purchase_date)}
                        {p.categories
                          ? ` · ${p.categories.code} ${p.categories.name}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-sm font-semibold tabular-nums">
                        {formatBRL(p.installment_amount)}
                      </span>
                      {p.payment_transaction_id ? (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-income">
                          Paga
                        </span>
                      ) : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <section className="px-4">
          <div className="rounded-xl border border-dashed border-border p-6 text-center space-y-3">
            <ShoppingBag className="size-8 text-muted-foreground mx-auto" />
            <p className="text-sm font-medium">Nenhuma fatura aberta</p>
            <p className="text-xs text-muted-foreground">
              Registre uma compra para abrir a primeira fatura deste cartão.
            </p>
            <Link
              href={`/credit-cards/${id}/purchases/new`}
              className={buttonVariants({
                variant: "outline",
                className: "h-12",
              })}
            >
              <Plus className="size-4" />
              Nova compra
            </Link>
          </div>
        </section>
      )}

      {/* Faturas anteriores */}
      {others.length > 0 ? (
        <section className="px-4 space-y-2">
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground px-2">
            Outras faturas
          </h2>
          <ul className="surface divide-y divide-border overflow-hidden">
            {others.map((inv) => (
              <li key={inv.id}>
                <Link
                  href={`/credit-cards/${id}/invoices/${inv.id}/pay`}
                  className="flex items-center gap-3 px-4 py-3 min-h-[56px] hover:bg-muted transition-colors"
                >
                  <div className="size-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                    {inv.status === "paid" ? (
                      <CheckCircle2 className="size-4 text-income" />
                    ) : (
                      <CreditCard className="size-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight">
                      {formatRefMonth(inv.reference_month)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Vence {formatBR(inv.due_date)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-semibold tabular-nums">
                      {formatBRL(inv.total_amount)}
                    </span>
                    <InvoiceStatusBadge status={inv.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}

function formatRefMonth(refMonth: string): string {
  const [y, m] = refMonth.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(y, m - 1, 1));
}

function InvoiceStatusBadge({ status }: { status: CreditCardInvoiceRow["status"] }) {
  return (
    <Badge
      variant={invoiceStatusVariant[status]}
      className="uppercase tracking-wider"
    >
      {invoiceStatusLabel[status]}
    </Badge>
  );
}
