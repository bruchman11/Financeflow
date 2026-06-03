"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/format/currency";
import { formatBR } from "@/lib/format/date";
import type { AccountRow } from "@/lib/db/accounts";
import type { BillRow } from "@/lib/db/bills";
import type { ActionResult } from "../../actions";
import { payBillAction } from "../../actions";

const initialState: ActionResult = { ok: true };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="h-14 text-base w-full">
      {pending ? "Registrando…" : "Registrar pagamento"}
    </Button>
  );
}

type Props = {
  bill: BillRow;
  accounts: AccountRow[];
  formattedAmount: string;
  defaultDate: string;
};

export function PayBillForm({
  bill,
  accounts,
  formattedAmount,
  defaultDate,
}: Props) {
  const bound = payBillAction.bind(null, bill.id);
  const [state, formAction] = useActionState(bound, initialState);
  const fieldErrors = !state.ok ? (state.fieldErrors ?? {}) : {};
  const globalError = !state.ok ? state.error : null;

  return (
    <form action={formAction} className="space-y-5">
      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            Boleto
          </span>
          <span className="text-sm font-medium truncate ml-2">
            {bill.description}
          </span>
        </div>
        {bill.beneficiary_name ? (
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              Beneficiário
            </span>
            <span className="text-sm truncate ml-2">{bill.beneficiary_name}</span>
          </div>
        ) : null}
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            Valor original
          </span>
          <span className="text-sm font-semibold tabular-nums">
            {formatBRL(bill.amount)}
          </span>
        </div>
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            Vencimento
          </span>
          <span className="text-sm tabular-nums">{formatBR(bill.due_date)}</span>
        </div>
      </div>

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
        ) : (
          <p className="text-xs text-muted-foreground">
            Pode diferir do valor original (juros, multa ou desconto).
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="account_id">Conta de pagamento</Label>
        <select
          id="account_id"
          name="account_id"
          required
          defaultValue={accounts[0]?.id ?? ""}
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
      </div>

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
      </div>

      {globalError ? (
        <p className="text-sm text-destructive" role="alert">
          {globalError}
        </p>
      ) : null}

      <SubmitButton />

      <p className="text-xs text-muted-foreground text-center">
        Gera uma movimentação na conta selecionada com a categoria do boleto.
      </p>
    </form>
  );
}
