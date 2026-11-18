"use client";

import { useTranslations } from "next-intl";
import { Controller } from "react-hook-form";
import { FormField } from "@/components/form/form-field";
import { SubmitButton } from "@/components/form/submit-button";
import { useActionForm } from "@/components/form/use-action-form";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { saveMyBirthday } from "./actions";
import { myBirthdaySchema, type MyBirthdayInput, type MyBirthdayOutput } from "./birthday";
import { BirthdaySelect } from "./birthday-select";

export function BirthdayForm({ defaults }: { defaults: MyBirthdayInput }) {
  const t = useTranslations("launch.birthday");
  const tc = useTranslations("common");
  const { form, onSubmit, pending } = useActionForm<MyBirthdayInput, undefined, MyBirthdayOutput>({
    schema: myBirthdaySchema,
    action: saveMyBirthday,
    defaultValues: defaults,
    successMessage: t("saved"),
  });
  const { errors } = form.formState;
  const [month, day] = form.watch(["birth_month", "birth_day"]);
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <FormField id="my-birthday-month" label={t("label")} description={t("hint")} error={errors.birth_month?.message ?? errors.birth_day?.message}>
        <BirthdaySelect
          idPrefix="my-birthday"
          month={month}
          day={day}
          onChange={(v) => {
            form.setValue("birth_month", v.birth_month, { shouldDirty: true, shouldValidate: form.formState.isSubmitted });
            form.setValue("birth_day", v.birth_day, { shouldDirty: true, shouldValidate: form.formState.isSubmitted });
          }}
        />
      </FormField>
      <Controller control={form.control} name="celebrate" render={({ field }) => (
        <Label className="flex items-start gap-3 font-normal">
          <Switch className="mt-0.5" checked={field.value} onCheckedChange={field.onChange} />
          <span>
            <span className="block text-sm font-medium">{t("celebrate")}</span>
            <span className="text-muted-foreground block text-xs">{t("celebrateHint")}</span>
          </span>
        </Label>
      )} />
      <SubmitButton pending={pending}>{tc("save")}</SubmitButton>
    </form>
  );
}
