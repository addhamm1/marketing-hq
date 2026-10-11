"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Controller } from "react-hook-form";
import { FormField } from "@/components/form/form-field";
import { SubmitButton } from "@/components/form/submit-button";
import { useActionForm } from "@/components/form/use-action-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "@/i18n/navigation";
import { createBoard } from "./board-actions";
import { createBoardSchema } from "./schemas";
import type { z } from "zod";

type Values = z.input<typeof createBoardSchema>;

export function NewBoardButton({ workspaces }: { workspaces: { id: string; name: string }[] }) {
  const t = useTranslations("boards");
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { form, onSubmit, pending } = useActionForm<Values, { id: string }>({
    schema: createBoardSchema,
    action: createBoard,
    defaultValues: { name: "", workspace_id: workspaces[1]?.id ?? workspaces[0]?.id, visibility: "marketing" },
    successMessage: t("boardCreated"),
    onSuccess: (data) => {
      setOpen(false);
      router.push(`/boards/${data.id}`);
    },
  });
  const { errors } = form.formState;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        <Plus aria-hidden /> {t("newBoard")}
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("newBoard")}</DialogTitle>
        </DialogHeader>
        <form id="new-board" onSubmit={onSubmit} className="space-y-4" noValidate>
          <FormField id="name" label={t("boardName")} error={errors.name?.message}>
            <Input id="name" autoFocus {...form.register("name")} />
          </FormField>
          <FormField id="workspace_id" label={t("workspace")} error={errors.workspace_id?.message}>
            <Controller
              control={form.control}
              name="workspace_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="workspace_id" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {workspaces.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField id="visibility" label={t("visibility")}>
            <Controller
              control={form.control}
              name="visibility"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="visibility" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="marketing">{t("visibilityMarketing")}</SelectItem>
                    <SelectItem value="private">{t("visibilityPrivate")}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
        </form>
        <DialogFooter>
          <SubmitButton form="new-board" pending={pending}>
            {t("newBoard")}
          </SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
