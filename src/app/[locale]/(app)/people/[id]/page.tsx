import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ProfileCard } from "@/features/people/profile-card";
import { requireAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function PersonPage({ params }: PageProps<"/[locale]/people/[id]">) {
  const { id: raw } = await params;
  const access = await requireAccess();
  const id = raw === "me" ? access.user_id : raw;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const locale = await getLocale();
  const t = await getTranslations("people");
  const supabase = await createClient();
  const [{ data: dir }, { data: profile }, { data: teams }, { data: depts }, { data: branches }, { data: sessions }, { count }] = await Promise.all([
    supabase.rpc("public_profiles"),
    supabase.from("profiles").select("email, phone, home_branch_id, presence").eq("id", id).maybeSingle(),
    supabase.from("teams").select("id, name_en, name_ar, color"),
    supabase.from("departments").select("id, name_en, name_ar"),
    supabase.from("branches").select("id, name_en, name_ar"),
    supabase.rpc("who_is_in", {}),
    supabase.from("card_assignees").select("card_id, cards!inner(stage, archived_at)", { count: "exact", head: true }).eq("user_id", id).is("cards.archived_at", null),
  ]);
  const person = (dir ?? []).find((p) => p.id === id);
  if (!person) notFound();
  const name = (rows: { id: string; name_en: string; name_ar: string }[] | null, key: string | null) => {
    const r = rows?.find((x) => x.id === key);
    return r ? (locale === "ar" ? r.name_ar : r.name_en) : null;
  };
  return (
    <ProfileCard
      person={person}
      team={name(teams, person.team_id)}
      teamColor={teams?.find((x) => x.id === person.team_id)?.color ?? null}
      department={name(depts, person.department_id)}
      branch={name(branches, profile?.home_branch_id ?? null)}
      email={profile?.email ?? null}
      phone={profile?.phone ?? null}
      presence={profile?.presence ?? null}
      checkedIn={(sessions ?? []).some((s) => s.user_id === id)}
      openCards={count ?? 0}
      labels={{ team: t("team"), department: t("department"), branch: t("branch"), contact: t("contact"), checkedIn: t("checkedIn"), notCheckedIn: t("notCheckedIn"), openCards: t("openCards") }}
    />
  );
}
