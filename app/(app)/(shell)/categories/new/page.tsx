import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { listCategories } from "@/lib/db/categories";
import { CategoryForm } from "../CategoryForm";
import { createCategoryAction } from "../actions";

export default async function NewCategoryPage() {
  // Mapa de codes para preview do parent no form
  const rows = await listCategories({ includeArchived: false });
  const existingCodes = Object.fromEntries(
    rows.map((r) => [r.code, { name: r.name, dre_type: r.dre_type }]),
  );

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
          Cadastro
        </p>
        <h1 className="text-2xl font-semibold">Nova categoria</h1>
      </header>

      <CategoryForm
        action={createCategoryAction}
        submitLabel="Criar categoria"
        existingCodes={existingCodes}
      />
    </main>
  );
}
