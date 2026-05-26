import Link from "next/link";
import { LoginForm } from "./LoginForm";

type Search = { check_email?: string };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { check_email } = await searchParams;

  return (
    <>
      <header className="space-y-2 text-center">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">
          FinanceFlow
        </p>
        <h1 className="text-2xl font-semibold">Entrar</h1>
        <p className="text-sm text-muted-foreground">
          Acesse o painel financeiro da sua empresa.
        </p>
      </header>

      {check_email ? (
        <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
          Enviamos um e-mail de confirmação. Confirme antes de entrar.
        </div>
      ) : null}

      <LoginForm />

      <p className="text-sm text-center text-muted-foreground">
        Ainda não tem conta?{" "}
        <Link href="/signup" className="text-foreground underline">
          Criar conta
        </Link>
      </p>
    </>
  );
}
