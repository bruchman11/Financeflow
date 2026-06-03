import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type MonthNavProps = {
  /** Rótulo central, ex.: "maio de 2026". */
  label: string;
  prevHref: string;
  nextHref: string;
  /** Desabilita "próximo" (ex.: mês corrente é o último permitido). */
  nextDisabled?: boolean;
  /** Fixa no topo durante o scroll. */
  sticky?: boolean;
  className?: string;
};

/**
 * Navegador de mês compartilhado (← rótulo →).
 * Cada página constrói os hrefs preservando seus próprios query params.
 */
export function MonthNav({
  label,
  prevHref,
  nextHref,
  nextDisabled = false,
  sticky = false,
  className,
}: MonthNavProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-3 border-b border-border",
        sticky ? "bg-background sticky top-0 z-10" : "",
        className,
      )}
    >
      <Link
        href={prevHref}
        aria-label="Mês anterior"
        className="size-11 inline-flex items-center justify-center rounded-md hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronLeft className="size-5" />
      </Link>
      <span className="text-sm font-semibold capitalize">{label}</span>
      <Link
        href={nextHref}
        aria-label="Próximo mês"
        aria-disabled={nextDisabled}
        className={cn(
          "size-11 inline-flex items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          nextDisabled
            ? "text-muted-foreground/30 pointer-events-none"
            : "hover:bg-muted",
        )}
      >
        <ChevronRight className="size-5" />
      </Link>
    </div>
  );
}
