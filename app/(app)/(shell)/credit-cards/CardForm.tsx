"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AccountRow } from "@/lib/db/accounts";
import type { ActionResult } from "./actions";

const initialState: ActionResult = { ok: true };

const CARD_COLORS = [
  "#1e293b", "#0f172a", "#7c3aed", "#dc2626",
  "#ea580c", "#ca8a04", "#16a34a", "#0891b2",
  "#2563eb", "#db2777",
] as const;

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="h-12 text-base w-full">
      {pending ? "Salvando…" : label}
    </Button>
  );
}

type Props = {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  accounts: AccountRow[];
  defaultValues?: {
    name?: string;
    closing_day?: number;
    due_day?: number;
    limit_amount?: string | null;
    payment_account_id?: string | null;
    color?: string | null;
  };
  submitLabel?: string;
};

export function CardForm({
  action,
  accounts,
  defaultValues,
  submitLabel = "Salvar",
}: Props) {
  const [state, formAction] = useActionState(action, initialState);
  const fieldErrors = !state.ok ? (state.fieldErrors ?? {}) : {};
  const globalError = !state.ok ? state.error : null;

  const [color, setColor] = useState<string>(
    defaultValues?.color ?? CARD_COLORS[0],
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Nome do cartão</Label>
        <Input
          id="name"
          name="name"
          type="text"
          required
          autoFocus={!defaultValues?.name}
          defaultValue={defaultValues?.name ?? ""}
          maxLength={60}
          placeholder="Ex.: Nubank Empresarial"
          className={cn("h-12", fieldErrors.name ? "border-destructive" : "")}
        />
        {fieldErrors.name ? (
          <p className="text-sm text-destructive">{fieldErrors.name}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="closing_day">Dia fechamento</Label>
          <Input
            id="closing_day"
            name="closing_day"
            type="number"
            min={1}
            max={31}
            inputMode="numeric"
            required
            defaultValue={defaultValues?.closing_day ?? ""}
            placeholder="15"
            className={cn(
              "h-12",
              fieldErrors.closing_day ? "border-destructive" : "",
            )}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="due_day">Dia vencimento</Label>
          <Input
            id="due_day"
            name="due_day"
            type="number"
            min={1}
            max={31}
            inputMode="numeric"
            required
            defaultValue={defaultValues?.due_day ?? ""}
            placeholder="22"
            className={cn(
              "h-12",
              fieldErrors.due_day ? "border-destructive" : "",
            )}
          />
        </div>
      </div>
      {fieldErrors.closing_day || fieldErrors.due_day ? (
        <p className="text-xs text-destructive">
          {fieldErrors.closing_day || fieldErrors.due_day}
        </p>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="limit_amount">
          Limite{" "}
          <span className="text-muted-foreground">(opcional)</span>
        </Label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base text-muted-foreground select-none">
            R$
          </span>
          <Input
            id="limit_amount"
            name="limit_amount"
            type="text"
            inputMode="decimal"
            defaultValue={defaultValues?.limit_amount ?? ""}
            placeholder="0,00"
            className={cn(
              "h-12 pl-12 text-right",
              fieldErrors.limit_amount ? "border-destructive" : "",
            )}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="payment_account_id">
          Conta padrão de pagamento{" "}
          <span className="text-muted-foreground">(opcional)</span>
        </Label>
        <select
          id="payment_account_id"
          name="payment_account_id"
          defaultValue={defaultValues?.payment_account_id ?? ""}
          className="w-full h-12 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Não definida</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label>Cor</Label>
        <div
          role="radiogroup"
          aria-label="Cor do cartão"
          className="flex flex-wrap gap-2"
        >
          {CARD_COLORS.map((c) => {
            const active = c === color;
            return (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className={cn(
                  "size-10 rounded-md flex items-center justify-center transition-transform",
                  active
                    ? "ring-2 ring-offset-2 ring-offset-background ring-foreground scale-105"
                    : "hover:scale-105",
                )}
              >
                {active ? <Check className="size-5 text-white" /> : null}
              </button>
            );
          })}
        </div>
        <input type="hidden" name="color" value={color} />
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
