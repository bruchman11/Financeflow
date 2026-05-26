"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  createCompanyAction,
  type ActionResult,
} from "../actions";

const initialState: ActionResult = { ok: true };

async function action(_prev: ActionResult, formData: FormData) {
  return createCompanyAction(formData);
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="h-12 text-base w-full">
      {pending ? "Criando…" : "Criar empresa"}
    </Button>
  );
}

export function NewCompanyForm() {
  const [state, formAction] = useActionState(action, initialState);
  const fieldErrors = !state.ok ? state.fieldErrors ?? {} : {};
  const globalError = !state.ok ? state.error : null;

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Nome da empresa</Label>
        <Input
          id="name"
          name="name"
          type="text"
          autoComplete="organization"
          required
          autoFocus
          className="h-12"
          aria-invalid={Boolean(fieldErrors.name) || undefined}
        />
        {fieldErrors.name ? (
          <p className="text-sm text-destructive">{fieldErrors.name}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="legal_name" className="flex justify-between">
          Razão social
          <span className="text-xs text-muted-foreground font-normal">
            opcional
          </span>
        </Label>
        <Input
          id="legal_name"
          name="legal_name"
          type="text"
          className="h-12"
          aria-invalid={Boolean(fieldErrors.legal_name) || undefined}
        />
        {fieldErrors.legal_name ? (
          <p className="text-sm text-destructive">{fieldErrors.legal_name}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tax_id" className="flex justify-between">
          CNPJ
          <span className="text-xs text-muted-foreground font-normal">
            opcional
          </span>
        </Label>
        <Input
          id="tax_id"
          name="tax_id"
          type="text"
          inputMode="numeric"
          className="h-12"
          aria-invalid={Boolean(fieldErrors.tax_id) || undefined}
        />
        {fieldErrors.tax_id ? (
          <p className="text-sm text-destructive">{fieldErrors.tax_id}</p>
        ) : null}
      </div>

      {globalError ? (
        <p className="text-sm text-destructive" role="alert">
          {globalError}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
