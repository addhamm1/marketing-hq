"use client";

import { useTranslations } from "next-intl";
import { FormField } from "@/components/form/form-field";
import { SubmitButton } from "@/components/form/submit-button";
import { useActionForm } from "@/components/form/use-action-form";
import { Input } from "@/components/ui/input";
import { changePassword } from "./actions";
import { changePasswordSchema, type ChangePasswordInput } from "./schemas";

export function ChangePasswordForm() {
  const t = useTranslations("auth");
  const { form, onSubmit, pending } = useActionForm<ChangePasswordInput>({
    schema: changePasswordSchema,
    action: changePassword,
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
    successMessage: t("passwordChanged"),
    onSuccess: () => form.reset(),
  });
  const { errors } = form.formState;

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <FormField id="currentPassword" label={t("currentPassword")} error={errors.currentPassword?.message}>
        <Input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!errors.currentPassword}
          {...form.register("currentPassword")}
        />
      </FormField>
      <FormField
        id="newPassword"
        label={t("newPassword")}
        error={errors.newPassword?.message}
        description={t("passwordHint")}
      >
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.newPassword}
          {...form.register("newPassword")}
        />
      </FormField>
      <FormField id="confirmPassword" label={t("confirmPassword")} error={errors.confirmPassword?.message}>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.confirmPassword}
          {...form.register("confirmPassword")}
        />
      </FormField>
      <SubmitButton pending={pending} className="w-full" size="lg">
        {t("changePassword")}
      </SubmitButton>
    </form>
  );
}
