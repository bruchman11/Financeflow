import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getCategory, listCategories } from "@/lib/db/categories";
import { CategoryForm } from "../../CategoryForm";
import {
  toggleCategoryArchivedAction,
  updateCategoryAction,
} from "../../actions";

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [category, rows] = await Promise.all([
    getCategory(id),
    listCategories({ includeArchived: false }),
  ]);
  if (!category) notFound();

  const existingCodes = Object.fromEntries(
    rows
      .filter((r) => r.id !== id)
      .map((r) => [r.code, { name: r.name, dre_type: r.dre_type }]),
  );

  const boundUpdate = updateCategoryAction.bind(null, id);

  return (
    <main className="flex-1 flex flex-col px-6 py-6 gap-6">
      <Link
        href="/categories"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground self-start"
      >
        <ChevronLeft className="size-4" />
        Voltar
      </Link>

      <header className="space-y-1">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">
          Editar categoria
        </p>
        <h1 className="text-2xl font-semibold truncate">
          {category.code} {category.name}
        </h1>
      </header>

      <CategoryForm
        action={boundUpdate}
        defaultValues={{
          code: category.code,
          name: category.name,
          dre_type: category.dre_type,
          color: category.color,
        }}
        submitLabel="Salvar alterações"
        existingCodes={existingCodes}
      />

      <div className="pt-2 border-t border-border">
        <form action={toggleCategoryArchivedAction}>
          <input type="hidden" name="id" value={category.id} />
          <input
            type="hidden"
            name="archived"
            value={category.is_archived ? "0" : "1"}
          />
          <button
            type="submit"
            className="h-12 w-full text-sm text-muted-foreground hover:text-foreground underline"
          >
            {category.is_archived
              ? "Desarquivar categoria"
              : "Arquivar categoria"}
          </button>
        </form>
      </div>
    </main>
  );
}
