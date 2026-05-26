/**
 * Helpers para valores monetários.
 * Regra do projeto: dinheiro nunca é representado por float em JS.
 * - Estado interno em strings BR ("1.234,56") ou normalizadas ("1234.56").
 * - Conversão para o banco como string `numeric` ("1234.56") — Postgres aceita.
 */

const BR_CURRENCY = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const BR_NUMBER = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Converte uma entrada do usuário em PT-BR ("1.234,56" ou "1234,56" ou "1234.56")
 * para o formato canônico do banco ("1234.56"). Retorna null se inválido.
 */
export function parseBRLToNumeric(input: string): string | null {
  if (input == null) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Remove "R$", espaços e separadores de milhar (.).
  // Mantém a vírgula como decimal, depois converte para ponto.
  const cleaned = trimmed
    .replace(/[R$\s\u00A0]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "") // remove pontos de milhar
    .replace(",", ".");

  if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) return null;

  const [intPart, decPart = ""] = cleaned.split(".");
  const decPadded = (decPart + "00").slice(0, 2);
  return `${intPart}.${decPadded}`;
}

/** Formata uma string/number numérico para "R$ 1.234,56". */
export function formatBRL(value: string | number): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return BR_CURRENCY.format(0);
  return BR_CURRENCY.format(n);
}

/** Formata sem o símbolo: "1.234,56". */
export function formatNumber(value: string | number): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return BR_NUMBER.format(0);
  return BR_NUMBER.format(n);
}

/** Aplica sinal e cor semântica em sumários: entradas positivas, saídas negativas. */
export function signedAmount(
  type: "income" | "expense",
  value: string | number,
): string {
  const formatted = formatBRL(value);
  return type === "expense" ? `−${formatted.replace("R$", "R$")}` : formatted;
}
