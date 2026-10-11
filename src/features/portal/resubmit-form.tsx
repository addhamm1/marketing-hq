"use client";

import { useTranslations } from "next-intl";
import { SubmitButton } from "@/components/form/submit-button";
import { useActionForm } from "@/components/form/use-action-form";
import type { CardDetail } from "@/features/boards/card-sheet/detail-query";
import { toCairoInput } from "@/lib/dates";
import { resubmitRequest } from "./actions";
import { LineFields, type LineOptions } from "./line-fields";
import { resubmitSchema } from "./schemas";
import type { z } from "zod";

type Values = z.input<typeof resubmitSchema>;

export function ResubmitForm({ card, options, onDone }: { card: CardDetail; options: LineOptions; onDone: () => void }) {
  const t = useTranslations("portal");
  const links = Array.isArray(card.reference_links) ? (card.reference_links as string[]) : [];
  const { form, onSubmit, pending } = useActionForm<Values>({
    schema: resubmitSchema,
    action: resubmitRequest,
    defaultValues: {
      card_id: card.id,
      title: card.title,
      description: card.description,
      objective: card.objective ?? "",
      key_message: card.key_message ?? "",
      vertical: card.vertical ?? "",
      brand_id: card.brand_id ?? "",
      format: card.format ?? "",
      platforms: card.platforms,
      due_at: toCairoInput(card.due_at),
      priority: card.priority,
      reference_links: links.join("\n"),
      budget_note: card.budget_note ?? "",
    },
    successMessage: t("resubmitted"),
    onSuccess: onDone,
  });
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <h3 className="text-sm font-semibold">{t("resubmit")}</h3>
      <LineFields prefix="" control={form.control as never} register={form.register as never} errors={form.formState.errors} options={options} />
      <SubmitButton pending={pending}>{t("resubmit")}</SubmitButton>
    </form>
  );
}
