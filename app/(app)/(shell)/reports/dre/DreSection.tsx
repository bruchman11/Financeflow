"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { formatBRL } from "@/lib/format/currency";
import { cn } from "@/lib/utils";
import type { DreNode } from "@/lib/db/reports";

type Props = {
  label: string;
  node: DreNode;
  sign: "+" | "-";
  revenueTotal: number;
};

export function DreSection({ label, node, sign, revenueTotal }: Props) {
  const [open, setOpen] = useState(false);
  const hasChildren = node.categories.length > 0;
  const pctOfRevenue =
    revenueTotal > 0 ? (node.total / revenueTotal) * 100 : null;

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => hasChildren && setOpen((o) => !o)}
        disabled={!hasChildren}
        className={cn(
          "w-full flex items-center gap-2 px-4 py-3 min-h-[48px] text-left transition-colors",
          hasChildren ? "hover:bg-muted" : "",
        )}
      >
        {hasChildren ? (
          open ? (
            <ChevronDown className="size-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground shrink-0" />
          )
        ) : (
          <span className="size-4 shrink-0" />
        )}
        <span
          className={cn(
            "text-base font-semibold shrink-0",
            sign === "+" ? "text-income" : "text-expense",
          )}
        >
          ({sign})
        </span>
        <span className="flex-1 text-sm font-medium truncate">{label}</span>
        {pctOfRevenue !== null ? (
          <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
            {pctOfRevenue.toFixed(1)}%
          </span>
        ) : null}
        <span className="text-sm font-semibold tabular-nums shrink-0">
          {formatBRL(node.total)}
        </span>
      </button>

      {open && hasChildren ? (
        <ul className="bg-muted/30 divide-y divide-border">
          {node.categories.map((c) => {
            const childPct =
              revenueTotal > 0 ? (c.total / revenueTotal) * 100 : null;
            return (
              <li
                key={c.id}
                className="flex items-center gap-2 px-4 py-2 min-h-[40px]"
                style={{ paddingLeft: `${20 + (c.code.split(".").length - 1) * 16}px` }}
              >
                <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                  {c.code}
                </span>
                <span className="flex-1 text-xs truncate">{c.name}</span>
                {childPct !== null ? (
                  <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                    {childPct.toFixed(1)}%
                  </span>
                ) : null}
                <span className="text-xs font-medium tabular-nums shrink-0">
                  {formatBRL(c.total)}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

type SubtotalProps = {
  label: string;
  value: number;
  revenueTotal: number;
  highlight?: boolean;
};

export function DreSubtotal({
  label,
  value,
  revenueTotal,
  highlight = false,
}: SubtotalProps) {
  const pct = revenueTotal > 0 ? (value / revenueTotal) * 100 : null;
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-4 py-3 min-h-[48px]",
        highlight
          ? "bg-foreground text-background font-bold"
          : "bg-muted/50 font-semibold",
      )}
    >
      <span className="size-4 shrink-0" />
      <span className="text-base shrink-0">=</span>
      <span className="flex-1 text-sm truncate">{label}</span>
      {pct !== null ? (
        <span
          className={cn(
            "text-[10px] tabular-nums shrink-0",
            highlight ? "opacity-70" : "text-muted-foreground",
          )}
        >
          {pct.toFixed(1)}%
        </span>
      ) : null}
      <span className="text-sm tabular-nums shrink-0">
        {value < 0 ? "−" : ""}
        {formatBRL(Math.abs(value))}
      </span>
    </div>
  );
}
