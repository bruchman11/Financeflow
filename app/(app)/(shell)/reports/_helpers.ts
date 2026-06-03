/**
 * Helpers de período dos relatórios.
 * Reexporta os utilitários de mês compartilhados (lib/format/month) para manter
 * compatibilidade com os imports `../_helpers` das páginas de relatório.
 */
export {
  currentYearMonth,
  fmtDate,
  monthRange,
  adjacentMonth,
  monthLabel,
} from "@/lib/format/month";
