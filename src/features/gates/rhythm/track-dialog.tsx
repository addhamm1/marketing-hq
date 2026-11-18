"use client";

import { useTranslations } from "next-intl";
import { Controller } from "react-hook-form";
import { FormField } from "@/components/form/form-field";
import { SubmitButton } from "@/components/form/submit-button";
import { useActionForm } from "@/components/form/use-action-form";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { saveGateTrack } from "../rhythm-actions";
import { trackSchema, type TrackValues } from "../schemas";
import type { GateTrack } from "../types";

export function TrackDialog({ track, nextPosition, onClose }: { track: GateTrack | null; nextPosition: number; onClose: () => void }) {
  const t = useTranslations("gates");
  const tc = useTranslations("common");
  const { form, onSubmit, pending } = useActionForm<TrackValues>({
    schema: trackSchema,
    action: saveGateTrack,
    defaultValues: {
      id: track?.id ?? null,
      name_en: track?.name_en ?? "",
      name_ar: track?.name_ar ?? "",
      subtitle_en: track?.subtitle_en ?? "",
      subtitle_ar: track?.subtitle_ar ?? "",
      position: track?.position ?? nextPosition,
      is_active: track?.is_active ?? true,
    },
    successMessage: t("saved"),
    onSuccess: onClose,
  });
  const { errors } = form.formState;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{track ? t("rhythm.editTrack") : t("rhythm.addTrack")}</DialogTitle>
        </DialogHeader>
        <form id="gate-track-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <FormField id="track-name-en" label={t("fields.nameEn")} error={errors.name_en?.message}>
            <Input id="track-name-en" dir="ltr" {...form.register("name_en")} />
          </FormField>
          <FormField id="track-name-ar" label={t("fields.nameAr")} error={errors.name_ar?.message}>
            <Input id="track-name-ar" dir="rtl" {...form.register("name_ar")} />
          </FormField>
          <FormField id="track-sub-en" label={t("rhythm.fields.subtitleEn")} error={errors.subtitle_en?.message}>
            <Input id="track-sub-en" dir="ltr" {...form.register("subtitle_en")} />
          </FormField>
          <FormField id="track-sub-ar" label={t("rhythm.fields.subtitleAr")} error={errors.subtitle_ar?.message}>
            <Input id="track-sub-ar" dir="rtl" {...form.register("subtitle_ar")} />
          </FormField>
          <FormField id="track-order" label={t("rhythm.fields.order")} error={errors.position?.message}>
            <Input id="track-order" type="number" min={0} max={999} dir="ltr" {...form.register("position", { valueAsNumber: true })} />
          </FormField>
          <Controller
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <Label className="flex items-center gap-2 self-end pb-2 font-normal">
                <Switch checked={field.value} onCheckedChange={field.onChange} />
                {t("rhythm.fields.active")}
              </Label>
            )}
          />
        </form>
        <DialogFooter>
          <SubmitButton pending={pending} form="gate-track-form">{tc("save")}</SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
