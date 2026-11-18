import { AlertCircle, CheckSquare, Clock, Flag, Inbox, Palette, TriangleAlert } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { clock, lateSince, pick } from "./format";
import { BriefingSection, RowLink, Tag } from "./section";
import { gateDue } from "./summary";
import type { ApprovalItem, CardItem, GateItem, Section } from "./types";

/** Long lists stay short here; the full list is one tap away. */
const VISIBLE = 6;

export async function CardSection({ cards, now }: { cards: Section<CardItem>; now: Date }) {
  const t = await getTranslations("myDay");
  const locale = await getLocale();
  return (
    <BriefingSection
      id="cards"
      icon={CheckSquare}
      title={t("sections.cards")}
      count={cards.items.length}
      failed={!cards.ok}
      empty={t("empty.cards")}
      more={{ href: "/my-work", label: t("more.cards") }}
    >
      {cards.items.slice(0, VISIBLE).map((c) => (
        <RowLink key={c.id} href={`/boards/${c.boardId}?card=${c.id}`}>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.title}</span>
          {c.overdue ? (
            <Tag tone="late" icon={AlertCircle}>
              {t("card.overdue", { when: lateSince(c.dueAt, now, locale) })}
            </Tag>
          ) : (
            <Tag tone="soon" icon={Clock}>
              {t("card.due", { time: clock(c.dueAt) })}
            </Tag>
          )}
        </RowLink>
      ))}
    </BriefingSection>
  );
}

export async function ApprovalSection({ approvals }: { approvals: Section<ApprovalItem> }) {
  const t = await getTranslations("myDay");
  const locale = await getLocale();
  return (
    <BriefingSection
      id="approvals"
      icon={Inbox}
      title={t("sections.approvals")}
      count={approvals.items.length}
      failed={!approvals.ok}
      empty={t("empty.approvals")}
      more={{ href: "/approvals", label: t("more.approvals") }}
    >
      {approvals.items.slice(0, VISIBLE).map((a) => (
        <RowLink key={a.stepId} href="/approvals">
          {a.kind === "card" ? (
            <Palette className="text-muted-foreground size-4 shrink-0" aria-hidden />
          ) : (
            <Inbox className="text-muted-foreground size-4 shrink-0" aria-hidden />
          )}
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{pick(a.title, locale)}</span>
          <Tag>{t(a.kind === "card" ? "approval.card" : "approval.request")}</Tag>
        </RowLink>
      ))}
    </BriefingSection>
  );
}

export async function GateSection({ gates }: { gates: Section<GateItem> }) {
  const t = await getTranslations("myDay");
  const locale = await getLocale();
  return (
    <BriefingSection
      id="gates"
      icon={Flag}
      title={t("sections.gates")}
      count={gates.items.length}
      failed={!gates.ok}
      empty={t("empty.gates")}
      more={{ href: "/gates", label: t("more.gates") }}
    >
      {gates.items.slice(0, VISIBLE).map((g) => {
        const due = gateDue(g);
        return (
          <RowLink key={g.id} href={`/gates?month=${g.month}`}>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{pick(g.name, locale)}</span>
              {g.atRisk ? <Tag tone="soon" icon={TriangleAlert}>{t("gate.atRisk")}</Tag> : null}
            </span>
            <Tag tone={g.daysLeft < 0 ? "late" : g.daysLeft <= 1 ? "soon" : "calm"} icon={g.daysLeft < 0 ? AlertCircle : Clock}>
              {t(`gate.${due.key}`, { days: due.days })}
            </Tag>
          </RowLink>
        );
      })}
    </BriefingSection>
  );
}
