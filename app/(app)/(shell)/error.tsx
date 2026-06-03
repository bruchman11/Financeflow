"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ShellError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[shell] erro ao renderizar", error.digest ?? "");
  }, [error]);

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="size-6 text-destructive" />
      </div>
      <div className="space-y-1">
        <h1 className="text-base font-semibold">Algo deu errado</h1>
        <p className="mx-auto max-w-xs text-sm text-muted-foreground">
          Não foi possível carregar esta tela. Tente novamente em instantes.
        </p>
      </div>
      <button
        type="button"
        onClick={reset}
        className={cn(buttonVariants({ variant: "outline" }), "h-11 gap-2 px-5 text-sm")}
      >
        <RotateCcw className="size-4" />
        Tentar de novo
      </button>
    </main>
  );
}
