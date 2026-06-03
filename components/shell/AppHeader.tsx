import Link from "next/link";
import { Building2, ChevronDown } from "lucide-react";
import type { UserCompany } from "@/lib/db/companies";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

/**
 * Barra superior fixa do shell mobile.
 * O nome da empresa é tocável e leva para /companies (switcher).
 * Mantém altura de 56px para não competir com a área de conteúdo.
 */
export function AppHeader({ company }: { company: UserCompany }) {
  return (
    <header className="sticky top-0 z-30 h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="h-full px-4 flex items-center gap-3">
        <Link
          href="/companies"
          aria-label="Trocar empresa"
          className="flex-1 min-w-0 flex items-center gap-2 -mx-2 px-2 py-1 rounded-md hover:bg-muted active:bg-muted transition-colors"
        >
          <div className="size-8 rounded-md bg-muted flex items-center justify-center shrink-0">
            <Building2 className="size-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-none mb-0.5">
              Empresa
            </p>
            <p className="text-sm font-medium truncate leading-tight">
              {company.name}
            </p>
          </div>
          <ChevronDown className="size-4 text-muted-foreground shrink-0" />
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
