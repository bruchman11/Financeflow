"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/format/currency";
import type { ActionResult } from "../../actions";
import { createBalanceAdjustmentAction } from "../../actions";

const initialState: ActionResult = { ok: true };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="h-14 text-base w-full"
    >
      {pending ? "Ajustando…" : "Confirmar ajuste"}
    </Button>
  );
}

type Props = {
  accountId: string;
  accountName: string;
  currentBalance: number;
  defaultDate: string;
};

/**
 * Calcula o delta entre saldo atual e desejado para feedback em tempo real.
 * Tolera entradas com vírgula PT-BR.
 */
function parseTargetForPreview(input: string): number | null {
  if (!input || input.trim() === "") return null;
  const cleaned = input
    .trim()
    .replace(/[R$\s ]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Number(cleaned);
}

export function AdjustBalanceForm({
  accountId,
  accountName,
  currentBalance,
  defaultDate,
}: Props) {
  const bound = createBalanceAdjustmentAction.bind(null, accountId);
  const [state, formAction] = useActionState(bound, initialState);
  const fieldErrors = !state.ok ? (state.fieldErrors ?? {}) : {};
  const globalError = !state.ok ? state.error : null;

  const [targetInput, setTargetInput] = useState("");
  const target = parseTargetForPreview(targetInput);
  const delta = target !== null ? target - currentBalance : null;

  return (
    <form action={formAction} className="space-y-5">
      {/* Card com saldos */}
      <div className="surface divide-y divide-border">
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            Conta
          </span>
          <span className="text-sm font-medium">{accountName}</span>
        </div>
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            Saldo atual
          </span>
          <span
            className={cn(
              "text-sm font-semibold tabular-nums",
              currentBalance < 0 ? "text-expense" : "text-foreground",
            )}
          >
            {currentBalance < 0 ? "−" : ""}
            {formatBRL(Math.abs(currentBalance))}
          </span>
        </div>
        {delta !== null ? (
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              Ajuste
            </span>
            <span
              className={cn(
                "text-sm font-semibold tabular-nums",
                delta === 0
                  ? "text-muted-foreground"
                  : delta > 0
                    ? "text-positive"
                    : "text-negative",
              )}
            >
              {delta === 0
                ? "—"
                : `${delta > 0 ? "+" : "−"}${formatBRL(Math.abs(delta))}`}
            </span>
          </div>
        ) : null}
      </div>

      {/* Saldo alvo */}
      <div className="space-y-1.5">
        <Label htmlFor="target_balance">Novo saldo desejado</Label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl text-muted-foreground select-none">
            R$
          </span>
          <Input
            id="target_balance"
            name="target_balance"
            type="text"
            inputMode="decimal"
            autoFocus
            required
            value={targetInput}
            onChange={(e) => setTargetInput(e.target.value)}
            placeholder="0,00"
            className={cn(
              "h-16 pl-14 text-2xl font-bold tracking-tight text-center pr-4",
              fieldErrors.target_balance ? "border-destructive" : "",
            )}
            aria-invalid={Boolean(fieldErrors.target_balance) || undefined}
          />
        </div>
        {fieldErrors.target_balance ? (
          <p className="text-sm text-destructive">{fieldErrors.target_balance}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Use sinal de menos (−) para saldo negativo. Ex.: −150,00
          </p>
        )}
      </div>

      {/* Data do ajuste */}
      <div className="space-y-1.5">
        <Label htmlFor="occurred_on">Data do ajuste</Label>
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
      </div>

      {/* Motivo */}
      <div className="space-y-1.5">
        <Label htmlFor="reason">
          Motivo{" "}
          <span className="text-muted-foreground">(opcional)</span>
        </Label>
        <Input
          id="reason"
          name="reason"
          type="text"
          maxLength={255}
          placeholder="Ex.: Conciliação bancária"
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
        Ajustes não aparecem na DRE — são apenas para conciliar o saldo da conta.
      </p>
    </form>
  );
}
