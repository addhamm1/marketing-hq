"use client";

import { ExternalLink, FileText, Palette } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePersonName } from "@/components/people-context";
import { EmptyState } from "@/components/states/states";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { ReviewPanel } from "@/features/boards/card-sheet/review-panel";
import { Link, useRouter } from "@/i18n/navigation";
import { formatCairo } from "@/lib/dates";
import type { InboxItem } from "./queries";

function MediaPreview({ item }: { item: Extract<InboxItem, { kind: "card" }> }) {
  if (!item.previews.length && !item.links.length) return null;
  return (
    <div className="space-y-2">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {item.previews.map((p) =>
          p.mime?.startsWith("video/") ? (
            <video key={p.id} src={p.url} controls preload="metadata" className="h-48 shrink-0 rounded-lg bg-black" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <a key={p.id} href={p.url} target="_blank" rel="noreferrer"><img src={p.url} alt={p.name} className="h-48 shrink-0 rounded-lg border object-cover" /></a>
          ),
        )}
      </div>
      {item.links.map((l) => (
        <a key={l.id} href={l.url} target="_blank" rel="noreferrer" className="text-primary-ink flex items-center gap-1 text-sm hover:underline">
          <ExternalLink className="size-3.5" aria-hidden /> {l.name}
        </a>
      ))}
    </div>
  );
}

export function ApprovalsInbox({ items, cardLinkBase }: { items: InboxItem[]; cardLinkBase: "team" | "portal" }) {
  const t = useTranslations("approvals");
  const tp = useTranslations("portal");
  const locale = useLocale();
  const name = usePersonName();
  const router = useRouter();

  if (!items.length) return <EmptyState title={t("empty")} body={t("emptyBody")} />;

  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <li key={item.stepId} className="bg-card space-y-4 rounded-xl border p-4" data-testid="inbox-item">
          {item.kind === "card" ? (
            <>
              <div className="flex flex-wrap items-start gap-2">
                <Palette className="text-primary-ink mt-0.5 size-4" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.card.title}</p>
                  <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="secondary">{item.card.stage === "confirmation" ? t("cardConfirmation") : t("cardReview")}</Badge>
                    {item.card.due_at ? <span dir="ltr">{formatCairo(item.card.due_at, "d MMM, HH:mm")}</span> : null}
                  </div>
                </div>
                <Link
                  href={cardLinkBase === "team" ? `/boards/${item.card.board_id}?card=${item.card.id}` : `/portal/requests/${item.card.id}`}
                  className="text-primary-ink text-sm hover:underline"
                >
                  {t("openCard")}
                </Link>
              </div>
              {item.card.key_message ? <p className="text-muted-foreground text-sm">{item.card.key_message}</p> : null}
              <MediaPreview item={item} />
              <ReviewPanel stepId={item.stepId} onDone={() => router.refresh()} />
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-start gap-3">
                <UserAvatar userId={item.request.requester_id} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{locale === "ar" ? item.type.name_ar : item.type.name_en}</p>
                  <p className="text-muted-foreground text-xs">{t("requestedBy", { name: name(item.request.requester_id) })}</p>
                </div>
                <FileText className="text-muted-foreground size-4" aria-hidden />
              </div>
              <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[10rem_1fr]">
                {item.request.starts_on ? (
                  <>
                    <dt className="text-muted-foreground">{tp("dueDate")}</dt>
                    <dd dir="ltr" className="text-start">
                      {item.request.starts_on}
                      {item.request.ends_on && item.request.ends_on !== item.request.starts_on ? ` → ${item.request.ends_on}` : ""}
                      {item.request.days ? ` · ${t("days", { count: Number(item.request.days) })}` : ""}
                    </dd>
                  </>
                ) : null}
                {item.type.fields
                  .filter((f) => !["starts_on", "ends_on"].includes(f.name) && item.request.data[f.name] !== undefined && item.request.data[f.name] !== "")
                  .map((f) => (
                    <div key={f.name} className="contents">
                      <dt className="text-muted-foreground">{locale === "ar" ? f.label_ar : f.label_en}</dt>
                      <dd className="break-words whitespace-pre-wrap">{String(item.request.data[f.name])}</dd>
                    </div>
                  ))}
              </dl>
              <ReviewPanel kind="request" stepId={item.stepId} onDone={() => router.refresh()} />
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
