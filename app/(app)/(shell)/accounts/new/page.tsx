import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { AccountForm } from "../AccountForm";
import { createAccountAction, type ActionResult } from "../actions";

async function action(_prev: ActionResult, formData: FormData) {
  "use server";
  return createAccountAction(formData);
}

export default function NewAccountPage() {
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
          Cadastro
        </p>
        <h1 className="text-2xl font-semibold">Nova conta</h1>
      </header>

      <AccountForm action={action} submitLabel="Criar conta" />
    </main>
  );
}
