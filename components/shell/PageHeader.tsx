import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  /** Quando definido, vira cabeçalho de detalhe com seta de voltar. */
  backHref?: string;
  /** Texto curto em caixa-alta acima do título (variante hub). */
  eyebrow?: string;
  /** Subtítulo abaixo do título (variante hub). */
  subtitle?: string;
  /** Ações à direita (botões, links). */
  action?: ReactNode;
  className?: string;
};

/**
 * Cabeçalho de página unificado.
 * - Com `backHref`: barra de detalhe (seta + título), com borda inferior.
 * - Sem `backHref`: cabeçalho de hub (eyebrow + título grande + subtítulo).
 */
export function PageHeader({
  title,
  backHref,
  eyebrow,
  subtitle,
  action,
  className,
}: PageHeaderProps) {
  if (backHref) {
    return (
      <header
        className={cn(
          "flex items-center gap-2 px-4 py-3 border-b border-border",
          className,
        )}
      >
        <Link
          href={backHref}
          aria-label="Voltar"
          className="size-11 -ml-2 inline-flex items-center justify-center rounded-md hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-lg font-semibold flex-1 min-w-0 truncate">
          {title}
        </h1>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
    );
  }

  return (
    <header className={cn("flex items-start justify-between gap-3", className)}>
      <div className="space-y-0.5 min-w-0">
        {eyebrow ? (
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-2xl font-semibold leading-tight truncate">
          {title}
        </h1>
        {subtitle ? (
          <p className="text-sm text-muted-foreground capitalize">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
