import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { CategoryForm } from "../CategoryForm";
import { createCategoryAction, type ActionResult } from "../actions";

async function action(_prev: ActionResult, formData: FormData) {
  "use server";
  return createCategoryAction(formData);
}

export default function NewCategoryPage() {
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

      <CategoryForm action={action} submitLabel="Criar categoria" />
    </main>
  );
}
