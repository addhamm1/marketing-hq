"use client";

import { useLocale, useTranslations } from "next-intl";
import { Controller } from "react-hook-form";
import { z } from "zod";
import { FormField } from "@/components/form/form-field";
import { SubmitButton } from "@/components/form/submit-button";
import { useActionForm } from "@/components/form/use-action-form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { fromCairoInput, toCairoInput } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { updateCard } from "../card-actions";
import type { BoardSettings } from "../queries";
import { PRIORITIES, type Brand } from "../types";
import type { CardDetail } from "./detail-query";

type Option = { id: string; name_en: string; name_ar: string };

const formSchema = z.object({
  title: z.string().trim().min(1, "validation.required").max(200, "validation.tooLong"),
  description: z.string().max(20_000, "validation.tooLong"),
  objective: z.string().max(2000, "validation.tooLong"),
  key_message: z.string().max(2000, "validation.tooLong"),
  reference_links: z
    .string()
    .max(10_000)
    .refine((v) => v.split("\n").map((s) => s.trim()).filter(Boolean).every((s) => /^https?:\/\/\S+$/.test(s)), "validation.invalid"),
  performance_notes: z.string().max(5000, "validation.tooLong"),
  vertical: z.string(),
  brand_id: z.string(),
  branch_id: z.string(),
  format: z.string(),
  platforms: z.array(z.string()),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  due_at: z.string(),
  stage_due_at: z.string(),
  budget_note: z.string().max(500, "validation.tooLong"),
});
type Values = z.infer<typeof formSchema>;

const none = (v: string) => (v === "" || v === "none" ? null : v);

