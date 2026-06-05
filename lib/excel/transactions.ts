/**
 * Helpers para importação e exportação de movimentações em Excel.
 * Usa SheetJS (xlsx) no servidor — nunca importado no client bundle.
 */
import * as XLSX from "xlsx";
import { parseBRLToNumeric, formatNumber } from "@/lib/format/currency";
import { formatBR } from "@/lib/format/date";
import type { TransactionType } from "@/lib/types/database";
import type { TransactionWithRefs } from "@/lib/db/transactions";

// ── Cabeçalhos canônicos da planilha ─────────────────────────────────────────

export const SHEET_HEADERS = [
  "Data",
  "Tipo",
  "Valor",
  "Conta",
  "Categoria",
  "Descrição",
] as const;

// ── Exportação ────────────────────────────────────────────────────────────────

/** Gera um buffer .xlsx a partir de uma lista de movimentações. */
export function buildExportBuffer(
  transactions: TransactionWithRefs[],
): Buffer {
  const rows = transactions.map((tx) => ({
    Data: formatBR(tx.occurred_on),
    Tipo: tx.type === "income" ? "Entrada" : "Saída",
    Valor: formatNumber(tx.amount),
    Conta: tx.accounts?.name ?? "",
    Categoria: tx.categories
      ? `${tx.categories.code} ${tx.categories.name}`
      : "",
    Descrição: tx.description ?? "",
  }));

  const ws = XLSX.utils.json_to_sheet(rows, { header: [...SHEET_HEADERS] });

  // Larguras de coluna (chars)
  ws["!cols"] = [
    { wch: 12 }, // Data
    { wch: 8 },  // Tipo
    { wch: 14 }, // Valor
    { wch: 22 }, // Conta
    { wch: 30 }, // Categoria
    { wch: 40 }, // Descrição
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Movimentações");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

/** Gera um buffer .xlsx com apenas o cabeçalho + 1 linha de exemplo. */
export function buildTemplateBuffer(): Buffer {
  const example = [
    {
      Data: "25/05/2026",
      Tipo: "Saída",
      Valor: "150,00",
      Conta: "Caixa",
      Categoria: "Alimentação",
      Descrição: "Almoço da equipe",
    },
  ];
  const ws = XLSX.utils.json_to_sheet(example, { header: [...SHEET_HEADERS] });
  ws["!cols"] = [
    { wch: 12 },
    { wch: 8 },
    { wch: 14 },
    { wch: 22 },
    { wch: 22 },
    { wch: 40 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Movimentações");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

// ── Importação ────────────────────────────────────────────────────────────────

export type ParsedRow = {
  occurred_on: string;      // YYYY-MM-DD
  type: TransactionType;
  amount: string;           // canonical "1234.56"
  accountName: string;
  categoryName: string;     // pode estar vazio
  description: string | null;
};

export type ParseError = { row: number; message: string };

export type ParseResult = {
  rows: ParsedRow[];
  errors: ParseError[];
};

/** Converte vários formatos de data para YYYY-MM-DD. */
function normalizeDate(value: unknown): string | null {
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof value === "number") {
    // Serial de data do Excel (sem cellDates: true)
    const date = XLSX.SSF.parse_date_code(value);
    if (!date) return null;
    return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
  }
  if (typeof value === "string") {
    const s = value.trim();
    const brMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (brMatch) {
      const [, d, m, y] = brMatch;
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  }
  return null;
}

/** Normaliza cabeçalho (remove acentos, lowercase, trim). */
function normalizeKey(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Parseia o conteúdo binário de um arquivo .xlsx/.xls e retorna
 * as linhas válidas e os erros por linha para feedback ao usuário.
 */
export function parseImportBuffer(buffer: ArrayBuffer): ParseResult {
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return { rows: [], errors: [{ row: 0, message: "Planilha vazia ou inválida." }] };

  // sheet_to_json retorna objetos; usamos defval para células vazias
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: "",
    raw: false, // formata datas como string ISO quando cellDates: false — mas como usamos cellDates: true, recebemos Date
  });

  const rows: ParsedRow[] = [];
  const errors: ParseError[] = [];

  for (let i = 0; i < raw.length; i++) {
    const rowNum = i + 2; // +1 cabeçalho +1 base-1
    const rawRow = raw[i];

    // Normaliza as chaves para tolerar variações de acento/caixa
    const row: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rawRow)) {
      row[normalizeKey(k)] = v;
    }

    // Pula linhas completamente vazias
    const allEmpty = Object.values(row).every(
      (v) => v === "" || v === null || v === undefined,
    );
    if (allEmpty) continue;

    // Data
    const occurred_on = normalizeDate(row["data"]);
    if (!occurred_on) {
      errors.push({ row: rowNum, message: `Data inválida: "${row["data"]}"` });
      continue;
    }

    // Tipo
    const tipoRaw = String(row["tipo"] ?? "").trim().toLowerCase();
    const type: TransactionType | null =
      tipoRaw === "entrada" ? "income"
      : tipoRaw === "saida" || tipoRaw === "saída" ? "expense"
      : null;
    if (!type) {
      errors.push({ row: rowNum, message: `Tipo inválido: "${row["tipo"]}" (use "Entrada" ou "Saída")` });
      continue;
    }

    // Valor
    const valorRaw = String(row["valor"] ?? "").trim();
    const amount = parseBRLToNumeric(valorRaw);
    if (!amount || Number(amount) <= 0) {
      errors.push({ row: rowNum, message: `Valor inválido: "${valorRaw}"` });
      continue;
    }

    // Conta
    const accountName = String(row["conta"] ?? "").trim();
    if (!accountName) {
      errors.push({ row: rowNum, message: `Conta obrigatória na linha ${rowNum}.` });
      continue;
    }

    // Categoria (opcional)
    const categoryName = String(row["categoria"] ?? "").trim();

    // Descrição (opcional)
    const descRaw = String(row["descricao"] ?? row["descrição"] ?? "").trim();

    rows.push({
      occurred_on,
      type,
      amount,
      accountName,
      categoryName,
      description: descRaw || null,
    });
  }

  return { rows, errors };
}
