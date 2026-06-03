"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatBRL, parseBRLToNumeric } from "@/lib/format/currency";
import type { CategoryRow } from "@/lib/db/categories";
import type { ActionResult } from "../../../actions";
import { createPurchaseAction } from "../../../actions";

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
  cardId: string;
  categories: CategoryRow[];
  defaultDate: string;
};

export function PurchaseForm({ cardId, categories, defaultDate }: Props) {
  const bound = createPurchaseAction.bind(null, cardId);
  const [state, formAction] = useActionState(bound, initialState);
  const fieldErrors = !state.ok ? (state.fieldErrors ?? {}) : {};
  const globalError = !state.ok ? state.error : null;

  const [amount, setAmount] = useState("");
  const [installments, setInstallments] = useState(1);

  // Preview do valor da parcela
  const installmentPreview = useMemo(() => {
    const normalized = parseBRLToNumeric(amount);
    if (!normalized) return null;
    const n = Number(normalized);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n / installments;
  }, [amount, installments]);

  const expenseCategories = categories.filter((c) => c.dre_type !== "revenue");

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="description">Descrição</Label>
        <Input
          id="description"
          name="description"
          type="text"
          required
          autoFocus
          maxLength={120}
          placeholder="Ex.: Notebook Dell"
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
        <Label htmlFor="total_amount">Valor total</Label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base text-muted-foreground select-none">
            R$
          </span>
          <Input
            id="total_amount"
            name="total_amount"
            type="text"
            inputMode="decimal"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            className={cn(
              "h-14 pl-12 text-xl font-bold text-right",
              fieldErrors.total_amount ? "border-destructive" : "",
            )}
          />
        </div>
        {fieldErrors.total_amount ? (
          <p className="text-sm text-destructive">{fieldErrors.total_amount}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="installments_total">Parcelas</Label>
        <div className="flex items-center gap-3">
          <Input
            id="installments_total"
            name="installments_total"
            type="number"
            min={1}
            max={60}
            inputMode="numeric"
            required
            value={installments}
            onChange={(e) =>
              setInstallments(Math.max(1, Math.min(60, parseInt(e.target.value || "1", 10))))
            }
            className={cn(
              "h-12 w-24 text-center",
              fieldErrors.installments_total ? "border-destructive" : "",
            )}
          />
          {installmentPreview !== null && installments > 1 ? (
            <p className="text-sm text-muted-foreground">
              {installments}× de{" "}
              <strong className="text-foreground tabular-nums">
                {formatBRL(installmentPreview)}
              </strong>
            </p>
          ) : null}
        </div>
        {fieldErrors.installments_total ? (
          <p className="text-sm text-destructive">{fieldErrors.installments_total}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="purchase_date">Data da compra</Label>
        <Input
          id="purchase_date"
          name="purchase_date"
          type="date"
          required
          defaultValue={defaultDate}
          className={cn(
            "h-12",
            fieldErrors.purchase_date ? "border-destructive" : "",
          )}
        />
        <p className="text-xs text-muted-foreground">
          A fatura correta é definida automaticamente conforme o dia de
          fechamento do cartão.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="category_id">
          Categoria{" "}
          <span className="text-muted-foreground">(opcional)</span>
        </Label>
        <select
          id="category_id"
          name="category_id"
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
          placeholder="Ex.: Magazine Luiza"
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
          className="h-12"
        />
      </div>

      {/* Mantém o competence_date sempre = purchase_date pelo padrão do schema */}

      {globalError ? (
        <p className="text-sm text-destructive" role="alert">
          {globalError}
        </p>
      ) : null}

      <SubmitButton label="Registrar compra" />
    </form>
  );
}
