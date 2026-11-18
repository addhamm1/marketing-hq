"use client";

import { DoorOpen, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Controller } from "react-hook-form";
import { FormField } from "@/components/form/form-field";
import { SubmitButton } from "@/components/form/submit-button";
import { useActionForm } from "@/components/form/use-action-form";
import { EmptyState } from "@/components/states/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useRouter } from "@/i18n/navigation";
import { saveRoom } from "./org-actions";
import { roomSchema, type RoomInput } from "./schemas";
import type { z } from "zod";

type Branch = { id: string; name_en: string; name_ar: string };
export type Room = { id: string; branch_id: string | null; name_en: string; name_ar: string; capacity: number; is_active: boolean };

function RoomDialog({ room, branches, onClose }: { room: Room | null; branches: Branch[]; onClose: () => void }) {
  const t = useTranslations("launch.rooms");
  const ta = useTranslations("admin");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const { form, onSubmit, pending } = useActionForm<RoomInput, undefined, z.output<typeof roomSchema>>({
    schema: roomSchema,
    action: (v) => saveRoom({ ...v, id: room?.id }),
    defaultValues: {
      branch_id: room?.branch_id ?? branches[0]?.id ?? "",
      name_en: room?.name_en ?? "",
      name_ar: room?.name_ar ?? "",
      capacity: room?.capacity ?? 6,
      is_active: room?.is_active ?? true,
    },
    successMessage: tc("saved"),
    onSuccess: () => {
      router.refresh();
      onClose();
    },
  });
  const { errors } = form.formState;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{room ? t("editTitle") : t("addTitle")}</DialogTitle></DialogHeader>
        <form id="room-form" onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
          <FormField id="room-branch" label={t("branch")} error={errors.branch_id?.message} className="sm:col-span-2">
            <Controller control={form.control} name="branch_id" render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="room-branch" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{locale === "ar" ? b.name_ar : b.name_en}</SelectItem>)}</SelectContent>
              </Select>
            )} />
          </FormField>
          <FormField id="room-en" label={ta("nameEn")} error={errors.name_en?.message}><Input id="room-en" dir="ltr" maxLength={80} {...form.register("name_en")} /></FormField>
          <FormField id="room-ar" label={ta("nameAr")} error={errors.name_ar?.message}><Input id="room-ar" dir="rtl" maxLength={80} {...form.register("name_ar")} /></FormField>
          <FormField id="room-capacity" label={t("capacity")} error={errors.capacity?.message}><Input id="room-capacity" type="number" min={1} max={500} dir="ltr" {...form.register("capacity")} /></FormField>
          <Controller control={form.control} name="is_active" render={({ field }) => (
            <Label className="flex items-center gap-2 self-end pb-2 font-normal"><Switch checked={field.value} onCheckedChange={field.onChange} /> {ta("active")}</Label>
          )} />
        </form>
        <DialogFooter><SubmitButton form="room-form" pending={pending}>{tc("save")}</SubmitButton></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RoomsEditor({ rooms, branches }: { rooms: Room[]; branches: Branch[] }) {
  const t = useTranslations("launch.rooms");
  const ta = useTranslations("admin");
  const locale = useLocale();
  const [editing, setEditing] = useState<Room | null>(null);
  const [adding, setAdding] = useState(false);
  const label = (o: { name_en: string; name_ar: string }) => (locale === "ar" ? o.name_ar : o.name_en);
  const branchName = (id: string | null) => {
    const b = branches.find((x) => x.id === id);
    return b ? label(b) : t("noBranch");
  };
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">{t("intro")}</p>
        <Button size="sm" onClick={() => setAdding(true)} disabled={!branches.length}><Plus aria-hidden /> {t("add")}</Button>
      </div>
      {rooms.length ? (
        <ul className="bg-card divide-y rounded-xl border">
          {rooms.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => setEditing(r)} className="hover:bg-muted/40 flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-start">
                <span className="min-w-0 flex-1 basis-40">
                  <span className="block font-medium">{label(r)}</span>
                  <span className="text-muted-foreground block text-xs">{branchName(r.branch_id)} · {t("seats", { count: r.capacity })}</span>
                </span>
                <Badge variant={r.is_active ? "secondary" : "outline"}>{r.is_active ? ta("active") : ta("statusInactive")}</Badge>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title={t("empty")} body={t("emptyHint")} icon={<DoorOpen className="size-8" aria-hidden />} />
      )}
      {adding || editing ? <RoomDialog room={editing} branches={branches} onClose={() => { setAdding(false); setEditing(null); }} /> : null}
    </div>
  );
}
