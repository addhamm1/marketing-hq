"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { usePersonName } from "@/components/people-context";
import { EmptyState, ErrorState } from "@/components/states/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useMessage } from "@/hooks/use-message";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { formatCairo } from "@/lib/dates";
import { createClient } from "@/lib/supabase/browser";
import { StageBadge } from "../badges";
import { archiveCard } from "../card-actions";
import type { BoardPerms } from "../permissions";
import type { BoardSettings } from "../queries";
import type { Board, Brand, Label } from "../types";
import { ActivityFeed } from "./activity-feed";
import { AssigneesEditor } from "./assignees-editor";
import { AttachmentsSection } from "./attachments-section";
import { CardFieldsForm } from "./card-fields-form";
import { ChecklistsSection } from "./checklists-section";
import { CommentsSection } from "./comments-section";
import { fetchCardDetail } from "./detail-query";
import { LabelsEditor } from "./labels-editor";
import { LinkedPost } from "./linked-post";
import { StageActions } from "./stage-actions";

type Option = { id: string; name_en: string; name_ar: string };

export function CardSheet(props: {
  cardId: string;
  board: Board;
  labels: Label[];
  brands: Brand[];
  branches: Option[];
  settings: BoardSettings;
  perms: BoardPerms;
  me: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { cardId, board, perms, me, onClose, onChanged } = props;
  const t = useTranslations("card");
  const tk = useTranslations("requestKind");
  const tc = useTranslations("common");
  const locale = useLocale();
  const message = useMessage();
  const name = usePersonName();
  const queryClient = useQueryClient();
  const [archiving, setArchiving] = useState(false);
  const [, startTransition] = useTransition();
  const queryKey = ["card", cardId];

  const { data: card, isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchCardDetail(createClient(), cardId),
  });
  const changed = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["card", cardId] });
    onChanged();
  }, [queryClient, cardId, onChanged]);

  useRealtimeRefresh(
    `card:${cardId}`,
    [
      { table: "comments", filter: `card_id=eq.${cardId}` },
      { table: "card_assignees", filter: `card_id=eq.${cardId}` },
      { table: "cards", filter: `id=eq.${cardId}` },
    ],
    () => queryClient.invalidateQueries({ queryKey: ["card", cardId] }),
  );

  const isAssignee = !!card?.assignees.some((a) => a.user_id === me);
  const canEdit =
    !!card &&
    (perms.isTraffic || perms.isTeamLead || perms.isAdmin || isAssignee || card.reviewer_id === me ||
      !board.is_pipeline);

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side={locale === "ar" ? "left" : "right"}
        className="gap-0 overflow-y-auto p-0 data-[side=left]:w-full data-[side=right]:w-full data-[side=left]:sm:max-w-3xl data-[side=right]:sm:max-w-3xl"
        showCloseButton={false}
      >
        {isLoading ? (
          <div className="space-y-3 p-6">
            <SheetTitle className="sr-only">{tc("loading")}</SheetTitle>
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : isError ? (
          <div className="p-6">
            <SheetTitle className="sr-only">{tc("errorTitle")}</SheetTitle>
            <ErrorState title={tc("errorTitle")} action={<Button onClick={() => refetch()}>{tc("retry")}</Button>} />
          </div>
        ) : !card ? (
          <div className="p-6">
            <SheetTitle className="sr-only">{t("notFound")}</SheetTitle>
            <EmptyState title={t("notFound")} />
          </div>
        ) : (
          <>
            <header className="bg-background sticky top-0 z-10 flex items-start gap-2 border-b px-4 py-3 sm:px-6">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  {card.stage ? <StageBadge stage={card.stage} /> : null}
                  {card.request_kind ? <Badge variant="outline">{tk(card.request_kind)}</Badge> : null}
                  {card.is_late_submission ? <Badge variant="destructive">{t("late")}</Badge> : null}
                  {card.revision_count > 0 ? (
                    <Badge variant="outline">
                      {t("revisionCount")}: {card.revision_count}
                    </Badge>
                  ) : null}
                </div>
                <SheetTitle className="text-lg leading-snug break-words">{card.title}</SheetTitle>
                <SheetDescription className="text-xs">
                  {name(card.created_by)} · <span dir="ltr">{formatCairo(card.created_at, "d MMM yyyy")}</span>
                </SheetDescription>
              </div>
              {canEdit ? (
                <Button variant="ghost" size="icon" onClick={() => setArchiving(true)} aria-label={t("archiveCard")}>
                  <Archive aria-hidden />
                </Button>
              ) : null}
              <Button variant="ghost" size="icon" onClick={onClose} aria-label={tc("close")}>
                <X aria-hidden />
              </Button>
            </header>

            <div className="grid gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[1fr_15rem]">
              <div className="min-w-0 space-y-6">
                {card.stage ? <StageActions card={card} perms={perms} me={me} onChanged={changed} /> : null}
                {card.stage === "request" && card.returned_reason ? (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                    <p className="font-medium">{t("returned")}</p>
                    <p className="mt-1 whitespace-pre-wrap">{card.returned_reason}</p>
                    {card.missing_items.length ? (
                      <ul className="mt-2 list-disc ps-5">
                        {card.missing_items.map((m) => (
                          <li key={m}>{m}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
                <CardFieldsForm card={card} canEdit={canEdit} brands={props.brands} branches={props.branches} settings={props.settings} onSaved={changed} />
                <ChecklistsSection card={card} canEdit={canEdit} onChanged={changed} />
                <AttachmentsSection card={card} me={me} canEdit={canEdit} onChanged={changed} />
                <CommentsSection card={card} me={me} onChanged={changed} />
              </div>
              <aside className="space-y-6">
                <AssigneesEditor card={card} canEdit={canEdit} settings={props.settings} onChanged={changed} />
                <LabelsEditor card={card} labels={props.labels} boardId={board.id} canEdit={canEdit} onChanged={changed} />
                {card.stage ? <LinkedPost cardId={card.id} /> : null}
                <ActivityFeed events={card.events} />
              </aside>
            </div>
            <ConfirmDialog
              open={archiving}
              onOpenChange={setArchiving}
              title={t("archiveCard")}
              body={t("archiveCardConfirm")}
              destructive
              onConfirm={() =>
                startTransition(async () => {
                  const r = await archiveCard({ id: card.id });
                  if (r.ok) {
                    toast.success(t("cardArchived"));
                    onChanged();
                    onClose();
                  } else toast.error(message(r.error));
                })
              }
            />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
