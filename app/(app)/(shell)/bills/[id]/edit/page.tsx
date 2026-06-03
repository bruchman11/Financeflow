import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { listCategories } from "@/lib/db/categories";
import { getBill } from "@/lib/db/bills";
import { formatNumber } from "@/lib/format/currency";
import { BillForm } from "../../BillForm";
import { updateBillAction } from "../../actions";

export default async function EditBillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [bill, categories] = await Promise.all([
    getBill(id),
    listCategories({ includeArchived: false }),
  ]);
  if (!bill) notFound();

  const bound = updateBillAction.bind(null, id);

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
        <h1 className="text-xl font-semibold truncate">{bill.description}</h1>
      </header>

      <BillForm
        action={bound}
        categories={categories}
        defaultValues={{
          description: bill.description,
          beneficiary_name: bill.beneficiary_name,
          amount: formatNumber(bill.amount),
          due_date: bill.due_date,
          competence_date: bill.competence_date,
          category_id: bill.category_id,
          barcode: bill.barcode,
          digitable_line: bill.digitable_line,
          notes: bill.notes,
        }}
        submitLabel="Salvar alterações"
      />
    </main>
  );
}
