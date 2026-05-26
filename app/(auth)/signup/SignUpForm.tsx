"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { signUpAction, type ActionResult } from "../actions";

const initialState: ActionResult = { ok: true };

async function action(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return signUpAction(formData);
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="h-12 text-base w-full">
      {pending ? "Criando conta…" : "Criar conta"}
    </Button>
  );
}

export function SignUpForm() {
  const [state, formAction] = useActionState(action, initialState);
  const fieldErrors = !state.ok ? state.fieldErrors ?? {} : {};
  const globalError = !state.ok ? state.error : null;

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="full_name">Nome completo</Label>
        <Input
          id="full_name"
          name="full_name"
          type="text"
          autoComplete="name"
          required
          className="h-12"
          aria-invalid={Boolean(fieldErrors.full_name) || undefined}
        />
        {fieldErrors.full_name ? (
          <p className="text-sm text-destructive">{fieldErrors.full_name}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          className="h-12"
          aria-invalid={Boolean(fieldErrors.email) || undefined}
        />
        {fieldErrors.email ? (
          <p className="text-sm text-destructive">{fieldErrors.email}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="h-12"
          aria-invalid={Boolean(fieldErrors.password) || undefined}
        />
        <p className="text-xs text-muted-foreground">
          Mínimo 8 caracteres.
        </p>
        {fieldErrors.password ? (
          <p className="text-sm text-destructive">{fieldErrors.password}</p>
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
