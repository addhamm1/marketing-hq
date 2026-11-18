"use client";

import { Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { StatusLabel } from "./status";
import { GATE_STATUSES } from "./types";

function Key({ swatch, children }: { swatch: ReactNode; children: ReactNode }) {
  return (
    <li className="inline-flex items-center gap-1.5">
      {swatch}
      {children}
    </li>
  );
}

/** What the shapes on the timeline mean. */
export function Legend() {
  const t = useTranslations("gates.legend");
  const tg = useTranslations("gates");
  return (
    <div className="text-muted-foreground hidden flex-wrap items-center gap-x-6 gap-y-2 text-xs lg:flex">
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5" aria-label={t("shapes")}>
        <Key swatch={<span className="bg-brand-stone h-2.5 w-5 rounded-[2px]" />}>{t("phase")}</Key>
        <Key swatch={<span className="bg-brand-black h-2.5 w-5 rounded-[2px]" />}>{t("production")}</Key>
        <Key swatch={<span className="bg-primary size-3 rounded-[2px]" />}>{t("gate")}</Key>
        <Key swatch={<span className="bg-primary ring-brand-black/70 mx-0.5 size-2 rotate-45 rounded-[1px] ring-1" />}>{t("recurring")}</Key>
        <Key swatch={<span className="ring-brand-black size-3 rounded-[2px] ring-2 ring-inset" />}>{t("checkpoint")}</Key>
        <Key swatch={<span className="bg-info h-3 w-px" />}>{t("today")}</Key>
      </ul>
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5" aria-label={t("statuses")}>
        {GATE_STATUSES.filter((s) => s !== "not_started").map((s) => (
          <li key={s}><StatusLabel status={s} className="font-normal" /></li>
        ))}
        <Key swatch={<Clock className="text-destructive size-3.5" aria-hidden />}>{tg("overdueTag")}</Key>
      </ul>
    </div>
  );
}
