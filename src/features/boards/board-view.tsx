"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, Plus, Workflow } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMessage } from "@/hooks/use-message";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { usePathname, useRouter } from "@/i18n/navigation";
import { keyBetween } from "@/lib/positions";
import { createClient } from "@/lib/supabase/browser";
import { archiveList, createList, updateList } from "./board-actions";
import { BoardMenu } from "./board-menu";
import { createCard, moveCard, moveCardStage } from "./card-actions";
import { CardSheet } from "./card-sheet/card-sheet";
import { applyFilters, EMPTY_FILTERS, type CardFilters } from "./filters";
import { FiltersBar } from "./filters-bar";
import { Kanban, type CardDrop } from "./kanban";
import type { BoardPerms } from "./permissions";
import { fetchBoardData, type BoardSettings } from "./queries";
import { needsPayload, StageMoveDialog, type StageMoveRequest } from "./stage-move-dialog";
import { TableView } from "./table-view";
import type { BoardData, Brand } from "./types";
import { WorkloadView } from "./workload-view";

type Option = { id: string; name_en: string; name_ar: string };

export function BoardView({
  initial, brands, settings, branches, departments, perms, me,
}: {
  initial: BoardData;
  brands: Brand[];
  settings: BoardSettings;
  branches: Option[];
  departments: Option[];
  perms: BoardPerms;
  me: string;
}) {
  const t = useTranslations("boards");
  const ts = useTranslations("stages");
  const message = useMessage();
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const boardId = initial.board.id;
  const queryKey = useMemo(() => ["board", boardId], [boardId]);
  const [filters, setFilters] = useState<CardFilters>(EMPTY_FILTERS);
  const [view, setView] = useState<"kanban" | "table" | "workload">("kanban");
  const [stageMove, setStageMove] = useState<StageMoveRequest | null>(null);
  const [, startTransition] = useTransition();

  const { data } = useQuery({
    queryKey,
    queryFn: async () => (await fetchBoardData(createClient(), boardId)) ?? initial,
    initialData: initial,
  });
  const refresh = useCallback(() => queryClient.invalidateQueries({ queryKey }), [queryClient, queryKey]);

  useRealtimeRefresh(
    `board:${boardId}`,
    [
      { table: "cards", filter: `board_id=eq.${boardId}` },
      { table: "lists", filter: `board_id=eq.${boardId}` },
      { table: "card_assignees" },
    ],
    refresh,
  );

  const openCardId = searchParams.get("card");
  const openCard = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set("card", id);
      else params.delete("card");
      const q = params.toString();
      router.replace(`${pathname}${q ? `?${q}` : ""}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const brandColors = useMemo(() => new Map(brands.map((b) => [b.id, b.color])), [brands]);
  const filtered = useMemo(() => applyFilters(data.cards, filters), [data.cards, filters]);
  const isPipeline = data.board.is_pipeline;

  function patchCard(id: string, patch: Partial<BoardData["cards"][number]>) {
    queryClient.setQueryData<BoardData>(queryKey, (old) =>
      old ? { ...old, cards: old.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)) } : old,
    );
  }

  function onCardDrop({ card, toList, position }: CardDrop) {
    const snapshot = queryClient.getQueryData<BoardData>(queryKey);
    const rollback = () => queryClient.setQueryData(queryKey, snapshot);
    const sameList = toList.id === card.list_id;

    if (isPipeline && !sameList && card.stage && toList.stage) {
      if (needsPayload(card.stage, toList.stage)) {
        setStageMove({ cardId: card.id, title: card.title, from: card.stage, to: toList.stage, position, assignees: card.assignees });
        return;
      }
      patchCard(card.id, { list_id: toList.id, stage: toList.stage, position, stage_entered_at: new Date().toISOString() });
      startTransition(async () => {
        const r = await moveCardStage({ id: card.id, to: toList.stage, position });
        if (!r.ok) {
          rollback();
          toast.error(message(r.error, r.params));
        }
        refresh();
      });
      return;
    }

    patchCard(card.id, { list_id: toList.id, position });
    startTransition(async () => {
      const r = await moveCard({ id: card.id, list_id: toList.id, position });
      if (!r.ok) {
        rollback();
        toast.error(message(r.error));
      }
    });
  }

  async function onAdd(listId: string, title: string, position: string) {
    const r = await createCard({ board_id: boardId, list_id: listId, title, position });
    if (r.ok) refresh();
    return r.ok ? { ok: true } : { ok: false, error: r.error };
  }

  function addList() {
    const last = data.lists.at(-1);
    startTransition(async () => {
      const r = await createList({ board_id: boardId, name: t("listName"), position: keyBetween(last?.position, null) });
      if (r.ok) refresh();
      else toast.error(message(r.error));
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {isPipeline ? <Workflow className="text-primary size-5" aria-hidden /> : null}
        <h1 className="text-xl font-semibold tracking-tight">{data.board.name}</h1>
        {isPipeline ? <Badge variant="secondary">{t("pipelineBadge")}</Badge> : null}
        {data.board.visibility === "private" ? (
          <Badge variant="outline" className="gap-1">
            <Lock className="size-3" aria-hidden /> {t("privateBadge")}
          </Badge>
        ) : null}
        <div className="ms-auto flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
            <TabsList>
              <TabsTrigger value="kanban">{t("kanban")}</TabsTrigger>
              <TabsTrigger value="table">{t("table")}</TabsTrigger>
              {perms.isTraffic || perms.isTeamLead || perms.isAdmin ? (
                <TabsTrigger value="workload">{t("workload")}</TabsTrigger>
              ) : null}
            </TabsList>
          </Tabs>
          {perms.addLists ? (
            <Button variant="outline" size="sm" onClick={addList}>
              <Plus aria-hidden /> {t("addList")}
            </Button>
          ) : null}
          {perms.editBoard ? (
            <BoardMenu board={{ id: boardId, name: data.board.name, visibility: data.board.visibility }} afterArchive="/boards" />
          ) : null}
        </div>
      </div>

      {view !== "workload" ? (
        <FiltersBar value={filters} onChange={setFilters} brands={brands} departments={departments} showStage={isPipeline} />
      ) : null}

      {view === "kanban" ? (
        <Kanban
          lists={data.lists}
          cards={filtered}
          labels={data.labels}
          brandColors={brandColors}
          stageTargets={settings.stageTargets}
          canAdd={perms.addCards}
          canEditLists={perms.addLists}
          canReorderLists={perms.reorderLists}
          canDrag={perms.isWriter || perms.addCards}
          onOpen={openCard}
          onAdd={onAdd}
          onCardDrop={onCardDrop}
          onListMove={(list, position) => {
            queryClient.setQueryData<BoardData>(queryKey, (old) =>
              old ? { ...old, lists: old.lists.map((l) => (l.id === list.id ? { ...l, position } : l)).sort((a, b) => (a.position < b.position ? -1 : 1)) } : old,
            );
            startTransition(async () => {
              const r = await updateList({ id: list.id, position });
              if (!r.ok) toast.error(message(r.error));
              refresh();
            });
          }}
          onRenameList={(id, name) =>
            startTransition(async () => {
              const r = await updateList({ id, name });
              if (!r.ok) toast.error(message(r.error));
              refresh();
            })
          }
          onArchiveList={(id) =>
            startTransition(async () => {
              const r = await archiveList({ id });
              if (!r.ok) toast.error(message(r.error));
              refresh();
            })
          }
        />
      ) : view === "table" ? (
        <TableView cards={filtered} lists={data.lists} brands={brands} departments={departments} onOpen={openCard} stageLabel={ts} />
      ) : (
        <WorkloadView cards={data.cards} wipLimit={settings.wipLimit} />
      )}

      <StageMoveDialog request={stageMove} onClose={() => setStageMove(null)} onMoved={refresh} />
      {openCardId ? (
        <CardSheet
          cardId={openCardId}
          board={data.board}
          labels={data.labels}
          brands={brands}
          branches={branches}
          settings={settings}
          perms={perms}
          me={me}
          onClose={() => openCard(null)}
          onChanged={refresh}
        />
      ) : null}
    </div>
  );
}
