"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/format/currency";
import { formatBR } from "@/lib/format/date";
import { frequencyLabels } from "@/lib/validation/fixed_expense";
import type { AccountRow } from "@/lib/db/accounts";
import type { FixedExpenseRow } from "@/lib/db/fixed_expenses";
import type { ActionResult } from "../../actions";
import { payFixedExpenseAction } from "../../actions";

const initialState: ActionResult = { ok: true };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="h-14 text-base w-full"
    >
      {pending ? "Registrando…" : "Registrar pagamento"}
    </Button>
  );
}

type Props = {
  fixedExpense: FixedExpenseRow;
  accounts: AccountRow[];
  formattedAmount: string;
  defaultDate: string;
};

export function PayForm({
  fixedExpense,
  accounts,
  formattedAmount,
  defaultDate,
}: Props) {
  const bound = payFixedExpenseAction.bind(null, fixedExpense.id);
  const [state, formAction] = useActionState(bound, initialState);
  const fieldErrors = !state.ok ? (state.fieldErrors ?? {}) : {};
  const globalError = !state.ok ? state.error : null;

  const defaultAccount =
    fixedExpense.default_account_id ?? accounts[0]?.id ?? "";

  return (
    <form action={formAction} className="space-y-5">
      {/* Resumo */}
      <div className="surface divide-y divide-border">
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            Despesa
          </span>
          <span className="text-sm font-medium truncate ml-2">
            {fixedExpense.description}
          </span>
        </div>
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            Frequência
          </span>
          <span className="text-sm">
            {frequencyLabels[fixedExpense.frequency]}
          </span>
        </div>
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            Valor previsto
          </span>
          <span className="text-sm font-semibold tabular-nums">
            {formatBRL(fixedExpense.amount)}
          </span>
        </div>
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            Vencimento
          </span>
          <span className="text-sm tabular-nums">
            {formatBR(fixedExpense.next_due_date)}
          </span>
        </div>
      </div>

      {/* Valor pago (pode diferir) */}
      <div className="space-y-1.5">
        <Label htmlFor="amount">Valor pago</Label>
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
            defaultValue={formattedAmount}
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

      {/* Conta */}
      <div className="space-y-1.5">
        <Label htmlFor="account_id">Conta de pagamento</Label>
        <select
          id="account_id"
          name="account_id"
          required
          defaultValue={defaultAccount}
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
      </div>

      {/* Data do pagamento */}
      <div className="space-y-1.5">
        <Label htmlFor="paid_on">Data do pagamento</Label>
        <Input
          id="paid_on"
          name="paid_on"
          type="date"
          required
          defaultValue={defaultDate}
          className={cn(
            "h-12",
            fieldErrors.paid_on ? "border-destructive" : "",
          )}
        />
        {fieldErrors.paid_on ? (
          <p className="text-sm text-destructive">{fieldErrors.paid_on}</p>
        ) : null}
      </div>

      {/* Competência (vencimento sendo pago) */}
      <div className="space-y-1.5">
        <Label htmlFor="due_date_paid">Competência paga</Label>
        <Input
          id="due_date_paid"
          name="due_date_paid"
          type="date"
          required
          defaultValue={fixedExpense.next_due_date}
          className={cn(
            "h-12",
            fieldErrors.due_date_paid ? "border-destructive" : "",
          )}
        />
        <p className="text-xs text-muted-foreground">
          Qual vencimento está sendo pago. Permite registrar pagamentos
          atrasados ou adiantados sem perder a referência.
        </p>
      </div>

      {globalError ? (
        <p className="text-sm text-destructive" role="alert">
          {globalError}
        </p>
      ) : null}

      <SubmitButton />

      <p className="text-xs text-muted-foreground text-center">
        Após confirmar, o próximo vencimento será calculado automaticamente.
      </p>
    </form>
  );
}
