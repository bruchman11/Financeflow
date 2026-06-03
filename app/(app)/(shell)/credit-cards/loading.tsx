import { Skeleton } from "@/components/ui/skeleton";

export default function CreditCardsLoading() {
  return (
    <main className="flex-1 flex flex-col px-4 py-6 gap-6">
      {/* Cabeçalho */}
      <div className="space-y-1.5 px-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-7 w-48" />
      </div>

      {/* Cartões */}
      <div className="space-y-3">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-36 w-full rounded-xl" />
        ))}
      </div>

      {/* Novo cartão */}
      <Skeleton className="h-12 w-full rounded-md" />
    </main>
  );
}
