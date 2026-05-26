"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Upload, CheckCircle2, AlertCircle, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ImportResult } from "../actions";
import { importTransactionsAction } from "../actions";

const initialState: ImportResult = { ok: "idle" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="h-14 text-base w-full gap-2"
    >
      <Upload className="size-4" />
      {pending ? "Importando…" : "Importar"}
    </Button>
  );
}

export function ImportForm() {
  const [state, formAction] = useActionState(importTransactionsAction, initialState);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <form action={formAction} className="space-y-5">
      {/* Área de upload */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            "w-full rounded-xl border-2 border-dashed border-input px-4 py-10",
            "flex flex-col items-center gap-3 transition-colors",
            "hover:border-foreground/40 hover:bg-muted/50",
            fileName ? "border-foreground/40 bg-muted/30" : "",
          )}
        >
          <FileSpreadsheet className="size-8 text-muted-foreground" />
          {fileName ? (
            <span className="text-sm font-medium text-center break-all">
              {fileName}
            </span>
          ) : (
            <>
              <span className="text-sm font-medium">
                Toque para selecionar o arquivo
              </span>
              <span className="text-xs text-muted-foreground">
                .xlsx ou .xls · máximo 5 MB
              </span>
            </>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          name="file"
          accept=".xlsx,.xls"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setFileName(f?.name ?? null);
          }}
        />
      </div>

      {/* Resultado da importação anterior */}
      {state.ok === true && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              {state.inserted} movimentação{state.inserted !== 1 ? "s" : ""} importada
              {state.inserted !== 1 ? "s" : ""}
              {state.skipped > 0 ? ` · ${state.skipped} ignorada${state.skipped !== 1 ? "s" : ""}` : ""}
            </p>
          </div>
          {state.errors.length > 0 && (
            <ul className="space-y-1 pl-6">
              {state.errors.map((e, i) => (
                <li key={i} className="text-xs text-amber-700 dark:text-amber-400">
                  {e.row > 0 ? `Linha ${e.row}: ` : ""}{e.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {state.ok === false && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-2">
          <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{state.error}</p>
        </div>
      )}

      <SubmitButton />
    </form>
  );
}
