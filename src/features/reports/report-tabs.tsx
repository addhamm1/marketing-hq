"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function ReportTabs({ tabs }: { tabs: { href: string; label: string }[] }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const t = useTranslations("reports");
  const range = sp.get("range") ?? "30";
  const q = (r: string) => {
    const p = new URLSearchParams(sp.toString());
    p.set("range", r);
    return `?${p.toString()}`;
  };
  return (
    <div className="flex flex-wrap items-center gap-3 border-b pb-2">
      <nav className="flex gap-1 overflow-x-auto">
        {tabs.map((tab) => (
          <Link key={tab.href} href={`${tab.href}?range=${range}`}
            className={cn("rounded-md px-3 py-1.5 text-sm whitespace-nowrap", pathname.startsWith(tab.href) ? "bg-secondary font-medium" : "text-muted-foreground hover:text-foreground")}>
            {tab.label}
          </Link>
        ))}
      </nav>
      <div className="ms-auto flex gap-1" role="group" aria-label={t("range")}>
        {(["30", "90", "month"] as const).map((r) => (
          <Link key={r} href={`${pathname}${q(r)}`} aria-pressed={range === r}
            className={cn("rounded-md border px-2.5 py-1 text-xs", range === r ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground")}>
            {r === "month" ? t("thisMonth") : t(r === "30" ? "last30" : "last90")}
          </Link>
        ))}
      </div>
    </div>
  );
}
