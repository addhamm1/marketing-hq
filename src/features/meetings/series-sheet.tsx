"use client";

import { useTranslations } from "next-intl";
import { Controller, useWatch } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { FormField } from "@/components/form/form-field";
import { SubmitButton } from "@/components/form/submit-button";
import { useActionForm } from "@/components/form/use-action-form";
import { usePeople } from "@/components/people-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "@/i18n/navigation";
import { cairoDateString } from "@/lib/dates";
import { AttendeePicker } from "./attendee-picker";
import { RoomPicker } from "./room-picker";
import { seriesSchema, type SeriesInput } from "./schemas";
import { saveSeries } from "./series-actions";
import { MonthDayPicker, WeekdayPicker } from "./series-day-pickers";
import type { Room, Series } from "./types";

const NONE = "none";
const NO_BUSY = new Set<string>();

type Props = { open: boolean; onOpenChange: (open: boolean) => void; series: Series | null; rooms: Room[]; marketingDepartments: string[]; me: string };

function initialValues(s: Series | null, me: string): SeriesInput {
  return {
    id: s?.id ?? null, title: s?.title ?? "", title_ar: s?.title_ar ?? "", agenda: s?.agenda ?? "",
    cadence: s?.cadence ?? "weekly", weekdays: s?.weekdays ?? [], month_days: s?.month_days ?? [],
    start_time: s?.start_time.slice(0, 5) ?? "10:00", duration_minutes: s?.duration_minutes ?? 30,
    room_id: s?.room_id ?? "", online_url: s?.online_url ?? "", owner_id: s?.owner_id ?? me,
    audience: s?.audience ?? "marketing", member_ids: s?.member_ids ?? [],
    starts_on: s?.starts_on ?? cairoDateString(), ends_on: s?.ends_on ?? "",
  };
}

function SeriesForm({ series, rooms, marketingDepartments, me, onDone }: Omit<Props, "open" | "onOpenChange"> & { onDone: () => void }) {
  const t = useTranslations("meetings.fixed");
  const tc = useTranslations("common");
  const tf = useTranslations("meetings.form");
  const router = useRouter();
  const { people } = usePeople();
  const { form, onSubmit, pending } = useActionForm<SeriesInput, { id: string }, z.output<typeof seriesSchema>>({
    schema: seriesSchema,
    action: saveSeries,
    defaultValues: initialValues(series, me),
    onSuccess: () => {
      toast.success(tf("saved"));
      onDone();
      router.refresh();
    },
  });
  const { control, register, formState: { errors } } = form;
  const [cadence, audience] = useWatch({ control, name: ["cadence", "audience"] });

  return (
    <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField id="s-title" label={t("titleEn")} error={errors.title?.message}>
            <Input id="s-title" dir="auto" maxLength={120} aria-invalid={!!errors.title} {...register("title")} />
          </FormField>
          <FormField id="s-title-ar" label={t("titleAr")} error={errors.title_ar?.message}>
            <Input id="s-title-ar" dir="rtl" maxLength={120} {...register("title_ar")} />
          </FormField>
        </div>

        <FormField id="s-cadence" label={t("repeats")} error={errors.cadence?.message}>
          <Controller control={control} name="cadence" render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="s-cadence" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["daily", "weekly", "monthly"] as const).map((c) => <SelectItem key={c} value={c}>{t(`cadence.${c}`)}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
        </FormField>

        {cadence === "weekly" ? (
          <Controller control={control} name="weekdays" render={({ field }) => (
            <WeekdayPicker value={field.value} onChange={field.onChange} error={errors.weekdays?.message} />
          )} />
        ) : null}
        {cadence === "monthly" ? (
          <Controller control={control} name="month_days" render={({ field }) => (
            <MonthDayPicker value={field.value} onChange={field.onChange} error={errors.month_days?.message} />
          )} />
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <FormField id="s-time" label={tf("start")} error={errors.start_time?.message}>
            <Input id="s-time" type="time" dir="ltr" step={300} aria-invalid={!!errors.start_time} {...register("start_time")} />
          </FormField>
          <FormField id="s-duration" label={t("durationMinutes")} error={errors.duration_minutes?.message}>
            <Input id="s-duration" type="number" dir="ltr" min={5} max={480} step={5} aria-invalid={!!errors.duration_minutes} {...register("duration_minutes", { valueAsNumber: true })} />
          </FormField>
          <FormField id="s-starts" label={t("startsOn")} error={errors.starts_on?.message}>
            <Input id="s-starts" type="date" dir="ltr" aria-invalid={!!errors.starts_on} {...register("starts_on")} />
          </FormField>
          <FormField id="s-ends" label={t("endsOn")} error={errors.ends_on?.message}>
            <Input id="s-ends" type="date" dir="ltr" aria-invalid={!!errors.ends_on} {...register("ends_on")} />
          </FormField>
        </div>

        <FormField id="s-room" label={tf("room")} description={t("roomHint")} error={errors.room_id?.message}>
          <Controller control={control} name="room_id" render={({ field }) => (
            <RoomPicker id="s-room" rooms={rooms} value={field.value} onChange={field.onChange} busy={NO_BUSY} showAvailability={false} />
          )} />
        </FormField>

        <FormField id="s-online" label={tf("online")} error={errors.online_url?.message}>
          <Input id="s-online" type="url" dir="ltr" placeholder="https://" aria-invalid={!!errors.online_url} {...register("online_url")} />
        </FormField>

        <FormField id="s-owner" label={t("owner")} error={errors.owner_id?.message}>
          <Controller control={control} name="owner_id" render={({ field }) => (
            <Select value={field.value || NONE} onValueChange={(v) => field.onChange(v === NONE ? "" : v)}>
              <SelectTrigger id="s-owner" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{t("noOwner")}</SelectItem>
                {people.map((p) => <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
        </FormField>

        <FormField id="s-audience" label={t("audience")} error={errors.audience?.message}>
          <Controller control={control} name="audience" render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="s-audience" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="marketing">{t("audienceMarketing")}</SelectItem>
                <SelectItem value="custom">{t("audienceCustom")}</SelectItem>
              </SelectContent>
            </Select>
          )} />
        </FormField>

        {audience === "custom" ? (
          <FormField id="s-members" label={t("members")} error={errors.member_ids?.message}>
            <Controller control={control} name="member_ids" render={({ field }) => (
              <AttendeePicker id="s-members" value={field.value} onChange={field.onChange} busy={NO_BUSY} marketingDepartments={marketingDepartments} />
            )} />
          </FormField>
        ) : null}

        <FormField id="s-agenda" label={tf("agenda")} error={errors.agenda?.message}>
          <Textarea id="s-agenda" dir="auto" rows={3} maxLength={4000} {...register("agenda")} />
        </FormField>
      </div>
      <div className="flex justify-end gap-2 border-t p-4">
        <Button type="button" variant="outline" onClick={onDone}>{tc("cancel")}</Button>
        <SubmitButton pending={pending}>{tc("save")}</SubmitButton>
      </div>
    </form>
  );
}

/** Create or edit a fixed meeting. */
export function SeriesSheet({ open, onOpenChange, series, rooms, marketingDepartments, me }: Props) {
  const t = useTranslations("meetings.fixed");
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl" aria-describedby={undefined}>
        <SheetHeader className="border-b pe-12">
          <SheetTitle>{series ? t("editTitle") : t("newTitle")}</SheetTitle>
        </SheetHeader>
        <SeriesForm key={series?.id ?? "new"} series={series} rooms={rooms} marketingDepartments={marketingDepartments} me={me} onDone={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}
