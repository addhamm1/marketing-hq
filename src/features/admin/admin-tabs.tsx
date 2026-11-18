"use client";

import { useEffect, useRef } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function AdminTabs({ tabs }: { tabs: { href: string; label: string }[] }) {
  const pathname = usePathname();
  const activeRef = useRef<HTMLAnchorElement>(null);
  // On a phone the tabs scroll sideways: keep the open one in view.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [pathname]);
  return (
    <nav className="-mx-4 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0">
      <div className="flex gap-1">
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              ref={active ? activeRef : undefined}
              aria-current={active ? "page" : undefined}
              href={tab.href}
              className={cn(
                "border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors",
                active ? "border-primary text-foreground font-medium" : "text-muted-foreground hover:text-foreground border-transparent",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
