import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getAccount } from "@/lib/db/accounts";
import { formatNumber } from "@/lib/format/currency";
import { AccountForm } from "../../AccountForm";
import {
  toggleAccountArchivedAction,
  updateAccountAction,
  type ActionResult,
} from "../../actions";

export default async function EditAccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const account = await getAccount(id);
  if (!account) notFound();

  async function action(_prev: ActionResult, formData: FormData) {
    "use server";
    return updateAccountAction(id, formData);
  }

  return (
    <main className="flex-1 flex flex-col px-6 py-6 gap-6">
      <Link
        href="/accounts"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground self-start"
      >
        <ChevronLeft className="size-4" />
        Voltar
      </Link>

      <header className="space-y-1">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">
          Editar conta
        </p>
        <h1 className="text-2xl font-semibold truncate">{account.name}</h1>
      </header>

      <AccountForm
        action={action}
        defaultValues={{
          name: account.name,
          kind: account.kind,
          opening_balance: formatNumber(account.opening_balance),
        }}
        submitLabel="Salvar alterações"
      />

      <div className="pt-2 border-t border-border">
        <form action={toggleAccountArchivedAction}>
          <input type="hidden" name="id" value={account.id} />
          <input
            type="hidden"
            name="archived"
            value={account.is_archived ? "0" : "1"}
          />
          <button
            type="submit"
            className="h-12 w-full text-sm text-muted-foreground hover:text-foreground underline"
          >
            {account.is_archived ? "Desarquivar conta" : "Arquivar conta"}
          </button>
        </form>
      </div>
    </main>
  );
}
