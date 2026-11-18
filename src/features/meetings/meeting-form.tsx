"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { usePathname, useRouter } from "@/i18n/navigation";
import { saveMeeting } from "./actions";
import { AttendeePicker } from "./attendee-picker";
import { meetingsBase } from "./display";
import { GuestFields } from "./guest-fields";
import { RoomPicker } from "./room-picker";
import { meetingSchema, type MeetingInput } from "./schemas";
import { nextSlot, rangeToForm } from "./time";
import type { FormOptions, MeetingDetail, SaveMeetingResult } from "./types";
import { useBusy } from "./use-busy";

const DURATIONS = [15, 30, 45, 60, 90, 120, 180, 240];

type Props = { options: FormOptions; meeting?: MeetingDetail; withId: string | null; onDone: () => void };

function initialValues(meeting: MeetingDetail | undefined, withId: string | null, me: string): MeetingInput {
  if (!meeting) {
    return {
      id: null, title: "", agenda: "", ...nextSlot(), duration: 30, room_id: "", location_text: "", online_url: "",
      is_private: false, attendee_ids: withId && withId !== me ? [withId] : [], guests: [],
    };
  }
  return {
    id: meeting.id, title: meeting.title, agenda: meeting.agenda, ...rangeToForm(meeting.starts_at, meeting.ends_at),
    room_id: meeting.room_id ?? "", location_text: meeting.location_text ?? "", online_url: meeting.online_url ?? "",
    is_private: meeting.is_private,
    attendee_ids: meeting.meeting_attendees.map((a) => a.user_id).filter((id) => id !== meeting.organizer_id),
    guests: meeting.guests.map((g) => ({ name: g.name, email: g.email })),
  };
}

export function MeetingForm({ options, meeting, withId, onDone }: Props) {
  const t = useTranslations("meetings.form");
  const tc = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const { people } = usePeople();
  const [defaults] = useState(() => initialValues(meeting, withId, options.me));

  function saved(result: SaveMeetingResult) {
    toast.success(meeting ? t("saved") : t("created"));
    if (result.invited) toast.success(t("guestsInvited", { count: result.invited }));
    if (result.failed) toast.warning(t("guestsFailed", { count: result.failed }));
    onDone();
    if (meeting) router.refresh();
    else router.push(`${meetingsBase(pathname.startsWith("/portal") ? "portal" : "team")}/${result.id}`);
  }

  const { form, onSubmit, pending } = useActionForm<MeetingInput, SaveMeetingResult, z.output<typeof meetingSchema>>({
    schema: meetingSchema,
    action: saveMeeting,
    defaultValues: defaults,
    onSuccess: saved,
  });
  const { control, register, formState: { errors } } = form;
  const [date, time, duration, roomId] = useWatch({ control, name: ["date", "time", "duration", "room_id"] });

  const allIds = useMemo(() => people.map((p) => p.id), [people]);
  const own = useMemo(
    () => (meeting ? { starts_at: meeting.starts_at, ends_at: meeting.ends_at, room_id: meeting.room_id, attendee_ids: meeting.meeting_attendees.map((a) => a.user_id) } : null),
    [meeting],
  );
  const busy = useBusy(date, time, duration, allIds, own);
  const durations = DURATIONS.includes(defaults.duration) ? DURATIONS : [...DURATIONS, defaults.duration].sort((a, b) => a - b);
  const roomTaken = !!roomId && busy.rooms.has(roomId);

  return (
    <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <FormField id="m-title" label={t("title")} error={errors.title?.message}>
          <Input id="m-title" dir="auto" maxLength={120} aria-invalid={!!errors.title} {...register("title")} />
        </FormField>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <FormField id="m-date" label={t("date")} error={errors.date?.message} className="col-span-2 sm:col-span-1">
            <Input id="m-date" type="date" dir="ltr" aria-invalid={!!errors.date} {...register("date")} />
          </FormField>
          <FormField id="m-time" label={t("start")} error={errors.time?.message}>
            <Input id="m-time" type="time" dir="ltr" step={300} aria-invalid={!!errors.time} {...register("time")} />
          </FormField>
          <FormField id="m-duration" label={t("duration")} error={errors.duration?.message}>
            <Controller control={control} name="duration" render={({ field }) => (
              <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                <SelectTrigger id="m-duration" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {durations.map((d) => <SelectItem key={d} value={String(d)}>{t("minutes", { count: d })}</SelectItem>)}
                </SelectContent>
              </Select>
            )} />
          </FormField>
        </div>

        <FormField
          id="m-room"
          label={t("room")}
          error={errors.room_id?.message ?? (roomTaken ? "meetings.errors.room_taken" : undefined)}
          description={busy.failed ? t("busyFailed") : busy.checking ? t("busyChecking") : t("roomHint")}
        >
          <Controller control={control} name="room_id" render={({ field }) => (
            <RoomPicker id="m-room" rooms={options.rooms} value={field.value} onChange={field.onChange} busy={busy.rooms} invalid={!!errors.room_id || roomTaken} />
          )} />
        </FormField>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField id="m-location" label={t("location")} error={errors.location_text?.message}>
            <Input id="m-location" dir="auto" maxLength={160} placeholder={t("locationPlaceholder")} {...register("location_text")} />
          </FormField>
          <FormField id="m-online" label={t("online")} error={errors.online_url?.message}>
            <Input id="m-online" type="url" dir="ltr" placeholder="https://" aria-invalid={!!errors.online_url} {...register("online_url")} />
          </FormField>
        </div>

        <FormField id="m-attendees" label={t("attendees")} error={errors.attendee_ids?.message}>
          <Controller control={control} name="attendee_ids" render={({ field }) => (
            <AttendeePicker
              id="m-attendees"
              value={field.value}
              onChange={field.onChange}
              busy={busy.people}
              marketingDepartments={options.marketingDepartments}
              exclude={meeting?.organizer_id ?? options.me}
            />
          )} />
        </FormField>

        <GuestFields control={control} register={register} errors={errors} />

        <FormField id="m-agenda" label={t("agenda")} error={errors.agenda?.message}>
          <Textarea id="m-agenda" dir="auto" rows={4} maxLength={4000} {...register("agenda")} />
        </FormField>

        <Controller control={control} name="is_private" render={({ field }) => (
          <label htmlFor="m-private" className="flex items-start justify-between gap-3 rounded-lg border p-3">
            <span>
              <span className="block text-sm font-medium">{t("private")}</span>
              <span className="text-muted-foreground block text-xs">{t("privateHint")}</span>
            </span>
            <Switch id="m-private" checked={field.value} onCheckedChange={field.onChange} className="mt-0.5" />
          </label>
        )} />
      </div>
      <div className="flex justify-end gap-2 border-t p-4">
        <Button type="button" variant="outline" onClick={onDone}>{tc("cancel")}</Button>
        <SubmitButton pending={pending}>{meeting ? tc("save") : t("create")}</SubmitButton>
      </div>
    </form>
  );
}
