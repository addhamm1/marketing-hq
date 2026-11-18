"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { usePersonName } from "@/components/people-context";
import { PageHeader } from "@/components/states/states";
import { AttachmentsSection } from "@/features/boards/card-sheet/attachments-section";
import { CommentsSection } from "@/features/boards/card-sheet/comments-section";
import { fetchCardDetail, type CardDetail } from "@/features/boards/card-sheet/detail-query";
import { ReviewPanel } from "@/features/boards/card-sheet/review-panel";
import { isReturned, trackerAction, type TrackerViewer } from "@/features/tracker/progress";
import { fetchCardTimeline } from "@/features/tracker/queries";
import type { CardTimeline } from "@/features/tracker/timeline";
import { TrackerProgress } from "@/features/tracker/tracker-progress";
import { NeedsActionTag, TrackerBadge } from "@/features/tracker/tracker-status";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { useRouter } from "@/i18n/navigation";
import { formatCairo } from "@/lib/dates";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import type { LineOptions } from "./line-fields";
import { ResubmitForm } from "./resubmit-form";

type Props = { initial: CardDetail; initialTimeline: CardTimeline; me: string; viewer: TrackerViewer; options: LineOptions };

export function PortalRequestView({ initial, initialTimeline, me, viewer, options }: Props) {
  const t = useTranslations("portal");
  const tt = useTranslations("tracker");
  const tf = useTranslations("card.fields");
  const tst = useTranslations("portal.status");
  const name = usePersonName();
  const router = useRouter();
  const queryClient = useQueryClient();
  const key = ["card", initial.id];
  const timelineKey = ["card-timeline", initial.id];
  const { data: card = initial } = useQuery({ queryKey: key, queryFn: async () => (await fetchCardDetail(createClient(), initial.id)) ?? initial, initialData: initial });
  const { data: timeline = initialTimeline } = useQuery({ queryKey: timelineKey, queryFn: () => fetchCardTimeline(createClient(), initial.id), initialData: initialTimeline });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: key });
    queryClient.invalidateQueries({ queryKey: timelineKey });
  };
  useRealtimeRefresh(`portal-card:${initial.id}`, [{ table: "cards", filter: `id=eq.${initial.id}` }, { table: "comments", filter: `card_id=eq.${initial.id}` }], refresh);

  const activeStep = card.steps.find((s) => s.status === "active" && s.approver_id === me);
  const action = trackerAction(card, viewer, activeStep?.card_stage === "confirmation");
  const returned = isReturned(card);
  const brand = options.brands.find((b) => b.id === card.brand_id)?.name;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={card.title} actions={<>{action ? <NeedsActionTag /> : null}<TrackerBadge card={card} /></>} />

      {returned ? (
        <section className={cn("space-y-4 rounded-xl border p-4", action ? "border-destructive/50 bg-destructive/5 border-s-4" : "bg-card")} data-testid="returned-panel">
          {action ? <h2 className="text-base font-semibold">{tt("action.resubmitTitle")}</h2> : null}
          <p className="text-sm font-medium">{card.returned_reason}</p>
          {card.missing_items.length ? (
            <ul className="list-disc ps-5 text-sm">{card.missing_items.map((m) => <li key={m}>{m}</li>)}</ul>
          ) : null}
          {action === "resubmit" ? <ResubmitForm card={card} options={options} onDone={() => { refresh(); router.refresh(); }} /> : null}
        </section>
      ) : null}

      {activeStep ? (
        <section className={cn("space-y-3 rounded-xl border p-4", action === "confirm" ? "border-destructive/50 bg-destructive/5 border-s-4" : "bg-card")} data-testid="confirm-panel">
          <h2 className="text-base font-semibold">{action === "confirm" ? tt("action.confirmTitle") : tst("awaiting_approval")}</h2>
          {action === "confirm" ? <p className="text-muted-foreground text-sm">{tt("action.confirmBody")}</p> : null}
          <ReviewPanel stepId={activeStep.id} onDone={refresh} />
        </section>
      ) : null}

      <TrackerProgress card={card} timeline={timeline} action={action} />

      <section className="bg-card rounded-xl border p-4">
        <h2 className="mb-3 text-sm font-semibold">{t("requestDetails")}</h2>
        <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[10rem_1fr]">
          <dt className="text-muted-foreground">{t("requestedBy")}</dt><dd>{name(card.requester_id)}</dd>
          <dt className="text-muted-foreground">{t("submittedOn")}</dt><dd dir="ltr" className="text-start">{formatCairo(card.created_at, "d MMM yyyy, HH:mm")}</dd>
          {card.due_at ? (<><dt className="text-muted-foreground">{t("dueDate")}</dt><dd dir="ltr" className="text-start">{formatCairo(card.due_at, "d MMM yyyy, HH:mm")}</dd></>) : null}
          {card.objective ? (<><dt className="text-muted-foreground">{tf("objective")}</dt><dd className="whitespace-pre-wrap">{card.objective}</dd></>) : null}
          {card.key_message ? (<><dt className="text-muted-foreground">{tf("key_message")}</dt><dd className="whitespace-pre-wrap">{card.key_message}</dd></>) : null}
          {card.vertical ? (<><dt className="text-muted-foreground">{tf("vertical")}</dt><dd>{card.vertical}</dd></>) : null}
          {brand ? (<><dt className="text-muted-foreground">{tf("brand_id")}</dt><dd>{brand}</dd></>) : null}
          {card.format ? (<><dt className="text-muted-foreground">{tf("format")}</dt><dd>{card.format}</dd></>) : null}
          {card.platforms.length ? (<><dt className="text-muted-foreground">{tf("platforms")}</dt><dd>{card.platforms.join(", ")}</dd></>) : null}
          {card.description ? (<><dt className="text-muted-foreground">{tf("description")}</dt><dd className="whitespace-pre-wrap">{card.description}</dd></>) : null}
        </dl>
      </section>

      <section className="bg-card rounded-xl border p-4">
        <AttachmentsSection card={card} me={me} canEdit={false} onChanged={refresh} />
      </section>
      <section className="bg-card rounded-xl border p-4">
        <CommentsSection card={card} me={me} onChanged={refresh} />
      </section>
    </div>
  );
}
