"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Filter } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type FiltersState = {
  from: string;
  to: string;
  accountId: string;
  categoryId: string;
  type: "" | "income" | "expense";
  regime: "cash" | "accrual";
  q: string;
};

export type FilterAccount = { id: string; name: string };
export type FilterCategory = {
  id: string;
  code: string;
  name: string;
  level: number;
};

type Props = {
  basePath: string;
  monthBaseParam: string; // mes=YYYY-MM (preservado)
  initialFilters: FiltersState;
  accounts: FilterAccount[];
  categories: FilterCategory[];
  /** Conta de filtros ativos para exibir badge no botão. */
  activeCount: number;
};

export function FiltersDrawer({
  basePath,
  monthBaseParam,
  initialFilters,
  accounts,
  categories,
  activeCount,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FiltersState>(initialFilters);

  function buildUrl(filters: FiltersState): string {
    const params = new URLSearchParams();
    if (monthBaseParam) params.set("mes", monthBaseParam);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.accountId) params.set("account", filters.accountId);
    if (filters.categoryId) params.set("category", filters.categoryId);
    if (filters.type) params.set("type", filters.type);
    if (filters.regime !== "cash") params.set("regime", filters.regime);
    if (filters.q.trim()) params.set("q", filters.q.trim());
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  }

  function apply() {
    router.push(buildUrl(draft));
    setOpen(false);
  }

  function clearAll() {
    const empty: FiltersState = {
      from: "",
      to: "",
      accountId: "",
      categoryId: "",
      type: "",
      regime: "cash",
      q: "",
    };
    setDraft(empty);
    router.push(buildUrl(empty));
    setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className={cn(
          "h-11 px-3 inline-flex items-center gap-1.5 rounded-md text-sm font-medium border border-input transition-colors",
          activeCount > 0
            ? "bg-foreground text-background border-foreground"
            : "bg-background hover:bg-muted",
        )}
      >
        <Filter className="size-4" />
        Filtros
        {activeCount > 0 ? (
          <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-background text-foreground text-[10px] font-bold">
            {activeCount}
          </span>
        ) : null}
      </SheetTrigger>

      <SheetContent side="bottom" className="h-[88vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filtros</SheetTitle>
        </SheetHeader>

        <div className="px-4 py-4 space-y-5">
          {/* Período */}
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground tracking-wider">
              Período
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={draft.from}
                onChange={(e) =>
                  setDraft({ ...draft, from: e.target.value })
                }
                placeholder="De"
                className="h-12"
              />
              <Input
                type="date"
                value={draft.to}
                onChange={(e) => setDraft({ ...draft, to: e.target.value })}
                placeholder="Até"
                className="h-12"
              />
            </div>
          </div>

          {/* Regime */}
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground tracking-wider">
              Data base
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDraft({ ...draft, regime: "cash" })}
                className={cn(
                  "h-12 rounded-md border text-sm font-medium transition-colors",
                  draft.regime === "cash"
                    ? "border-foreground bg-foreground text-background"
                    : "border-input bg-background hover:bg-muted",
                )}
              >
                Caixa
              </button>
              <button
                type="button"
                onClick={() => setDraft({ ...draft, regime: "accrual" })}
                className={cn(
                  "h-12 rounded-md border text-sm font-medium transition-colors",
                  draft.regime === "accrual"
                    ? "border-foreground bg-foreground text-background"
                    : "border-input bg-background hover:bg-muted",
                )}
              >
                Competência
              </button>
            </div>
          </div>

          {/* Tipo */}
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground tracking-wider">
              Tipo
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { v: "" as const, label: "Tudo" },
                { v: "income" as const, label: "Entrada" },
                { v: "expense" as const, label: "Saída" },
              ].map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setDraft({ ...draft, type: opt.v })}
                  className={cn(
                    "h-12 rounded-md border text-sm font-medium transition-colors",
                    draft.type === opt.v
                      ? "border-foreground bg-foreground text-background"
                      : "border-input bg-background hover:bg-muted",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conta */}
          <div className="space-y-2">
            <Label
              htmlFor="filter-account"
              className="text-xs uppercase text-muted-foreground tracking-wider"
            >
              Conta
            </Label>
            <select
              id="filter-account"
              value={draft.accountId}
              onChange={(e) =>
                setDraft({ ...draft, accountId: e.target.value })
              }
              className="w-full h-12 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Todas</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Categoria */}
          <div className="space-y-2">
            <Label
              htmlFor="filter-category"
              className="text-xs uppercase text-muted-foreground tracking-wider"
            >
              Categoria
            </Label>
            <select
              id="filter-category"
              value={draft.categoryId}
              onChange={(e) =>
                setDraft({ ...draft, categoryId: e.target.value })
              }
              className="w-full h-12 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Todas</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {" ".repeat((c.level - 1) * 2)}
                  {c.code} {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Busca */}
          <div className="space-y-2">
            <Label
              htmlFor="filter-q"
              className="text-xs uppercase text-muted-foreground tracking-wider"
            >
              Busca na descrição
            </Label>
            <Input
              id="filter-q"
              type="text"
              value={draft.q}
              onChange={(e) => setDraft({ ...draft, q: e.target.value })}
              placeholder="ex.: aluguel"
              className="h-12"
            />
          </div>
        </div>

        <SheetFooter className="flex-row gap-2 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sticky bottom-0 bg-background border-t border-border pt-3">
          {activeCount > 0 ? (
            <button
              type="button"
              onClick={clearAll}
              className="flex-1 h-12 text-sm font-medium underline text-muted-foreground"
            >
              Limpar tudo
            </button>
          ) : (
            <SheetClose className="flex-1 h-12 text-sm font-medium rounded-md border border-input">
              Cancelar
            </SheetClose>
          )}
          <Button onClick={apply} className="flex-1 h-12">
            Aplicar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

