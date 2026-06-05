import { NextRequest, NextResponse } from "next/server";
import { getActiveCompany, getUser } from "@/lib/auth/current";
import {
  listTransactionsPage,
  type TransactionFilters,
  type TransactionWithRefs,
} from "@/lib/db/transactions";
import { buildExportBuffer, buildTemplateBuffer } from "@/lib/excel/transactions";

function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthRange(mes: string): { from: string; to: string } {
  const [y, m] = mes.split("-").map(Number);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return {
    from: fmt(new Date(y, m - 1, 1)),
    to: fmt(new Date(y, m, 0)),
  };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const company = await getActiveCompany();
  if (!company) {
    return NextResponse.json({ error: "Nenhuma empresa ativa." }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);

  // Modo template — planilha vazia com cabeçalho + exemplo
  if (searchParams.get("template") === "1") {
    const buffer = buildTemplateBuffer();
    return new NextResponse(new Uint8Array(buffer as Buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="modelo-movimentacoes.xlsx"',
      },
    });
  }

  // Período: from/to explícitos > mes (compat) > mês corrente
  const fromRaw = searchParams.get("from");
  const toRaw = searchParams.get("to");
  let from: string;
  let to: string;
  if (ISO_DATE.test(fromRaw ?? "") && ISO_DATE.test(toRaw ?? "")) {
    from = fromRaw!;
    to = toRaw!;
  } else {
    const mes = /^\d{4}-\d{2}$/.test(searchParams.get("mes") ?? "")
      ? (searchParams.get("mes") as string)
      : currentYearMonth();
    ({ from, to } = monthRange(mes));
  }

  const typeParam = searchParams.get("type");
  const filters: TransactionFilters = {
    from,
    to,
    regime: searchParams.get("regime") === "accrual" ? "accrual" : "cash",
    accountId: searchParams.get("account") || null,
    categoryId: searchParams.get("category") || null,
    type:
      typeParam === "income" || typeParam === "expense" ? typeParam : null,
    q: searchParams.get("q") || null,
  };

  // Busca TODAS as linhas do período/filtros, paginando por cursor.
  // pageSize deve ficar abaixo do teto de linhas do PostgREST (~1000): a query
  // pede pageSize+1 p/ detectar a próxima página, então 500+1 nunca é truncado.
  const transactions: TransactionWithRefs[] = [];
  let cursor: string | null = null;
  do {
    const page = await listTransactionsPage({
      ...filters,
      pageSize: 500,
      cursor,
    });
    transactions.push(...page.rows);
    cursor = page.nextCursor;
  } while (cursor && transactions.length < 100000);

  const buffer = buildExportBuffer(transactions);

  return new NextResponse(new Uint8Array(buffer as Buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="movimentacoes-${from}_a_${to}.xlsx"`,
    },
  });
}
