"use client";

import { useTranslations } from "next-intl";
import { FormField } from "@/components/form/form-field";
import { SubmitButton } from "@/components/form/submit-button";
import { useActionForm } from "@/components/form/use-action-form";
import { Input } from "@/components/ui/input";
import { signIn } from "./actions";
import { signInSchema, type SignInInput } from "./schemas";

export function SignInForm({ next }: { next?: string }) {
  const t = useTranslations("auth");
  const { form, onSubmit, pending } = useActionForm<SignInInput>({
    schema: signInSchema,
    action: signIn,
    defaultValues: { email: "", password: "", next },
  });
  const { errors } = form.formState;

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <FormField id="email" label={t("email")} error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          dir="ltr"
          inputMode="email"
          aria-invalid={!!errors.email}
          {...form.register("email")}
        />
      </FormField>
      <FormField id="password" label={t("password")} error={errors.password?.message}>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!errors.password}
          {...form.register("password")}
        />
      </FormField>
      <SubmitButton pending={pending} pendingLabel={t("signingIn")} className="w-full" size="lg">
        {t("signIn")}
      </SubmitButton>
    </form>
  );
}
