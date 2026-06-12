"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { formatBRL } from "@/lib/format/currency";
import { cn } from "@/lib/utils";
import type { DreNode, DreTreeNode } from "@/lib/db/reports";

type Props = {
  label: string;
  node: DreNode;
  sign: "+" | "-";
  revenueTotal: number;
};

export function DreSection({ label, node, sign, revenueTotal }: Props) {
  const [open, setOpen] = useState(false);
  const hasChildren = node.tree.length > 0;
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
        <ul className="bg-muted/30">
          {node.tree.map((child) => (
            <DreTreeRow
              key={child.id}
              node={child}
              depth={0}
              revenueTotal={revenueTotal}
            />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** Linha recursiva da árvore: total acumulado por nó, expansível por clique. */
function DreTreeRow({
  node,
  depth,
  revenueTotal,
}: {
  node: DreTreeNode;
  depth: number;
  revenueTotal: number;
}) {
  const [open, setOpen] = useState(false);
  const hasChildren = node.children.length > 0;
  const pct = revenueTotal > 0 ? (node.total / revenueTotal) * 100 : null;
  const padLeft = 16 + depth * 16;

  return (
    <li className="border-t border-border/60 first:border-t-0">
      <button
        type="button"
        onClick={() => hasChildren && setOpen((o) => !o)}
        disabled={!hasChildren}
        className={cn(
          "w-full flex items-center gap-2 pr-4 py-2 min-h-[40px] text-left transition-colors",
          hasChildren ? "hover:bg-muted/60" : "",
        )}
        style={{ paddingLeft: `${padLeft}px` }}
      >
        {hasChildren ? (
          open ? (
            <ChevronDown className="size-3.5 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
          )
        ) : (
          <span className="size-3.5 shrink-0" />
        )}
        <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
          {node.code}
        </span>
        <span
          className={cn(
            "flex-1 truncate text-xs",
            hasChildren ? "font-medium" : "",
          )}
        >
          {node.name}
        </span>
        {pct !== null ? (
          <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
            {pct.toFixed(1)}%
          </span>
        ) : null}
        <span
          className={cn(
            "text-xs tabular-nums shrink-0",
            hasChildren ? "font-semibold" : "font-medium",
          )}
        >
          {formatBRL(node.total)}
        </span>
      </button>

      {open && hasChildren ? (
        <ul>
          {node.children.map((c) => (
            <DreTreeRow
              key={c.id}
              node={c}
              depth={depth + 1}
              revenueTotal={revenueTotal}
            />
          ))}
        </ul>
      ) : null}
    </li>
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
