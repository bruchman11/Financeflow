import { Skeleton } from "@/components/ui/skeleton";

export default function BillsLoading() {
  return (
    <main className="flex-1 flex flex-col px-4 py-6 gap-6">
      {/* Cabeçalho */}
      <div className="space-y-1.5 px-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-7 w-28" />
      </div>

      {/* Toggle de visualização */}
      <div className="flex gap-2">
        <Skeleton className="h-9 w-28 rounded-md" />
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>

      {/* Grupos */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-24 ml-2" />
        <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-2 px-4 py-3 min-h-[72px]">
              <div className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-md shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-4 w-16 shrink-0" />
              </div>
              <div className="flex items-center gap-2 pl-11">
                <Skeleton className="h-6 w-24 rounded-full" />
                <div className="flex-1" />
                <Skeleton className="h-8 w-32 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
