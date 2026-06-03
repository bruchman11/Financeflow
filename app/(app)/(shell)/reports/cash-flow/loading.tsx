import { Skeleton } from "@/components/ui/skeleton";

export default function CashFlowLoading() {
  return (
    <main className="flex-1 flex flex-col pb-6">
      {/* Cabeçalho de detalhe */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Skeleton className="size-9 rounded-md" />
        <Skeleton className="h-5 w-36" />
      </div>

      {/* Mês */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <Skeleton className="size-9 rounded-md" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="size-9 rounded-md" />
      </div>

      {/* Filtro de conta */}
      <div className="px-4 py-3 border-b border-border space-y-1.5">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 border-b border-border">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex flex-col items-center py-3 gap-2 [&:not(:last-child)]:border-r [&:not(:last-child)]:border-border"
          >
            <Skeleton className="h-2.5 w-12" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>

      {/* Gráfico */}
      <div className="px-4 py-4">
        <Skeleton className="h-56 w-full rounded-lg" />
      </div>
    </main>
  );
}
