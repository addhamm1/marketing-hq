import { getTranslations } from "next-intl/server";
import { PeopleProvider } from "@/components/people-context";
import { EmptyState, PageHeader } from "@/components/states/states";
import { GatesView } from "@/features/gates/gates-view";
import { resolveMonth } from "@/features/gates/month";
import { canManageGates } from "@/features/gates/perms";
import { loadGateMonth } from "@/features/gates/queries";
import { requireAccess } from "@/lib/auth/session";
import { cairoDateString } from "@/lib/dates";

export async function generateMetadata() {
  const t = await getTranslations("gates");
  return { title: t("title") };
}

export default async function GatesPage({ searchParams }: PageProps<"/[locale]/gates">) {
  const access = await requireAccess();
  const t = await getTranslations("gates");
  const today = cairoDateString();
  const month = resolveMonth((await searchParams).month, today);
  const data = await loadGateMonth(month);

  return (
    <div className="min-w-0">
      <PageHeader title={t("title")} description={t("description")} />
      {data ? (
        <PeopleProvider people={data.people}>
          <GatesView
            month={month}
            today={today}
            tracks={data.tracks}
            items={data.items}
            cards={data.cards}
            perms={{ canManage: canManageGates(access), userId: access.user_id }}
          />
        </PeopleProvider>
      ) : (
        <EmptyState title={t("outOfReachTitle")} body={t("outOfReachBody")} />
      )}
    </div>
  );
}
