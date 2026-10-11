"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Archive, GripVertical, MoreHorizontal, Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CardTile } from "./card-tile";
import { QuickAdd } from "./quick-add";
import type { BoardCard, BoardList, Label } from "./types";

const SortableCard = memo(function SortableCard(props: {
  card: BoardCard;
  labels: Map<string, Label>;
  brandColor?: string;
  targetHours?: number;
  onOpen: (id: string) => void;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.card.id,
    data: { type: "card", listId: props.card.list_id },
    disabled: props.disabled,
  });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }} {...attributes} {...listeners}>
      <CardTile {...props} dragging={isDragging} />
    </div>
  );
});

type Props = {
  list: BoardList;
  cards: BoardCard[];
  labels: Map<string, Label>;
  brandColors: Map<string, string>;
  stageTargets: Partial<Record<string, number>>;
  canAdd: boolean;
  canEditList: boolean;
  canReorder: boolean;
  dragDisabled: boolean;
  onOpen: (id: string) => void;
  onAdd: (listId: string, title: string) => Promise<{ ok: boolean; error?: string }>;
  onRename: (listId: string, name: string) => void;
  onArchive: (listId: string) => void;
};

export function ListColumn(p: Props) {
  const t = useTranslations("boards");
  const ts = useTranslations("stages");
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(p.list.name);
  const {
    setNodeRef: setSortRef,
    transform,
    transition,
    isDragging,
    attributes,
    listeners,
  } = useSortable({ id: `list:${p.list.id}`, data: { type: "list", listId: p.list.id }, disabled: !p.canReorder });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `drop:${p.list.id}`, data: { type: "list", listId: p.list.id } });
  const title = p.list.stage ? ts(p.list.stage) : p.list.name;

  return (
    <section
      ref={setSortRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "bg-muted/60 flex max-h-full w-[85vw] shrink-0 snap-start flex-col rounded-xl sm:w-72",
        isDragging && "opacity-50",
      )}
      aria-label={title}
      data-testid={`list-${p.list.stage ?? p.list.id}`}
    >
      <header className="flex items-center gap-1 px-3 pt-2.5 pb-2">
        {p.canReorder ? (
          <button className="text-muted-foreground -ms-1 cursor-grab touch-none" aria-label={t("list")} {...attributes} {...listeners}>
            <GripVertical className="size-4" aria-hidden />
          </button>
        ) : null}
        {renaming ? (
          <Input
            autoFocus
            value={name}
            maxLength={80}
            className="h-7"
            aria-label={t("listName")}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              setRenaming(false);
              if (name.trim() && name !== p.list.name) p.onRename(p.list.id, name.trim());
            }}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          />
        ) : (
          <h3 className="flex-1 truncate text-sm font-semibold">{title}</h3>
        )}
        <span className="text-muted-foreground text-xs tabular-nums">{p.cards.length}</span>
        {p.canEditList && !p.list.stage ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-xs" aria-label={t("list")}>
                <MoreHorizontal aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setRenaming(true)}>
                <Pencil aria-hidden /> {t("renameList")}
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={() => p.onArchive(p.list.id)}>
                <Archive aria-hidden /> {t("archiveList")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </header>
      <div
        ref={setDropRef}
        className={cn("min-h-16 flex-1 space-y-2 overflow-y-auto px-2 pb-2 transition-colors", isOver && "bg-primary/5 rounded-lg")}
      >
        <SortableContext items={p.cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {p.cards.map((card) => (
            <SortableCard
              key={card.id}
              card={card}
              labels={p.labels}
              brandColor={card.brand_id ? p.brandColors.get(card.brand_id) : undefined}
              targetHours={card.stage ? p.stageTargets[card.stage] : undefined}
              onOpen={p.onOpen}
              disabled={p.dragDisabled}
            />
          ))}
        </SortableContext>
        {p.cards.length === 0 ? <p className="text-muted-foreground px-1 py-3 text-center text-xs">{t("noCards")}</p> : null}
      </div>
      {p.canAdd ? (
        <div className="px-2 pb-2">
          <QuickAdd onAdd={(title) => p.onAdd(p.list.id, title)} />
        </div>
      ) : null}
    </section>
  );
}
