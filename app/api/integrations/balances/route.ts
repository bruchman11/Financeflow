import { NextRequest } from "next/server";
import { authorize } from "@/lib/integrations/auth";
import { getAccountBalances } from "@/lib/db/integrations";
import { json, errorResponse } from "@/lib/integrations/http";

/** Saldo atual por conta (saldo inicial + Σ entradas − Σ saídas). */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const auth = authorize(req, searchParams.get("phone"));
  if (!auth.ok) return json(auth.status, { error: auth.error });

  try {
    const accounts = await getAccountBalances(auth.contact.companyId);
    const total = accounts.reduce((s, a) => s + a.currentBalance, 0);
    return json(200, { ok: true, total, accounts });
  } catch (e) {
    return errorResponse(e);
  }
}
