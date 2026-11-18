import { getTranslations } from "next-intl/server";
import { ErrorState } from "@/components/states/states";
import { createClient } from "@/lib/supabase/server";
import { fetchBranches, fetchSeries } from "./queries";
import { SeriesList } from "./series-list";
import type { Area, Room, Series } from "./types";

type Props = { area: Area; isMarketing: boolean; canManage: boolean; rooms: Room[]; marketingDepartments: string[]; me: string };

/** In the portal, only the fixed meetings this person is part of. */
function isPartOf(series: Series, me: string, isMarketing: boolean) {
  return series.owner_id === me || series.member_ids.includes(me) || (series.audience === "marketing" && isMarketing);
}

/** Daily, weekly and monthly meetings. Only super admins and traffic managers can change them. */
export async function FixedTab({ area, isMarketing, canManage, rooms, marketingDepartments, me }: Props) {
  const tc = await getTranslations("common");
  const supabase = await createClient();
  const [{ series, failed }, branches] = await Promise.all([
    fetchSeries(supabase),
    canManage ? fetchBranches(supabase) : Promise.resolve([]),
  ]);
  if (failed) return <ErrorState title={tc("errorTitle")} body={tc("errorBody")} />;
  const shown = area === "portal" ? series.filter((s) => isPartOf(s, me, isMarketing)) : series;
  return <SeriesList series={shown} rooms={rooms} branches={branches} canManage={canManage} marketingDepartments={marketingDepartments} me={me} />;
}
