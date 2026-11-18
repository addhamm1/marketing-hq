"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Controller } from "react-hook-form";
import { FormField } from "@/components/form/form-field";
import { SubmitButton } from "@/components/form/submit-button";
import { useActionForm } from "@/components/form/use-action-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useRouter } from "@/i18n/navigation";
import { addRequestType } from "./org-actions";
import { requestTypeAddSchema, type RequestTypeAddInput } from "./schemas";

function AddForm({ isAdmin, onClose }: { isAdmin: boolean; onClose: () => void }) {
  const t = useTranslations("launch.requestTypes");
  const ta = useTranslations("admin");
  const tr = useTranslations("requests");
  const tc = useTranslations("common");
  const router = useRouter();
  const { form, onSubmit, pending } = useActionForm<RequestTypeAddInput>({
    schema: requestTypeAddSchema,
    action: addRequestType,
    defaultValues: { name_en: "", name_ar: "", category: "leave", counts_working_days: true },
    successMessage: t("added"),
    onSuccess: () => {
      router.refresh();
      onClose();
    },
  });
  const { errors } = form.formState;
  return (
    <>
      <form id="add-type-form" onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <FormField id="type-en" label={ta("nameEn")} error={errors.name_en?.message}><Input id="type-en" dir="ltr" maxLength={80} {...form.register("name_en")} /></FormField>
        <FormField id="type-ar" label={ta("nameAr")} error={errors.name_ar?.message}><Input id="type-ar" dir="rtl" maxLength={80} {...form.register("name_ar")} /></FormField>
        <FormField id="type-category" label={t("category")} error={errors.category?.message}>
          <Controller control={form.control} name="category" render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange} disabled={!isAdmin}>
              <SelectTrigger id="type-category" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="leave">{tr("leave")}</SelectItem>
                <SelectItem value="special">{tr("special")}</SelectItem>
              </SelectContent>
            </Select>
          )} />
        </FormField>
        <Controller control={form.control} name="counts_working_days" render={({ field }) => (
          <Label className="flex items-center gap-2 self-end pb-2 font-normal"><Switch checked={field.value} onCheckedChange={field.onChange} /> {t("countsDays")}</Label>
        )} />
      </form>
      <DialogFooter><SubmitButton form="add-type-form" pending={pending}>{tc("add")}</SubmitButton></DialogFooter>
    </>
  );
}

/** New request types start switched off, so the approval chain can be set before anyone uses them. */
export function AddRequestTypeDialog({ isAdmin }: { isAdmin: boolean }) {
  const t = useTranslations("launch.requestTypes");
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}><Plus aria-hidden /> {t("add")}</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("add")}</DialogTitle>
            <DialogDescription>{t("addHint")}</DialogDescription>
          </DialogHeader>
          {open ? <AddForm isAdmin={isAdmin} onClose={() => setOpen(false)} /> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
