import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, CreditCard, FileText, Receipt } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  listCalendarItems,
  type CalendarItem,
  type CalendarItemKind,
  calendarKindLabels,
} from "@/lib/db/calendar";
import { formatBRL } from "@/lib/format/currency";
import { formatWeekday, todayISO } from "@/lib/format/date";
import {
  adjacentMonth,
  currentYearMonth,
  fmtDate,
  monthLabel,
  monthRange,
} from "@/lib/format/month";
import { MonthNav } from "@/components/shell/MonthNav";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Calendário — FinanceFlow",
};

// ── ícones e cores por tipo ───────────────────────────────────────────────────

const kindIcon: Record<
  CalendarItemKind,
  React.ComponentType<{ className?: string }>
> = {
  bill: FileText,
  fixed_expense: Receipt,
  invoice: CreditCard,
};

const kindAccent: Record<CalendarItemKind, string> = {
  bill: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  fixed_expense:
    "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  invoice:
    "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
};

// ── página ────────────────────────────────────────────────────────────────────

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; kind?: string }>;
}) {
  const sp = await searchParams;
  const defaultMes = currentYearMonth();
  const mes = /^\d{4}-\d{2}$/.test(sp.mes ?? "") ? sp.mes! : defaultMes;

  const kindFilter =
    sp.kind === "bill" ||
    sp.kind === "fixed_expense" ||
    sp.kind === "invoice"
      ? (sp.kind as CalendarItemKind)
      : null;

  const today = todayISO();
  const { from, to } = monthRange(mes);

  // Para o mês corrente: incluir overdue do passado (até 90 dias para trás)
  const monthStart = new Date(from + "T00:00:00");
  const overdueLookback = new Date(monthStart);
  overdueLookback.setDate(overdueLookback.getDate() - 90);
  const queryFrom = fmtDate(overdueLookback);

  const allItems = await listCalendarItems({
    from: queryFrom,
    to,
    kinds: kindFilter ? [kindFilter] : undefined,
  });

  // Separa: overdue (antes de hoje) vs período visível
  const overdue: CalendarItem[] = [];
  const inPeriod: CalendarItem[] = [];
  for (const item of allItems) {
    if (item.event_date < today && item.event_date < from) {
      overdue.push(item);
    } else if (item.event_date >= from && item.event_date <= to) {
      inPeriod.push(item);
    } else if (item.event_date < today) {
      overdue.push(item);
    } else {
      inPeriod.push(item);
    }
  }

  // Agrupa inPeriod por dia
  const byDay = new Map<string, CalendarItem[]>();
  for (const item of inPeriod) {
    const list = byDay.get(item.event_date) ?? [];
    list.push(item);
    byDay.set(item.event_date, list);
  }
  const days = Array.from(byDay.keys()).sort();

  // Soma total no período (excluindo overdue)
  const monthTotal = inPeriod.reduce((acc, it) => acc + Number(it.amount), 0);
  const overdueTotal = overdue.reduce((acc, it) => acc + Number(it.amount), 0);

  const prevMes = adjacentMonth(mes, -1);
  const nextMes = adjacentMonth(mes, 1);
  const isCurrentMonth = mes === defaultMes;

  const baseHref = (m: string, k: string | null) =>
    `/calendar?mes=${m}${k ? `&kind=${k}` : ""}`;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Navegação de mês */}
      <MonthNav
        label={monthLabel(mes)}
        prevHref={baseHref(prevMes, kindFilter)}
        nextHref={baseHref(nextMes, kindFilter)}
        nextDisabled={isCurrentMonth}
        sticky
      />

      {/* Filtros por tipo */}
      <div className="flex gap-2 px-4 py-3 border-b border-border bg-background overflow-x-auto">
        <Link
          href={baseHref(mes, null)}
          className={cn(
            "h-9 px-3 inline-flex items-center rounded-full text-xs font-medium border whitespace-nowrap transition-colors",
            kindFilter === null
              ? "bg-foreground text-background border-foreground"
              : "bg-background hover:bg-muted border-input",
          )}
        >
          Tudo
        </Link>
        {(["bill", "fixed_expense", "invoice"] as CalendarItemKind[]).map(
          (k) => (
            <Link
              key={k}
              href={baseHref(mes, k)}
              className={cn(
                "h-9 px-3 inline-flex items-center rounded-full text-xs font-medium border whitespace-nowrap transition-colors",
                kindFilter === k
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background hover:bg-muted border-input",
              )}
            >
              {calendarKindLabels[k]}
            </Link>
          ),
        )}
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 border-b border-border">
        <div className="flex flex-col items-center py-3 gap-0.5 border-r border-border">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
            Vencidos
          </span>
          <span
            className={cn(
              "text-sm font-semibold tabular-nums",
              overdue.length > 0 ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {overdue.length > 0 ? formatBRL(overdueTotal) : "—"}
          </span>
        </div>
        <div className="flex flex-col items-center py-3 gap-0.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
            No mês
          </span>
          <span className="text-sm font-semibold tabular-nums">
            {formatBRL(monthTotal)}
          </span>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto pb-24">
        {/* Vencidos no topo */}
        {overdue.length > 0 ? (
          <section>
            <div className="px-4 py-1.5 bg-destructive/10 border-b border-destructive/20">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-destructive">
                Vencidos ({overdue.length})
              </span>
            </div>
            <ul className="divide-y divide-border">
              {overdue.map((item) => (
                <ItemRow key={`${item.kind}-${item.id}`} item={item} overdue />
              ))}
            </ul>
          </section>
        ) : null}

        {/* Itens do mês agrupados por dia */}
        {days.length === 0 && overdue.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Nada agendado neste mês"
            description="Cadastre boletos, despesas fixas ou compras no cartão para ver os vencimentos aqui."
          />
        ) : (
          <ul>
            {days.map((day) => {
              const itemsOfDay = byDay.get(day)!;
              const dayLabel = formatWeekday(day);
              const isToday = day === today;
              return (
                <li key={day}>
                  <div
                    className={cn(
                      "px-4 py-1.5 border-b border-border",
                      isToday ? "bg-amber-100 dark:bg-amber-950" : "bg-muted/50",
                    )}
                  >
                    <span
                      className={cn(
                        "text-[11px] uppercase tracking-wider capitalize",
                        isToday
                          ? "text-amber-800 dark:text-amber-300 font-semibold"
                          : "text-muted-foreground",
                      )}
                    >
                      {dayLabel}
                      {isToday ? " · Hoje" : ""}
                    </span>
                  </div>
                  <ul className="divide-y divide-border">
                    {itemsOfDay.map((item) => (
                      <ItemRow key={`${item.kind}-${item.id}`} item={item} />
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function ItemRow({
  item,
  overdue = false,
}: {
  item: CalendarItem;
  overdue?: boolean;
}) {
  const Icon = kindIcon[item.kind];

  return (
    <li className="flex items-center gap-3 px-4 py-3 min-h-[64px]">
      <Link
        href={item.detail_href}
        className={cn(
          "size-9 rounded-md flex items-center justify-center shrink-0",
          kindAccent[item.kind],
        )}
        aria-label={`Abrir ${calendarKindLabels[item.kind].toLowerCase()}`}
      >
        <Icon className="size-4" />
      </Link>
      <Link
        href={item.detail_href}
        className="flex-1 min-w-0 -my-3 py-3 hover:opacity-80 transition-opacity"
      >
        <p className="text-sm font-medium leading-tight truncate">
          {item.title}
        </p>
        <p
          className={cn(
            "text-xs truncate",
            overdue ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {calendarKindLabels[item.kind]}
          {item.subtitle ? ` · ${item.subtitle}` : ""}
          {item.category_name ? ` · ${item.category_name}` : ""}
        </p>
      </Link>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span
          className={cn(
            "text-sm font-semibold tabular-nums",
            overdue ? "text-destructive" : "",
          )}
        >
          {formatBRL(item.amount)}
        </span>
        <Link
          href={item.pay_href}
          className={buttonVariants({
            variant: overdue ? "default" : "outline",
            className: "h-7 px-2 text-[11px]",
          })}
        >
          Pagar
        </Link>
      </div>
    </li>
  );
}
