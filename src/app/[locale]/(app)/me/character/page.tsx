import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/states/states";
import { CharacterCreator } from "@/features/character/creator";
import { savedLooksSchema } from "@/game/avatar/config";
import type { AvatarConfig, SavedLook } from "@/game/avatar/types";
import { requireAccess } from "@/lib/auth/session";
import { cairoDateString } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("character");
  return { title: t("title") };
}

export default async function CharacterPage() {
  const access = await requireAccess();
  const t = await getTranslations("character");
  const supabase = await createClient();
  const [{ data }, events] = await Promise.all([
    supabase.from("avatars").select("config, looks").eq("user_id", access.user_id).maybeSingle(),
    supabase.from("seasonal_events").select("key, name_en, name_ar, starts_on, ends_on, items, is_active"),
  ]);
  const looks = savedLooksSchema.safeParse(data?.looks ?? []);
  const welcome = !access.avatar_seen;
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={t("title")} description={welcome ? t("welcome") : t("intro")} />
      <CharacterCreator
        initial={(data?.config as unknown as AvatarConfig) ?? null}
        initialLooks={looks.success ? (looks.data as SavedLook[]) : []}
        events={events.data ?? []}
        eventsFailed={!!events.error}
        today={cairoDateString()}
        welcome={welcome}
      />
    </div>
  );
}
