"use client";

import { PartyPopper, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Controller } from "react-hook-form";
import { FormField } from "@/components/form/form-field";
import { SubmitButton } from "@/components/form/submit-button";
import { useActionForm } from "@/components/form/use-action-form";
import { EmptyState } from "@/components/states/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useRouter } from "@/i18n/navigation";
import { saveSeason } from "./season-actions";
import { seasonSchema, type SeasonInput, type SeasonOutput } from "./schemas";

export type Season = { id: string; key: string; name_en: string; name_ar: string; starts_on: string; ends_on: string; items: string[]; is_active: boolean };

function SeasonDialog({ season, knownItems, onClose }: { season: Season | null; knownItems: string[]; onClose: () => void }) {
  const t = useTranslations("seasonsAdmin");
  const ta = useTranslations("admin");
  const tc = useTranslations("common");
  const router = useRouter();
  const { form, onSubmit, pending } = useActionForm<SeasonInput, undefined, SeasonOutput>({
    schema: seasonSchema,
    action: (values) => saveSeason({ id: season?.id, values }),
    defaultValues: {
      name_en: season?.name_en ?? "",
      name_ar: season?.name_ar ?? "",
      starts_on: season?.starts_on ?? "",
      ends_on: season?.ends_on ?? "",
      items: season?.items.join(", ") ?? "",
      is_active: season?.is_active ?? true,
    },
    successMessage: t("saved"),
    onSuccess: () => {
      router.refresh();
      onClose();
    },
  });
  const { errors } = form.formState;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>{season ? t("editTitle") : t("addTitle")}</DialogTitle></DialogHeader>
        <form id="season-form" onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
          <FormField id="season-en" label={ta("nameEn")} error={errors.name_en?.message}><Input id="season-en" dir="ltr" maxLength={80} {...form.register("name_en")} /></FormField>
          <FormField id="season-ar" label={ta("nameAr")} error={errors.name_ar?.message}><Input id="season-ar" dir="rtl" maxLength={80} {...form.register("name_ar")} /></FormField>
          <FormField id="season-start" label={t("startsOn")} error={errors.starts_on?.message}><Input id="season-start" type="date" dir="ltr" {...form.register("starts_on")} /></FormField>
          <FormField id="season-end" label={t("endsOn")} error={errors.ends_on?.message}><Input id="season-end" type="date" dir="ltr" {...form.register("ends_on")} /></FormField>
          <FormField id="season-items" label={t("items")} description={t("itemsHint", { example: knownItems.slice(0, 3).join(", ") || "winter-scarf" })} error={errors.items?.message} className="sm:col-span-2">
            <Input id="season-items" dir="ltr" {...form.register("items")} />
          </FormField>
          <Controller control={form.control} name="is_active" render={({ field }) => (
            <Label className="flex items-center gap-2 font-normal sm:col-span-2"><Switch checked={field.value} onCheckedChange={field.onChange} /> {ta("active")}</Label>
          )} />
        </form>
        <DialogFooter><SubmitButton form="season-form" pending={pending}>{tc("save")}</SubmitButton></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SeasonsEditor({ seasons }: { seasons: Season[] }) {
  const t = useTranslations("seasonsAdmin");
  const ta = useTranslations("admin");
  const locale = useLocale();
  const [editing, setEditing] = useState<Season | null>(null);
  const [adding, setAdding] = useState(false);
  const knownItems = [...new Set(seasons.flatMap((s) => s.items))];
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">{t("intro")}</p>
        <Button size="sm" onClick={() => setAdding(true)}><Plus aria-hidden /> {t("add")}</Button>
      </div>
      {seasons.length ? (
        <ul className="bg-card divide-y rounded-xl border">
          {seasons.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => setEditing(s)} className="hover:bg-muted/40 flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-start">
                <span className="min-w-0 flex-1 basis-40">
                  <span className="block font-medium">{locale === "ar" ? s.name_ar : s.name_en}</span>
                  <span className="text-muted-foreground block text-xs" dir="ltr">{s.starts_on} → {s.ends_on}</span>
                </span>
                <span className="text-muted-foreground text-xs">{t("itemCount", { count: s.items.length })}</span>
                <Badge variant={s.is_active ? "secondary" : "outline"}>{s.is_active ? ta("active") : ta("statusInactive")}</Badge>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title={t("empty")} icon={<PartyPopper className="size-8" aria-hidden />} />
      )}
      {adding || editing ? <SeasonDialog season={editing} knownItems={knownItems} onClose={() => { setAdding(false); setEditing(null); }} /> : null}
    </div>
  );
}
