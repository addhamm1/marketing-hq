"use client";

import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useMessage } from "@/hooks/use-message";
import { keyBetween } from "@/lib/positions";
import { addChecklistItem, createChecklist, deleteChecklist, deleteChecklistItem, toggleChecklistItem } from "../card-extras-actions";
import type { CardDetail } from "./detail-query";

function AddInline({ placeholder, onAdd }: { placeholder: string; onAdd: (text: string) => Promise<void> }) {
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const tc = useTranslations("common");
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        startTransition(async () => {
          await onAdd(text.trim());
          setText("");
        });
      }}
    >
      <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="h-8" maxLength={300} />
      <Button type="submit" size="sm" variant="outline" disabled={pending || !text.trim()}>
        <Plus aria-hidden /> {tc("add")}
      </Button>
    </form>
  );
}

export function ChecklistsSection({ card, canEdit, onChanged }: { card: CardDetail; canEdit: boolean; onChanged: () => void }) {
  const t = useTranslations("card");
  const tc = useTranslations("common");
  const message = useMessage();
  const [, startTransition] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) toast.error(message(r.error));
      onChanged();
    });

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">{t("checklists")}</h3>
      {card.checklists.length === 0 ? <p className="text-muted-foreground text-xs">{t("noChecklists")}</p> : null}
      {card.checklists.map((cl) => {
        const done = cl.items.filter((i) => i.done).length;
        const pct = cl.items.length ? Math.round((done / cl.items.length) * 100) : 0;
        return (
          <div key={cl.id} className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <span className="flex-1 text-sm font-medium">{cl.title}</span>
              <span className="text-muted-foreground text-xs tabular-nums">{done}/{cl.items.length}</span>
              {canEdit ? (
                <Button variant="ghost" size="icon-xs" aria-label={tc("delete")} onClick={() => run(() => deleteChecklist({ id: cl.id }))}>
                  <Trash2 aria-hidden />
                </Button>
              ) : null}
            </div>
            <Progress value={pct} className="h-1.5" />
            <ul className="space-y-1">
              {cl.items.map((item) => (
                <li key={item.id} className="group flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={item.done}
                    disabled={!canEdit}
                    aria-label={item.text}
                    onCheckedChange={(v) => run(() => toggleChecklistItem({ id: item.id, done: v === true }))}
                  />
                  <span className={item.done ? "text-muted-foreground flex-1 line-through" : "flex-1"}>{item.text}</span>
                  {canEdit ? (
                    <Button variant="ghost" size="icon-xs" className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100" aria-label={tc("delete")}
                      onClick={() => run(() => deleteChecklistItem({ id: item.id }))}>
                      <Trash2 aria-hidden />
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
            {canEdit ? (
              <AddInline
                placeholder={t("addItem")}
                onAdd={async (text) => run(() => addChecklistItem({ checklist_id: cl.id, text, position: keyBetween(cl.items.at(-1)?.position, null) }))}
              />
            ) : null}
          </div>
        );
      })}
      {canEdit ? <AddInline placeholder={t("checklistTitle")} onAdd={async (title) => run(() => createChecklist({ card_id: card.id, title }))} /> : null}
    </section>
  );
}
