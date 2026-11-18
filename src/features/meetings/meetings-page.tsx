import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ListSkeleton, PageHeader } from "@/components/states/states";
import { Link } from "@/i18n/navigation";
import { hasRole } from "@/lib/auth/access";
import { requireAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { meetingsBase } from "./display";
import { FixedTab } from "./fixed-tab";
import { MeetingList } from "./meeting-list";
import { NewMeetingButton } from "./new-meeting-button";
import { fetchFormOptions } from "./queries";
import { uuid } from "./schemas";
import type { Area, MeetingTab } from "./types";

const TABS: MeetingTab[] = ["upcoming", "fixed", "past"];

type Search = Record<string, string | string[] | undefined>;

/** The Meetings area, shared by the team app and the department portal. */
export async function MeetingsPage({ area, search }: { area: Area; search: Search }) {
  const access = await requireAccess();
  const t = await getTranslations("meetings");
  const tab = TABS.find((x) => x === search.tab) ?? "upcoming";
  const base = meetingsBase(area);
  const supabase = await createClient();
  const options = await fetchFormOptions(supabase, access.user_id);
  const withId = uuid.safeParse(search.with);
  const canManage = area === "team" && hasRole(access, "super_admin", "traffic_manager");

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={<NewMeetingButton options={options} base={base} openOnLoad={search.new === "1"} withId={withId.success ? withId.data : null} />}
      />
      <nav aria-label={t("tabsLabel")} className="mb-5 flex gap-1 border-b">
        {TABS.map((key) => (
          <Link
            key={key}
            href={key === "upcoming" ? base : `${base}?tab=${key}`}
            aria-current={key === tab ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
              key === tab ? "border-primary-ink text-foreground" : "text-muted-foreground hover:text-foreground border-transparent",
            )}
          >
            {t(`tabs.${key}`)}
          </Link>
        ))}
      </nav>
      <Suspense key={tab} fallback={<ListSkeleton rows={5} />}>
        {tab === "fixed" ? (
          <FixedTab area={area} isMarketing={access.is_marketing} canManage={canManage} rooms={options.rooms} marketingDepartments={options.marketingDepartments} me={access.user_id} />
        ) : (
          <MeetingList tab={tab} area={area} me={access.user_id} />
        )}
      </Suspense>
    </div>
  );
}
