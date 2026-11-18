import { getTranslations } from "next-intl/server";
import { RoomsEditor } from "@/features/launch/rooms-editor";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("launch.rooms");
  return { title: t("title") };
}

export default async function RoomsPage() {
  await requireRole("super_admin");
  const supabase = await createClient();
  const [rooms, branches] = await Promise.all([
    supabase.from("meeting_rooms").select("id, branch_id, name_en, name_ar, capacity, is_active").order("name_en"),
    supabase.from("branches").select("id, name_en, name_ar").eq("is_active", true).order("name_en"),
  ]);
  if (rooms.error) throw rooms.error;
  if (branches.error) throw branches.error;
  return <RoomsEditor rooms={rooms.data ?? []} branches={branches.data ?? []} />;
}
