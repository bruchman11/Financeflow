import type { Metadata } from "next";
import Link from "next/link";
import { ArchiveRestore, Pencil, Plus } from "lucide-react";

export const metadata: Metadata = { title: "Categorias — FinanceFlow" };
import { listCategories, type CategoryRow } from "@/lib/db/categories";
import {
  DEFAULT_CATEGORY_COLOR,
  transactionTypeLabels,
} from "@/lib/validation/category";
import { buttonVariants } from "@/components/ui/button";
import { toggleCategoryArchivedAction } from "./actions";

function Dot({ color }: { color: string | null }) {
  return (
    <span
      aria-hidden
      className="size-3 rounded-full shrink-0"
      style={{ backgroundColor: color ?? DEFAULT_CATEGORY_COLOR }}
    />
  );
}

function Section({
  title,
  items,
}: {
  title: string;
  items: CategoryRow[];
}) {
  if (items.length === 0) {
    return (
      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground px-2">
          {title}
        </h2>
        <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center">
          <p className="text-xs text-muted-foreground">Nenhuma categoria.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium text-muted-foreground px-2">
        {title}
      </h2>
      <ul className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
        {items.map((c) => (
          <li key={c.id}>
            <Link
              href={`/categories/${c.id}/edit`}
              className="flex items-center gap-3 px-4 py-3 min-h-[56px] hover:bg-muted transition-colors"
            >
              <Dot color={c.color} />
              <p className="flex-1 min-w-0 text-sm font-medium truncate">
                {c.name}
              </p>
              <Pencil
                className="size-4 text-muted-foreground shrink-0"
                aria-label="Editar"
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const params = await searchParams;
  const showArchived = params.archived === "1";

  const all = await listCategories({ includeArchived: true });
  const active = all.filter((c) => !c.is_archived);
  const archived = all.filter((c) => c.is_archived);
  const incomes = active.filter((c) => c.type === "income");
  const expenses = active.filter((c) => c.type === "expense");

  return (
    <main className="flex-1 flex flex-col px-4 py-6 gap-6">
      <header className="space-y-1 px-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">
          Cadastro
        </p>
        <h1 className="text-2xl font-semibold">Categorias</h1>
      </header>

      <Section title={transactionTypeLabels.income + "s"} items={incomes} />
      <Section title={transactionTypeLabels.expense + "s"} items={expenses} />

      <Link
        href="/categories/new"
        className={buttonVariants({
          variant: "outline",
          className: "h-12 text-base w-full",
        })}
      >
        <Plus className="size-4" />
        Nova categoria
      </Link>

      {archived.length > 0 ? (
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-medium text-muted-foreground">
              Arquivadas ({archived.length})
            </h2>
            <Link
              href={showArchived ? "/categories" : "/categories?archived=1"}
              className="text-xs text-muted-foreground underline"
            >
              {showArchived ? "Ocultar" : "Mostrar"}
            </Link>
          </div>

          {showArchived ? (
            <ul className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
              {archived.map((c) => (
                <li key={c.id}>
                  <div className="flex items-center gap-3 px-4 py-3 min-h-[56px] opacity-70">
                    <Dot color={c.color} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight truncate">
                        {c.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {transactionTypeLabels[c.type]}
                      </p>
                    </div>
                    <form action={toggleCategoryArchivedAction}>
                      <input type="hidden" name="id" value={c.id} />
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
