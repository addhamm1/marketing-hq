"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { usePersonName } from "@/components/people-context";
import { PageHeader } from "@/components/states/states";
import { AttachmentsSection } from "@/features/boards/card-sheet/attachments-section";
import { CommentsSection } from "@/features/boards/card-sheet/comments-section";
import { fetchCardDetail, type CardDetail } from "@/features/boards/card-sheet/detail-query";
import { ReviewPanel } from "@/features/boards/card-sheet/review-panel";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { useRouter } from "@/i18n/navigation";
import { formatCairo } from "@/lib/dates";
import { createClient } from "@/lib/supabase/browser";
import type { LineOptions } from "./line-fields";
import { PortalStatusBadge } from "./request-row";
import { ResubmitForm } from "./resubmit-form";
import { portalStatus } from "./status";

const STEPS = ["received", "in_production", "awaiting_approval", "delivered"] as const;

export function PortalRequestView({ initial, me, options }: { initial: CardDetail; me: string; options: LineOptions }) {
  const t = useTranslations("portal");
  const tf = useTranslations("card.fields");
  const tst = useTranslations("portal.status");
  const name = usePersonName();
  const router = useRouter();
  const queryClient = useQueryClient();
  const key = ["card", initial.id];
  const { data: card = initial } = useQuery({ queryKey: key, queryFn: async () => (await fetchCardDetail(createClient(), initial.id)) ?? initial, initialData: initial });
  const refresh = () => queryClient.invalidateQueries({ queryKey: key });
  useRealtimeRefresh(`portal-card:${initial.id}`, [{ table: "cards", filter: `id=eq.${initial.id}` }, { table: "comments", filter: `card_id=eq.${initial.id}` }], refresh);

  const status = portalStatus(card.stage, card.returned_reason);
  const current = STEPS.indexOf(status as (typeof STEPS)[number]);
  const activeStep = card.steps.find((s) => s.status === "active" && s.approver_id === me);
  const brand = options.brands.find((b) => b.id === card.brand_id)?.name;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={card.title} actions={<PortalStatusBadge stage={card.stage} returnedReason={card.returned_reason} />} />

      {status !== "returned" ? (
        <ol className="grid grid-cols-4 gap-2" aria-label={t("timeline")}>
          {STEPS.map((s, i) => (
            <li key={s} className="space-y-1.5">
              <div className={`h-1.5 rounded-full ${i <= current ? "bg-primary" : "bg-muted"}`} />
              <p className={`text-xs ${i <= current ? "font-medium" : "text-muted-foreground"}`}>{tst(s)}</p>
            </li>
          ))}
        </ol>
      ) : (
        <div className="space-y-4 rounded-xl border border-rose-200 bg-rose-50/60 p-4">
          <p className="text-sm font-medium text-rose-900">{card.returned_reason}</p>
          {card.missing_items.length ? (
            <ul className="list-disc ps-5 text-sm text-rose-900">{card.missing_items.map((m) => <li key={m}>{m}</li>)}</ul>
          ) : null}
          <ResubmitForm card={card} options={options} onDone={() => { refresh(); router.refresh(); }} />
        </div>
      )}

      {activeStep ? (
        <section className="bg-card space-y-3 rounded-xl border p-4">
          <h2 className="text-sm font-semibold">{tst("awaiting_approval")}</h2>
          <ReviewPanel stepId={activeStep.id} onDone={refresh} />
        </section>
      ) : null}

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
