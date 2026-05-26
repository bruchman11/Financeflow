"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CATEGORY_COLORS,
  DEFAULT_CATEGORY_COLOR,
  type CategoryColor,
  TRANSACTION_TYPES,
  transactionTypeLabels,
} from "@/lib/validation/category";
import type { TransactionType } from "@/lib/types/database";
import type { ActionResult } from "./actions";

export type CategoryFormValues = {
  name: string;
  type: TransactionType;
  color: CategoryColor;
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
  defaultValues?: Partial<CategoryFormValues>;
  submitLabel?: string;
};

export function CategoryForm({
  action,
  defaultValues,
  submitLabel = "Salvar",
}: Props) {
  const [state, formAction] = useActionState(action, initialState);
  const fieldErrors = !state.ok ? state.fieldErrors ?? {} : {};
  const globalError = !state.ok ? state.error : null;

  const [type, setType] = useState<TransactionType>(
    defaultValues?.type ?? "expense",
  );
  const [color, setColor] = useState<CategoryColor>(
    defaultValues?.color ?? DEFAULT_CATEGORY_COLOR,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Tipo</Label>
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
                onClick={() => setType(t)}
                className={cn(
                  "h-12 rounded-md border text-sm font-medium transition-colors",
                  active
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background text-foreground border-input hover:bg-muted",
                )}
              >
                {transactionTypeLabels[t]}
              </button>
            );
          })}
        </div>
        <input type="hidden" name="type" value={type} />
        {fieldErrors.type ? (
          <p className="text-sm text-destructive">{fieldErrors.type}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          name="name"
          type="text"
          required
          autoFocus={!defaultValues?.name}
          defaultValue={defaultValues?.name ?? ""}
          maxLength={60}
          className="h-12"
          aria-invalid={Boolean(fieldErrors.name) || undefined}
        />
        {fieldErrors.name ? (
          <p className="text-sm text-destructive">{fieldErrors.name}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label>Cor</Label>
        <div
          role="radiogroup"
          aria-label="Cor"
          className="flex flex-wrap gap-2"
        >
          {CATEGORY_COLORS.map((c) => {
            const active = c === color;
            return (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={c}
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className={cn(
                  "size-10 rounded-full flex items-center justify-center transition-transform",
                  active
                    ? "ring-2 ring-offset-2 ring-offset-background ring-foreground scale-105"
                    : "hover:scale-105",
                )}
              >
                {active ? (
                  <Check className="size-5 text-white drop-shadow" />
                ) : null}
              </button>
            );
          })}
        </div>
        <input type="hidden" name="color" value={color} />
        {fieldErrors.color ? (
          <p className="text-sm text-destructive">{fieldErrors.color}</p>
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
