import { Skeleton } from "@/components/ui/skeleton";

export default function ReportsLoading() {
  return (
    <main className="flex-1 flex flex-col px-4 py-6 gap-6">
      {/* Cabeçalho */}
      <div className="space-y-1.5 px-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-7 w-40" />
      </div>

      {/* Lista de relatórios */}
      <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 min-h-[56px]">
            <Skeleton className="size-9 rounded-md shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="size-4 shrink-0" />
          </div>
        ))}
      </div>
    </main>
  );
}
