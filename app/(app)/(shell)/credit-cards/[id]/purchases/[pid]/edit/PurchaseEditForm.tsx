"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CategoryRow } from "@/lib/db/categories";
import type { ActionResult } from "../../../../actions";
import { updatePurchaseAction } from "../../../../actions";

const initialState: ActionResult = { ok: true };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="h-12 text-base w-full">
      {pending ? "Salvando…" : "Salvar alterações"}
    </Button>
  );
}

type Props = {
  purchaseId: string;
  categories: CategoryRow[];
  defaultValues: {
    description: string;
    category_id: string | null;
    payee: string | null;
    notes: string | null;
  };
  /** Quando true, mostra aviso de fatura paga (mas form ainda funciona). */
  paidInvoice: boolean;
};

export function PurchaseEditForm({
  purchaseId,
  categories,
  defaultValues,
  paidInvoice,
}: Props) {
  const bound = updatePurchaseAction.bind(null, purchaseId);
  const [state, formAction] = useActionState(bound, initialState);
  const fieldErrors = !state.ok ? (state.fieldErrors ?? {}) : {};
  const globalError = !state.ok ? state.error : null;

  const expenseCategories = categories.filter((c) => c.dre_type !== "revenue");

  return (
    <form action={formAction} className="space-y-4">
      {paidInvoice ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-800 dark:text-amber-400">
          Esta compra pertence a uma fatura já paga. O valor e a estrutura
          de parcelas não podem ser alterados. Para mudar o valor, edite a
          transação correspondente em Movimentações.
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="description">Descrição</Label>
        <Input
          id="description"
          name="description"
          type="text"
          required
          autoFocus
          maxLength={120}
          defaultValue={defaultValues.description}
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
        <Label htmlFor="category_id">
          Categoria{" "}
          <span className="text-muted-foreground">(opcional)</span>
        </Label>
        <select
          id="category_id"
          name="category_id"
          defaultValue={defaultValues.category_id ?? ""}
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

      <div className="space-y-1.5">
        <Label htmlFor="payee">
          Fornecedor{" "}
          <span className="text-muted-foreground">(opcional)</span>
        </Label>
        <Input
          id="payee"
          name="payee"
          type="text"
          maxLength={120}
          defaultValue={defaultValues.payee ?? ""}
          className="h-12"
        />
      </div>

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
          defaultValue={defaultValues.notes ?? ""}
          className="h-12"
        />
      </div>

      {globalError ? (
        <p className="text-sm text-destructive" role="alert">
          {globalError}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
