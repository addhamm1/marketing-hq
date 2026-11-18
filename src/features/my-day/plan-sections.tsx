import { AlertCircle, Cake, Camera, ClipboardList, MapPin, PartyPopper, Sparkles } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { pick, shortDay } from "./format";
import { BriefingSection, RowLink, Tag } from "./section";
import type { ActionItem, CelebrationItem, Section, ShootItem } from "./types";

export async function ShootSection({ shoots }: { shoots: Section<ShootItem> }) {
  const t = await getTranslations("myDay");
  const locale = await getLocale();
  return (
    <BriefingSection
      id="shoots"
      icon={Camera}
      title={t("sections.shoots")}
      count={shoots.items.length}
      failed={!shoots.ok}
      empty={t("empty.shoots")}
      more={{ href: "/shoots", label: t("more.shoots") }}
    >
      {shoots.items.map((s) => (
        <RowLink key={s.id} href={`/shoots/${s.id}`}>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{s.title}</span>
            <span className="flex flex-wrap items-center gap-x-3">
              <Tag tone={s.when === "today" ? "soon" : "calm"}>
                {t(`shoot.${s.when}`, { time: s.callTime })}
              </Tag>
              {s.place ? <Tag icon={MapPin}>{pick(s.place, locale)}</Tag> : null}
            </span>
          </span>
        </RowLink>
      ))}
    </BriefingSection>
  );
}

export async function ActionSection({ actions }: { actions: Section<ActionItem> }) {
  const t = await getTranslations("myDay");
  const locale = await getLocale();
  return (
    <BriefingSection
      id="actions"
      icon={ClipboardList}
      title={t("sections.actions")}
      count={actions.items.length}
      failed={!actions.ok}
      empty={t("empty.actions")}
    >
      {actions.items.slice(0, 6).map((a) => (
        <RowLink key={a.id} href={`/meetings/${a.meetingId}`}>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{a.title}</span>
            {a.meetingTitle ? (
              <span className="text-muted-foreground block truncate text-xs">{pick(a.meetingTitle, locale)}</span>
            ) : null}
          </span>
          {a.dueOn ? (
            <Tag tone={a.overdue ? "late" : "calm"} icon={a.overdue ? AlertCircle : undefined}>
              {t(a.overdue ? "action.overdue" : "action.due", { date: shortDay(a.dueOn, locale) })}
            </Tag>
          ) : null}
        </RowLink>
      ))}
    </BriefingSection>
  );
}

export async function CelebrationSection({ celebrations, userId }: { celebrations: Section<CelebrationItem>; userId: string }) {
  const t = await getTranslations("myDay");
  return (
    <BriefingSection
      id="celebrations"
      icon={PartyPopper}
      title={t("sections.celebrations")}
      count={celebrations.items.length}
      failed={!celebrations.ok}
      empty={t("empty.celebrations")}
      more={{ href: "/celebrations", label: t("more.celebrations") }}
    >
      {celebrations.items.map((c) => {
        const mine = c.userId === userId;
        const label =
          c.kind === "birthday"
            ? t(mine ? "celebration.myBirthday" : "celebration.birthday", { name: c.name })
            : t(mine ? "celebration.myAnniversary" : "celebration.anniversary", { name: c.name, years: c.years ?? 1 });
        return (
          <RowLink key={`${c.userId}-${c.kind}`} href="/celebrations">
            {c.kind === "birthday" ? (
              <Cake className="text-primary-ink size-4 shrink-0" aria-hidden />
            ) : (
              <Sparkles className="text-primary-ink size-4 shrink-0" aria-hidden />
            )}
            <span className="min-w-0 flex-1 text-sm font-medium break-words">{label}</span>
          </RowLink>
        );
      })}
    </BriefingSection>
  );
}
