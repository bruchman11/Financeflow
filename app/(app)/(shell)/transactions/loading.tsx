import { cn } from "@/lib/utils";

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      aria-hidden
    />
  );
}

export default function TransactionsLoading() {
  return (
    <div className="flex-1 flex flex-col">
      {/* Navegação de mês */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <Skeleton className="size-9 rounded-md" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="size-9 rounded-md" />
      </div>

      {/* Sumário */}
      <div className="grid grid-cols-3 border-b border-border">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              "flex flex-col items-center py-3 gap-2",
              i < 2 ? "border-r border-border" : "",
            )}
          >
            <Skeleton className="h-2.5 w-12" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>

      {/* Lista */}
      <div className="flex-1">
        {/* Cabeçalho de dia */}
        <div className="px-4 py-1.5 bg-muted/50 border-b border-border">
          <Skeleton className="h-3 w-32" />
        </div>
        <ul className="divide-y divide-border">
          {[0, 1, 2, 3, 4].map((i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-3 min-h-[60px]">
              <Skeleton className="size-3 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-4 w-16 shrink-0" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
