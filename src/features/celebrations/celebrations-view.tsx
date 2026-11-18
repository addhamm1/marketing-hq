"use client";

import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { PeopleProvider } from "@/components/people-context";
import { PageHeader } from "@/components/states/states";
import { Button } from "@/components/ui/button";
import { KudosFeed } from "./kudos-feed";
import type { CelebrationsData } from "./queries";
import { SendKudosDialog } from "./send-kudos-dialog";
import { splitCelebrations } from "./split";
import { TodayBanner } from "./today-banner";
import { UpcomingList } from "./upcoming-list";

/** Shared by the team app and the department portal. */
export function CelebrationsView({ data, viewerId, canModerate }: {
  data: CelebrationsData;
  viewerId: string;
  canModerate: boolean;
}) {
  const t = useTranslations("celebrations");
  const [dialog, setDialog] = useState<{ toId?: string } | null>(null);
  const { today, upcoming } = splitCelebrations(data.celebrations ?? [], data.today);

  return (
    <PeopleProvider people={data.people} avatars={data.avatars}>
      <div className="mx-auto max-w-5xl">
        <PageHeader
          title={t("title")}
          description={t("subtitle")}
          actions={<Button onClick={() => setDialog({})}><Heart aria-hidden /> {t("sendKudos")}</Button>}
        />
        <TodayBanner items={today} viewerId={viewerId} wished={data.wished} onKudos={(toId) => setDialog({ toId })} />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <KudosFeed initial={data.kudos} viewerId={viewerId} canModerate={canModerate} onSend={() => setDialog({})} />
          <UpcomingList items={data.celebrations === null ? null : upcoming} today={data.today} />
        </div>
      </div>
      {dialog ? <SendKudosDialog viewerId={viewerId} toId={dialog.toId} onClose={() => setDialog(null)} /> : null}
    </PeopleProvider>
  );
}
