"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  Home,
  ListOrdered,
  MoreHorizontal,
  Wallet,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const items: NavItem[] = [
  { href: "/dashboard", label: "Início", icon: Home },
  { href: "/transactions", label: "Movim.", icon: ListOrdered },
  { href: "/calendar", label: "Agenda", icon: Calendar },
  { href: "/accounts", label: "Contas", icon: Wallet },
  { href: "/more", label: "Mais", icon: MoreHorizontal },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Barra de navegação inferior, fixa, segura para safe-area do iOS.
 * Altura mínima de toque 44px por item conforme HIG.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="sticky bottom-0 z-30 border-t border-border bg-background pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="contents">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-[11px] transition-colors",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
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
