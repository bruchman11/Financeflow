import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { listCategories } from "@/lib/db/categories";
import { getCreditCard } from "@/lib/db/credit_cards";
import { todayISO } from "@/lib/format/date";
import { PurchaseForm } from "./PurchaseForm";

export default async function NewPurchasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [card, categories] = await Promise.all([
    getCreditCard(id),
    listCategories({ includeArchived: false }),
  ]);
  if (!card) notFound();

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
          <h1 className="text-xl font-semibold">Nova compra</h1>
        </div>
      </header>

      <PurchaseForm
        cardId={id}
        categories={categories}
        defaultDate={todayISO()}
      />
    </main>
  );
}