function SimpleSelect({ value, onChange, options, id, disabled }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; id: string; disabled: boolean }) {
  const tc = useTranslations("common");
  return (
    <Select value={value || "none"} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">{tc("none")}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function CardFieldsForm({ card, canEdit, brands, branches, settings, onSaved }: {
  card: CardDetail;
  canEdit: boolean;
  brands: Brand[];
  branches: Option[];
  settings: BoardSettings;
  onSaved: () => void;
}) {
  const t = useTranslations("card");
  const tp = useTranslations("priority");
  const tpl = useTranslations("platform");
  const locale = useLocale();
  const pipeline = !!card.stage;
  const links = Array.isArray(card.reference_links) ? (card.reference_links as string[]) : [];

  const { form, onSubmit, pending } = useActionForm<Values, undefined, Values>({
    schema: formSchema,
    action: (v) =>
      updateCard({
        id: card.id,
        title: v.title,
        description: v.description,
        objective: v.objective || null,
        key_message: v.key_message || null,
        reference_links: v.reference_links.split("\n").map((s) => s.trim()).filter(Boolean),
        performance_notes: v.performance_notes || null,
        vertical: none(v.vertical),
        brand_id: none(v.brand_id),
        branch_id: none(v.branch_id),
        format: none(v.format),
        platforms: v.platforms,
        priority: v.priority,
        due_at: fromCairoInput(v.due_at),
        stage_due_at: fromCairoInput(v.stage_due_at),
        budget_note: v.budget_note || null,
      }),
    defaultValues: {
      title: card.title,
      description: card.description,
      objective: card.objective ?? "",
      key_message: card.key_message ?? "",
      reference_links: links.join("\n"),
      performance_notes: card.performance_notes ?? "",
      vertical: card.vertical ?? "",
      brand_id: card.brand_id ?? "",
      branch_id: card.branch_id ?? "",
      format: card.format ?? "",
      platforms: card.platforms,
      priority: card.priority,
      due_at: toCairoInput(card.due_at),
      stage_due_at: toCairoInput(card.stage_due_at),
      budget_note: card.budget_note ?? "",
    },
    successMessage: t("saved"),
    onSuccess: () => {
      form.reset(form.getValues());
      onSaved();
    },
  });
  const { errors, isDirty } = form.formState;
  const ro = !canEdit;

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <h3 className="text-sm font-semibold">{t("details")}</h3>
      <FormField id="title" label={t("fields.title")} error={errors.title?.message}>
        <Input id="title" readOnly={ro} {...form.register("title")} />
      </FormField>
      <FormField id="description" label={t("fields.description")} error={errors.description?.message}>
        <Textarea id="description" rows={4} readOnly={ro} {...form.register("description")} />
      </FormField>
      {pipeline ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="objective" label={t("fields.objective")} error={errors.objective?.message}>
            <Textarea id="objective" rows={2} readOnly={ro} {...form.register("objective")} />
          </FormField>
          <FormField id="key_message" label={t("fields.key_message")} error={errors.key_message?.message}>
            <Textarea id="key_message" rows={2} readOnly={ro} {...form.register("key_message")} />
          </FormField>
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {pipeline ? (
          <>
            <FormField id="vertical" label={t("fields.vertical")}>
              <Controller control={form.control} name="vertical" render={({ field }) => (
                <SimpleSelect id="vertical" disabled={ro} value={field.value} onChange={field.onChange} options={settings.verticals.map((v) => ({ value: v, label: v }))} />
              )} />
            </FormField>
            <FormField id="format" label={t("fields.format")}>
              <Controller control={form.control} name="format" render={({ field }) => (
                <SimpleSelect id="format" disabled={ro} value={field.value} onChange={field.onChange} options={settings.formats.map((v) => ({ value: v, label: v }))} />
              )} />
            </FormField>
          </>
        ) : null}
        <FormField id="brand_id" label={t("fields.brand_id")}>
          <Controller control={form.control} name="brand_id" render={({ field }) => (
            <SimpleSelect id="brand_id" disabled={ro} value={field.value} onChange={field.onChange} options={brands.map((b) => ({ value: b.id, label: b.name }))} />
          )} />
        </FormField>
        <FormField id="branch_id" label={t("fields.branch_id")}>
          <Controller control={form.control} name="branch_id" render={({ field }) => (
            <SimpleSelect id="branch_id" disabled={ro} value={field.value} onChange={field.onChange} options={branches.map((b) => ({ value: b.id, label: locale === "ar" ? b.name_ar : b.name_en }))} />
          )} />
        </FormField>
        <FormField id="priority" label={t("fields.priority")}>
          <Controller control={form.control} name="priority" render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange} disabled={ro}>
              <SelectTrigger id="priority" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{tp(p)}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
        </FormField>
        <FormField id="due_at" label={t("fields.due_at")} error={errors.due_at?.message}>
          <Input id="due_at" type="datetime-local" dir="ltr" readOnly={ro} {...form.register("due_at")} />
        </FormField>
        {pipeline ? (
          <FormField id="stage_due_at" label={t("fields.stage_due_at")} error={errors.stage_due_at?.message}>
            <Input id="stage_due_at" type="datetime-local" dir="ltr" readOnly={ro} {...form.register("stage_due_at")} />
          </FormField>
        ) : null}
      </div>
      <fieldset disabled={ro}>
        <legend className="mb-2 text-sm font-medium">{t("fields.platforms")}</legend>
        <Controller control={form.control} name="platforms" render={({ field }) => (
          <div className="flex flex-wrap gap-1.5">
            {settings.platforms.map((p) => {
              const on = field.value.includes(p);
              return (
                <button key={p} type="button" aria-pressed={on}
                  onClick={() => field.onChange(on ? field.value.filter((x) => x !== p) : [...field.value, p])}
                  className={cn("rounded-md border px-2.5 py-1 text-xs", on ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground")}
                >
                  {tpl.has(p as never) ? tpl(p as never) : p}
                </button>
              );
            })}
          </div>
        )} />
      </fieldset>
      {pipeline ? (
        <>
          <FormField id="performance_notes" label={t("fields.performance_notes")} error={errors.performance_notes?.message}>
            <Textarea id="performance_notes" rows={3} readOnly={ro} {...form.register("performance_notes")} />
          </FormField>
          <FormField id="reference_links" label={t("fields.reference_links")} error={errors.reference_links?.message}>
            <Textarea id="reference_links" rows={2} dir="ltr" readOnly={ro} placeholder="https://" {...form.register("reference_links")} />
          </FormField>
          <FormField id="budget_note" label={t("fields.budget_note")} error={errors.budget_note?.message}>
            <Input id="budget_note" readOnly={ro} {...form.register("budget_note")} />
          </FormField>
        </>
      ) : null}
      {canEdit ? (
        <SubmitButton pending={pending} disabled={!isDirty} size="sm">
          {t("save")}
        </SubmitButton>
      ) : null}
    </form>
  );
}
