import { getActiveCompanyOrRedirect } from "@/lib/auth/current";
import { AppHeader } from "@/components/shell/AppHeader";
import { BottomNav } from "@/components/shell/BottomNav";

/**
 * Layout do shell mobile: aplicado a rotas que assumem empresa ativa
 * (dashboard, movimentações, contas, etc). Telas de seleção/criação de
 * empresa NÃO usam este layout — ficam diretamente em (app)/companies.
 *
 * Estrutura: header sticky + área de conteúdo rolável + bottom nav sticky.
 */
export default async function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const company = await getActiveCompanyOrRedirect();

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full max-w-md mx-auto">
      <AppHeader company={company} />
      <div className="flex-1 flex flex-col min-h-0">{children}</div>
      <BottomNav />
    </div>
  );
}
