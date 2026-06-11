import { NextRequest } from "next/server";
import { authorize } from "@/lib/integrations/auth";
import { getContext } from "@/lib/db/integrations";
import { json, errorResponse } from "@/lib/integrations/http";

/** Contas + categorias da empresa — a IA usa para mapear nome→código. */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const auth = authorize(req, searchParams.get("phone"));
  if (!auth.ok) return json(auth.status, { error: auth.error });

  try {
    const ctx = await getContext(auth.contact.companyId);
    return json(200, { ok: true, ...ctx });
  } catch (e) {
    return errorResponse(e);
  }
}
