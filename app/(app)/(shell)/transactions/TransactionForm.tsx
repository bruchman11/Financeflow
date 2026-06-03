"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { RotateCcw } from "lucide-react";
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
    competence_date?: string | null;
    description?: string | null;
  };
  /** Semente do atalho "repetir último" (tipo/conta/categoria do lançamento anterior). */
  repeat?: {
    type: TransactionType;
    accountId: string;
    categoryId: string;
    label: string;
  } | null;
  submitLabel?: string;
};

export function TransactionForm({
  action,
  accounts,
  categories,
  defaultValues,
  repeat,
  submitLabel = "Salvar",
}: Props) {
  const [state, formAction] = useActionState(action, { ok: true } as ActionResult);
  const fieldErrors = !state.ok ? (state.fieldErrors ?? {}) : {};
  const globalError = !state.ok ? state.error : null;

  const [type, setType] = useState<TransactionType>(
    defaultValues?.type ?? "expense",
  );
  const [account, setAccount] = useState(
    defaultValues?.account_id ?? accounts[0]?.id ?? "",
  );
  const [selectedCategory, setSelectedCategory] = useState(
    defaultValues?.category_id ?? "",
  );

  // UUID gerado uma vez por montagem — protege contra duplo envio em retry de rede
  const clientRequestId = useRef(
    typeof crypto !== "undefined" ? crypto.randomUUID() : "",
  );

  // Income → categorias revenue. Expense → cost / expense / tax.
  const matchesType = (dreType: string, txType: TransactionType) =>
    txType === "income"
      ? dreType === "revenue"
      : dreType === "cost" || dreType === "expense" || dreType === "tax";

  const filteredCategories = categories.filter((c) =>
    matchesType(c.dre_type, type),
  );

  function handleTypeChange(newType: TransactionType) {
    setType(newType);
    const stillValid = categories
      .filter((c) => matchesType(c.dre_type, newType))
      .some((c) => c.id === selectedCategory);
    if (!stillValid) setSelectedCategory("");
  }

  function applyRepeat() {
    if (!repeat) return;
    setType(repeat.type);
    setAccount(repeat.accountId);
    setSelectedCategory(repeat.categoryId);
  }

  return (
    <form action={formAction} className="space-y-5">
      <input
        type="hidden"
        name="client_request_id"
        value={clientRequestId.current}
      />

      {/* Atalho: repetir último lançamento (tipo/conta/categoria) */}
      {repeat ? (
        <button
          type="button"
          onClick={applyRepeat}
          className="flex items-center gap-2 w-full min-h-11 rounded-md border border-input bg-muted/40 px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
        >
          <RotateCcw className="size-4 shrink-0" />
          <span className="truncate">
            Repetir último:{" "}
            <span className="text-foreground font-medium">{repeat.label}</span>
          </span>
        </button>
      ) : null}

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
                    ? "bg-expense text-white border-expense"
                    : "bg-background text-foreground border-input hover:bg-muted"
                  : active
                    ? "bg-income text-white border-income"
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
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          className={cn(
            "w-full h-12 px-3 rounded-lg border border-input bg-background text-base md:text-sm",
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
          className="w-full h-12 px-3 rounded-lg border border-input bg-background text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Sem categoria</option>
          {filteredCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {" ".repeat((c.level - 1) * 2)}
              {c.code} {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Data de caixa + competência (colapsável) */}
      <DateFields
        occurredOn={defaultValues?.occurred_on ?? ""}
        competenceDate={defaultValues?.competence_date ?? null}
        errors={fieldErrors}
      />


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

/**
 * Dois campos de data: caixa (occurred_on) sempre visível, competência colapsada
 * por padrão. Quando a competência é igual ao caixa (default), o input fica
 * oculto; se o usuário expandir, fica controlado independentemente.
 */
function DateFields({
  occurredOn,
  competenceDate,
  errors,
}: {
  occurredOn: string;
  competenceDate: string | null;
  errors: Record<string, string>;
}) {
  const competenceDiffersFromDefault =
    competenceDate !== null && competenceDate !== occurredOn;

  const [occurred, setOccurred] = useState(occurredOn);
  const [showCompetence, setShowCompetence] = useState(
    competenceDiffersFromDefault,
  );
  const [competence, setCompetence] = useState(
    competenceDate ?? occurredOn,
  );

  // Quando a competência está colapsada, espelha occurred — assim o input
  // hidden enviado ao servidor sempre tem o valor correto.
  const effectiveCompetence = showCompetence ? competence : occurred;

  return (
    <div className="space-y-1.5">
      <Label htmlFor="occurred_on">Data</Label>
      <Input
        id="occurred_on"
        name="occurred_on"
        type="date"
        required
        value={occurred}
        onChange={(e) => setOccurred(e.target.value)}
        className={cn(
          "h-12",
          errors.occurred_on ? "border-destructive" : "",
        )}
        aria-invalid={Boolean(errors.occurred_on) || undefined}
      />
      {errors.occurred_on ? (
        <p className="text-sm text-destructive">{errors.occurred_on}</p>
      ) : null}

      {showCompetence ? (
        <div className="pt-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="competence_date">Data de competência</Label>
            <button
              type="button"
              onClick={() => {
                setShowCompetence(false);
                setCompetence(occurred);
              }}
              className="text-xs text-muted-foreground underline"
            >
              usar data de caixa
            </button>
          </div>
          <Input
            id="competence_date"
            type="date"
            value={competence}
            onChange={(e) => setCompetence(e.target.value)}
            className="h-12"
          />
          <p className="text-xs text-muted-foreground">
            Use uma data diferente quando o regime de competência for distinto
            do regime de caixa.
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
      <input
        type="hidden"
        name="competence_date"
        value={effectiveCompetence}
      />
    </div>
  );
}
