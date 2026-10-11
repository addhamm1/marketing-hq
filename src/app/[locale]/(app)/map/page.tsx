import { getLocale, getTranslations } from "next-intl/server";
import { MapView } from "@/features/map/map-view";
import { fetchMapData } from "@/features/map/queries";
import { requireAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("map");
  return { title: t("title") };
}

export default async function MapPage() {
  const access = await requireAccess();
  const locale = await getLocale();
  const supabase = await createClient();
  const data = await fetchMapData(supabase, locale);
  const mine = data.sessions.find((s) => s.user_id === access.user_id);
  // Default: the branch I'm checked in at, else my home branch.
  const selection = mine
    ? (mine.branch_id ?? mine.method)
    : (access.home_branch_id ?? data.branches[0]?.id ?? "field");
  return <MapView initial={data} defaultSelection={selection} />;
}
