"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/states/states";
import { Button } from "@/components/ui/button";
import { useMessage } from "@/hooks/use-message";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { deleteKudos } from "./actions";
import { KudosCard } from "./kudos-card";
import { KUDOS_QUERY, fetchKudos } from "./kudos-client";
import { KUDOS_PAGE, type Kudos } from "./types";

export function KudosFeed({ initial, viewerId, canModerate, onSend }: {
  initial: Kudos[];
  viewerId: string;
  /** Super admins can remove anyone's kudos. */
  canModerate: boolean;
  onSend: () => void;
}) {
  const t = useTranslations("celebrations");
  const message = useMessage();
  const queryClient = useQueryClient();
  const [limit, setLimit] = useState(KUDOS_PAGE);
  const [deleting, setDeleting] = useState<Kudos | null>(null);
  const [, startTransition] = useTransition();

  const query = useQuery({
    queryKey: [...KUDOS_QUERY, limit],
    queryFn: () => fetchKudos(limit),
    initialData: limit === KUDOS_PAGE ? initial : undefined,
    placeholderData: keepPreviousData,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: KUDOS_QUERY });
  useRealtimeRefresh("kudos-feed", [{ table: "kudos" }], () => void refresh());

  function confirmDelete() {
    if (!deleting) return;
    const { id } = deleting;
    setDeleting(null);
    startTransition(async () => {
      const result = await deleteKudos({ id });
      if (!result.ok) {
        toast.error(message(result.error));
        return;
      }
      toast.success(t("feed.deleted"));
      await refresh();
    });
  }

  const items = query.data ?? [];

  return (
    <section aria-labelledby="kudos-feed-title" className="min-w-0">
      <h2 id="kudos-feed-title" className="mb-3 font-semibold">{t("feed.title")}</h2>
      {query.isPending ? <ListSkeleton rows={4} /> : null}
      {query.isError && !query.data ? (
        <ErrorState
          title={t("feed.errorTitle")}
          body={t("feed.errorBody")}
          action={<Button variant="outline" onClick={() => void query.refetch()}>{t("feed.retry")}</Button>}
        />
      ) : null}
      {query.data && !items.length ? (
        <EmptyState
          icon={<Heart className="size-8" aria-hidden />}
          title={t("feed.emptyTitle")}
          body={t("feed.emptyBody")}
          action={<Button onClick={onSend}>{t("sendKudos")}</Button>}
        />
      ) : null}
      {items.length ? (
        <ul className="space-y-3">
          {items.map((kudos) => (
            <KudosCard
              key={kudos.id}
              kudos={kudos}
              canDelete={kudos.from_id === viewerId || canModerate}
              onDelete={() => setDeleting(kudos)}
            />
          ))}
        </ul>
      ) : null}
      {items.length >= limit ? (
        <Button
          variant="outline"
          className="mt-3 w-full"
          disabled={query.isFetching}
          onClick={() => setLimit((n) => n + KUDOS_PAGE)}
        >
          {query.isFetching ? <Loader2 className="animate-spin" aria-hidden /> : null}
          {t("feed.showMore")}
        </Button>
      ) : null}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("feed.deleteTitle")}
        body={t("feed.deleteBody")}
        confirmLabel={t("feed.deleteConfirm")}
        destructive
        onConfirm={confirmDelete}
      />
    </section>
  );
}
