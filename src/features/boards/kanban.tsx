"use client";

import {
  closestCorners, DndContext, DragOverlay, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { horizontalListSortingStrategy, SortableContext, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useMemo, useState } from "react";
import { byPosition, keyBetween } from "@/lib/positions";
import { CardTile } from "./card-tile";
import { ListColumn } from "./list-column";
import type { BoardCard, BoardList, Label } from "./types";

export type CardDrop = { card: BoardCard; toList: BoardList; position: string };

type Props = {
  lists: BoardList[];
  cards: BoardCard[];
  labels: Label[];
  brandColors: Map<string, string>;
  stageTargets: Partial<Record<string, number>>;
  canAdd: boolean;
  canEditLists: boolean;
  canReorderLists: boolean;
  canDrag: boolean;
  onOpen: (id: string) => void;
  onAdd: (listId: string, title: string, position: string) => Promise<{ ok: boolean; error?: string }>;
  onCardDrop: (drop: CardDrop) => void;
  onListMove: (list: BoardList, position: string) => void;
  onRenameList: (listId: string, name: string) => void;
  onArchiveList: (listId: string) => void;
};

export function Kanban(p: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const labelMap = useMemo(() => new Map(p.labels.map((l) => [l.id, l])), [p.labels]);
  const byList = useMemo(() => {
    const m = new Map<string, BoardCard[]>();
    for (const l of p.lists) m.set(l.id, []);
    for (const c of p.cards) m.get(c.list_id)?.push(c);
    for (const arr of m.values()) arr.sort(byPosition);
    return m;
  }, [p.lists, p.cards]);
  const active = activeId ? p.cards.find((c) => c.id === activeId) : undefined;

  function onDragStart(e: DragStartEvent) {
    if (e.active.data.current?.type === "card") setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active: a, over } = e;
    if (!over) return;

    if (a.data.current?.type === "list") {
      const from = p.lists.findIndex((l) => `list:${l.id}` === a.id);
      const overListId = over.data.current?.listId as string | undefined;
      const to = p.lists.findIndex((l) => l.id === overListId);
      if (from < 0 || to < 0 || from === to) return;
      const rest = p.lists.filter((_, i) => i !== from);
      const before = to > from ? rest[to - 1] : rest[to - 1];
      const after = to > from ? rest[to] : rest[to];
      p.onListMove(p.lists[from], keyBetween(before?.position, after?.position));
      return;
    }

    const card = p.cards.find((c) => c.id === a.id);
    const toListId = over.data.current?.listId as string | undefined;
    const toList = p.lists.find((l) => l.id === toListId);
    if (!card || !toList) return;
    const target = (byList.get(toList.id) ?? []).filter((c) => c.id !== card.id);

    let index = target.length;
    if (over.data.current?.type === "card") {
      const overIndex = target.findIndex((c) => c.id === over.id);
      const translated = a.rect.current.translated;
      const below = translated ? translated.top > over.rect.top + over.rect.height / 2 : false;
      index = overIndex < 0 ? target.length : overIndex + (below ? 1 : 0);
    }
    const position = keyBetween(target[index - 1]?.position, target[index]?.position);
    if (toList.id === card.list_id && position === card.position) return;
    p.onCardDrop({ card, toList, position });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="-mx-4 flex h-[calc(100dvh-13rem)] snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6 md:h-[calc(100dvh-11.5rem)] lg:-mx-8 lg:px-8">
        <SortableContext items={p.lists.map((l) => `list:${l.id}`)} strategy={horizontalListSortingStrategy}>
          {p.lists.map((list) => (
            <ListColumn
              key={list.id}
              list={list}
              cards={byList.get(list.id) ?? []}
              labels={labelMap}
              brandColors={p.brandColors}
              stageTargets={p.stageTargets}
              canAdd={p.canAdd && (!list.stage || list.stage === "intake")}
              canEditList={p.canEditLists}
              canReorder={p.canReorderLists}
              dragDisabled={!p.canDrag}
              onOpen={p.onOpen}
              onAdd={(listId, title) => {
                const last = (byList.get(listId) ?? []).at(-1);
                return p.onAdd(listId, title, keyBetween(last?.position, null));
              }}
              onRename={p.onRenameList}
              onArchive={p.onArchiveList}
            />
          ))}
        </SortableContext>
      </div>
      <DragOverlay>
        {active ? (
          <CardTile
            card={active}
            labels={labelMap}
            brandColor={active.brand_id ? p.brandColors.get(active.brand_id) : undefined}
            overlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
