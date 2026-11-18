"use client";

import { CircleCheck, CircleDashed, Trash2, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { usePersonName } from "@/components/people-context";
import { EmptyState } from "@/components/states/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CrewAddForm } from "./crew-add-form";
import { removeCrew, updateCrew } from "./crew-actions";
import { shortTime } from "./helpers";
import type { ShootPage } from "./queries";
import { useShootAction } from "./use-shoot-action";

type Crew = ShootPage["crew"][number];

function CrewRow({ crew, shootId, canEdit, shootCall }: { crew: Crew; shootId: string; canEdit: boolean; shootCall: string }) {
  const t = useTranslations("shoots.crew");
  const tc = useTranslations("common");
  const name = usePersonName();
  const { pending, run } = useShootAction();
  const [role, setRole] = useState(crew.role);
  const [time, setTime] = useState(shortTime(crew.call_time));
  const label = crew.user_id ? name(crew.user_id) : crew.external_name;

  const save = (patch: Partial<{ role: string; call_time: string; confirmed: boolean }> = {}) =>
    run(() => updateCrew({ id: crew.id, shoot_id: shootId, role, call_time: time, confirmed: crew.confirmed, ...patch }));
  const blurSave = () => {
    if (role.trim() !== crew.role || time !== shortTime(crew.call_time)) save();
  };

  const heading = (
    <div className="min-w-0">
      <span className="font-medium break-words">{label}</span>
      {crew.user_id ? null : <Badge variant="outline" className="ms-2">{t("outside")}</Badge>}
    </div>
  );

  if (!canEdit) {
    return (
      <li className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
        <div className="min-w-0 flex-1">{heading}<p className="text-muted-foreground text-sm">{crew.role || t("noRole")}</p></div>
        <span className="text-sm" dir="ltr">{shortTime(crew.call_time) || shootCall}</span>
        <span className="text-muted-foreground flex items-center gap-1 text-sm">
          {crew.confirmed ? <CircleCheck className="text-success size-4" aria-hidden /> : <CircleDashed className="size-4" aria-hidden />}
          {crew.confirmed ? t("confirmed") : t("notConfirmed")}
        </span>
      </li>
    );
  }

  return (
    <li className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,11rem)_7rem_auto_auto] sm:items-center">
      {heading}
      <Input aria-label={`${t("role")}: ${label}`} maxLength={80} placeholder={t("rolePlaceholder")} value={role} onChange={(e) => setRole(e.target.value)} onBlur={blurSave} />
      <Input aria-label={`${t("callTime")}: ${label}`} type="time" dir="ltr" value={time} onChange={(e) => setTime(e.target.value)} onBlur={blurSave} />
      <div className="flex items-center justify-between gap-3">
        <Label className="flex items-center gap-2 font-normal">
          <Checkbox checked={crew.confirmed} disabled={pending} onCheckedChange={(c) => save({ confirmed: c === true })} />
          {t("confirmed")}
        </Label>
        <Button variant="ghost" size="icon-sm" disabled={pending} aria-label={`${tc("remove")}: ${label}`} className="sm:hidden"
          onClick={() => run(() => removeCrew({ id: crew.id, shoot_id: shootId }))}>
          <Trash2 aria-hidden />
        </Button>
      </div>
      <Button variant="ghost" size="icon-sm" disabled={pending} aria-label={`${tc("remove")}: ${label}`} className="hidden sm:inline-flex"
        onClick={() => run(() => removeCrew({ id: crew.id, shoot_id: shootId }))}>
        <Trash2 aria-hidden />
      </Button>
    </li>
  );
}

export function CrewSection({ shootId, crew, canEdit, shootCall }: { shootId: string; crew: Crew[]; canEdit: boolean; shootCall: string }) {
  const t = useTranslations("shoots.crew");
  const taken = crew.flatMap((c) => (c.user_id ? [c.user_id] : []));
  return (
    <section className="space-y-3">
      {canEdit ? <CrewAddForm shootId={shootId} taken={taken} /> : null}
      {crew.length ? (
        <ul className="bg-card divide-y rounded-xl border">
          {crew.map((c) => <CrewRow key={c.id} crew={c} shootId={shootId} canEdit={canEdit} shootCall={shootCall} />)}
        </ul>
      ) : (
        <EmptyState title={t("empty")} body={canEdit ? t("emptyHint") : undefined} icon={<Users className="size-8" aria-hidden />} />
      )}
    </section>
  );
}
