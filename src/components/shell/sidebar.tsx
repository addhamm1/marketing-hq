"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import type { NavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { NavIcon } from "./nav-icon";

export function isActive(pathname: string, href: string) {
  if (href === "/portal") return pathname === "/portal";
  return pathname === href || pathname.startsWith(href + "/");
}

export function Sidebar({ items, header }: { items: NavItem[]; header: React.ReactNode }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  return (
    <aside className="bg-sidebar text-sidebar-foreground border-sidebar-border sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-e md:flex">
      <div className="flex h-14 items-center px-5">{header}</div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <NavIcon name={item.key} className={cn("size-4", active && "text-sidebar-primary")} />
              {t(item.key)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
