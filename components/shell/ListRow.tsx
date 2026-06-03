import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ListRowProps = {
  icon?: ComponentType<{ className?: string }>;
  label: string;
  hint?: string;
  /** Conteúdo à direita, antes do chevron (badge, valor). */
  trailing?: ReactNode;
  /** Oculta o chevron (ex.: linhas não navegáveis). */
  hideChevron?: boolean;
  className?: string;
};

/**
 * Conteúdo de uma linha de lista padrão: ícone + título + hint + trailing + chevron.
 * Use dentro de <Link> (ver LinkRow) ou de <button> em formulários.
 */
export function ListRow({
  icon: Icon,
  label,
  hint,
  trailing,
  hideChevron = false,
  className,
}: ListRowProps) {
  return (
    <div
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3 min-h-[56px] text-left",
        className,
      )}
    >
      {Icon ? (
        <div className="size-9 rounded-md bg-muted flex items-center justify-center shrink-0">
          <Icon className="size-4 text-muted-foreground" />
        </div>
      ) : null}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight truncate">{label}</p>
        {hint ? (
          <p className="text-xs text-muted-foreground truncate">{hint}</p>
        ) : null}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
      {!hideChevron ? (
        <ChevronRight className="size-4 text-muted-foreground shrink-0" />
      ) : null}
    </div>
  );
}

type LinkRowProps = ListRowProps & { href: string };

/** Linha de lista navegável (LinkRow = Link + ListRow). */
export function LinkRow({ href, className, ...row }: LinkRowProps) {
  return (
    <Link href={href} className="block hover:bg-muted transition-colors">
      <ListRow {...row} className={className} />
    </Link>
  );
}
