"use client";

import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { useFieldArray } from "react-hook-form";
import { toast } from "sonner";
import { FormField } from "@/components/form/form-field";
import { SubmitButton } from "@/components/form/submit-button";
import { useActionForm } from "@/components/form/use-action-form";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "@/i18n/navigation";
import { submitStrategicPlan, submitUrgentRequest } from "./actions";
import { LineFields, type LineOptions } from "./line-fields";
import { emptyLine, strategicSchema, urgentSchema, type StrategicInput, type UrgentInput } from "./schemas";

/** Tracks which fields still have uploads running, so submit waits for them. */
function useUploadsBusy() {
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  // One stable callback per field, so reporting does not re-render the field in a loop.
  const [reporters] = useState(() => new Map<string, (b: boolean) => void>());
  const report = useCallback(
    (key: string) => {
      let fn = reporters.get(key);
      if (!fn) {
        fn = (b: boolean) => setBusy((s) => (!!s[key] === b ? s : { ...s, [key]: b }));
        reporters.set(key, fn);
      }
      return fn;
    },
    [reporters],
  );
  return { busy: Object.values(busy).some(Boolean), report };
}

function useFilesWarning() {
  const t = useTranslations("media");
  return (failed: number) => {
    if (failed) toast.warning(t("someFailed", { count: failed }));
  };
}

function StrategicForm({ options, forMonth, monthLabel, deadlineDay, isLate }: { options: LineOptions; forMonth: string; monthLabel: string; deadlineDay: number; isLate: boolean }) {
  const t = useTranslations("portal");
  const router = useRouter();
  const tm = useTranslations("media");
  const uploads = useUploadsBusy();
  const warn = useFilesWarning();
  const { form, onSubmit, pending } = useActionForm<StrategicInput, { count: number; failedFiles: number }>({
    schema: strategicSchema,
    action: submitStrategicPlan,
    defaultValues: { for_month: forMonth, lines: [emptyLine()] },
    onSuccess: (data) => {
      warn(data.failedFiles);
      router.push("/portal");
    },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" });
  const errors = form.formState.errors;

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="space-y-1">
        <p className="font-medium">{t("forMonth", { month: monthLabel })}</p>
        <p className="text-muted-foreground text-sm">{t("strategicIntro", { day: deadlineDay })}</p>
      </div>
      {isLate ? (
        <p className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="size-4 shrink-0" aria-hidden /> {t("lateWarning")}
        </p>
      ) : null}
      {fields.map((f, i) => (
        <fieldset key={f.id} className="bg-card space-y-4 rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <legend className="text-sm font-semibold">{t("line", { n: i + 1 })}</legend>
            {fields.length > 1 ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => remove(i)}>
                <Trash2 aria-hidden /> {t("removeLine")}
              </Button>
            ) : null}
          </div>
          <LineFields
            prefix={`lines.${i}.`}
            control={form.control as never}
            register={form.register as never}
            errors={errors.lines?.[i]}
            options={options}
            withMedia
            onUploadBusy={uploads.report(f.id)}
          />
        </fieldset>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => append(emptyLine())}>
          <Plus aria-hidden /> {t("addLine")}
        </Button>
        <SubmitButton pending={pending} disabled={uploads.busy}>{uploads.busy ? tm("waitForUploads") : t("submitPlan")}</SubmitButton>
      </div>
    </form>
  );
}

function UrgentForm({ options }: { options: LineOptions }) {
  const t = useTranslations("portal");
  const router = useRouter();
  const tm = useTranslations("media");
  const uploads = useUploadsBusy();
  const warn = useFilesWarning();
  const { form, onSubmit, pending } = useActionForm<UrgentInput, { id: string; failedFiles: number }>({
    schema: urgentSchema,
    action: submitUrgentRequest,
    defaultValues: { ...emptyLine(), priority: "urgent", urgent_reason: "" } as UrgentInput,
    successMessage: t("urgentSubmitted"),
    onSuccess: (data) => {
      warn(data.failedFiles);
      router.push(`/portal/requests/${data.id}`);
    },
  });
  const errors = form.formState.errors;
  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <p className="text-muted-foreground text-sm">{t("urgentIntro")}</p>
      <div className="bg-card space-y-4 rounded-xl border p-4">
        <LineFields prefix="" control={form.control as never} register={form.register as never} errors={errors} options={options} withMedia onUploadBusy={uploads.report("urgent")} />
        <FormField id="urgent_reason" label={t("urgentReason")} error={errors.urgent_reason?.message}>
          <Textarea id="urgent_reason" rows={3} {...form.register("urgent_reason")} />
        </FormField>
      </div>
      <SubmitButton pending={pending} disabled={uploads.busy}>{uploads.busy ? tm("waitForUploads") : t("submitUrgent")}</SubmitButton>
    </form>
  );
}

export function NewRequestForm(props: { options: LineOptions; forMonth: string; monthLabel: string; deadlineDay: number; isLate: boolean }) {
  const t = useTranslations("portal");
  return (
    <Tabs defaultValue="strategic">
      <TabsList>
        <TabsTrigger value="strategic">{t("strategic")}</TabsTrigger>
        <TabsTrigger value="urgent">{t("urgent")}</TabsTrigger>
      </TabsList>
      <TabsContent value="strategic" className="mt-4">
        <StrategicForm {...props} />
      </TabsContent>
      <TabsContent value="urgent" className="mt-4">
        <UrgentForm options={props.options} />
      </TabsContent>
    </Tabs>
  );
}
