"use client";

import { useLocale, useTranslations } from "next-intl";
import { Controller } from "react-hook-form";
import { FormField } from "@/components/form/form-field";
import { SubmitButton } from "@/components/form/submit-button";
import { useActionForm } from "@/components/form/use-action-form";
import { usePeople } from "@/components/people-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "@/i18n/navigation";
import { createShoot, updateShoot } from "./actions";
import { SHOOT_STATUSES, shootSchema, type ShootInput, type ShootOutput } from "./schemas";

export type BranchOption = { id: string; name_en: string; name_ar: string };

/** Creates a shoot, or edits one when `shootId` is given. */
export function ShootForm({ shootId, defaults, branches, onDone }: {
  shootId?: string;
  defaults: ShootInput;
  branches: BranchOption[];
  onDone?: () => void;
}) {
  const t = useTranslations("shoots");
  const ts = useTranslations("shoots.status");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const { people } = usePeople();
  const { form, onSubmit, pending } = useActionForm<ShootInput, { id: string } | undefined, ShootOutput>({
    schema: shootSchema,
    action: (values) => (shootId ? updateShoot({ id: shootId, values }) : createShoot(values)),
    defaultValues: defaults,
    successMessage: shootId ? t("saved") : t("created"),
    onSuccess: (data) => {
      if (data?.id) router.push(`/shoots/${data.id}`);
      else {
        router.refresh();
        onDone?.();
      }
    },
  });
  const { errors } = form.formState;
  const place = form.watch("place");

  return (
    <form id="shoot-form" onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-6">
      <FormField id="title" label={t("fields.title")} error={errors.title?.message} className="sm:col-span-6">
        <Input id="title" maxLength={160} {...form.register("title")} />
      </FormField>
      <FormField id="shoot_on" label={t("fields.date")} error={errors.shoot_on?.message} className="sm:col-span-2">
        <Input id="shoot_on" type="date" dir="ltr" {...form.register("shoot_on")} />
      </FormField>
      <FormField id="call_time" label={t("fields.callTime")} error={errors.call_time?.message} className="sm:col-span-2">
        <Input id="call_time" type="time" dir="ltr" {...form.register("call_time")} />
      </FormField>
      <FormField id="wrap_time" label={t("fields.wrapTime")} error={errors.wrap_time?.message} className="sm:col-span-2">
        <Input id="wrap_time" type="time" dir="ltr" {...form.register("wrap_time")} />
      </FormField>

      <fieldset className="space-y-2 sm:col-span-6">
        <legend className="text-sm font-medium">{t("fields.place")}</legend>
        <Controller control={form.control} name="place" render={({ field }) => (
          <RadioGroup value={field.value} onValueChange={field.onChange} className="flex flex-wrap gap-4">
            <Label className="flex items-center gap-2 font-normal"><RadioGroupItem value="branch" /> {t("fields.atBranch")}</Label>
            <Label className="flex items-center gap-2 font-normal"><RadioGroupItem value="outside" /> {t("fields.outside")}</Label>
          </RadioGroup>
        )} />
      </fieldset>
      {place === "branch" ? (
        <FormField id="branch_id" label={t("fields.branch")} error={errors.branch_id?.message} className="sm:col-span-3">
          <Controller control={form.control} name="branch_id" render={({ field }) => (
            <Select value={field.value ?? "none"} onValueChange={field.onChange}>
              <SelectTrigger id="branch_id" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{tc("none")}</SelectItem>
                {branches.map((b) => <SelectItem key={b.id} value={b.id}>{locale === "ar" ? b.name_ar : b.name_en}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
        </FormField>
      ) : (
        <FormField id="location_name" label={t("fields.locationName")} error={errors.location_name?.message} className="sm:col-span-3">
          <Input id="location_name" maxLength={160} {...form.register("location_name")} />
        </FormField>
      )}
      <FormField id="location_url" label={t("fields.mapLink")} error={errors.location_url?.message} description={t("fields.mapLinkHint")} className="sm:col-span-3">
        <Input id="location_url" type="url" dir="ltr" placeholder="https://" {...form.register("location_url")} />
      </FormField>

      <FormField id="producer_id" label={t("fields.producer")} error={errors.producer_id?.message} className="sm:col-span-3">
        <Controller control={form.control} name="producer_id" render={({ field }) => (
          <Select value={field.value ?? "none"} onValueChange={field.onChange}>
            <SelectTrigger id="producer_id" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{tc("none")}</SelectItem>
              {people.map((p) => <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>)}
            </SelectContent>
          </Select>
        )} />
      </FormField>
      <FormField id="status" label={tc("status")} error={errors.status?.message} className="sm:col-span-3">
        <Controller control={form.control} name="status" render={({ field }) => (
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger id="status" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{SHOOT_STATUSES.map((s) => <SelectItem key={s} value={s}>{ts(s)}</SelectItem>)}</SelectContent>
          </Select>
        )} />
      </FormField>

      <FormField id="brief" label={t("fields.brief")} error={errors.brief?.message} className="sm:col-span-6">
        <Textarea id="brief" rows={4} maxLength={6000} {...form.register("brief")} />
      </FormField>
      <FormField id="backup_plan" label={t("fields.backupPlan")} error={errors.backup_plan?.message} description={t("fields.backupPlanHint")} className="sm:col-span-6">
        <Textarea id="backup_plan" rows={2} maxLength={2000} {...form.register("backup_plan")} />
      </FormField>
      <div className="flex justify-end sm:col-span-6">
        <SubmitButton pending={pending}>{shootId ? tc("save") : t("create")}</SubmitButton>
      </div>
    </form>
  );
}
