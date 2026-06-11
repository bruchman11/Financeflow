import { NextRequest } from "next/server";
import { authorize } from "@/lib/integrations/auth";
import { getTotalsByCategory } from "@/lib/db/integrations";
import { json, errorResponse, resolveRange } from "@/lib/integrations/http";

/** Totais por categoria no período (padrão: mês corrente). */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const auth = authorize(req, searchParams.get("phone"));
  if (!auth.ok) return json(auth.status, { error: auth.error });

  const { from, to } = resolveRange(searchParams);
  try {
    const categories = await getTotalsByCategory(
      auth.contact.companyId,
      from,
      to,
    );
    return json(200, { ok: true, from, to, categories });
  } catch (e) {
    return errorResponse(e);
  }
}
