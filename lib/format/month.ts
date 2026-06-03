/**
 * Helpers de mês (YYYY-MM) compartilhados por movimentações, calendário e
 * relatórios. Mês corrente em horário local; datas no formato ISO (sem fuso).
 */

/** Mês corrente no formato "YYYY-MM" (horário local). */
export function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Date → "YYYY-MM-DD" (sem deslocamento de fuso). */
export function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "YYYY-MM" → primeiro e último dia do mês em ISO. */
export function monthRange(mes: string): { from: string; to: string } {
  const [y, m] = mes.split("-").map(Number);
  return {
    from: fmtDate(new Date(y, m - 1, 1)),
    to: fmtDate(new Date(y, m, 0)),
  };
}

/** Soma/subtrai meses a um "YYYY-MM". */
export function adjacentMonth(mes: string, delta: number): string {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** "YYYY-MM" → "maio de 2026" (PT-BR). */
export function monthLabel(mes: string): string {
  const [y, m] = mes.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(y, m - 1, 1));
}
