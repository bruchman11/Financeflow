"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DRE_TYPES,
  dreTypeLabels,
  dreTypeColors,
  parentCodeOf,
} from "@/lib/validation/category";
import type { DreType } from "@/lib/types/database";
import type { ActionResult } from "./actions";

export type CategoryFormValues = {
  code: string;
  name: string;
  dre_type: DreType;
  color: string | null;
};

const initialState: ActionResult = { ok: true };

const COLOR_PRESETS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#10b981",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#64748b",
] as const;

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
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  defaultValues?: Partial<CategoryFormValues>;
  submitLabel?: string;
  /** Lista de codes existentes para preview do parent. */
  existingCodes?: Record<string, { name: string; dre_type: DreType }>;
};

export function CategoryForm({
  action,
  defaultValues,
  submitLabel = "Salvar",
  existingCodes = {},
}: Props) {
  const [state, formAction] = useActionState(action, initialState);
  const fieldErrors = !state.ok ? (state.fieldErrors ?? {}) : {};
  const globalError = !state.ok ? state.error : null;

  const [code, setCode] = useState(defaultValues?.code ?? "");
  const [dreType, setDreType] = useState<DreType>(
    defaultValues?.dre_type ?? "expense",
  );
  const [color, setColor] = useState<string>(
    defaultValues?.color ?? dreTypeColors[dreType],
  );

  // Preview do pai
  const parentCode = parentCodeOf(code.trim());
  const parentPreview = parentCode ? existingCodes[parentCode] : null;
  const parentNotFound = parentCode && !parentPreview;

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="code">Código</Label>
        <Input
          id="code"
          name="code"
          type="text"
          required
          autoFocus={!defaultValues?.code}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="01.01"
          maxLength={8}
          inputMode="numeric"
          className={cn(
            "h-12 tabular-nums",
            fieldErrors.code ? "border-destructive" : "",
          )}
          aria-invalid={Boolean(fieldErrors.code) || undefined}
        />
        {fieldErrors.code ? (
          <p className="text-sm text-destructive">{fieldErrors.code}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Use 01 (raiz), 01.01 (subcategoria) ou 01.01.01 (nível 3).
          </p>
        )}
        {parentPreview ? (
          <p className="text-xs text-income">
            ↳ subcategoria de{" "}
            <strong>
              {parentCode} {parentPreview.name}
            </strong>
          </p>
        ) : parentNotFound ? (
          <p className="text-xs text-amber-600">
            ⚠ Pai {parentCode} não existe. Crie-o primeiro ou ajuste o código.
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={defaultValues?.name ?? ""}
          maxLength={60}
          placeholder="Aluguel"
          className="h-12"
          aria-invalid={Boolean(fieldErrors.name) || undefined}
        />
        {fieldErrors.name ? (
          <p className="text-sm text-destructive">{fieldErrors.name}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label>Tipo DRE</Label>
        <div
          role="radiogroup"
          aria-label="Tipo DRE"
          className="grid grid-cols-2 gap-2"
        >
          {DRE_TYPES.map((t) => {
            const active = t === dreType;
            return (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  setDreType(t);
                  // Se o usuário não escolheu cor custom, reflete a cor padrão do tipo
                  if (
                    color === dreTypeColors[dreType] ||
                    !defaultValues?.color
                  ) {
                    setColor(dreTypeColors[t]);
                  }
                }}
                className={cn(
                  "h-12 rounded-md border text-sm font-medium transition-colors flex items-center justify-center gap-2",
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-input bg-background hover:bg-muted",
                )}
              >
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: dreTypeColors[t] }}
                />
                {dreTypeLabels[t]}
              </button>
            );
          })}
        </div>
        <input type="hidden" name="dre_type" value={dreType} />
        {fieldErrors.dre_type ? (
          <p className="text-sm text-destructive">{fieldErrors.dre_type}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label>Cor</Label>
        <div
          role="radiogroup"
          aria-label="Cor"
          className="flex flex-wrap gap-2"
        >
          {COLOR_PRESETS.map((c) => {
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
