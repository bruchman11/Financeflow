"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CategoryRow } from "@/lib/db/categories";
import type { ActionResult } from "./actions";

const initialState: ActionResult = { ok: true };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="h-14 text-base w-full">
      {pending ? "Salvando…" : label}
    </Button>
  );
}

type Props = {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  categories: CategoryRow[];
  defaultValues?: {
    description?: string;
    beneficiary_name?: string | null;
    amount?: string;
    due_date?: string;
    competence_date?: string | null;
    category_id?: string | null;
    barcode?: string | null;
    digitable_line?: string | null;
    notes?: string | null;
  };
  submitLabel?: string;
};

export function BillForm({
  action,
  categories,
  defaultValues,
  submitLabel = "Salvar",
}: Props) {
  const [state, formAction] = useActionState(action, initialState);
  const fieldErrors = !state.ok ? (state.fieldErrors ?? {}) : {};
  const globalError = !state.ok ? state.error : null;

  const dueDate = defaultValues?.due_date ?? "";
  const competence = defaultValues?.competence_date ?? null;
  const competenceDiffers = competence !== null && competence !== dueDate;

  const [showCompetence, setShowCompetence] = useState(competenceDiffers);
  const [showAdvanced, setShowAdvanced] = useState(
    Boolean(defaultValues?.barcode || defaultValues?.digitable_line),
  );

  const expenseCategories = categories.filter((c) => c.dre_type !== "revenue");

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="description">Descrição</Label>
        <Input
          id="description"
          name="description"
          type="text"
          required
          autoFocus={!defaultValues?.description}
          defaultValue={defaultValues?.description ?? ""}
          maxLength={120}
          placeholder="Ex.: Conta de energia"
          className={cn(
            "h-12",
            fieldErrors.description ? "border-destructive" : "",
          )}
        />
        {fieldErrors.description ? (
          <p className="text-sm text-destructive">{fieldErrors.description}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="beneficiary_name">
          Beneficiário{" "}
          <span className="text-muted-foreground">(opcional)</span>
        </Label>
        <Input
          id="beneficiary_name"
          name="beneficiary_name"
          type="text"
          defaultValue={defaultValues?.beneficiary_name ?? ""}
          maxLength={120}
          placeholder="Ex.: CEMIG"
          className="h-12"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="amount">Valor</Label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base text-muted-foreground select-none">
            R$
          </span>
          <Input
            id="amount"
            name="amount"
            type="text"
            inputMode="decimal"
            required
            defaultValue={defaultValues?.amount ?? ""}
            placeholder="0,00"
            className={cn(
              "h-14 pl-12 text-xl font-bold text-right",
              fieldErrors.amount ? "border-destructive" : "",
            )}
          />
        </div>
        {fieldErrors.amount ? (
          <p className="text-sm text-destructive">{fieldErrors.amount}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="due_date">Vencimento</Label>
        <Input
          id="due_date"
          name="due_date"
          type="date"
          required
          defaultValue={dueDate}
          className={cn(
            "h-12",
            fieldErrors.due_date ? "border-destructive" : "",
          )}
        />
        {fieldErrors.due_date ? (
          <p className="text-sm text-destructive">{fieldErrors.due_date}</p>
        ) : null}
      </div>

      {/* Competência opcional */}
      {showCompetence ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="competence_date">Data de competência</Label>
            <button
              type="button"
              onClick={() => setShowCompetence(false)}
              className="text-xs text-muted-foreground underline"
            >
              usar vencimento
            </button>
          </div>
          <Input
            id="competence_date"
            name="competence_date"
            type="date"
            defaultValue={competence ?? dueDate}
            className="h-12"
          />
          <p className="text-xs text-muted-foreground">
            Mês contábil em que a despesa deve aparecer no regime de
            competência.
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowCompetence(true)}
          className="text-xs text-muted-foreground underline self-start"
        >
          Alterar data de competência
        </button>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="category_id">
          Categoria{" "}
          <span className="text-muted-foreground">(opcional)</span>
        </Label>
        <select
          id="category_id"
          name="category_id"
          defaultValue={defaultValues?.category_id ?? ""}
          className="w-full h-12 px-3 rounded-lg border border-input bg-background text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Sem categoria</option>
          {expenseCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {" ".repeat((c.level - 1) * 2)}
              {c.code} {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Avançado: códigos de barras e linha digitável */}
      {showAdvanced ? (
        <div className="space-y-3 surface/50 px-3 py-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Identificação do boleto
            </p>
            <button
              type="button"
              onClick={() => setShowAdvanced(false)}
              className="text-xs text-muted-foreground underline"
            >
              ocultar
            </button>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="barcode">Código de barras</Label>
            <Input
              id="barcode"
              name="barcode"
              type="text"
              maxLength={60}
              defaultValue={defaultValues?.barcode ?? ""}
              className="h-12 tabular-nums text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="digitable_line">Linha digitável</Label>
            <Input
              id="digitable_line"
              name="digitable_line"
              type="text"
              maxLength={60}
              defaultValue={defaultValues?.digitable_line ?? ""}
              className="h-12 tabular-nums text-sm"
            />
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAdvanced(true)}
          className="text-xs text-muted-foreground underline self-start"
        >
          Adicionar código de barras / linha digitável
        </button>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="notes">
          Observações{" "}
          <span className="text-muted-foreground">(opcional)</span>
        </Label>
        <Input
          id="notes"
          name="notes"
          type="text"
          maxLength={500}
          defaultValue={defaultValues?.notes ?? ""}
          className="h-12"
        />
      </div>

      {globalError ? (
        <p className="text-sm text-destructive" role="alert">
          {globalError}
        </p>
      ) : null}

      <SubmitButton label={submitLabel} />
    </form>
  );
}
