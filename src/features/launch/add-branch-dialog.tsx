"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { z } from "zod";
import { FormField } from "@/components/form/form-field";
import { SubmitButton } from "@/components/form/submit-button";
import { useActionForm } from "@/components/form/use-action-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useRouter } from "@/i18n/navigation";
import { addBranch } from "./org-actions";
import { branchAddSchema } from "./schemas";

type Values = z.input<typeof branchAddSchema>;

function AddBranchForm({ onClose }: { onClose: () => void }) {
  const t = useTranslations("launch.branches");
  const ta = useTranslations("admin");
  const tc = useTranslations("common");
  const router = useRouter();
  const { form, onSubmit, pending } = useActionForm<Values>({
    schema: branchAddSchema,
    action: addBranch,
    defaultValues: { name_en: "", name_ar: "", area: "" },
    successMessage: t("added"),
    onSuccess: () => {
      router.refresh();
      onClose();
    },
  });
  const { errors } = form.formState;
  return (
    <>
      <form id="add-branch-form" onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <FormField id="branch-en" label={ta("nameEn")} error={errors.name_en?.message}><Input id="branch-en" dir="ltr" maxLength={80} {...form.register("name_en")} /></FormField>
        <FormField id="branch-ar" label={ta("nameAr")} error={errors.name_ar?.message}><Input id="branch-ar" dir="rtl" maxLength={80} {...form.register("name_ar")} /></FormField>
        <FormField id="branch-area" label={t("area")} error={errors.area?.message} className="sm:col-span-2"><Input id="branch-area" maxLength={120} {...form.register("area")} /></FormField>
      </form>
      <DialogFooter><SubmitButton form="add-branch-form" pending={pending}>{tc("add")}</SubmitButton></DialogFooter>
    </>
  );
}

export function AddBranchDialog() {
  const t = useTranslations("launch.branches");
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
          {open ? <AddBranchForm onClose={() => setOpen(false)} /> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
