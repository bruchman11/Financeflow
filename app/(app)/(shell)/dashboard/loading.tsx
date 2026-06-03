import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <main className="flex-1 flex flex-col px-4 py-5 gap-6 pb-6">
      {/* Cabeçalho */}
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-24" />
      </div>

      {/* Resumo do mês */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-28" />
        <div className="grid grid-cols-3 rounded-xl border border-border overflow-hidden">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                "flex flex-col items-center py-4 gap-2",
                i < 2 ? "border-r border-border" : "",
              )}
            >
              <Skeleton className="h-2.5 w-12" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <Skeleton className="h-14 w-full rounded-md" />

      {/* Contas */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-16" />
        <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 min-h-[56px]">
              <Skeleton className="size-8 rounded-md shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-4 w-16 shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Últimas movimentações */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-40" />
        <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 min-h-[56px]">
              <Skeleton className="size-3 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-36" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-4 w-16 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
