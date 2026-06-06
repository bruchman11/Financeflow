"use client";

import { useActionState } from "react";
import { NativeSelect } from "@/components/ui/native-select";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/format/currency";
import { formatBR } from "@/lib/format/date";
import type { AccountRow } from "@/lib/db/accounts";
import type { CreditCardInvoiceRow } from "@/lib/db/credit_cards";
import type { ActionResult } from "../../../../actions";
import { payInvoiceAction } from "../../../../actions";

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
  invoice: CreditCardInvoiceRow;
  accounts: AccountRow[];
  defaultAccountId: string | null;
  defaultDate: string;
  refMonthLabel: string;
};

export function PayInvoiceForm({
  invoice,
  accounts,
  defaultAccountId,
  defaultDate,
  refMonthLabel,
}: Props) {
  const bound = payInvoiceAction.bind(null, invoice.id);
  const [state, formAction] = useActionState(bound, initialState);
  const fieldErrors = !state.ok ? (state.fieldErrors ?? {}) : {};
  const globalError = !state.ok ? state.error : null;

  return (
    <form action={formAction} className="space-y-5">
      <div className="surface divide-y divide-border">
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            Fatura
          </span>
          <span className="text-sm font-medium capitalize">{refMonthLabel}</span>
        </div>
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            Total
          </span>
          <span className="text-base font-semibold tabular-nums">
            {formatBRL(invoice.total_amount)}
          </span>
        </div>
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            Vencimento
          </span>
          <span className="text-sm tabular-nums">
            {formatBR(invoice.due_date)}
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="account_id">Conta de pagamento</Label>
        <NativeSelect
          id="account_id"
          name="account_id"
          required
          defaultValue={defaultAccountId ?? accounts[0]?.id ?? ""}
          aria-invalid={Boolean(fieldErrors.account_id) || undefined}
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </NativeSelect>
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
        O pagamento gera uma movimentação por compra (categorizada na DRE)
        e marca a fatura como paga.
      </p>
    </form>
  );
}
