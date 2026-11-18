"use client";

import { DoorOpen, Plus, Repeat } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { EmptyState } from "@/components/states/states";
import { Button } from "@/components/ui/button";
import { RoomsDialog } from "./rooms-dialog";
import { SeriesRow } from "./series-row";
import { SeriesSheet } from "./series-sheet";
import type { Branch, Cadence, Room, Series } from "./types";

const CADENCES: Cadence[] = ["daily", "weekly", "monthly"];

type Props = { series: Series[]; rooms: Room[]; branches: Branch[]; canManage: boolean; marketingDepartments: string[]; me: string };

export function SeriesList({ series, rooms, branches, canManage, marketingDepartments, me }: Props) {
  const t = useTranslations("meetings.fixed");
  const [editing, setEditing] = useState<Series | null>(null);
  const [creating, setCreating] = useState(false);
  const [roomsOpen, setRoomsOpen] = useState(false);
  const groups = CADENCES.map((cadence) => ({ cadence, rows: series.filter((s) => s.cadence === cadence) })).filter((g) => g.rows.length);

  return (
    <div className="space-y-5">
      {canManage ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setCreating(true)}><Plus aria-hidden />{t("new")}</Button>
          <Button variant="outline" onClick={() => setRoomsOpen(true)}><DoorOpen aria-hidden />{t("manageRooms")}</Button>
        </div>
      ) : null}

      {groups.length ? (
        groups.map((group) => (
          <section key={group.cadence} aria-labelledby={`cadence-${group.cadence}`}>
            <h2 id={`cadence-${group.cadence}`} className="text-muted-foreground mb-2 text-xs font-semibold">{t(`cadence.${group.cadence}`)}</h2>
            <ul className="space-y-2">
              {group.rows.map((s) => (
                <li key={s.id}><SeriesRow series={s} canManage={canManage} onEdit={() => setEditing(s)} /></li>
              ))}
            </ul>
          </section>
        ))
      ) : (
        <EmptyState icon={<Repeat className="size-8" aria-hidden />} title={t("empty")} body={canManage ? t("emptyManager") : t("emptyBody")} />
      )}

      {canManage ? (
        <>
          <SeriesSheet
            open={creating || !!editing}
            onOpenChange={(open) => {
              if (open) return;
              setCreating(false);
              setEditing(null);
            }}
            series={editing}
            rooms={rooms}
            marketingDepartments={marketingDepartments}
            me={me}
          />
          <RoomsDialog open={roomsOpen} onOpenChange={setRoomsOpen} rooms={rooms} branches={branches} />
        </>
      ) : null}
    </div>
  );
}
