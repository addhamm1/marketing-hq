"use client";

import { ListChecks, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Controller } from "react-hook-form";
import type { z } from "zod";
import { FormField } from "@/components/form/form-field";
import { SubmitButton } from "@/components/form/submit-button";
import { useActionForm } from "@/components/form/use-action-form";
import { usePeople } from "@/components/people-context";
import { EmptyState } from "@/components/states/states";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "@/i18n/navigation";
import { ActionItemRow } from "./action-item-row";
import { addActionItem } from "./item-actions";
import { actionItemSchema, type ActionItemInput } from "./schemas";
import type { ActionItem } from "./types";

const NONE = "none";

type Props = { meetingId: string; items: ActionItem[]; canContribute: boolean; canMakeCards: boolean; showCardLink: boolean };

function AddActionItem({ meetingId }: { meetingId: string }) {
  const t = useTranslations("meetings.items");
  const router = useRouter();
  const { people } = usePeople();
  const blank: ActionItemInput = { meeting_id: meetingId, title: "", assignee_id: "", due_on: "" };
  const { form, onSubmit, pending } = useActionForm<ActionItemInput, undefined, z.output<typeof actionItemSchema>>({
    schema: actionItemSchema,
    action: addActionItem,
    defaultValues: blank,
    onSuccess: () => {
      form.reset(blank);
      router.refresh();
    },
  });
  const { control, register, formState: { errors } } = form;

  return (
    <form onSubmit={onSubmit} noValidate className="bg-muted/40 grid gap-2 rounded-lg p-3 sm:grid-cols-[minmax(0,1fr)_10rem_9.5rem_auto] sm:items-start">
      <FormField id="item-title" label={t("title")} error={errors.title?.message}>
        <Input id="item-title" dir="auto" maxLength={200} aria-invalid={!!errors.title} {...register("title")} />
      </FormField>
      <FormField id="item-assignee" label={t("assignee")} error={errors.assignee_id?.message}>
        <Controller control={control} name="assignee_id" render={({ field }) => (
          <Select value={field.value || NONE} onValueChange={(v) => field.onChange(v === NONE ? "" : v)}>
            <SelectTrigger id="item-assignee" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>{t("unassigned")}</SelectItem>
              {people.map((p) => <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>)}
            </SelectContent>
          </Select>
        )} />
      </FormField>
      <FormField id="item-due" label={t("due")} error={errors.due_on?.message}>
        <Input id="item-due" type="date" dir="ltr" {...register("due_on")} />
      </FormField>
      <SubmitButton pending={pending} className="sm:mt-6"><Plus aria-hidden />{t("add")}</SubmitButton>
    </form>
  );
}

/** What was agreed: owners, dates, and a way to turn each into a card. */
export function ActionItems({ meetingId, items, canContribute, canMakeCards, showCardLink }: Props) {
  const t = useTranslations("meetings.items");
  return (
    <div className="space-y-3">
      {items.length ? (
        <ul className="divide-y">
          {items.map((item) => (
            <li key={item.id} className="py-3 first:pt-0 last:pb-0">
              <ActionItemRow item={item} canContribute={canContribute} canMakeCards={canMakeCards} showCardLink={showCardLink} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState className="py-6" icon={<ListChecks className="size-6" aria-hidden />} title={t("empty")} body={canContribute ? t("emptyBody") : undefined} />
      )}
      {canContribute ? <AddActionItem meetingId={meetingId} /> : null}
    </div>
  );
}
