import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/states/states";
import { AutoCheckoutConfirm } from "@/features/checkin/auto-checkout-confirm";
import { CheckinPanel } from "@/features/checkin/checkin-panel";
import { requireAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("checkin");
  return { title: t("title") };
}

export default async function CheckinPage() {
  const access = await requireAccess();
  const t = await getTranslations("checkin");
  const locale = await getLocale();
  const supabase = await createClient();
  const [{ data: open }, { data: branches }, { data: wfh }, { data: autoClosed }, { data: assigned }] = await Promise.all([
    supabase
      .from("attendance_sessions")
      .select("id, branch_id, method, checked_in_at, is_late, checkin_place")
      .eq("user_id", access.user_id)
      .is("checked_out_at", null)
      .maybeSingle(),
    supabase.from("branches").select("id, name_en, name_ar, checkin_methods").eq("is_active", true).order("name_en"),
    supabase.rpc("my_wfh_today"),
    supabase
      .from("attendance_sessions")
      .select("id, checked_in_at, checked_out_at")
      .eq("user_id", access.user_id)
      .eq("auto_closed", true)
      .is("confirmed_at", null)
      .order("checked_in_at", { ascending: false })
      .limit(1),
    supabase.from("card_assignees").select("cards(id, title, stage, archived_at)").eq("user_id", access.user_id),
  ]);
  const branchList = (branches ?? []).map((br) => ({ id: br.id, name: locale === "ar" ? br.name_ar : br.name_en, methods: br.checkin_methods }));
  const cards = (assigned ?? [])
    .map((a) => a.cards as unknown as { id: string; title: string; stage: string | null; archived_at: string | null } | null)
    .filter((c): c is NonNullable<typeof c> => !!c && !c.archived_at && !["published", "reported"].includes(c.stage ?? ""))
    .map((c) => ({ id: c.id, title: c.title }));

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeader title={t("title")} />
      {autoClosed?.[0] ? <AutoCheckoutConfirm session={autoClosed[0]} /> : null}
      <CheckinPanel
        open={open ?? null}
        branches={branchList}
        homeBranchId={access.home_branch_id}
        wfhToday={!!wfh}
        cards={cards}
        canCheckIn={access.is_marketing}
      />
    </div>
  );
}
