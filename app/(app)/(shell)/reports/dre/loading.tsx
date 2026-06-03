import { Skeleton } from "@/components/ui/skeleton";

export default function DreLoading() {
  return (
    <main className="flex-1 flex flex-col pb-6">
      {/* Cabeçalho de detalhe */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Skeleton className="size-9 rounded-md" />
        <Skeleton className="h-5 w-20" />
      </div>

      {/* Regime */}
      <div className="grid grid-cols-2 gap-2 p-3 border-b border-border">
        <Skeleton className="h-10 rounded-md" />
        <Skeleton className="h-10 rounded-md" />
      </div>

      {/* Mês */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <Skeleton className="size-9 rounded-md" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="size-9 rounded-md" />
      </div>

      {/* Linhas do DRE */}
      <div className="divide-y divide-border">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between px-4 py-3 min-h-[48px]"
          >
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3.5 w-20" />
          </div>
        ))}
      </div>
    </main>
  );
}
