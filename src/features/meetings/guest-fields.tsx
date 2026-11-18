"use client";

import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useFieldArray, type Control, type FieldErrors, type UseFormRegister } from "react-hook-form";
import { FormField } from "@/components/form/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MeetingInput } from "./schemas";

type Props = {
  control: Control<MeetingInput, unknown, unknown>;
  register: UseFormRegister<MeetingInput>;
  errors: FieldErrors<MeetingInput>;
};

/** People outside the company, invited by email. */
export function GuestFields({ control, register, errors }: Props) {
  const t = useTranslations("meetings.guests");
  const { fields, append, remove } = useFieldArray({ control, name: "guests" });

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium">{t("title")}</legend>
      <p className="text-muted-foreground -mt-2 text-xs">{t("hint")}</p>
      {fields.map((field, index) => (
        <div key={field.id} className="flex items-start gap-2">
          <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
            <FormField id={`guest-name-${index}`} label={t("name")} error={errors.guests?.[index]?.name?.message}>
              <Input id={`guest-name-${index}`} autoComplete="off" {...register(`guests.${index}.name`)} />
            </FormField>
            <FormField id={`guest-email-${index}`} label={t("email")} error={errors.guests?.[index]?.email?.message}>
              <Input id={`guest-email-${index}`} type="email" dir="ltr" autoComplete="off" {...register(`guests.${index}.email`)} />
            </FormField>
          </div>
          <Button type="button" variant="ghost" size="icon" className="mt-6" onClick={() => remove(index)} aria-label={t("remove")}>
            <Trash2 aria-hidden />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => append({ name: "", email: "" })}>
        <Plus aria-hidden />
        {t("add")}
      </Button>
    </fieldset>
  );
}
