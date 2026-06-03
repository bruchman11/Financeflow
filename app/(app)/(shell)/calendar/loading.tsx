import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarLoading() {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Navegação de mês */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <Skeleton className="size-9 rounded-md" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="size-9 rounded-md" />
      </div>

      {/* Filtros por tipo */}
      <div className="flex gap-2 px-4 py-3 border-b border-border">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-9 w-20 rounded-full shrink-0" />
        ))}
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 border-b border-border">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="flex flex-col items-center py-3 gap-2 [&:first-child]:border-r [&:first-child]:border-border"
          >
            <Skeleton className="h-2.5 w-14" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>

      {/* Lista */}
      <div className="flex-1">
        <div className="px-4 py-1.5 bg-muted/50 border-b border-border">
          <Skeleton className="h-3 w-32" />
        </div>
        <ul className="divide-y divide-border">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-3 min-h-[64px]">
              <Skeleton className="size-9 rounded-md shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-7 w-14 rounded-md" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
