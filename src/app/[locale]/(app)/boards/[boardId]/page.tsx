import { notFound } from "next/navigation";
import { PeopleProvider } from "@/components/people-context";
import { BoardView } from "@/features/boards/board-view";
import { boardPermissions } from "@/features/boards/permissions";
import { fetchBoardData, fetchBoardSettings, fetchBrands, fetchPeople } from "@/features/boards/queries";
import { requireAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }: PageProps<"/[locale]/boards/[boardId]">) {
  const { boardId } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("boards").select("name").eq("id", boardId).maybeSingle();
  return { title: data?.name ?? "Board" };
}

export default async function BoardPage({ params }: PageProps<"/[locale]/boards/[boardId]">) {
  const { boardId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(boardId)) notFound();
  const access = await requireAccess();
  const supabase = await createClient();
  const [data, people, brands, settings, branches] = await Promise.all([
    fetchBoardData(supabase, boardId),
    fetchPeople(supabase),
    fetchBrands(supabase),
    fetchBoardSettings(supabase),
    supabase.from("branches").select("id, name_en, name_ar").eq("is_active", true).order("name_en"),
  ]);
  if (!data || data.board.archived_at) notFound();
  const { data: departments } = await supabase.from("departments").select("id, name_en, name_ar").order("name_en");

  return (
    <PeopleProvider people={people}>
      <BoardView
        initial={data}
        brands={brands}
        settings={settings}
        branches={branches.data ?? []}
        departments={departments ?? []}
        perms={boardPermissions(access, data.board)}
        me={access.user_id}
      />
    </PeopleProvider>
  );
}
