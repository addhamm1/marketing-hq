"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Controller } from "react-hook-form";
import { FormField } from "@/components/form/form-field";
import { SubmitButton } from "@/components/form/submit-button";
import { useActionForm } from "@/components/form/use-action-form";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";
import { updateRequestType } from "./org-actions";

type Row = { id: string; key: string; name_en: string; name_ar: string; category: string; is_active: boolean; requires_attachment_after_days: number | null; approval_chain: string; form_schema: string };

const schema = z.object({
  id: z.string(),
  name_en: z.string().trim().min(1, "validation.required"),
  name_ar: z.string().trim().min(1, "validation.required"),
  is_active: z.boolean(),
  requires_attachment_after_days: z.string(),
  approval_chain: z.string(),
  form_schema: z.string(),
});
type Values = z.infer<typeof schema>;

function EditDialog({ row, onClose }: { row: Row; onClose: () => void }) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const { form, onSubmit, pending } = useActionForm<Values>({
    schema,
    action: (v) => updateRequestType({ ...v, requires_attachment_after_days: v.requires_attachment_after_days ? Number(v.requires_attachment_after_days) : null }),
    defaultValues: { ...row, requires_attachment_after_days: row.requires_attachment_after_days === null ? "" : String(row.requires_attachment_after_days) },
    successMessage: t("requestTypeSaved"),
    onSuccess: onClose,
  });
  const { errors } = form.formState;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle dir="ltr">{row.key}</DialogTitle></DialogHeader>
        <form id="rt-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <FormField id="name_en" label={t("nameEn")} error={errors.name_en?.message}><Input id="name_en" dir="ltr" {...form.register("name_en")} /></FormField>
          <FormField id="name_ar" label={t("nameAr")} error={errors.name_ar?.message}><Input id="name_ar" dir="rtl" {...form.register("name_ar")} /></FormField>
          <FormField id="requires_attachment_after_days" label={t("attachmentAfter")}><Input id="requires_attachment_after_days" type="number" min={0} {...form.register("requires_attachment_after_days")} /></FormField>
          <Controller control={form.control} name="is_active" render={({ field }) => (
            <Label className="flex items-center gap-2 self-end pb-2 font-normal"><Switch checked={field.value} onCheckedChange={field.onChange} /> {t("active")}</Label>
          )} />
          <FormField id="approval_chain" label={t("approvalChain")} description={t("chainHint")} error={errors.approval_chain?.message} className="sm:col-span-2">
            <Textarea id="approval_chain" dir="ltr" rows={5} className="font-mono text-xs" {...form.register("approval_chain")} />
          </FormField>
          <FormField id="form_schema" label={t("formSchema")} error={errors.form_schema?.message} className="sm:col-span-2">
            <Textarea id="form_schema" dir="ltr" rows={10} className="font-mono text-xs" {...form.register("form_schema")} />
          </FormField>
        </form>
        <DialogFooter><SubmitButton form="rt-form" pending={pending}>{tc("save")}</SubmitButton></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RequestTypesEditor({ types }: { types: Row[] }) {
  const t = useTranslations("admin");
  const tr = useTranslations("requests");
  const locale = useLocale();
  const [editing, setEditing] = useState<Row | null>(null);
  return (
    <>
      <ul className="bg-card divide-y rounded-xl border">
        {types.map((r) => (
          <li key={r.id}>
            <button type="button" onClick={() => setEditing(r)} className="hover:bg-muted/40 flex w-full items-center gap-3 px-4 py-3 text-start">
              <span className="flex-1 font-medium">{locale === "ar" ? r.name_ar : r.name_en}</span>
              <Badge variant="secondary">{r.category === "leave" ? tr("leave") : tr("special")}</Badge>
              {!r.is_active ? <Badge variant="outline">{t("statusInactive")}</Badge> : null}
            </button>
          </li>
        ))}
      </ul>
      {editing ? <EditDialog row={editing} onClose={() => setEditing(null)} /> : null}
    </>
  );
}
