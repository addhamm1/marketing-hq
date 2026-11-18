"use client";

import { useTranslations } from "next-intl";
import type { UseFormReturn } from "react-hook-form";
import { FormField } from "@/components/form/form-field";
import { Input } from "@/components/ui/input";
import { BirthdaySelect } from "@/features/launch/birthday-select";
import type { CreateAccountInput } from "./schemas";

type Values = CreateAccountInput & { user_id?: string };

/** Phone (super admin), joining date and birthday (super admin and HR). */
export function UserDetailsFields({ form, phoneLocked }: { form: UseFormReturn<Values, unknown, unknown>; phoneLocked: boolean }) {
  const t = useTranslations("launch.userForm");
  const { errors } = form.formState;
  const [month, day] = form.watch(["birth_month", "birth_day"]);
  return (
    <>
      <FormField id="phone" label={t("phone")} error={errors.phone?.message}>
        <Input id="phone" type="tel" dir="ltr" autoComplete="off" maxLength={30} disabled={phoneLocked} {...form.register("phone")} />
      </FormField>
      <FormField id="joined_on" label={t("joinedOn")} error={errors.joined_on?.message}>
        <Input id="joined_on" type="date" dir="ltr" {...form.register("joined_on")} />
      </FormField>
      <FormField
        id="user-birthday-month"
        label={t("birthday")}
        description={t("birthdayHint")}
        error={errors.birth_month?.message ?? errors.birth_day?.message}
        className="sm:col-span-2"
      >
        <BirthdaySelect
          idPrefix="user-birthday"
          month={month}
          day={day}
          onChange={(v) => {
            form.setValue("birth_month", v.birth_month, { shouldDirty: true });
            form.setValue("birth_day", v.birth_day, { shouldDirty: true });
          }}
        />
      </FormField>
    </>
  );
}
