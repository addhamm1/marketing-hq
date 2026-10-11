"use client";

import { Check, Plus, Tag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMessage } from "@/hooks/use-message";
import { createLabel, setCardLabels } from "../card-actions";
import type { Label } from "../types";
import type { CardDetail } from "./detail-query";

const COLORS = ["#DC2626", "#EA580C", "#CA8A04", "#16A34A", "#0891B2", "#2563EB", "#7C3AED", "#DB2777", "#64748B"];

export function LabelsEditor({ card, labels, boardId, canEdit, onChanged }: { card: CardDetail; labels: Label[]; boardId: string; canEdit: boolean; onChanged: () => void }) {
  const t = useTranslations("card");
  const tc = useTranslations("common");
  const message = useMessage();
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[5]);
  const [, startTransition] = useTransition();
  const selected = labels.filter((l) => card.label_ids.includes(l.id));

  function toggle(id: string) {
    const next = card.label_ids.includes(id) ? card.label_ids.filter((x) => x !== id) : [...card.label_ids, id];
    startTransition(async () => {
      const r = await setCardLabels({ card_id: card.id, label_ids: next });
      if (!r.ok) toast.error(message(r.error));
      onChanged();
    });
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t("labels")}</h3>
        {canEdit ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon-xs" aria-label={t("labels")}><Tag aria-hidden /></Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-60 space-y-2">
              {labels.map((l) => (
                <button key={l.id} type="button" onClick={() => toggle(l.id)} className="hover:bg-muted flex w-full items-center gap-2 rounded px-1.5 py-1 text-sm">
                  <span className="size-3 rounded-full" style={{ backgroundColor: l.color }} />
                  <span className="flex-1 text-start">{l.name}</span>
                  {card.label_ids.includes(l.id) ? <Check className="size-4" aria-hidden /> : null}
                </button>
              ))}
              <div className="space-y-2 border-t pt-2">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("labelName")} aria-label={t("labelName")} className="h-8" maxLength={40} />
                <div className="flex flex-wrap gap-1">
                  {COLORS.map((c) => (
                    <button key={c} type="button" aria-label={c} aria-pressed={c === color} onClick={() => setColor(c)}
                      className="size-5 rounded-full ring-offset-2 aria-pressed:ring-2" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <Button size="sm" variant="outline" className="w-full" disabled={!name.trim()}
                  onClick={() => startTransition(async () => {
                    const r = await createLabel({ board_id: boardId, name, color });
                    if (!r.ok) return void toast.error(message(r.error));
                    setName("");
                    const res = await setCardLabels({ card_id: card.id, label_ids: [...card.label_ids, r.data.id] });
                    if (!res.ok) toast.error(message(res.error));
                    onChanged();
                  })}>
                  <Plus aria-hidden /> {t("newLabel")}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        ) : null}
      </div>
      {selected.length ? (
        <div className="flex flex-wrap gap-1">
          {selected.map((l) => (
            <span key={l.id} className="rounded-md px-2 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: l.color }}>{l.name}</span>
          ))}
        </div>
      ) : <p className="text-muted-foreground text-xs">{tc("none")}</p>}
    </section>
  );
}
