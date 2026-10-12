"use client";

import { MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Link, usePathname } from "@/i18n/navigation";
import { splitForBottomBar, type NavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { NavIcon } from "./nav-icon";
import { isActive } from "./sidebar";

export function BottomBar({ items }: { items: NavItem[] }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { primary, more } = splitForBottomBar(items);
  const moreActive = more.some((i) => isActive(pathname, i.href));

  const tab = (active: boolean) =>
    cn(
      "flex min-w-0 flex-1 flex-col items-center gap-1 py-2 text-[11px] leading-none",
      active ? "text-foreground font-semibold" : "text-muted-foreground",
    );

  return (
    <nav className="bg-card/95 fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="flex">
        {primary.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link key={item.key} href={item.href} className={tab(active)} aria-current={active ? "page" : undefined}>
              <NavIcon name={item.key} className="size-5" />
              <span className="truncate">{t(item.key)}</span>
            </Link>
          );
        })}
        {more.length > 0 ? (
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger className={tab(moreActive)}>
              <MoreHorizontal className="size-5" aria-hidden />
              <span>{t("more")}</span>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-xl">
              <SheetHeader>
                <SheetTitle>{t("more")}</SheetTitle>
              </SheetHeader>
              <div className="grid grid-cols-3 gap-2 px-4 pb-6">
                {more.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-lg border p-3 text-center text-xs",
                      isActive(pathname, item.href) && "border-primary text-foreground font-semibold",
                    )}
                  >
                    <NavIcon name={item.key} className="size-5" />
                    {t(item.key)}
                  </Link>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        ) : null}
      </div>
    </nav>
  );
}
