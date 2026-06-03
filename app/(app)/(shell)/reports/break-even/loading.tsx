import { Skeleton } from "@/components/ui/skeleton";

export default function BreakEvenLoading() {
  return (
    <main className="flex-1 flex flex-col pb-6">
      {/* Cabeçalho de detalhe */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Skeleton className="size-9 rounded-md" />
        <Skeleton className="h-5 w-44" />
      </div>

      {/* Mês */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <Skeleton className="size-9 rounded-md" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="size-9 rounded-md" />
      </div>

      {/* Input de margem */}
      <div className="px-4 py-4 border-b border-border space-y-2">
        <Skeleton className="h-3 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-12 w-32 rounded-md" />
          <Skeleton className="h-12 w-28 rounded-md" />
        </div>
      </div>

      {/* Resultado */}
      <div className="px-4 py-6">
        <div className="rounded-xl border border-border p-5 space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-2.5 w-32" />
              <Skeleton className="h-7 w-40" />
            </div>
          </div>
          <Skeleton className="h-3 w-full rounded-full" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </div>
    </main>
  );
}
