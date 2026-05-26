/**
 * Helpers de data. App usa `date` (sem hora) no banco para occurred_on,
 * evitando confusão de fuso. Exibição em PT-BR.
 */

const BR_DATE = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const BR_DATE_SHORT = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
});

const BR_WEEKDAY = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "2-digit",
});

/** Retorna a data atual no formato ISO (YYYY-MM-DD), em horário local. */
export function todayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** "YYYY-MM-DD" → Date local (sem deslocamento de fuso). */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** "YYYY-MM-DD" → "22/05/2026" */
export function formatBR(iso: string): string {
  return BR_DATE.format(parseISODate(iso));
}

/** "YYYY-MM-DD" → "22/05" */
export function formatBRShort(iso: string): string {
  return BR_DATE_SHORT.format(parseISODate(iso));
}

/** "YYYY-MM-DD" → "quarta-feira, 22/05" */
export function formatWeekday(iso: string): string {
  return BR_WEEKDAY.format(parseISODate(iso));
}

/** Adiciona dias a uma data ISO. */
export function addDaysISO(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/** Início e fim (ISO) do mês corrente. */
export function currentMonthRange(): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: fmt(first), to: fmt(last) };
}
