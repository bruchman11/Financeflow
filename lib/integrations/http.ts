import "server-only";
import { NextResponse } from "next/server";
import { currentMonthRange } from "@/lib/format/date";
import { IntegrationError } from "@/lib/db/integrations";

export function json(status: number, body: unknown) {
  return NextResponse.json(body, { status });
}

/** Mapeia IntegrationError → status; demais erros viram 500 genérico (sem vazar detalhes). */
export function errorResponse(e: unknown) {
  if (e instanceof IntegrationError) return json(e.status, { error: e.message });
  return json(500, { error: "internal_error" });
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** from/to da query (se válidos) ou o mês corrente como padrão. */
export function resolveRange(sp: URLSearchParams): { from: string; to: string } {
  const from = sp.get("from");
  const to = sp.get("to");
  if (from && to && ISO.test(from) && ISO.test(to)) return { from, to };
  return currentMonthRange();
}
