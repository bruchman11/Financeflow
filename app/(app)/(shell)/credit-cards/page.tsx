import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  getCurrentOpenInvoice,
  listCreditCards,
  type CreditCardWithRefs,
} from "@/lib/db/credit_cards";
import { formatBRL } from "@/lib/format/currency";
import { formatBR } from "@/lib/format/date";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Cartões de crédito — FinanceFlow",
};

type CardWithSummary = CreditCardWithRefs & {
  openInvoice: { total: string; due_date: string } | null;
};

export default async function CreditCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const params = await searchParams;
  const showInactive = params.archived === "1";

  const all = await listCreditCards({ includeInactive: true });
  const active = all.filter((c) => c.is_active);
  const inactive = all.filter((c) => !c.is_active);

  // Para cada cartão ativo, busca a fatura aberta atual
  const withSummary: CardWithSummary[] = await Promise.all(
    active.map(async (c) => {
      const inv = await getCurrentOpenInvoice(c.id);
      return {
        ...c,
        openInvoice: inv
          ? { total: inv.total_amount, due_date: inv.due_date }
          : null,
      };
    }),
  );

  return (
    <main className="flex-1 flex flex-col px-4 py-6 gap-6 pb-24 relative">
      <header className="space-y-1 px-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">
          Cartões
        </p>
        <h1 className="text-2xl font-semibold">Cartões de crédito</h1>
      </header>

      {withSummary.length === 0 && !showInactive ? (
        <EmptyState
          compact
          className="rounded-lg border border-dashed border-border"
          icon={CreditCard}
          title="Nenhum cartão cadastrado"
          description="Adicione seus cartões para gerenciar faturas e compras parceladas."
        />
      ) : !showInactive ? (
        <ul className="space-y-3">
          {withSummary.map((c) => (
            <li key={c.id}>
              <Link
                href={`/credit-cards/${c.id}`}
                className="block rounded-xl p-4 text-white shadow-sm hover:shadow-md transition-shadow"
                style={{
                  background: `linear-gradient(135deg, ${c.color ?? "#1e293b"}, ${c.color ?? "#0f172a"}cc)`,
                }}
              >
                <div className="flex items-start justify-between mb-6">
                  <CreditCard className="size-6" aria-hidden />
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider opacity-70">
                      Fech. {c.closing_day} · Venc. {c.due_day}
                    </p>
                  </div>
                </div>
                <p className="text-base font-semibold leading-tight">{c.name}</p>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider opacity-70">
                      Fatura aberta
                    </p>
                    <p className="text-xl font-bold tabular-nums">
                      {c.openInvoice
                        ? formatBRL(c.openInvoice.total)
                        : "R$ 0,00"}
                    </p>
                  </div>
                  {c.openInvoice ? (
                    <p className="text-[11px] opacity-80 tabular-nums">
                      Vence {formatBR(c.openInvoice.due_date)}
                    </p>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <section className="space-y-2">
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground px-2">
            Inativos ({inactive.length})
          </h2>
          {inactive.length === 0 ? (
            <EmptyState compact title="Nenhum cartão inativo" />
          ) : (
            <ul className="surface divide-y divide-border overflow-hidden">
              {inactive.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center gap-3 px-4 py-3 min-h-[56px] opacity-60"
                >
                  <CreditCard className="size-5 text-muted-foreground" />
                  <span className="flex-1 text-sm font-medium truncate">
                    {c.name}
                  </span>
                  <Link
                    href={`/credit-cards/${c.id}/edit`}
                    className="text-xs underline text-muted-foreground"
                  >
                    Reativar
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <Link
        href="/credit-cards/new"
        className={buttonVariants({
          variant: "outline",
          className: "h-12 text-base w-full",
        })}
      >
        <Plus className="size-4" />
        Novo cartão
      </Link>

      {inactive.length > 0 || showInactive ? (
        <div className="flex justify-center">
          <Link
            href={showInactive ? "/credit-cards" : "/credit-cards?archived=1"}
            className="text-xs text-muted-foreground underline"
          >
            {showInactive
              ? "← Ver ativos"
              : `Ver inativos (${inactive.length}) →`}
          </Link>
        </div>
      ) : null}
    </main>
  );
}
