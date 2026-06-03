import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { listCategories } from "@/lib/db/categories";
import { todayISO } from "@/lib/format/date";
import { BillForm } from "../BillForm";
import { createBillAction } from "../actions";

export default async function NewBillPage() {
  const categories = await listCategories({ includeArchived: false });

  return (
    <main className="flex-1 flex flex-col px-4 py-4 gap-6">
      <header className="flex items-center gap-2">
        <Link
          href="/bills"
          className="size-9 inline-flex items-center justify-center rounded-md hover:bg-muted -ml-1"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-xl font-semibold">Novo boleto</h1>
      </header>

      <BillForm
        action={createBillAction}
        categories={categories}
        defaultValues={{ due_date: todayISO() }}
        submitLabel="Criar boleto"
      />
    </main>
  );
}
