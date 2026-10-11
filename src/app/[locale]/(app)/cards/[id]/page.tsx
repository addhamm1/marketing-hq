import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/** Stable link to a card: redirects to its board with the card open. */
export default async function CardRedirect({ params }: PageProps<"/[locale]/cards/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  await requireAccess();
  const supabase = await createClient();
  const { data } = await supabase.from("cards").select("board_id").eq("id", id).maybeSingle();
  if (!data) notFound();
  return redirect({ href: `/boards/${data.board_id}?card=${id}`, locale: await getLocale() });
}
