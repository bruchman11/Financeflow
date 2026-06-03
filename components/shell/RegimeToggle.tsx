import Link from "next/link";
import { cn } from "@/lib/utils";

type RegimeToggleProps = {
  value: "cash" | "accrual";
  cashHref: string;
  accrualHref: string;
  className?: string;
};

/**
 * Alternador de regime (Caixa / Competência) compartilhado por DRE e Comparativo.
 * Navegação por link — cada página define os hrefs preservando seus params.
 */
export function RegimeToggle({
  value,
  cashHref,
  accrualHref,
  className,
}: RegimeToggleProps) {
  return (
    <div className={cn("grid grid-cols-2 border-b border-border", className)}>
      <Link
        href={cashHref}
        className={cn(
          "py-3 text-center text-sm font-medium border-r border-border transition-colors",
          value === "cash"
            ? "bg-foreground text-background"
            : "hover:bg-muted",
        )}
      >
        Caixa
      </Link>
      <Link
        href={accrualHref}
        className={cn(
          "py-3 text-center text-sm font-medium transition-colors",
          value === "accrual"
            ? "bg-foreground text-background"
            : "hover:bg-muted",
        )}
      >
        Competência
      </Link>
    </div>
  );
}
