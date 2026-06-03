"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Home, ListOrdered, MoreHorizontal } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const items: NavItem[] = [
  { href: "/dashboard", label: "Início", icon: Home },
  { href: "/transactions", label: "Transações", icon: ListOrdered },
  { href: "/reports", label: "Relatórios", icon: BarChart3 },
  { href: "/more", label: "Mais", icon: MoreHorizontal },
];

// Rotas secundárias (sem aba própria) destacam "Mais".
const moreRoutes = [
  "/more",
  "/accounts",
  "/calendar",
  "/bills",
  "/credit-cards",
  "/fixed-expenses",
  "/categories",
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/more") {
    return moreRoutes.some(
      (r) => pathname === r || pathname.startsWith(`${r}/`),
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Barra de navegação inferior flutuante (pílula no item ativo).
 * Segura para safe-area do iOS; toque mínimo ≥44px por item.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="sticky bottom-0 z-30 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-3 mb-3 flex items-stretch gap-1 rounded-2xl border border-border bg-background/95 p-1.5 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 rounded-xl py-2 min-h-[52px] text-[11px] font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                <Icon
                  className={cn(
                    "size-5",
                    active ? "stroke-[2.25]" : "stroke-[1.75]",
                  )}
                  aria-hidden
                />
                <span className="leading-none">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
