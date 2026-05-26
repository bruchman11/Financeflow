import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { ImportForm } from "./ImportForm";

export const metadata: Metadata = { title: "Importar movimentações — FinanceFlow" };

export default function ImportTransactionsPage() {
  return (
    <main className="flex-1 flex flex-col px-4 py-4 gap-6">
      <header className="flex items-center gap-2">
        <Link
          href="/transactions"
          className="size-9 inline-flex items-center justify-center rounded-md hover:bg-muted -ml-1"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-xl font-semibold">Importar movimentações</h1>
      </header>

      {/* Instruções */}
      <section className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold">Como importar</h2>
        <ol className="space-y-1.5 pl-4 list-decimal">
          <li className="text-sm text-muted-foreground">
            Baixe o modelo Excel com o formato correto.
          </li>
          <li className="text-sm text-muted-foreground">
            Preencha as colunas: <strong className="text-foreground">Data</strong>,{" "}
            <strong className="text-foreground">Tipo</strong> (Entrada ou Saída),{" "}
            <strong className="text-foreground">Valor</strong>,{" "}
            <strong className="text-foreground">Conta</strong> e opcionalmente{" "}
            Categoria e Descrição.
          </li>
          <li className="text-sm text-muted-foreground">
            Os nomes de <strong className="text-foreground">Conta</strong> e{" "}
            <strong className="text-foreground">Categoria</strong> devem ser
            idênticos aos cadastrados no app.
          </li>
          <li className="text-sm text-muted-foreground">
            Faça o upload do arquivo preenchido.
          </li>
        </ol>

        <a
          href="/api/transactions/export?template=1"
          download
          className="inline-flex items-center gap-2 text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          <Download className="size-4" />
          Baixar modelo Excel
        </a>
      </section>

      <ImportForm />
    </main>
  );
}
