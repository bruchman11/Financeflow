import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { listAccounts } from "@/lib/db/accounts";
import { CardForm } from "../CardForm";
import { createCreditCardAction } from "../actions";

export default async function NewCreditCardPage() {
  const accounts = await listAccounts({ includeArchived: false });

  return (
    <main className="flex-1 flex flex-col px-4 py-4 gap-6">
      <header className="flex items-center gap-2">
        <Link
          href="/credit-cards"
          className="size-9 inline-flex items-center justify-center rounded-md hover:bg-muted -ml-1"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-xl font-semibold">Novo cartão</h1>
      </header>

      <CardForm
        action={createCreditCardAction}
        accounts={accounts}
        submitLabel="Criar cartão"
      />
    </main>
  );
}
