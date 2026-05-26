import { NextRequest, NextResponse } from "next/server";
import { getActiveCompany, getUser } from "@/lib/auth/current";
import { listTransactions } from "@/lib/db/transactions";
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

export async function GET(req: NextRequest) {
  // Auth
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const company = await getActiveCompany();
  if (!company) {
    return NextResponse.json({ error: "Nenhuma empresa ativa." }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);

  // Modo template — retorna planilha vazia com cabeçalho + exemplo
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

  // Exportação do período
  const mes =
    /^\d{4}-\d{2}$/.test(searchParams.get("mes") ?? "")
      ? (searchParams.get("mes") as string)
      : currentYearMonth();

  const { from, to } = monthRange(mes);
  const transactions = await listTransactions({ from, to });

  const buffer = buildExportBuffer(transactions);

  return new NextResponse(new Uint8Array(buffer as Buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="movimentacoes-${mes}.xlsx"`,
    },
  });
}
