import Link from "next/link";
import { ChevronRight, LogOut, Repeat2, Tags } from "lucide-react";
import { getUserOrRedirect } from "@/lib/auth/current";
import { clearActiveCompanyAction } from "@/app/(app)/companies/actions";
import { signOutAction } from "@/app/(auth)/actions";

type RowProps = {
  icon: React.ReactNode;
  label: string;
  hint?: string;
};

function Row({ icon, label, hint }: RowProps) {
  return (
    <div className="w-full flex items-center gap-3 px-4 py-3 min-h-[56px]">
      <div className="size-9 rounded-md bg-muted flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm font-medium leading-tight">{label}</p>
        {hint ? (
          <p className="text-xs text-muted-foreground truncate">{hint}</p>
        ) : null}
      </div>
      <ChevronRight className="size-4 text-muted-foreground shrink-0" />
    </div>
  );
}

/**
 * Página "Mais": agrupa ações secundárias que não cabem na bottom nav.
 * Categorias (Etapa 6), trocar empresa, e sair.
 */
export default async function MorePage() {
  const user = await getUserOrRedirect();

  return (
    <main className="flex-1 flex flex-col px-4 py-6 gap-6">
      <header className="space-y-1 px-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">
          Configurações
        </p>
        <h1 className="text-2xl font-semibold">Mais</h1>
      </header>

      <section className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
        <Link href="/categories" className="block hover:bg-muted transition-colors">
          <Row
            icon={<Tags className="size-4 text-muted-foreground" />}
            label="Categorias"
          />
        </Link>
        <form action={clearActiveCompanyAction}>
          <button
            type="submit"
            className="w-full text-left hover:bg-muted active:bg-muted transition-colors"
          >
            <Row
              icon={<Repeat2 className="size-4 text-muted-foreground" />}
              label="Trocar empresa"
            />
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-border bg-card overflow-hidden">
        <form action={signOutAction}>
          <button
            type="submit"
            className="w-full text-left hover:bg-muted active:bg-muted transition-colors"
          >
            <Row
              icon={<LogOut className="size-4 text-muted-foreground" />}
              label="Sair"
              hint={user.email ?? undefined}
            />
          </button>
        </form>
      </section>
    </main>
  );
}
