"use client";

import { Info, Layers, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/states/states";
import { Button } from "@/components/ui/button";
import { useMessage } from "@/hooks/use-message";
import { deleteGateTemplate } from "../rhythm-actions";
import type { GateTemplate, GateTrack } from "../types";
import { localName } from "../use-item-text";
import { TemplateDialog } from "./template-dialog";
import { TrackDialog } from "./track-dialog";
import { TrackSection } from "./track-section";

type TemplateTarget = { template: GateTemplate | null; trackId: string };

export function RhythmView({ tracks, templates }: { tracks: GateTrack[]; templates: GateTemplate[] }) {
  const t = useTranslations("gates.rhythm");
  const tc = useTranslations("common");
  const locale = useLocale();
  const message = useMessage();
  const [editingTrack, setEditingTrack] = useState<GateTrack | "new" | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<TemplateTarget | null>(null);
  const [deleting, setDeleting] = useState<GateTemplate | null>(null);
  const [, startTransition] = useTransition();

  const confirmDelete = () => {
    if (!deleting) return;
    const id = deleting.id;
    startTransition(async () => {
      const result = await deleteGateTemplate(id);
      if (result.ok) toast.success(t("templateDeleted"));
      else toast.error(message(result.error));
    });
  };
  const nextOrder = (trackId: string) =>
    Math.max(0, ...templates.filter((x) => x.track_id === trackId).map((x) => x.position)) + 1;

  return (
    <div className="min-w-0 space-y-6">
      <div className="bg-accent/60 flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm">
        <Info className="text-primary-ink mt-0.5 size-4 shrink-0" aria-hidden />
        <p className="max-w-[70ch]">{t("explain")}</p>
      </div>

      {tracks.length ? (
        tracks.map((track) => (
          <TrackSection
            key={track.id}
            track={track}
            templates={templates.filter((x) => x.track_id === track.id)}
            onEditTrack={() => setEditingTrack(track)}
            onAddTemplate={() => setEditingTemplate({ template: null, trackId: track.id })}
            onEditTemplate={(template) => setEditingTemplate({ template, trackId: track.id })}
            onDeleteTemplate={setDeleting}
          />
        ))
      ) : (
        <EmptyState icon={<Layers className="size-8" aria-hidden />} title={t("emptyTitle")} body={t("emptyBody")} />
      )}

      <Button variant="outline" onClick={() => setEditingTrack("new")}><Plus aria-hidden />{t("addTrack")}</Button>

      {editingTrack ? (
        <TrackDialog
          track={editingTrack === "new" ? null : editingTrack}
          nextPosition={Math.max(0, ...tracks.map((x) => x.position)) + 1}
          onClose={() => setEditingTrack(null)}
        />
      ) : null}
      {editingTemplate ? (
        <TemplateDialog
          template={editingTemplate.template}
          trackId={editingTemplate.trackId}
          tracks={tracks}
          nextPosition={nextOrder(editingTemplate.trackId)}
          onClose={() => setEditingTemplate(null)}
        />
      ) : null}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("deleteTitle", { name: deleting ? localName(deleting, locale) : "" })}
        body={t("deleteBody")}
        confirmLabel={tc("delete")}
        destructive
        onConfirm={confirmDelete}
      />
    </div>
  );
}
