"use client";

import { useTranslations } from "next-intl";
import { Controller } from "react-hook-form";
import { z } from "zod";
import { FormField } from "@/components/form/form-field";
import { SubmitButton } from "@/components/form/submit-button";
import { useActionForm } from "@/components/form/use-action-form";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "@/i18n/navigation";
import { shotAddSchema } from "./schemas";
import { addShot, updateShot } from "./shot-actions";

const SHOT_TYPES = ["wide", "medium", "closeUp", "detail", "interview", "broll", "drone", "pov"] as const;

const schema = shotAddSchema.omit({ shoot_id: true });
type Input_ = z.input<typeof schema>;
type Output = z.output<typeof schema>;

export type ShotValues = { id?: string; description: string; shot_type: string; notes: string; card_id: string | null };

/** Add or edit one shot. A shot can point at a card linked to the shoot. */
export function ShotDialog({ shootId, shot, cards, onClose }: {
  shootId: string;
  shot: ShotValues | null;
  cards: { id: string; title: string }[];
  onClose: () => void;
}) {
  const t = useTranslations("shoots.shots");
  const tc = useTranslations("common");
  const router = useRouter();
  const { form, onSubmit, pending } = useActionForm<Input_, undefined, Output>({
    schema,
    action: (v) => (shot?.id ? updateShot({ ...v, id: shot.id, shoot_id: shootId }) : addShot({ ...v, shoot_id: shootId })),
    defaultValues: { description: shot?.description ?? "", shot_type: shot?.shot_type ?? "", notes: shot?.notes ?? "", card_id: shot?.card_id ?? null },
    successMessage: tc("saved"),
    onSuccess: () => {
      router.refresh();
      onClose();
    },
  });
  const { errors } = form.formState;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>{shot?.id ? t("editTitle") : t("addTitle")}</DialogTitle></DialogHeader>
        <form id="shot-form" onSubmit={onSubmit} noValidate className="space-y-4">
          <FormField id="shot-description" label={t("description")} error={errors.description?.message}>
            <Textarea id="shot-description" rows={2} maxLength={500} {...form.register("description")} />
          </FormField>
          <FormField id="shot-type" label={t("type")} error={errors.shot_type?.message}>
            <Input id="shot-type" list="shot-types" maxLength={60} {...form.register("shot_type")} />
            <datalist id="shot-types">{SHOT_TYPES.map((s) => <option key={s} value={t(`types.${s}`)} />)}</datalist>
          </FormField>
          <FormField id="shot-card" label={t("linkedCard")} description={cards.length ? undefined : t("noLinkedCards")}>
            <Controller control={form.control} name="card_id" render={({ field }) => (
              <Select value={field.value ?? "none"} onValueChange={field.onChange} disabled={!cards.length}>
                <SelectTrigger id="shot-card" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{tc("none")}</SelectItem>
                  {cards.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                </SelectContent>
              </Select>
            )} />
          </FormField>
          <FormField id="shot-notes" label={tc("notes")} error={errors.notes?.message}>
            <Textarea id="shot-notes" rows={2} maxLength={1000} {...form.register("notes")} />
          </FormField>
        </form>
        <DialogFooter><SubmitButton form="shot-form" pending={pending}>{tc("save")}</SubmitButton></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
