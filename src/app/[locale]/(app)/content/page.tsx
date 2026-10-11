import { addMonths, format } from "date-fns";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/states/states";
import { monthGrid } from "@/features/calendar/month";
import { fetchBrands } from "@/features/boards/queries";
import { ContentView } from "@/features/content/content-view";
import { fetchPosts, fetchReadyCards } from "@/features/content/queries";
import { hasRole } from "@/lib/auth/access";
import { requireAccess } from "@/lib/auth/session";
import { cairoDateString, cairoInstant } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("content");
  return { title: t("title") };
}

export default async function ContentPage({ searchParams }: PageProps<"/[locale]/content">) {
  const access = await requireAccess();
  const sp = await searchParams;
  const today = cairoDateString();
  const month = typeof sp.month === "string" && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : today.slice(0, 7);
  const grid = monthGrid(month);
  const range = { from: cairoInstant(grid[0].date, "00:00").toISOString(), to: new Date(cairoInstant(grid.at(-1)!.date, "23:59").getTime() + 60_000).toISOString() };
  const locale = await getLocale();
  const t = await getTranslations("content");
  const supabase = await createClient();
  const [posts, ready, brands, branches, target] = await Promise.all([
    fetchPosts(supabase, range.from, range.to),
    fetchReadyCards(supabase),
    fetchBrands(supabase),
    supabase.from("branches").select("id, name_en, name_ar").eq("is_active", true).order("name_en"),
    supabase.from("settings").select("value").eq("key", "monthly_post_target").maybeSingle(),
  ]);
  const base = new Date(`${month}-15T12:00:00Z`);
  const writer = access.is_marketing && hasRole(access, "super_admin", "team_lead", "traffic_manager", "member");
  return (
    <div>
      <PageHeader title={t("title")} />
      <ContentView
        month={month}
        monthLabel={new Intl.DateTimeFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(base)}
        prev={format(addMonths(base, -1), "yyyy-MM")}
        next={format(addMonths(base, 1), "yyyy-MM")}
        today={today}
        grid={grid}
        range={range}
        initialPosts={posts}
        readyCards={ready}
        brands={brands}
        branches={branches.data ?? []}
        target={Number(target.data?.value ?? 12)}
        perms={{
          canEdit: writer,
          canApprove: hasRole(access, "team_lead", "super_admin"),
          canPublish: writer && (access.team_slug === "community" || hasRole(access, "team_lead", "super_admin")),
        }}
      />
    </div>
  );
}
