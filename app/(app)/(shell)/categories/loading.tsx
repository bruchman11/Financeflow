import { Skeleton } from "@/components/ui/skeleton";

export default function CategoriesLoading() {
  return (
    <main className="flex-1 flex flex-col px-4 py-6 gap-6">
      {/* Cabeçalho */}
      <div className="space-y-1.5 px-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-3 w-full max-w-xs" />
      </div>

      {/* Árvore de categorias */}
      <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 min-h-[56px]">
            <Skeleton className="size-2.5 rounded-full shrink-0" />
            <Skeleton className="h-3 w-10 shrink-0" />
            <div className="flex-1">
              <Skeleton className="h-3.5 w-36" />
            </div>
            <Skeleton className="size-4 shrink-0" />
          </div>
        ))}
      </div>

      {/* Nova categoria */}
      <Skeleton className="h-12 w-full rounded-md" />
    </main>
  );
}
