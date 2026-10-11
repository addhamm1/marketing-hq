import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/states/states";
import { CharacterCreator } from "@/features/character/creator";
import type { AvatarConfig } from "@/game/avatar/types";
import { requireAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("character");
  return { title: t("title") };
}

export default async function CharacterPage() {
  const access = await requireAccess();
  const t = await getTranslations("character");
  const supabase = await createClient();
  const { data } = await supabase.from("avatars").select("config").eq("user_id", access.user_id).maybeSingle();
  const welcome = !access.avatar_seen;
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={t("title")} description={welcome ? t("welcome") : t("intro")} />
      <CharacterCreator initial={(data?.config as unknown as AvatarConfig) ?? null} welcome={welcome} />
    </div>
  );
}
