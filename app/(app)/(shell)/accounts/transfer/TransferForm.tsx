"use client";

import { useActionState, useState } from "react";
import { NativeSelect } from "@/components/ui/native-select";
import { useFormStatus } from "react-dom";
import { ArrowDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AccountRow } from "@/lib/db/accounts";
import type { ActionResult } from "../actions";
import { createTransferAction } from "../actions";

const initialState: ActionResult = { ok: true };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="h-14 text-base w-full"
    >
      {pending ? "Transferindo…" : "Transferir"}
    </Button>
  );
}

type Props = {
  accounts: AccountRow[];
  defaultDate: string;
};

export function TransferForm({ accounts, defaultDate }: Props) {
  const [state, formAction] = useActionState(createTransferAction, initialState);
  const fieldErrors = !state.ok ? (state.fieldErrors ?? {}) : {};
  const globalError = !state.ok ? state.error : null;

  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id ?? "");
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id ?? "");

  const sameAccount = fromAccountId === toAccountId && fromAccountId !== "";

  return (
    <form action={formAction} className="space-y-5">
      {/* Valor */}
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

      {/* De */}
      <div className="space-y-1.5">
        <Label htmlFor="from_account_id">De</Label>
        <NativeSelect
          id="from_account_id"
          name="from_account_id"
          required
          value={fromAccountId}
          onChange={(e) => setFromAccountId(e.target.value)}
          aria-invalid={Boolean(fieldErrors.from_account_id) || undefined}
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </NativeSelect>
      </div>

      {/* Seta visual */}
      <div className="flex justify-center -my-1">
        <div className="size-9 rounded-full bg-muted flex items-center justify-center">
          <ArrowDown className="size-4 text-muted-foreground" />
        </div>
      </div>

      {/* Para */}
      <div className="space-y-1.5">
        <Label htmlFor="to_account_id">Para</Label>
        <NativeSelect
          id="to_account_id"
          name="to_account_id"
          required
          value={toAccountId}
          onChange={(e) => setToAccountId(e.target.value)}
          className={cn(
            "w-full h-12 px-3 rounded-lg border border-input bg-background text-base md:text-sm",
            "focus:outline-none focus:ring-2 focus:ring-ring",
            sameAccount || fieldErrors.to_account_id ? "border-destructive" : "",
          )}
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id} disabled={a.id === fromAccountId}>
              {a.name}
              {a.id === fromAccountId ? " (origem)" : ""}
            </option>
          ))}
        </NativeSelect>
        {sameAccount ? (
          <p className="text-sm text-destructive">
            Origem e destino devem ser diferentes.
          </p>
        ) : fieldErrors.to_account_id ? (
          <p className="text-sm text-destructive">{fieldErrors.to_account_id}</p>
        ) : null}
      </div>

      {/* Data */}
      <div className="space-y-1.5">
        <Label htmlFor="occurred_on">Data</Label>
        <Input
          id="occurred_on"
          name="occurred_on"
          type="date"
          required
          defaultValue={defaultDate}
          className={cn(
            "h-12",
            fieldErrors.occurred_on ? "border-destructive" : "",
          )}
        />
        {fieldErrors.occurred_on ? (
          <p className="text-sm text-destructive">{fieldErrors.occurred_on}</p>
        ) : null}
      </div>

      {/* Descrição opcional */}
      <div className="space-y-1.5">
        <Label htmlFor="description">
          Descrição{" "}
          <span className="text-muted-foreground">(opcional)</span>
        </Label>
        <Input
          id="description"
          name="description"
          type="text"
          maxLength={255}
          placeholder="Ex.: Reserva para impostos"
          className="h-12"
        />
      </div>

      {globalError ? (
        <p className="text-sm text-destructive" role="alert">
          {globalError}
        </p>
      ) : null}

      <SubmitButton />

      <p className="text-xs text-muted-foreground text-center">
        Transferências não contam como receita ou despesa nos relatórios.
      </p>
    </form>
  );
}
