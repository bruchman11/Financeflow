import {
  Calendar,
  CreditCard,
  FileText,
  LogOut,
  Receipt,
  Repeat2,
  Tags,
  Wallet,
} from "lucide-react";
import { getUserOrRedirect } from "@/lib/auth/current";
import { clearActiveCompanyAction } from "@/app/(app)/companies/actions";
import { signOutAction } from "@/app/(auth)/actions";
import { PageHeader } from "@/components/shell/PageHeader";
import { LinkRow, ListRow } from "@/components/shell/ListRow";

/**
 * Página "Mais": agrupa ações secundárias que não cabem na bottom nav.
 * Categorias (Etapa 6), trocar empresa, e sair.
 */
export default async function MorePage() {
  const user = await getUserOrRedirect();

  return (
    <main className="flex-1 flex flex-col px-4 py-6 gap-6">
      <PageHeader eyebrow="Configurações" title="Mais" className="px-2" />

      <section className="surface divide-y divide-border overflow-hidden">
        <LinkRow href="/accounts" icon={Wallet} label="Contas" />
        <LinkRow href="/calendar" icon={Calendar} label="Agenda" />
        <LinkRow href="/fixed-expenses" icon={Receipt} label="Despesas fixas" />
        <LinkRow
          href="/credit-cards"
          icon={CreditCard}
          label="Cartões de crédito"
        />
        <LinkRow href="/bills" icon={FileText} label="Boletos" />
        <LinkRow href="/categories" icon={Tags} label="Categorias" />
        <form action={clearActiveCompanyAction}>
          <button
            type="submit"
            className="w-full hover:bg-muted active:bg-muted transition-colors"
          >
            <ListRow icon={Repeat2} label="Trocar empresa" />
          </button>
        </form>
      </section>

      <section className="surface overflow-hidden">
        <form action={signOutAction}>
          <button
            type="submit"
            className="w-full hover:bg-muted active:bg-muted transition-colors"
          >
            <ListRow icon={LogOut} label="Sair" hint={user.email ?? undefined} />
          </button>
        </form>
      </section>
    </main>
  );
}
