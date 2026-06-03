import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { listAccounts } from "@/lib/db/accounts";
import { getCreditCard } from "@/lib/db/credit_cards";
import { formatNumber } from "@/lib/format/currency";
import { CardForm } from "../../CardForm";
import { toggleCardActiveAction, updateCreditCardAction } from "../../actions";

export default async function EditCreditCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [card, accounts] = await Promise.all([
    getCreditCard(id),
    listAccounts({ includeArchived: false }),
  ]);
  if (!card) notFound();

  const bound = updateCreditCardAction.bind(null, id);

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
        <h1 className="text-xl font-semibold truncate">{card.name}</h1>
      </header>

      <CardForm
        action={bound}
        accounts={accounts}
        defaultValues={{
          name: card.name,
          closing_day: card.closing_day,
          due_day: card.due_day,
          limit_amount: card.limit_amount
            ? formatNumber(card.limit_amount)
            : null,
          payment_account_id: card.payment_account_id,
          color: card.color,
        }}
        submitLabel="Salvar alterações"
      />

      <div className="pt-2 border-t border-border">
        <form action={toggleCardActiveAction}>
          <input type="hidden" name="id" value={card.id} />
          <input
            type="hidden"
            name="active"
            value={card.is_active ? "0" : "1"}
          />
          <button
            type="submit"
            className="h-12 w-full text-sm text-muted-foreground hover:text-foreground underline"
          >
            {card.is_active ? "Inativar cartão" : "Reativar cartão"}
          </button>
        </form>
      </div>
    </main>
  );
}
