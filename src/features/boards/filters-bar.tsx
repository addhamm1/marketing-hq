"use client";

import { Search, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePeople } from "@/components/people-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EMPTY_FILTERS, isFiltered, type CardFilters } from "./filters";
import { STAGES, type Brand } from "./types";

type Option = { id: string; name_en: string; name_ar: string };

export function FiltersBar({
  value,
  onChange,
  brands,
  departments,
  showStage,
}: {
  value: CardFilters;
  onChange: (f: CardFilters) => void;
  brands: Brand[];
  departments: Option[];
  showStage: boolean;
}) {
  const t = useTranslations("boards");
  const ts = useTranslations("stages");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { people } = usePeople();
  const set = (patch: Partial<CardFilters>) => onChange({ ...value, ...patch });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full sm:w-56">
        <Search className="text-muted-foreground absolute start-2.5 top-1/2 size-4 -translate-y-1/2" aria-hidden />
        <Input value={value.q} onChange={(e) => set({ q: e.target.value })} placeholder={t("searchCards")} aria-label={t("searchCards")} className="h-8 ps-8" />
      </div>
      <Select value={value.assignee} onValueChange={(v) => set({ assignee: v })}>
        <SelectTrigger size="sm" className="w-36" aria-label={t("assignee")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("anyone")}</SelectItem>
          {people.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.display_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showStage ? (
        <Select value={value.stage} onValueChange={(v) => set({ stage: v })}>
          <SelectTrigger size="sm" className="w-40" aria-label={t("stage")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("anyStage")}</SelectItem>
            {STAGES.map((s) => (
              <SelectItem key={s} value={s}>
                {ts(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
      <Select value={value.brand} onValueChange={(v) => set({ brand: v })}>
        <SelectTrigger size="sm" className="w-32" aria-label={t("brand")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("anyBrand")}</SelectItem>
          {brands.map((b) => (
            <SelectItem key={b.id} value={b.id}>
              {b.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showStage ? (
        <Select value={value.department} onValueChange={(v) => set({ department: v })}>
          <SelectTrigger size="sm" className="w-40" aria-label={t("department")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("anyDepartment")}</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {locale === "ar" ? d.name_ar : d.name_en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
      <Select value={value.due} onValueChange={(v) => set({ due: v as CardFilters["due"] })}>
        <SelectTrigger size="sm" className="w-36" aria-label={t("due")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("dueAny")}</SelectItem>
          <SelectItem value="overdue">{t("dueOverdue")}</SelectItem>
          <SelectItem value="week">{t("dueWeek")}</SelectItem>
          <SelectItem value="none">{t("dueNone")}</SelectItem>
        </SelectContent>
      </Select>
      {isFiltered(value) ? (
        <Button variant="ghost" size="sm" onClick={() => onChange(EMPTY_FILTERS)}>
          <X aria-hidden /> {tc("clearFilters")}
        </Button>
      ) : null}
    </div>
  );
}
