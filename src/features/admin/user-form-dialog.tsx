"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Controller, type Control } from "react-hook-form";
import { FormField } from "@/components/form/form-field";
import { SubmitButton } from "@/components/form/submit-button";
import { useActionForm } from "@/components/form/use-action-form";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AdminUser, OrgOption } from "./queries";
import { APP_ROLES, createAccountSchema, updateUserSchema, type CreateAccountInput } from "./schemas";
import { SecretDialog } from "./secret-dialog";
import { createAccount, updateUser } from "./users-actions";

type Org = { departments: OrgOption[]; teams: OrgOption[]; branches: OrgOption[] };
type Values = CreateAccountInput & { user_id?: string };
const WEEK = [6, 0, 1, 2, 3, 4, 5];

function OrgSelect({
  control, name, options, id, disabled,
}: {
  control: Control<Values>;
  name: "department_id" | "team_id" | "home_branch_id" | "lead_team_id";
  options: OrgOption[];
  id: string;
  disabled?: boolean;
}) {
  const locale = useLocale();
  const tc = useTranslations("common");
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Select value={field.value ?? "none"} onValueChange={field.onChange} disabled={disabled}>
          <SelectTrigger id={id} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{tc("none")}</SelectItem>
            {options.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {locale === "ar" ? o.name_ar : o.name_en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  );
}

export function UserFormDialog({
  mode, user, org, isAdmin, onClose,
}: {
  mode: "create" | "edit";
  user?: AdminUser;
  org: Org;
  isAdmin: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("admin");
  const tr = useTranslations("roles");
  const tw = useTranslations("weekdays");
  const tc = useTranslations("common");
  const [secret, setSecret] = useState<string | null>(null);
  const leadTeam = user?.roles.find((r) => r.role === "team_lead")?.team_id ?? null;

  const { form, onSubmit, pending } = useActionForm<Values, unknown>({
    schema: (mode === "create" ? createAccountSchema : updateUserSchema) as never,
    action: (values) => (mode === "create" ? createAccount(values) : updateUser(values)),
    defaultValues: {
      user_id: user?.id,
      email: user?.email ?? "",
      full_name: user?.full_name ?? "",
      department_id: user?.department_id ?? null,
      team_id: user?.team_id ?? null,
      home_branch_id: user?.home_branch_id ?? null,
      title: user?.title ?? "",
      roles: user?.roles.map((r) => r.role) ?? ["member"],
      lead_team_id: leadTeam,
      workdays: user?.schedule.workdays ?? [6, 0, 1, 2, 3, 4],
      start_time: user?.schedule.start_time ?? "10:00",
      end_time: user?.schedule.end_time ?? "18:00",
    },
    successMessage: mode === "create" ? t("accountCreated") : t("userSaved"),
    onSuccess: (data) => {
      const password = (data as { password?: string } | undefined)?.password;
      if (password) setSecret(password);
      else onClose();
    },
  });
  const { errors } = form.formState;
  const dept = form.watch("department_id");
  const roles = form.watch("roles");
  const teams = org.teams.filter((tm) => !dept || dept === "none" || tm.department_id === dept);
  const profileLocked = !isAdmin;

  if (secret) {
    return <SecretDialog secret={secret} title={t("tempPasswordTitle")} body={t("tempPasswordBody")} onClose={onClose} />;
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? t("createAccountTitle") : t("editUser")}</DialogTitle>
          {mode === "create" ? <DialogDescription>{t("createAccountBody")}</DialogDescription> : null}
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate id="user-form">
          {mode === "create" ? (
            <FormField id="email" label={tc("email")} error={errors.email?.message} className="sm:col-span-2">
              <Input id="email" type="email" dir="ltr" autoComplete="off" {...form.register("email")} />
            </FormField>
          ) : null}
          <FormField id="full_name" label={t("fullName")} error={errors.full_name?.message} className="sm:col-span-2">
            <Input id="full_name" disabled={profileLocked} {...form.register("full_name")} />
          </FormField>
          <FormField id="department_id" label={t("department")} error={errors.department_id?.message}>
            <OrgSelect control={form.control} name="department_id" options={org.departments} id="department_id" disabled={profileLocked} />
          </FormField>
          <FormField id="team_id" label={t("team")} error={errors.team_id?.message}>
            <OrgSelect control={form.control} name="team_id" options={teams} id="team_id" disabled={profileLocked} />
          </FormField>
          <FormField id="home_branch_id" label={t("homeBranch")} error={errors.home_branch_id?.message}>
            <OrgSelect control={form.control} name="home_branch_id" options={org.branches} id="home_branch_id" disabled={profileLocked} />
          </FormField>
          <FormField id="title" label={t("jobTitle")} error={errors.title?.message}>
            <Input id="title" disabled={profileLocked} {...form.register("title")} />
          </FormField>

          <fieldset className="sm:col-span-2" disabled={profileLocked}>
            <legend className="mb-2 text-sm font-medium">{t("roles")}</legend>
            <Controller
              control={form.control}
              name="roles"
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {APP_ROLES.map((r) => (
                    <Label key={r} className="flex items-center gap-2 font-normal">
                      <Checkbox
                        checked={field.value.includes(r)}
                        onCheckedChange={(c) =>
                          field.onChange(c ? [...field.value, r] : field.value.filter((x) => x !== r))
                        }
                      />
                      {tr(r)}
                    </Label>
                  ))}
                </div>
              )}
            />
          </fieldset>
          {roles.includes("team_lead") ? (
            <FormField id="lead_team_id" label={t("teamFor")} error={errors.lead_team_id?.message} className="sm:col-span-2">
              <OrgSelect control={form.control} name="lead_team_id" options={org.teams} id="lead_team_id" disabled={profileLocked} />
            </FormField>
          ) : null}

          <fieldset className="sm:col-span-2">
            <legend className="mb-2 text-sm font-medium">{t("workdays")}</legend>
            <Controller
              control={form.control}
              name="workdays"
              render={({ field }) => (
                <div className="flex flex-wrap gap-1.5">
                  {WEEK.map((d) => {
                    const on = field.value.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        aria-pressed={on}
                        onClick={() => field.onChange(on ? field.value.filter((x) => x !== d) : [...field.value, d])}
                        className={`rounded-md border px-2.5 py-1 text-xs ${on ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground"}`}
                      >
                        {tw(String(d) as "0")}
                      </button>
                    );
                  })}
                </div>
              )}
            />
            {errors.workdays ? <p className="text-destructive mt-1 text-sm">{tc("required")}</p> : null}
          </fieldset>
          <FormField id="start_time" label={t("startTime")} error={errors.start_time?.message}>
            <Input id="start_time" type="time" dir="ltr" {...form.register("start_time")} />
          </FormField>
          <FormField id="end_time" label={t("endTime")} error={errors.end_time?.message}>
            <Input id="end_time" type="time" dir="ltr" {...form.register("end_time")} />
          </FormField>
        </form>
        <DialogFooter>
          <SubmitButton pending={pending} form="user-form">
            {mode === "create" ? t("createAccount") : tc("save")}
          </SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
