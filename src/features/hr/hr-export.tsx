"use client";

import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function HrExport() {
  const t = useTranslations("hr");
  const tc = useTranslations("common");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{t("export")}</h2>
      <div className="bg-card flex flex-wrap items-end gap-2 rounded-xl border p-3">
        <p className="text-muted-foreground w-full text-sm">{t("exportBody")}</p>
        <div className="space-y-1"><Label htmlFor="x-from">{tc("from")}</Label><Input id="x-from" type="date" dir="ltr" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="space-y-1"><Label htmlFor="x-to">{tc("to")}</Label><Input id="x-to" type="date" dir="ltr" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <Button asChild={!!from && !!to && to >= from} disabled={!from || !to || to < from}>
          {from && to && to >= from ? (
            <a href={`/api/export/hr?from=${from}&to=${to}`} download><Download aria-hidden /> {t("download")}</a>
          ) : (
            <span><Download aria-hidden /> {t("download")}</span>
          )}
        </Button>
      </div>
    </section>
  );
}
