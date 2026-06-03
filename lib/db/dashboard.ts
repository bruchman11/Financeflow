import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AccountKind } from "@/lib/types/database";

export type AccountBalance = {
  id: string;
  name: string;
  kind: AccountKind;
  openingBalance: string;
  /** Saldo calculado apenas para exibição — nunca persista este número. */
  currentBalance: number;
};

/**
 * Retorna o saldo atual de cada conta ativa da empresa.
 * currentBalance = opening_balance + Σ entradas − Σ saídas (todas as transações, sem filtro de data).
 * Usa Number() só para cálculo de display — regra "sem float para persistência" é mantida.
 */
export async function getAccountBalances(): Promise<AccountBalance[]> {
  const supabase = await createSupabaseServerClient();

  const { data: accounts, error: accErr } = await supabase
    .from("accounts")
    .select("id, name, kind, opening_balance")
    .eq("is_archived", false)
    .order("name", { ascending: true });
  if (accErr) throw accErr;

  // Soma sinalizada de TODAS as transações por conta. Paginamos em blocos
  // porque uma consulta sem range é truncada pelo limite de linhas do PostgREST
  // (~1000) — o que distorcia o saldo assim que a empresa passava de 1000
  // lançamentos. O somatório precisa bater com a RPC create_balance_adjustment.
  const sums = new Map<string, number>();
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data: txs, error: txErr } = await supabase
      .from("transactions")
      .select("account_id, type, amount")
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (txErr) throw txErr;
    for (const tx of txs ?? []) {
      const curr = sums.get(tx.account_id) ?? 0;
      sums.set(
        tx.account_id,
        tx.type === "income"
          ? curr + Number(tx.amount)
          : curr - Number(tx.amount),
      );
    }
    if (!txs || txs.length < PAGE) break;
  }

  return (accounts ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    kind: a.kind as AccountKind,
    openingBalance: a.opening_balance,
    currentBalance: Number(a.opening_balance) + (sums.get(a.id) ?? 0),
  }));
}
