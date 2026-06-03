"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  FREQUENCIES,
  frequencyLabels,
} from "@/lib/validation/fixed_expense";
import type {
  FixedExpenseFrequency,
} from "@/lib/types/database";
import type { AccountRow } from "@/lib/db/accounts";
import type { CategoryRow } from "@/lib/db/categories";
import type { ActionResult } from "./actions";

const initialState: ActionResult = { ok: true };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="h-14 text-base w-full"
    >
      {pending ? "Salvando…" : label}
    </Button>
  );
}

type Props = {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  accounts: AccountRow[];
  categories: CategoryRow[];
  defaultValues?: {
    description?: string;
    amount?: string;
    frequency?: FixedExpenseFrequency;
    custom_interval_days?: number | null;
    next_due_date?: string;
    category_id?: string | null;
    default_account_id?: string | null;
    notes?: string | null;
  };
  submitLabel?: string;
};

export function FixedExpenseForm({
  action,
  accounts,
  categories,
  defaultValues,
  submitLabel = "Salvar",
}: Props) {
  const [state, formAction] = useActionState(action, initialState);
  const fieldErrors = !state.ok ? (state.fieldErrors ?? {}) : {};
  const globalError = !state.ok ? state.error : null;

  const [frequency, setFrequency] = useState<FixedExpenseFrequency>(
    defaultValues?.frequency ?? "monthly",
  );

  // Categorias de saída (cost/expense/tax)
  const expenseCategories = categories.filter(
    (c) => c.dre_type !== "revenue",
  );

  return (
    <form action={formAction} className="space-y-5">
      {/* Descrição */}
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
          placeholder="Ex.: Aluguel do escritório"
          className={cn(
            "h-12",
            fieldErrors.description ? "border-destructive" : "",
          )}
        />
        {fieldErrors.description ? (
          <p className="text-sm text-destructive">{fieldErrors.description}</p>
        ) : null}
      </div>

      {/* Valor */}
      <div className="space-y-1.5">
        <Label htmlFor="amount">Valor (R$)</Label>
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
              "h-12 pl-12 text-lg font-semibold text-right",
              fieldErrors.amount ? "border-destructive" : "",
            )}
          />
        </div>
        {fieldErrors.amount ? (
          <p className="text-sm text-destructive">{fieldErrors.amount}</p>
        ) : null}
      </div>

      {/* Frequência */}
      <div className="space-y-1.5">
        <Label htmlFor="frequency">Frequência</Label>
        <select
          id="frequency"
          name="frequency"
          required
          value={frequency}
          onChange={(e) =>
            setFrequency(e.target.value as FixedExpenseFrequency)
          }
          className="w-full h-12 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {FREQUENCIES.map((f) => (
            <option key={f} value={f}>
              {frequencyLabels[f]}
            </option>
          ))}
        </select>

        {frequency === "custom" ? (
          <div className="pt-2">
            <Label htmlFor="custom_interval_days">Intervalo em dias</Label>
            <Input
              id="custom_interval_days"
              name="custom_interval_days"
              type="number"
              min={1}
              max={365}
              inputMode="numeric"
              defaultValue={defaultValues?.custom_interval_days ?? ""}
              placeholder="30"
              className={cn(
                "h-12 mt-1",
                fieldErrors.custom_interval_days ? "border-destructive" : "",
              )}
            />
            {fieldErrors.custom_interval_days ? (
              <p className="text-sm text-destructive">
                {fieldErrors.custom_interval_days}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Próximo vencimento */}
      <div className="space-y-1.5">
        <Label htmlFor="next_due_date">Próximo vencimento</Label>
        <Input
          id="next_due_date"
          name="next_due_date"
          type="date"
          required
          defaultValue={defaultValues?.next_due_date ?? ""}
          className={cn(
            "h-12",
            fieldErrors.next_due_date ? "border-destructive" : "",
          )}
        />
        {fieldErrors.next_due_date ? (
          <p className="text-sm text-destructive">{fieldErrors.next_due_date}</p>
        ) : null}
      </div>

      {/* Categoria */}
      <div className="space-y-1.5">
        <Label htmlFor="category_id">
          Categoria{" "}
          <span className="text-muted-foreground">(opcional)</span>
        </Label>
        <select
          id="category_id"
          name="category_id"
          defaultValue={defaultValues?.category_id ?? ""}
          className="w-full h-12 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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

      {/* Conta padrão */}
      <div className="space-y-1.5">
        <Label htmlFor="default_account_id">
          Conta padrão{" "}
          <span className="text-muted-foreground">(opcional)</span>
        </Label>
        <select
          id="default_account_id"
          name="default_account_id"
          defaultValue={defaultValues?.default_account_id ?? ""}
          className="w-full h-12 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Não definida</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Pré-seleciona esta conta ao informar pagamento.
        </p>
      </div>

      {/* Notas */}
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
