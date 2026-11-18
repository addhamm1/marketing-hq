"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePersonName } from "@/components/people-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { weekdayName } from "../format";
import { WORK_WEEKDAYS, type GateTemplate, type GateTrack } from "../types";
import { localName } from "../use-item-text";

function TemplateRow({ template, onEdit, onDelete }: { template: GateTemplate; onEdit: () => void; onDelete: () => void }) {
  const t = useTranslations("gates");
  const locale = useLocale();
  const owner = usePersonName();
  const name = localName(template, locale);
  const days = template.start_day === template.end_day
    ? t("rhythm.dayOne", { day: template.start_day })
    : t("rhythm.dayRange", { start: template.start_day, end: template.end_day });
  const weekdays = WORK_WEEKDAYS.filter((d) => template.weekdays.includes(d)).map((d) => weekdayName(d, locale)).join(locale === "ar" ? "، " : ", ");
  const when = template.kind === "recurring" ? `${weekdays} · ${days}` : days;

  return (
    <li data-testid="gate-template" className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 sm:flex-nowrap">
      <span className="text-muted-foreground w-6 shrink-0 text-xs tabular-nums" title={t("rhythm.fields.order")}>{template.position}</span>
      <div className="min-w-0 flex-1 basis-40">
        <p className="text-sm leading-snug font-medium">{name}</p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {t(`kind.${template.kind}`)} · {when}{template.owner_id ? ` · ${owner(template.owner_id)}` : ""}
        </p>
      </div>
      {!template.is_active ? <Badge variant="outline">{t("rhythm.inactive")}</Badge> : null}
      <div className="ms-auto flex shrink-0 items-center">
        <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label={t("rhythm.editTemplate", { name })}><Pencil aria-hidden /></Button>
        <Button variant="ghost" size="icon-sm" onClick={onDelete} aria-label={t("rhythm.deleteTemplate", { name })}><Trash2 aria-hidden /></Button>
      </div>
    </li>
  );
}

export function TrackSection({ track, templates, onEditTrack, onAddTemplate, onEditTemplate, onDeleteTemplate }: {
  track: GateTrack;
  templates: GateTemplate[];
  onEditTrack: () => void;
  onAddTemplate: () => void;
  onEditTemplate: (template: GateTemplate) => void;
  onDeleteTemplate: (template: GateTemplate) => void;
}) {
  const t = useTranslations("gates.rhythm");
  const locale = useLocale();
  const name = localName(track, locale);
  const subtitle = locale === "ar" ? track.subtitle_ar : track.subtitle_en;
  return (
    <section aria-labelledby={`rhythm-${track.id}`}>
      <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <h2 id={`rhythm-${track.id}`} className="text-sm font-semibold">{name}</h2>
        {subtitle ? <p className="text-muted-foreground text-xs">{subtitle}</p> : null}
        {!track.is_active ? <Badge variant="outline">{t("inactive")}</Badge> : null}
        <div className="ms-auto flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onEditTrack} aria-label={t("editTrackNamed", { name })}><Pencil aria-hidden />{t("editTrack")}</Button>
          <Button variant="outline" size="sm" onClick={onAddTemplate} aria-label={t("addTemplateTo", { name })}><Plus aria-hidden />{t("addTemplate")}</Button>
        </div>
      </div>
      {templates.length ? (
        <ul className="bg-card divide-y rounded-xl border">
          {templates.map((template) => (
            <TemplateRow key={template.id} template={template} onEdit={() => onEditTemplate(template)} onDelete={() => onDeleteTemplate(template)} />
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-6 text-center text-sm">{t("trackEmpty")}</p>
      )}
    </section>
  );
}
