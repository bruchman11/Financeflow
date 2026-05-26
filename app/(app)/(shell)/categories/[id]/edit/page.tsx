import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getCategory } from "@/lib/db/categories";
import {
  CATEGORY_COLORS,
  DEFAULT_CATEGORY_COLOR,
  type CategoryColor,
} from "@/lib/validation/category";
import { CategoryForm } from "../../CategoryForm";
import {
  toggleCategoryArchivedAction,
  updateCategoryAction,
  type ActionResult,
} from "../../actions";

function normalizeColor(value: string | null): CategoryColor {
  const lower = (value ?? "").toLowerCase();
  return (CATEGORY_COLORS as readonly string[]).includes(lower)
    ? (lower as CategoryColor)
    : DEFAULT_CATEGORY_COLOR;
}

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const category = await getCategory(id);
  if (!category) notFound();

  async function action(_prev: ActionResult, formData: FormData) {
    "use server";
    return updateCategoryAction(id, formData);
  }

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
        <h1 className="text-2xl font-semibold truncate">{category.name}</h1>
      </header>

      <CategoryForm
        action={action}
        defaultValues={{
          name: category.name,
          type: category.type,
          color: normalizeColor(category.color),
        }}
        submitLabel="Salvar alterações"
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
