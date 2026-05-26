import { getUserOrRedirect } from "@/lib/auth/current";

/**
 * Layout das rotas autenticadas (dashboard, transações, contas, etc).
 * Por enquanto apenas garante sessão; o shell mobile (header + bottom nav)
 * é montado na Etapa 4 do roadmap.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await getUserOrRedirect();

  return <div className="flex-1 flex flex-col">{children}</div>;
}
