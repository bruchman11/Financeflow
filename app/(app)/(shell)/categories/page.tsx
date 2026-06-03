import type { Metadata } from "next";
import Link from "next/link";
import { ArchiveRestore, Pencil, Plus, Tags } from "lucide-react";
import {
  listCategories,
  buildCategoryTree,
  type CategoryNode,
} from "@/lib/db/categories";
import { dreTypeLabels, dreTypeColors } from "@/lib/validation/category";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { toggleCategoryArchivedAction } from "./actions";

export const metadata: Metadata = { title: "Categorias — FinanceFlow" };

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const params = await searchParams;
  const showArchived = params.archived === "1";

  const rows = await listCategories({ includeArchived: true });
  const activeRows = rows.filter((r) => !r.is_archived);
  const archivedRows = rows.filter((r) => r.is_archived);
  const tree = buildCategoryTree(activeRows);

  return (
    <main className="flex-1 flex flex-col px-4 py-6 gap-6">
      <header className="space-y-1 px-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">
          Cadastro
        </p>
        <h1 className="text-2xl font-semibold">Categorias</h1>
        <p className="text-xs text-muted-foreground">
          Estrutura DRE: receita, custo, despesa e imposto. Use códigos como
          01, 01.01, 01.01.01 para criar a hierarquia.
        </p>
      </header>

      {tree.length === 0 ? (
        <EmptyState
          compact
          className="rounded-lg border border-dashed border-border"
          icon={Tags}
          title="Nenhuma categoria ativa"
          description="Crie a primeira categoria para organizar suas movimentações."
        />
      ) : (
        <ul className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
          {flatten(tree).map((node) => (
            <CategoryRow key={node.id} node={node} />
          ))}
        </ul>
      )}

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

      {archivedRows.length > 0 ? (
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-medium text-muted-foreground">
              Arquivadas ({archivedRows.length})
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
              {archivedRows.map((a) => (
                <li key={a.id}>
                  <div className="flex items-center gap-3 px-4 py-3 min-h-[56px] opacity-70">
                    <span className="text-xs text-muted-foreground tabular-nums w-12 shrink-0">
                      {a.code}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight truncate">
                        {a.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {dreTypeLabels[a.dre_type]}
                      </p>
                    </div>
                    <form action={toggleCategoryArchivedAction}>
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

/** Flatten preservando ordem hierárquica (raiz → filhos) para render linear. */
function flatten(nodes: CategoryNode[]): CategoryNode[] {
  const out: CategoryNode[] = [];
  const walk = (ns: CategoryNode[]) => {
    for (const n of ns) {
      out.push(n);
      if (n.children.length > 0) walk(n.children);
    }
  };
  walk(nodes);
  return out;
}

function CategoryRow({ node }: { node: CategoryNode }) {
  const indent = (node.level - 1) * 16; // 16px por nível
  const color = node.color ?? dreTypeColors[node.dre_type];
  return (
    <li>
      <Link
        href={`/categories/${node.id}/edit`}
        className="flex items-center gap-3 px-4 py-3 min-h-[56px] hover:bg-muted transition-colors"
        style={{ paddingLeft: `${16 + indent}px` }}
      >
        <span
          className="size-2.5 rounded-full shrink-0"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        <span
          className={cn(
            "text-xs tabular-nums shrink-0 text-muted-foreground",
            node.level === 1 ? "font-semibold text-foreground" : "",
          )}
        >
          {node.code}
        </span>
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-sm leading-tight truncate",
              node.level === 1 ? "font-semibold" : "",
            )}
          >
            {node.name}
          </p>
          {node.level === 1 ? (
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {dreTypeLabels[node.dre_type]}
            </p>
          ) : null}
        </div>
        <Pencil
          className="size-4 text-muted-foreground shrink-0"
          aria-label="Editar"
        />
      </Link>
    </li>
  );
}
