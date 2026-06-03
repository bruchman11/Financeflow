import Link from "next/link";
import { X } from "lucide-react";

/**
 * Chip de filtro ativo. Server-friendly: navegação por Link.
 * `removeHref` deve apontar para a URL sem o parâmetro removido.
 */
export function FilterChip({
  label,
  removeHref,
}: {
  label: string;
  removeHref: string;
}) {
  return (
    <Link
      href={removeHref}
      className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full bg-muted text-xs font-medium hover:bg-muted/70 transition-colors"
    >
      {label}
      <X className="size-3" />
    </Link>
  );
}
