"use client";

import { ArrowDown, ArrowUp, Camera, Link2, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useOptimistic, useState } from "react";
import { EmptyState } from "@/components/states/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { moveItem } from "./helpers";
import type { ShootPage } from "./queries";
import { ShotDialog, type ShotValues } from "./shot-dialog";
import { removeShot, reorderShots, setShotDone } from "./shot-actions";
import { useShootAction } from "./use-shoot-action";

type Shot = ShootPage["shots"][number];
type Card = ShootPage["cards"][number];

export function ShotsSection({ shootId, shots, cards, canEdit }: { shootId: string; shots: Shot[]; cards: Card[]; canEdit: boolean }) {
  const t = useTranslations("shoots.shots");
  const tc = useTranslations("common");
  const { pending, run } = useShootAction();
  const [items, setItems] = useOptimistic(shots);
  const [editing, setEditing] = useState<ShotValues | null>(null);
  const [adding, setAdding] = useState(false);
  const cardTitle = (id: string | null) => cards.find((c) => c.id === id)?.title;
  const done = items.filter((s) => s.done).length;

  function move(index: number, delta: -1 | 1) {
    const next = moveItem(items, index, delta);
    run(async () => {
      setItems(next);
      return reorderShots({ shoot_id: shootId, ids: next.map((s) => s.id) });
    });
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">{t("progress", { done, total: items.length })}</p>
        {canEdit ? <Button size="sm" onClick={() => setAdding(true)}><Plus aria-hidden /> {t("add")}</Button> : null}
      </div>
      {items.length ? (
        <ol className="bg-card divide-y rounded-xl border">
          {items.map((s, i) => {
            const card = cardTitle(s.card_id);
            return (
              <li key={s.id} className="flex items-start gap-3 px-4 py-3">
                <Checkbox className="mt-0.5" checked={s.done} disabled={!canEdit || pending} aria-label={`${t("done")}: ${s.description}`}
                  onCheckedChange={(c) => run(() => setShotDone({ id: s.id, shoot_id: shootId, done: c === true }))} />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className={cn("text-sm font-medium break-words", s.done && "text-muted-foreground line-through")}>
                    <span className="text-muted-foreground me-1.5 tabular-nums">{i + 1}.</span>{s.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {s.shot_type ? <Badge variant="secondary">{s.shot_type}</Badge> : null}
                    {s.done ? <span className="text-muted-foreground text-xs">{t("done")}</span> : null}
                    {card ? (
                      <Link href={`/cards/${s.card_id}`} className="text-primary-ink inline-flex min-w-0 items-center gap-1 text-xs underline-offset-4 hover:underline">
                        <Link2 className="size-3 shrink-0" aria-hidden /> <span className="truncate">{card}</span>
                      </Link>
                    ) : null}
                  </div>
                  {s.notes ? <p className="text-muted-foreground text-xs break-words whitespace-pre-wrap">{s.notes}</p> : null}
                </div>
                {canEdit ? (
                  <div className="flex shrink-0 flex-wrap justify-end gap-0.5">
                    <Button variant="ghost" size="icon-sm" disabled={pending || i === 0} aria-label={`${t("moveUp")}: ${s.description}`} onClick={() => move(i, -1)}><ArrowUp aria-hidden /></Button>
                    <Button variant="ghost" size="icon-sm" disabled={pending || i === items.length - 1} aria-label={`${t("moveDown")}: ${s.description}`} onClick={() => move(i, 1)}><ArrowDown aria-hidden /></Button>
                    <Button variant="ghost" size="icon-sm" aria-label={`${tc("edit")}: ${s.description}`} onClick={() => setEditing(s)}><Pencil aria-hidden /></Button>
                    <Button variant="ghost" size="icon-sm" disabled={pending} aria-label={`${tc("remove")}: ${s.description}`}
                      onClick={() => run(() => removeShot({ id: s.id, shoot_id: shootId }))}><Trash2 aria-hidden /></Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : (
        <EmptyState title={t("empty")} body={canEdit ? t("emptyHint") : undefined} icon={<Camera className="size-8" aria-hidden />} />
      )}
      {adding || editing ? (
        <ShotDialog shootId={shootId} shot={editing} cards={cards} onClose={() => { setAdding(false); setEditing(null); }} />
      ) : null}
    </section>
  );
}
