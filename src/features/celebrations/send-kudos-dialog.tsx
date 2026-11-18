"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Controller, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { FormField } from "@/components/form/form-field";
import { SubmitButton } from "@/components/form/submit-button";
import { useActionForm } from "@/components/form/use-action-form";
import { usePeople } from "@/components/people-context";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { sendKudos } from "./actions";
import { BADGE_ICONS } from "./badge-icons";
import { KUDOS_QUERY } from "./kudos-client";
import { PersonPicker } from "./person-picker";
import { KUDOS_BADGES, KUDOS_MAX, type KudosInput, type KudosOutput, kudosSchema } from "./schemas";

export function SendKudosDialog({ viewerId, toId, onClose }: { viewerId: string; toId?: string; onClose: () => void }) {
  const t = useTranslations("celebrations");
  const { byId } = usePeople();
  const queryClient = useQueryClient();
  const { form, onSubmit, pending } = useActionForm<KudosInput, undefined, KudosOutput>({
    schema: kudosSchema,
    action: sendKudos,
    defaultValues: { to_id: toId ?? "", badge: "teamwork", message: "" },
    onSuccess: (_data, values) => {
      toast.success(t("dialog.sent", { name: byId.get(values.to_id)?.display_name ?? "" }));
      void queryClient.invalidateQueries({ queryKey: KUDOS_QUERY });
      onClose();
    },
  });
  const { errors } = form.formState;
  const length = useWatch({ control: form.control, name: "message" })?.trim().length ?? 0;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("dialog.title")}</DialogTitle>
          <DialogDescription>{t("dialog.description")}</DialogDescription>
        </DialogHeader>
        <form id="kudos-form" onSubmit={onSubmit} className="grid min-w-0 gap-4" noValidate>
          <FormField id="to_id" label={t("dialog.person")} error={errors.to_id?.message}>
            <Controller
              control={form.control}
              name="to_id"
              render={({ field }) => (
                <PersonPicker id="to_id" value={field.value} excludeId={viewerId} invalid={!!errors.to_id} onChange={field.onChange} />
              )}
            />
          </FormField>
          <FormField id="badge" label={t("dialog.badge")} error={errors.badge?.message}>
            <Controller
              control={form.control}
              name="badge"
              render={({ field }) => (
                <RadioGroup id="badge" value={field.value} onValueChange={field.onChange} className="grid-cols-1 sm:grid-cols-2">
                  {KUDOS_BADGES.map((badge) => {
                    const Icon = BADGE_ICONS[badge];
                    return (
                      <Label
                        key={badge}
                        htmlFor={`badge-${badge}`}
                        className={cn(
                          "flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-normal",
                          field.value === badge && "border-primary bg-accent",
                        )}
                      >
                        <RadioGroupItem id={`badge-${badge}`} value={badge} />
                        <Icon className="size-4 shrink-0" aria-hidden />
                        {t(`badges.${badge}`)}
                      </Label>
                    );
                  })}
                </RadioGroup>
              )}
            />
          </FormField>
          <FormField id="message" label={t("dialog.message")} error={errors.message?.message}>
            <Textarea
              id="message"
              rows={3}
              dir="auto"
              placeholder={t("dialog.messagePlaceholder")}
              aria-invalid={!!errors.message}
              aria-describedby="message-count"
              {...form.register("message")}
            />
            <p id="message-count" className={cn("text-muted-foreground text-end text-xs", length > KUDOS_MAX && "text-destructive")}>
              {t("dialog.counter", { count: length, max: KUDOS_MAX })}
            </p>
          </FormField>
        </form>
        <DialogFooter>
          <SubmitButton form="kudos-form" pending={pending} pendingLabel={t("dialog.sending")}>
            {t("dialog.send")}
          </SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
