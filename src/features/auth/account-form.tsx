"use client";

import { useTranslations } from "next-intl";
import { Controller } from "react-hook-form";
import { FormField } from "@/components/form/form-field";
import { SubmitButton } from "@/components/form/submit-button";
import { useActionForm } from "@/components/form/use-action-form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePathname, useRouter } from "@/i18n/navigation";
import { updateAccount } from "./actions";
import { accountSchema, type AccountInput } from "./schemas";

export function AccountForm({ defaults }: { defaults: AccountInput }) {
  const t = useTranslations("account");
  const tc = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const { form, onSubmit, pending } = useActionForm<AccountInput>({
    schema: accountSchema,
    action: updateAccount,
    defaultValues: defaults,
    successMessage: t("profileSaved"),
    onSuccess: (_, values) => {
      if (values.locale !== defaults.locale) router.replace(pathname, { locale: values.locale });
    },
  });
  const { errors } = form.formState;

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <FormField id="display_name" label={t("displayName")} error={errors.display_name?.message}>
        <Input id="display_name" {...form.register("display_name")} />
      </FormField>
      <FormField id="phone" label={t("phone")} error={errors.phone?.message}>
        <Input id="phone" type="tel" dir="ltr" autoComplete="tel" {...form.register("phone")} />
      </FormField>
      <FormField id="locale" label={t("language")} error={errors.locale?.message}>
        <Controller
          control={form.control}
          name="locale"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="locale" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{tc("english")}</SelectItem>
                <SelectItem value="ar">{tc("arabic")}</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </FormField>
      <SubmitButton pending={pending}>{tc("save")}</SubmitButton>
    </form>
  );
}
