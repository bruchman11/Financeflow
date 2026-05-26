import type { Metadata } from "next";
import Link from "next/link";
import { ArchiveRestore, Pencil, Plus, Wallet } from "lucide-react";

export const metadata: Metadata = { title: "Contas — FinanceFlow" };
import { listAccounts } from "@/lib/db/accounts";
import { accountKindLabels } from "@/lib/validation/account";
import { formatBRL } from "@/lib/format/currency";
import { buttonVariants } from "@/components/ui/button";
import { toggleAccountArchivedAction } from "./actions";

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const params = await searchParams;
  const showArchived = params.archived === "1";

  const accounts = await listAccounts({ includeArchived: true });
  const active = accounts.filter((a) => !a.is_archived);
  const archived = accounts.filter((a) => a.is_archived);

  return (
    <main className="flex-1 flex flex-col px-4 py-6 gap-6">
      <header className="space-y-1 px-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">
          Cadastro
        </p>
        <h1 className="text-2xl font-semibold">Contas</h1>
      </header>

      {active.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center space-y-1">
          <p className="text-sm font-medium">Nenhuma conta ativa</p>
          <p className="text-xs text-muted-foreground">
            Crie uma conta para começar a lançar movimentações.
          </p>
        </div>
      ) : (
        <ul className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
          {active.map((a) => (
            <li key={a.id}>
              <Link
                href={`/accounts/${a.id}/edit`}
                className="flex items-center gap-3 px-4 py-3 min-h-[64px] hover:bg-muted transition-colors"
              >
                <div className="size-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                  <Wallet className="size-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight truncate">
                    {a.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {accountKindLabels[a.kind]} · saldo inicial{" "}
                    {formatBRL(a.opening_balance)}
                  </p>
                </div>
                <Pencil
                  className="size-4 text-muted-foreground shrink-0"
                  aria-label="Editar"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/accounts/new"
        className={buttonVariants({
          variant: "outline",
          className: "h-12 text-base w-full",
        })}
      >
        <Plus className="size-4" />
        Nova conta
      </Link>

      {archived.length > 0 ? (
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-medium text-muted-foreground">
              Arquivadas ({archived.length})
            </h2>
            <Link
              href={showArchived ? "/accounts" : "/accounts?archived=1"}
              className="text-xs text-muted-foreground underline"
            >
              {showArchived ? "Ocultar" : "Mostrar"}
            </Link>
          </div>

          {showArchived ? (
            <ul className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
              {archived.map((a) => (
                <li key={a.id}>
                  <div className="flex items-center gap-3 px-4 py-3 min-h-[64px] opacity-70">
                    <div className="size-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                      <Wallet className="size-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight truncate">
                        {a.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {accountKindLabels[a.kind]}
                      </p>
                    </div>
                    <form action={toggleAccountArchivedAction}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="archived" value="0" />
                      <button
                        type="submit"
                        aria-label="Desarquivar"
                        className="size-9 rounded-md inline-flex items-center justify-center hover:bg-muted active:bg-muted transition-colors"
                      >
                        <ArchiveRestore className="size-4 text-muted-foreground" />
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
