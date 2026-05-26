"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  TRANSACTION_TYPES,
  transactionTypeLabels,
} from "@/lib/validation/transaction";
import type { TransactionType } from "@/lib/types/database";
import type { AccountRow } from "@/lib/db/accounts";
import type { CategoryRow } from "@/lib/db/categories";
import type { ActionResult } from "./actions";

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
    type?: TransactionType;
    amount?: string;
    account_id?: string;
    category_id?: string | null;
    occurred_on?: string;
    description?: string | null;
  };
  submitLabel?: string;
};

export function TransactionForm({
  action,
  accounts,
  categories,
  defaultValues,
  submitLabel = "Salvar",
}: Props) {
  const [state, formAction] = useActionState(action, { ok: true } as ActionResult);
  const fieldErrors = !state.ok ? (state.fieldErrors ?? {}) : {};
  const globalError = !state.ok ? state.error : null;

  const [type, setType] = useState<TransactionType>(
    defaultValues?.type ?? "expense",
  );
  const [selectedCategory, setSelectedCategory] = useState(
    defaultValues?.category_id ?? "",
  );

  // UUID gerado uma vez por montagem — protege contra duplo envio em retry de rede
  const clientRequestId = useRef(
    typeof crypto !== "undefined" ? crypto.randomUUID() : "",
  );

  const filteredCategories = categories.filter((c) => c.type === type);

  function handleTypeChange(newType: TransactionType) {
    setType(newType);
    const stillValid = categories
      .filter((c) => c.type === newType)
      .some((c) => c.id === selectedCategory);
    if (!stillValid) setSelectedCategory("");
  }

  return (
    <form action={formAction} className="space-y-5">
      <input
        type="hidden"
        name="client_request_id"
        value={clientRequestId.current}
      />

      {/* Tipo (Entrada / Saída) */}
      <div
        role="radiogroup"
        aria-label="Tipo de movimentação"
        className="grid grid-cols-2 gap-2"
      >
        {TRANSACTION_TYPES.map((t) => {
          const active = t === type;
          return (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => handleTypeChange(t)}
              className={cn(
                "h-12 rounded-md border text-sm font-semibold transition-colors",
                t === "expense"
                  ? active
                    ? "bg-destructive text-destructive-foreground border-destructive"
                    : "bg-background text-foreground border-input hover:bg-muted"
                  : active
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-background text-foreground border-input hover:bg-muted",
              )}
            >
              {transactionTypeLabels[t]}
            </button>
          );
        })}
      </div>
      <input type="hidden" name="type" value={type} />

      {/* Valor — campo principal, foco automático, teclado numérico */}
      <div className="space-y-1.5">
        <Label htmlFor="amount" className="sr-only">
          Valor
        </Label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl text-muted-foreground select-none">
            R$
          </span>
          <Input
            id="amount"
            name="amount"
            type="text"
            inputMode="decimal"
            autoFocus
            required
            defaultValue={defaultValues?.amount ?? ""}
            placeholder="0,00"
            className={cn(
              "h-20 pl-14 text-4xl font-bold tracking-tight text-center pr-4",
              fieldErrors.amount ? "border-destructive" : "",
            )}
            aria-invalid={Boolean(fieldErrors.amount) || undefined}
          />
        </div>
        {fieldErrors.amount ? (
          <p className="text-sm text-destructive">{fieldErrors.amount}</p>
        ) : null}
      </div>

      {/* Conta */}
      <div className="space-y-1.5">
        <Label htmlFor="account_id">Conta</Label>
        <select
          id="account_id"
          name="account_id"
          required
          defaultValue={defaultValues?.account_id ?? accounts[0]?.id ?? ""}
          className={cn(
            "w-full h-12 px-3 rounded-md border border-input bg-background text-sm",
            "focus:outline-none focus:ring-2 focus:ring-ring",
            fieldErrors.account_id ? "border-destructive" : "",
          )}
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        {fieldErrors.account_id ? (
          <p className="text-sm text-destructive">{fieldErrors.account_id}</p>
        ) : null}
      </div>

      {/* Categoria (filtrada por tipo) */}
      <div className="space-y-1.5">
        <Label htmlFor="category_id">
          Categoria{" "}
          <span className="text-muted-foreground">(opcional)</span>
        </Label>
        <select
          id="category_id"
          name="category_id"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full h-12 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Sem categoria</option>
          {filteredCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Data */}
      <div className="space-y-1.5">
        <Label htmlFor="occurred_on">Data</Label>
        <Input
          id="occurred_on"
          name="occurred_on"
          type="date"
          required
          defaultValue={defaultValues?.occurred_on ?? ""}
          className={cn(
            "h-12",
            fieldErrors.occurred_on ? "border-destructive" : "",
          )}
          aria-invalid={Boolean(fieldErrors.occurred_on) || undefined}
        />
        {fieldErrors.occurred_on ? (
          <p className="text-sm text-destructive">{fieldErrors.occurred_on}</p>
        ) : null}
      </div>

      {/* Descrição */}
      <div className="space-y-1.5">
        <Label htmlFor="description">
          Descrição{" "}
          <span className="text-muted-foreground">(opcional)</span>
        </Label>
        <Input
          id="description"
          name="description"
          type="text"
          defaultValue={defaultValues?.description ?? ""}
          placeholder="Ex.: Aluguel de maio"
          maxLength={255}
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
