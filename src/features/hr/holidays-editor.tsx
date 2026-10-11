"use client";

import { Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMessage } from "@/hooks/use-message";
import { useRouter } from "@/i18n/navigation";
import { addHoliday, deleteHoliday } from "./actions";

type Holiday = { id: string; day: string; name_en: string; name_ar: string; is_half_day: boolean };

export function HolidaysEditor({ holidays }: { holidays: Holiday[] }) {
  const t = useTranslations("hr");
  const ta = useTranslations("admin");
  const tc = useTranslations("common");
  const locale = useLocale();
  const message = useMessage();
  const router = useRouter();
  const [form, setForm] = useState({ day: "", name_en: "", name_ar: "", is_half_day: false });
  const [, startTransition] = useTransition();

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{t("holidays")}</h2>
      <div className="bg-card flex flex-wrap items-end gap-2 rounded-xl border p-3">
        <div className="space-y-1"><Label htmlFor="h-day">{tc("date")}</Label><Input id="h-day" type="date" dir="ltr" value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })} /></div>
        <div className="space-y-1"><Label htmlFor="h-en">{ta("nameEn")}</Label><Input id="h-en" dir="ltr" value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} /></div>
        <div className="space-y-1"><Label htmlFor="h-ar">{ta("nameAr")}</Label><Input id="h-ar" dir="rtl" value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} /></div>
        <Label className="flex items-center gap-2 pb-2 font-normal"><Checkbox checked={form.is_half_day} onCheckedChange={(v) => setForm({ ...form, is_half_day: v === true })} /> {t("halfDay")}</Label>
        <Button disabled={!form.day || !form.name_en || !form.name_ar}
          onClick={() => startTransition(async () => {
            const r = await addHoliday(form);
            if (r.ok) {
              toast.success(t("holidaySaved"));
              setForm({ day: "", name_en: "", name_ar: "", is_half_day: false });
              router.refresh();
            } else toast.error(message(r.error));
          })}>
          {t("addHoliday")}
        </Button>
      </div>
      {holidays.length === 0 ? <p className="text-muted-foreground text-sm">{t("noHolidays")}</p> : (
        <ul className="bg-card divide-y rounded-xl border">
          {holidays.map((h) => (
            <li key={h.id} className="flex items-center gap-3 px-4 py-2 text-sm">
              <span className="w-28 tabular-nums" dir="ltr">{h.day}</span>
              <span className="flex-1">{locale === "ar" ? h.name_ar : h.name_en}{h.is_half_day ? ` · ${t("halfDay")}` : ""}</span>
              <Button variant="ghost" size="icon-xs" aria-label={tc("delete")}
                onClick={() => startTransition(async () => { const r = await deleteHoliday({ id: h.id }); if (!r.ok) toast.error(message(r.error)); router.refresh(); })}>
                <Trash2 aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
