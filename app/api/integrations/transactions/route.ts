import { NextRequest } from "next/server";
import { authorize, isValidApiKey, resolveContact } from "@/lib/integrations/auth";
import { integrationCreateTxSchema } from "@/lib/validation/integration";
import { createTransaction, listTransactions } from "@/lib/db/integrations";
import { json, errorResponse } from "@/lib/integrations/http";

/** Cria uma movimentação (idempotente por client_request_id). */
export async function POST(req: NextRequest) {
  if (!isValidApiKey(req.headers.get("x-api-key"))) {
    return json(401, { error: "unauthorized" });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "invalid_json" });
  }

  const parsed = integrationCreateTxSchema.safeParse(body);
  if (!parsed.success) {
    return json(422, {
      error: "validation",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const contact = resolveContact(parsed.data.phone);
  if (!contact) return json(403, { error: "phone_not_allowlisted" });

  try {
    const result = await createTransaction(
      contact.companyId,
      contact.userId,
      parsed.data,
    );
    return json(result.duplicated ? 200 : 201, {
      ok: true,
      duplicated: result.duplicated,
      transaction: result.transaction,
      resumo: result.resumo,
    });
  } catch (e) {
    return errorResponse(e);
  }
}

/** Lista/busca movimentações (ferramenta de leitura do chat). */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const auth = authorize(req, searchParams.get("phone"));
  if (!auth.ok) return json(auth.status, { error: auth.error });

  const typeParam = searchParams.get("type");
  try {
    const transactions = await listTransactions(auth.contact.companyId, {
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      type:
        typeParam === "income" || typeParam === "expense" ? typeParam : undefined,
      q: searchParams.get("q") ?? undefined,
      accountId: searchParams.get("accountId") ?? undefined,
      categoryCode: searchParams.get("categoryCode") ?? undefined,
      limit: searchParams.get("limit")
        ? Number(searchParams.get("limit"))
        : undefined,
    });
    return json(200, { ok: true, transactions });
  } catch (e) {
    return errorResponse(e);
  }
}
