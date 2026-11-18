"use client";

import { Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMessage } from "@/hooks/use-message";
import { useRouter } from "@/i18n/navigation";
import type { ActionResult } from "@/lib/actions";
import { addTeam, saveBrand, saveDepartment } from "./org-actions";

type Dept = { id: string; name_en: string; name_ar: string };
type Brand = { id: string; name: string; color: string };

function useSave() {
  const tc = useTranslations("common");
  const message = useMessage();
  const router = useRouter();
  const [pending, start] = useTransition();
  const save = (action: () => Promise<ActionResult>, onDone?: () => void) =>
    start(async () => {
      const r = await action();
      if (!r.ok) return void toast.error(message(Object.values(r.fieldErrors ?? {})[0] ?? r.error));
      toast.success(tc("saved"));
      onDone?.();
      router.refresh();
    });
  return { pending, save };
}

function DepartmentRow({ dept }: { dept?: Dept }) {
  const t = useTranslations("admin");
  const tl = useTranslations("launch.org");
  const tc = useTranslations("common");
  const { pending, save } = useSave();
  const blank = { name_en: dept?.name_en ?? "", name_ar: dept?.name_ar ?? "" };
  const [v, setV] = useState(blank);
  const dirty = v.name_en !== blank.name_en || v.name_ar !== blank.name_ar;
  return (
    <li className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_1fr_auto] sm:items-center">
      <Input dir="ltr" value={v.name_en} placeholder={dept ? undefined : tl("newDepartment")} aria-label={t("nameEn")} onChange={(e) => setV({ ...v, name_en: e.target.value })} />
      <Input dir="rtl" value={v.name_ar} aria-label={t("nameAr")} onChange={(e) => setV({ ...v, name_ar: e.target.value })} />
      <Button size="sm" variant={dept ? "default" : "outline"} disabled={!dirty || pending}
        onClick={() => save(() => saveDepartment({ id: dept?.id, ...v }), () => { if (!dept) setV({ name_en: "", name_ar: "" }); })}>
        {dept ? tc("save") : <><Plus aria-hidden /> {tc("add")}</>}
      </Button>
    </li>
  );
}

function AddTeam({ departments }: { departments: Dept[] }) {
  const t = useTranslations("admin");
  const tl = useTranslations("launch.org");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { pending, save } = useSave();
  const blank = { department_id: departments[0]?.id ?? "", name_en: "", name_ar: "", color: "#3B82F6" };
  const [v, setV] = useState(blank);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    save(() => addTeam(v), () => setV(blank));
  };
  return (
    <form onSubmit={submit} className="bg-card grid gap-2 rounded-xl border p-3 sm:grid-cols-[minmax(0,1fr)_1fr_1fr_auto_auto] sm:items-end">
      <div className="min-w-0 space-y-1">
        <Label htmlFor="team-dept">{t("department")}</Label>
        <Select value={v.department_id} onValueChange={(department_id) => setV({ ...v, department_id })}>
          <SelectTrigger id="team-dept" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{locale === "ar" ? d.name_ar : d.name_en}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1"><Label htmlFor="team-en">{t("nameEn")}</Label><Input id="team-en" dir="ltr" value={v.name_en} onChange={(e) => setV({ ...v, name_en: e.target.value })} /></div>
      <div className="space-y-1"><Label htmlFor="team-ar">{t("nameAr")}</Label><Input id="team-ar" dir="rtl" value={v.name_ar} onChange={(e) => setV({ ...v, name_ar: e.target.value })} /></div>
      <input type="color" value={v.color} aria-label={t("teamColor")} onChange={(e) => setV({ ...v, color: e.target.value })} className="h-9 w-14 cursor-pointer rounded border" />
      <Button type="submit" disabled={pending || !v.name_en.trim() || !v.name_ar.trim()}><Plus aria-hidden /> {tl("addTeam")}<span className="sr-only">{tc("add")}</span></Button>
    </form>
  );
}

function BrandRow({ brand }: { brand?: Brand }) {
  const tl = useTranslations("launch.org");
  const tc = useTranslations("common");
  const { pending, save } = useSave();
  const blank = { name: brand?.name ?? "", color: brand?.color ?? "#0F766E" };
  const [v, setV] = useState(blank);
  const dirty = v.name !== blank.name || v.color.toLowerCase() !== blank.color.toLowerCase();
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 px-4 py-3">
      <Input value={v.name} placeholder={brand ? undefined : tl("newBrand")} aria-label={tl("brandName")} onChange={(e) => setV({ ...v, name: e.target.value })} />
      <input type="color" value={v.color} aria-label={tl("brandColor")} onChange={(e) => setV({ ...v, color: e.target.value })} className="h-9 w-14 cursor-pointer rounded border" />
      <Button size="sm" variant={brand ? "default" : "outline"} disabled={!dirty || pending || !v.name.trim()}
        onClick={() => save(() => saveBrand({ id: brand?.id, ...v }), () => { if (!brand) setV({ name: "", color: "#0F766E" }); })}>
        {brand ? tc("save") : <><Plus aria-hidden /> {tc("add")}</>}
      </Button>
    </li>
  );
}

/** Names of departments, new teams and brands: everything the seed creates for the organisation. */
export function OrgCatalog({ departments, brands }: { departments: Dept[]; brands: Brand[] }) {
  const tl = useTranslations("launch.org");
  return (
    <div className="mt-8 space-y-8">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{tl("departmentNames")}</h2>
        <ul className="bg-card divide-y rounded-xl border">
          {departments.map((d) => <DepartmentRow key={d.id} dept={d} />)}
          <DepartmentRow />
        </ul>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{tl("addTeam")}</h2>
        <AddTeam departments={departments} />
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{tl("brands")}</h2>
        <ul className="bg-card divide-y rounded-xl border">
          {brands.map((b) => <BrandRow key={b.id} brand={b} />)}
          <BrandRow />
        </ul>
      </section>
    </div>
  );
}
