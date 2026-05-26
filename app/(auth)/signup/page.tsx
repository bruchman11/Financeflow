import Link from "next/link";
import { SignUpForm } from "./SignUpForm";

export default function SignUpPage() {
  return (
    <>
      <header className="space-y-2 text-center">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">
          FinanceFlow
        </p>
        <h1 className="text-2xl font-semibold">Criar conta</h1>
        <p className="text-sm text-muted-foreground">
          Comece a controlar a saúde financeira da sua empresa.
        </p>
      </header>

      <SignUpForm />

      <p className="text-sm text-center text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/login" className="text-foreground underline">
          Entrar
        </Link>
      </p>
    </>
  );
}
