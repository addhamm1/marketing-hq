"use client";

import { Loader2, Paperclip, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMessage } from "@/hooks/use-message";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import { createRequestFileUpload, submitRequest } from "./actions";
import type { Balance, FormField, RequestType } from "./types";

type Values = Record<string, string>;

function FieldInput({ field, value, onChange, cards }: { field: FormField; value: string; onChange: (v: string) => void; cards: { id: string; title: string }[] }) {
  const t = useTranslations("requests.options");
  const tc = useTranslations("common");
  const id = `f-${field.name}`;
  switch (field.type) {
    case "textarea":
      return <Textarea id={id} rows={3} value={value} onChange={(e) => onChange(e.target.value)} />;
    case "date":
      return <Input id={id} type="date" dir="ltr" value={value} onChange={(e) => onChange(e.target.value)} />;
    case "time":
      return <Input id={id} type="time" dir="ltr" value={value} onChange={(e) => onChange(e.target.value)} />;
    case "number":
      return <Input id={id} type="number" inputMode="decimal" step="0.5" min={field.min} max={field.max} dir="ltr" value={value} onChange={(e) => onChange(e.target.value)} />;
    case "select":
    case "card": {
      const items = field.type === "card" ? cards.map((c) => ({ value: c.id, label: c.title })) : (field.options ?? []).map((o) => ({ value: o, label: t.has(o as never) ? t(o as never) : o }));
      return (
        <Select value={value || "none"} onValueChange={(v) => onChange(v === "none" ? "" : v)}>
          <SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{tc("none")}</SelectItem>
            {items.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }
    default:
      return <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} />;
  }
}

export function RequestForm({ types, balances, cards }: { types: RequestType[]; balances: Balance[]; cards: { id: string; title: string }[] }) {
  const t = useTranslations("requests");
  const tv = useTranslations("validation");
  const locale = useLocale();
  const message = useMessage();
  const router = useRouter();
  const [key, setKey] = useState(types[0]?.key ?? "");
  const [values, setValues] = useState<Values>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<{ path: string; name: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [days, setDays] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const type = types.find((x) => x.key === key);
  const label = (f: FormField) => (locale === "ar" ? f.label_ar : f.label_en);

  // Working days preview from the database (Fridays and holidays skipped).
  useEffect(() => {
    if (!type?.counts_working_days || !values.starts_on) return;
    let alive = true;
    createClient()
      .rpc("working_days", { p_from: values.starts_on, p_to: values.ends_on || values.starts_on })
      .then(({ data }) => alive && setDays(typeof data === "number" ? data : null));
    return () => {
      alive = false;
    };
  }, [type?.counts_working_days, values.starts_on, values.ends_on]);

  const balance = useMemo(() => {
    if (!type?.is_leave || !values.starts_on) return null;
    const year = Number(values.starts_on.slice(0, 4));
    const b = balances.find((x) => x.type_key === type.key && x.year === year);
    const available = b ? b.allowance - b.used - b.pending : 0;
    return { available, after: available - (days ?? 0) };
  }, [type, values.starts_on, balances, days]);

  const needsFiles = !!type?.requires_attachment_after_days && (days ?? 0) > type.requires_attachment_after_days;

  async function upload(list: FileList | null) {
    if (!list?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(list)) {
        const signed = await createRequestFileUpload({ file_name: file.name });
        if (!signed.ok) throw new Error();
        const { error } = await createClient().storage.from("request-files").uploadToSignedUrl(signed.data.path, signed.data.token, file, { contentType: file.type });
        if (error) throw error;
        setFiles((f) => [...f, { path: signed.data.path, name: file.name }]);
      }
    } catch {
      toast.error(message("card.uploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  function submit() {
    if (!type) return;
    const errs: Record<string, string> = {};
    for (const f of type.fields) if (f.required && !values[f.name]?.trim()) errs[f.name] = tv("required");
    if (needsFiles && !files.length) errs.files = tv("required");
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const data: Record<string, string | number | string[]> = {};
    for (const f of type.fields) if (values[f.name]) data[f.name] = f.type === "number" ? Number(values[f.name]) : values[f.name];
    if (files.length) data.files = files.map((f) => f.path);
    startTransition(async () => {
      const r = await submitRequest({ type_key: type.key, data });
      if (r.ok) {
        toast.success(t("submitted"));
        router.push("/requests");
      } else toast.error(message(r.error, r.params));
    });
  }

  const groups: ["leave" | "special", string][] = [["leave", t("leave")], ["special", t("special")]];

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">{t("chooseType")}</h2>
        {groups.map(([cat, title]) => (
          <div key={cat} className="space-y-2">
            <p className="text-muted-foreground text-xs">{title}</p>
            <div className="flex flex-wrap gap-2">
              {types.filter((x) => x.category === cat).map((x) => (
                <button key={x.key} type="button" aria-pressed={x.key === key}
                  onClick={() => { setKey(x.key); setValues({}); setErrors({}); setFiles([]); setDays(null); }}
                  className={cn("rounded-lg border px-3 py-1.5 text-sm", x.key === key ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>
                  {locale === "ar" ? x.name_ar : x.name_en}
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      {type ? (
        <section className="bg-card space-y-4 rounded-xl border p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {type.fields.map((f) => (
              <Field key={f.name} data-invalid={!!errors[f.name] || undefined} className={f.type === "textarea" ? "sm:col-span-2" : undefined}>
                <FieldLabel htmlFor={`f-${f.name}`}>{label(f)}</FieldLabel>
                <FieldInput field={f} value={values[f.name] ?? ""} onChange={(v) => setValues((s) => ({ ...s, [f.name]: v }))} cards={cards} />
                {errors[f.name] ? <FieldError>{errors[f.name]}</FieldError> : null}
              </Field>
            ))}
          </div>
          {type.counts_working_days && days !== null ? <p className="text-sm">{t("days", { count: days })}</p> : null}
          {balance ? (
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/50 p-3 text-sm">
              <div><p className="text-muted-foreground text-xs">{t("balanceBefore")}</p><p className="text-lg font-semibold tabular-nums">{balance.available}</p></div>
              <div><p className="text-muted-foreground text-xs">{t("balanceAfter")}</p><p className={cn("text-lg font-semibold tabular-nums", balance.after < 0 && "text-destructive")}>{balance.after}</p></div>
            </div>
          ) : null}
          {type.requires_attachment_after_days ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">{t("attachments")}</p>
              <p className="text-muted-foreground text-xs">{t("attachHint", { days: type.requires_attachment_after_days })}</p>
              <ul className="space-y-1">
                {files.map((f) => (
                  <li key={f.path} className="flex items-center gap-2 text-sm">
                    <Paperclip className="size-3.5" aria-hidden /> <span className="flex-1 truncate">{f.name}</span>
                    <Button variant="ghost" size="icon-xs" aria-label={f.name} onClick={() => setFiles((x) => x.filter((y) => y.path !== f.path))}><X aria-hidden /></Button>
                  </li>
                ))}
              </ul>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
                {uploading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Paperclip className="size-4" aria-hidden />}
                {t("addFile")}
                <input type="file" className="hidden" accept="image/*,application/pdf" multiple onChange={(e) => upload(e.target.files)} />
              </label>
              {errors.files ? <p className="text-destructive text-sm">{errors.files}</p> : null}
            </div>
          ) : null}
          <Button onClick={submit} disabled={pending || uploading}>{t("submit")}</Button>
        </section>
      ) : null}
    </div>
  );
}
