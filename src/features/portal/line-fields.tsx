"use client";

import { useTranslations } from "next-intl";
import { Controller, type Control, type FieldErrors, type UseFormRegister } from "react-hook-form";
import { FormField } from "@/components/form/form-field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Brand } from "@/features/boards/types";
import { cn } from "@/lib/utils";
import { DraftMediaField } from "./draft-media-field";
import { ReferenceLinksField } from "./reference-links-field";
import type { LineInput } from "./schemas";

export type LineOptions = { brands: Brand[]; verticals: string[]; formats: string[]; platforms: string[] };

type Props = {
  prefix: string;
  control: Control<never>;
  register: UseFormRegister<never>;
  errors?: FieldErrors<LineInput>;
  options: LineOptions;
  compact?: boolean;
  /** New requests: upload reference media now, attach it to the card on submit. */
  withMedia?: boolean;
  onUploadBusy?: (busy: boolean) => void;
};

/** One content request: shared by strategic lines, urgent requests and resubmission. */
export function LineFields({ prefix, control, register, errors, options, compact, withMedia, onUploadBusy }: Props) {
  const t = useTranslations("card.fields");
  const tp = useTranslations("priority");
  const tpl = useTranslations("platform");
  const tc = useTranslations("common");
  const name = (f: keyof LineInput) => `${prefix}${f}` as never;
  const id = (f: string) => `${prefix.replace(/\W/g, "-")}${f}`;
  const select = (f: "vertical" | "format" | "brand_id", items: { value: string; label: string }[]) => (
    <Controller
      control={control}
      name={name(f)}
      render={({ field }) => (
        <Select value={(field.value as string) || "none"} onValueChange={(v) => field.onChange(v === "none" ? "" : v)}>
          <SelectTrigger id={id(f)} className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{tc("none")}</SelectItem>
            {items.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
    />
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField id={id("title")} label={t("title")} error={errors?.title?.message} className="sm:col-span-2">
        <Input id={id("title")} {...register(name("title"))} />
      </FormField>
      <FormField id={id("objective")} label={t("objective")} error={errors?.objective?.message}>
        <Textarea id={id("objective")} rows={2} {...register(name("objective"))} />
      </FormField>
      <FormField id={id("key_message")} label={t("key_message")} error={errors?.key_message?.message}>
        <Textarea id={id("key_message")} rows={2} {...register(name("key_message"))} />
      </FormField>
      <FormField id={id("vertical")} label={t("vertical")} error={errors?.vertical?.message}>
        {select("vertical", options.verticals.map((v) => ({ value: v, label: v })))}
      </FormField>
      <FormField id={id("brand_id")} label={t("brand_id")} error={errors?.brand_id?.message}>
        {select("brand_id", options.brands.map((b) => ({ value: b.id, label: b.name })))}
      </FormField>
      <FormField id={id("format")} label={t("format")} error={errors?.format?.message}>
        {select("format", options.formats.map((v) => ({ value: v, label: v })))}
      </FormField>
      <FormField id={id("due_at")} label={t("due_at")} error={errors?.due_at?.message}>
        <Input id={id("due_at")} type="datetime-local" dir="ltr" {...register(name("due_at"))} />
      </FormField>
      <fieldset className="sm:col-span-2">
        <legend className="mb-2 text-sm font-medium">{t("platforms")}</legend>
        <Controller
          control={control}
          name={name("platforms")}
          render={({ field }) => {
            const value = (field.value as string[]) ?? [];
            return (
              <div className="flex flex-wrap gap-1.5">
                {options.platforms.map((p) => {
                  const on = value.includes(p);
                  return (
                    <button key={p} type="button" aria-pressed={on}
                      onClick={() => field.onChange(on ? value.filter((x) => x !== p) : [...value, p])}
                      className={cn("rounded-md border px-2.5 py-1 text-xs", on ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground")}>
                      {tpl.has(p as never) ? tpl(p as never) : p}
                    </button>
                  );
                })}
              </div>
            );
          }}
        />
        {errors?.platforms?.message ? <p className="text-destructive mt-1 text-sm">{tc("required")}</p> : null}
      </fieldset>
      {!compact ? (
        <>
          <FormField id={id("priority")} label={t("priority")}>
            <Controller
              control={control}
              name={name("priority")}
              render={({ field }) => (
                <Select value={field.value as string} onValueChange={field.onChange}>
                  <SelectTrigger id={id("priority")} className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["low", "normal", "high", "urgent"] as const).map((p) => <SelectItem key={p} value={p}>{tp(p)}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField id={id("budget_note")} label={t("budget_note")} error={errors?.budget_note?.message}>
            <Input id={id("budget_note")} {...register(name("budget_note"))} />
          </FormField>
          <FormField id={id("description")} label={t("description")} error={errors?.description?.message} className="sm:col-span-2">
            <Textarea id={id("description")} rows={3} {...register(name("description"))} />
          </FormField>
          <FormField id={id("reference_links")} label={t("reference_links")} error={errors?.reference_links?.message} className="sm:col-span-2">
            <ReferenceLinksField id={id("reference_links")} control={control} name={name("reference_links")} />
          </FormField>
        </>
      ) : null}
      {withMedia ? (
        <div className="sm:col-span-2">
          <DraftMediaField control={control} name={name("files" as keyof LineInput)} onBusy={onUploadBusy} />
        </div>
      ) : null}
    </div>
  );
}
