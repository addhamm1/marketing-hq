"use client";

import { useLocale, useTranslations } from "next-intl";
import { Controller } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { FormField } from "@/components/form/form-field";
import { SubmitButton } from "@/components/form/submit-button";
import { useActionForm } from "@/components/form/use-action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { roomName } from "./display";
import { roomSchema, type RoomInput } from "./schemas";
import { saveRoom } from "./series-actions";
import type { Branch, Room } from "./types";

const NONE = "none";

type Props = { room: Room | null; branches: Branch[]; onDone: () => void; onCancel: () => void };

export function RoomForm({ room, branches, onDone, onCancel }: Props) {
  const t = useTranslations("meetings.rooms");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { form, onSubmit, pending } = useActionForm<RoomInput, undefined, z.output<typeof roomSchema>>({
    schema: roomSchema,
    action: saveRoom,
    defaultValues: {
      id: room?.id ?? null,
      name_en: room?.name_en ?? "",
      name_ar: room?.name_ar ?? "",
      capacity: room?.capacity ?? 6,
      branch_id: room?.branch_id ?? "",
      is_active: room?.is_active ?? true,
    },
    onSuccess: () => {
      toast.success(tc("saved"));
      onDone();
    },
  });
  const { control, register, formState: { errors } } = form;
  const key = room?.id ?? "new";

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3 rounded-lg border p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField id={`r-en-${key}`} label={t("nameEn")} error={errors.name_en?.message}>
          <Input id={`r-en-${key}`} dir="ltr" maxLength={80} aria-invalid={!!errors.name_en} {...register("name_en")} />
        </FormField>
        <FormField id={`r-ar-${key}`} label={t("nameAr")} error={errors.name_ar?.message}>
          <Input id={`r-ar-${key}`} dir="rtl" maxLength={80} aria-invalid={!!errors.name_ar} {...register("name_ar")} />
        </FormField>
        <FormField id={`r-cap-${key}`} label={t("capacity")} error={errors.capacity?.message}>
          <Input id={`r-cap-${key}`} type="number" dir="ltr" min={1} max={500} aria-invalid={!!errors.capacity} {...register("capacity", { valueAsNumber: true })} />
        </FormField>
        <FormField id={`r-branch-${key}`} label={t("branch")} error={errors.branch_id?.message}>
          <Controller control={control} name="branch_id" render={({ field }) => (
            <Select value={field.value || NONE} onValueChange={(v) => field.onChange(v === NONE ? "" : v)}>
              <SelectTrigger id={`r-branch-${key}`} className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{tc("none")}</SelectItem>
                {branches.map((b) => <SelectItem key={b.id} value={b.id}>{roomName(b, locale)}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
        </FormField>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>{tc("cancel")}</Button>
        <SubmitButton pending={pending} size="sm">{tc("save")}</SubmitButton>
      </div>
    </form>
  );
}
