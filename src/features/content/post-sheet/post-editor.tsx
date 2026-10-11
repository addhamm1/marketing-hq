"use client";

import { useLocale, useTranslations } from "next-intl";
import { Controller } from "react-hook-form";
import { z } from "zod";
import { FormField } from "@/components/form/form-field";
import { SubmitButton } from "@/components/form/submit-button";
import { useActionForm } from "@/components/form/use-action-form";
import { usePeople } from "@/components/people-context";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Brand } from "@/features/boards/types";
import { fromCairoInput, toCairoInput } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { updatePost } from "../actions";
import { CAPTION_LIMITS, FORMATS, PILLARS, POST_PLATFORMS, type Post } from "../types";

const schema = z.object({
  brand_id: z.string().min(1, "validation.required"),
  branch_id: z.string(),
  platforms: z.array(z.string()),
  scheduled_at: z.string(),
  format: z.string(),
  caption_ar: z.string().max(5000, "validation.tooLong"),
  caption_en: z.string().max(5000, "validation.tooLong"),
  hashtags: z.string().max(2000).refine((v) => v.split(/\s+/).filter(Boolean).every((h) => /^#?[\p{L}\p{N}_]+$/u.test(h)), "validation.invalid"),
  first_comment: z.string().max(2000, "validation.tooLong"),
  pillar: z.string(),
  notes: z.string().max(2000, "validation.tooLong"),
  publisher_id: z.string(),
});
type Values = z.infer<typeof schema>;
const nullable = (v: string) => (v && v !== "none" ? v : null);

function Counter({ text, platforms }: { text: string; platforms: string[] }) {
  const t = useTranslations("content.editor");
  const tp = useTranslations("platform");
  const limits = platforms.map((p) => [p, CAPTION_LIMITS[p] ?? 2200] as const).sort((a, b) => a[1] - b[1]);
  const tightest = limits[0];
  if (!tightest) return null;
  const over = text.length > tightest[1];
  return (
    <span className={cn("text-xs tabular-nums", over ? "text-destructive" : "text-muted-foreground")}>
      {t("chars", { count: text.length, limit: tightest[1] })}{over ? ` · ${t("overLimit", { platform: tp(tightest[0] as "facebook") })}` : ""}
    </span>
  );
}

export function PostEditor({ post, brands, branches, onSaved }: { post: Post; brands: Brand[]; branches: { id: string; name_en: string; name_ar: string }[]; onSaved: () => void }) {
  const t = useTranslations("content");
  const tp = useTranslations("platform");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { people } = usePeople();
  const { form, onSubmit, pending } = useActionForm<Values>({
    schema,
    action: (v) =>
      updatePost({
        id: post.id,
        brand_id: v.brand_id,
        branch_id: nullable(v.branch_id),
        platforms: v.platforms,
        scheduled_at: fromCairoInput(v.scheduled_at),
        format: v.format,
        caption_ar: v.caption_ar,
        caption_en: v.caption_en,
        hashtags: v.hashtags.split(/\s+/).filter(Boolean).map((h) => h.replace(/^#/, "")),
        first_comment: v.first_comment,
        pillar: nullable(v.pillar),
        notes: v.notes,
        publisher_id: nullable(v.publisher_id),
      }),
    defaultValues: {
      brand_id: post.brand_id, branch_id: post.branch_id ?? "", platforms: post.platforms, scheduled_at: toCairoInput(post.scheduled_at),
      format: post.format, caption_ar: post.caption_ar, caption_en: post.caption_en, hashtags: post.hashtags.join(" "),
      first_comment: post.first_comment, pillar: post.pillar ?? "", notes: post.notes, publisher_id: post.publisher_id ?? "",
    },
    successMessage: t("editor.saved"),
    onSuccess: () => {
      form.reset(form.getValues());
      onSaved();
    },
  });
  const { errors, isDirty } = form.formState;
  const platforms = form.watch("platforms");
  const sel = (name: "brand_id" | "branch_id" | "format" | "pillar" | "publisher_id", items: { value: string; label: string }[], allowNone = true) => (
    <Controller control={form.control} name={name} render={({ field }) => (
      <Select value={field.value || "none"} onValueChange={field.onChange}>
        <SelectTrigger id={name} className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>
          {allowNone ? <SelectItem value="none">{tc("none")}</SelectItem> : null}
          {items.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
        </SelectContent>
      </Select>
    )} />
  );

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="brand_id" label={t("fields.brand")} error={errors.brand_id?.message}>{sel("brand_id", brands.map((b) => ({ value: b.id, label: b.name })), false)}</FormField>
        <FormField id="scheduled_at" label={t("fields.scheduled_at")}><Input id="scheduled_at" type="datetime-local" dir="ltr" {...form.register("scheduled_at")} /></FormField>
        <FormField id="format" label={t("fields.format")}>{sel("format", FORMATS.map((f) => ({ value: f, label: t(`format.${f}`) })), false)}</FormField>
        <FormField id="pillar" label={t("fields.pillar")}>{sel("pillar", PILLARS.map((p) => ({ value: p, label: t(`pillar.${p}`) })))}</FormField>
        <FormField id="branch_id" label={t("fields.branch")}>{sel("branch_id", branches.map((b) => ({ value: b.id, label: locale === "ar" ? b.name_ar : b.name_en })))}</FormField>
        <FormField id="publisher_id" label={t("fields.publisher")}>{sel("publisher_id", people.map((p) => ({ value: p.id, label: p.display_name })))}</FormField>
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">{t("fields.platforms")}</legend>
        <Controller control={form.control} name="platforms" render={({ field }) => (
          <div className="flex flex-wrap gap-1.5">
            {POST_PLATFORMS.map((p) => {
              const on = field.value.includes(p);
              return (
                <button key={p} type="button" aria-pressed={on} onClick={() => field.onChange(on ? field.value.filter((x) => x !== p) : [...field.value, p])}
                  className={cn("rounded-md border px-2.5 py-1 text-xs", on ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground")}>
                  {tp(p)}
                </button>
              );
            })}
          </div>
        )} />
      </fieldset>
      <FormField id="caption_ar" label={<span className="flex w-full justify-between">{t("fields.caption_ar")}<Counter text={form.watch("caption_ar")} platforms={platforms} /></span>} error={errors.caption_ar?.message}>
        <Textarea id="caption_ar" dir="rtl" rows={5} {...form.register("caption_ar")} />
      </FormField>
      <FormField id="caption_en" label={<span className="flex w-full justify-between">{t("fields.caption_en")}<Counter text={form.watch("caption_en")} platforms={platforms} /></span>} error={errors.caption_en?.message}>
        <Textarea id="caption_en" dir="ltr" rows={5} {...form.register("caption_en")} />
      </FormField>
      <FormField id="hashtags" label={t("fields.hashtags")} description={t("fields.hashtagsHint")} error={errors.hashtags?.message}>
        <Input id="hashtags" dir="ltr" {...form.register("hashtags")} />
      </FormField>
      <FormField id="first_comment" label={t("fields.first_comment")} error={errors.first_comment?.message}>
        <Textarea id="first_comment" rows={2} {...form.register("first_comment")} />
      </FormField>
      <FormField id="notes" label={t("fields.notes")} error={errors.notes?.message}>
        <Textarea id="notes" rows={2} {...form.register("notes")} />
      </FormField>
      <SubmitButton pending={pending} disabled={!isDirty}>{t("editor.save")}</SubmitButton>
    </form>
  );
}
