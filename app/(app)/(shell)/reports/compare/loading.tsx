import { Skeleton } from "@/components/ui/skeleton";

export default function CompareLoading() {
  return (
    <main className="flex-1 flex flex-col pb-6">
      {/* Cabeçalho de detalhe */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Skeleton className="size-9 rounded-md" />
        <Skeleton className="h-5 w-28" />
      </div>

      {/* Regime */}
      <div className="grid grid-cols-2 gap-2 p-3 border-b border-border">
        <Skeleton className="h-10 rounded-md" />
        <Skeleton className="h-10 rounded-md" />
      </div>

      {/* Seletores de período */}
      <div className="grid grid-cols-2 border-b border-border divide-x divide-border">
        {[0, 1].map((i) => (
          <div key={i} className="p-3 flex flex-col gap-1.5">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-28 mt-1" />
          </div>
        ))}
      </div>

      {/* Linhas comparativas */}
      <div className="divide-y divide-border">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-12" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
