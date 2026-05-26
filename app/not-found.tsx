import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center gap-4">
      <p className="text-5xl font-bold text-muted-foreground/40">404</p>
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Página não encontrada</h1>
        <p className="text-sm text-muted-foreground">
          O endereço que você acessou não existe ou foi movido.
        </p>
      </div>
      <Link
        href="/"
        className={buttonVariants({ variant: "outline", className: "h-12" })}
      >
        Voltar ao início
      </Link>
    </div>
  );
}
