"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ACCOUNT_KINDS,
  accountKindLabels,
} from "@/lib/validation/account";
import type { ActionResult } from "./actions";
import type { AccountKind } from "@/lib/types/database";

export type AccountFormValues = {
  name: string;
  kind: AccountKind;
  opening_balance: string; // formato BR para exibição ("0,00")
};

const initialState: ActionResult = { ok: true };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="h-12 text-base w-full"
    >
      {pending ? "Salvando…" : label}
    </Button>
  );
}

type Props = {
  action: (
    prev: ActionResult,
    formData: FormData,
  ) => Promise<ActionResult>;
  defaultValues?: Partial<AccountFormValues>;
  submitLabel?: string;
};

export function AccountForm({
  action,
  defaultValues,
  submitLabel = "Salvar",
}: Props) {
  const [state, formAction] = useActionState(action, initialState);
  const fieldErrors = !state.ok ? state.fieldErrors ?? {} : {};
  const globalError = !state.ok ? state.error : null;

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          name="name"
          type="text"
          required
          autoFocus={!defaultValues?.name}
          defaultValue={defaultValues?.name ?? ""}
          maxLength={80}
          className="h-12"
          aria-invalid={Boolean(fieldErrors.name) || undefined}
        />
        {fieldErrors.name ? (
          <p className="text-sm text-destructive">{fieldErrors.name}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="kind">Tipo</Label>
        <select
          id="kind"
          name="kind"
          required
          defaultValue={defaultValues?.kind ?? "checking"}
          className={cn(
            "h-12 w-full rounded-md border border-input bg-transparent px-3 text-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "appearance-none bg-[length:1rem] bg-no-repeat bg-[right_0.75rem_center]",
          )}
          aria-invalid={Boolean(fieldErrors.kind) || undefined}
        >
          {ACCOUNT_KINDS.map((k) => (
            <option key={k} value={k}>
              {accountKindLabels[k]}
            </option>
          ))}
        </select>
        {fieldErrors.kind ? (
          <p className="text-sm text-destructive">{fieldErrors.kind}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="opening_balance" className="flex justify-between">
          Saldo inicial
          <span className="text-xs text-muted-foreground font-normal">
            opcional
          </span>
        </Label>
        <Input
          id="opening_balance"
          name="opening_balance"
          type="text"
          inputMode="decimal"
          placeholder="0,00"
          defaultValue={defaultValues?.opening_balance ?? ""}
          className="h-12"
          aria-invalid={Boolean(fieldErrors.opening_balance) || undefined}
        />
        {fieldErrors.opening_balance ? (
          <p className="text-sm text-destructive">
            {fieldErrors.opening_balance}
          </p>
        ) : null}
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
